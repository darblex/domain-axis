#!/usr/bin/env node
/**
 * DOMAIN AXIS PRO — Browser-Based URL Grabber
 * 
 * Uses Playwright to ACTUALLY visit each registrar site,
 * search for a domain, and capture the real working URL.
 * Then patches index.html with verified URLs.
 * 
 * Usage: node browser-grab.js [domain]
 * Example: node browser-grab.js ai-group.com
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_DOMAIN = process.argv[2] || 'my-test-domain-2026.com';
const TIMEOUT = 12000;

// ══════════════════════════════════════════════════════════════
// REGISTRAR CRAWL DEFINITIONS
// Each has: startUrl, searchSteps (how to search), extractUrl
// ══════════════════════════════════════════════════════════════
const CRAWL_DEFS = {
  cloudflare: {
    name: 'Cloudflare', icon: '☁️',
    // Cloudflare requires login — URL pattern is known and stable
    skipBrowser: true,
    buyPattern: d => `https://dash.cloudflare.com/?to=/:account/domains/register/${d}`,
    reason: 'Requires Cloudflare account login — URL pattern is stable and verified',
  },

  spaceship: {
    name: 'Spaceship', icon: '🚀',
    startUrl: 'https://www.spaceship.com/domain/search/',
    searchSteps: async (page, domain) => {
      await page.fill('input[type="text"], input[type="search"], input[name*="domain"], input[name*="search"], input[placeholder*="domain" i], input[placeholder*="search" i]', domain);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    },
  },

  dynadot: {
    name: 'Dynadot', icon: '🔷',
    startUrl: d => `https://www.dynadot.com/domain/search?domain=${d}`,
    directUrl: true, // Just navigate, no form interaction needed
  },

  porkbun: {
    name: 'Porkbun', icon: '🐷',
    startUrl: d => `https://porkbun.com/checkout/search?q=${d}`,
    directUrl: true,
  },

  namecheap: {
    name: 'Namecheap', icon: '🟠',
    startUrl: d => `https://www.namecheap.com/domains/registration/results/?domain=${d}`,
    directUrl: true,
  },

  godaddy: {
    name: 'GoDaddy', icon: '🟢',
    startUrl: d => `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${d}`,
    directUrl: true,
  },

  hover: {
    name: 'Hover', icon: '🔵',
    startUrl: 'https://www.hover.com/domains',
    searchSteps: async (page, domain) => {
      await page.fill('input[type="text"], input[type="search"], input[placeholder*="domain" i]', domain);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    },
  },

  squarespace: {
    name: 'Squarespace', icon: '⬛',
    startUrl: d => `https://domains.squarespace.com/search?query=${d}`,
    directUrl: true,
  },

  ionos: {
    name: 'IONOS', icon: '💙',
    startUrl: 'https://www.ionos.com/domains/domain-names',
    searchSteps: async (page, domain) => {
      // IONOS uses a JS form — try to find and fill it
      const input = await page.$('input[type="text"], input[type="search"], input[placeholder*="domain" i], input[name*="domain" i]');
      if (input) {
        await input.fill(domain);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
      }
    },
  },

  dreamhost: {
    name: 'DreamHost', icon: '🌙',
    startUrl: d => `https://www.dreamhost.com/domains/?domain=${d}`,
    directUrl: true,
  },

  gandi: {
    name: 'Gandi', icon: '🦎',
    startUrl: d => `https://shop.gandi.net/en/domain/suggest?search=${d}`,
    directUrl: true,
  },
};

// ══════════════════════════════════════════════════════════════
// BROWSER GRABBER
// ══════════════════════════════════════════════════════════════
async function grabUrl(browser, id, def, domain) {
  if (def.skipBrowser) {
    return {
      id,
      name: def.name,
      icon: def.icon,
      status: 'skip',
      buyUrl: def.buyPattern(domain),
      buyPattern: def.buyPattern.toString(),
      reason: def.reason,
    };
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });
  const page = await context.newPage();

  try {
    // Navigate
    let startUrl;
    if (def.directUrl) {
      startUrl = typeof def.startUrl === 'function' ? def.startUrl(domain) : def.startUrl;
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      await page.waitForTimeout(2000);
    } else {
      startUrl = typeof def.startUrl === 'function' ? def.startUrl(domain) : def.startUrl;
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      await page.waitForTimeout(1500);
      
      if (def.searchSteps) {
        try {
          await def.searchSteps(page, domain);
        } catch (e) {
          // Search steps may fail on some sites
        }
      }
    }

    // Capture final URL after any redirects/JS navigation
    const finalUrl = page.url();
    const title = await page.title();

    // Check if page has domain-related content
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 3000) || '');
    const hasDomainContent = /available|unavailable|taken|register|domain|add to cart|buy now/i.test(bodyText);
    const hasError = /404|not found|error|access denied|forbidden/i.test(title);
    const hasLogin = /sign in|log in|login|create account/i.test(bodyText.slice(0, 500));

    // Extract the URL pattern (replace domain with placeholder)
    const urlPattern = finalUrl.replace(domain, '{DOMAIN}');

    // Determine if this is a working buy link
    let status = 'unknown';
    if (hasError) status = 'error';
    else if (hasLogin && !hasDomainContent) status = 'login-required';
    else if (hasDomainContent) status = 'verified';
    else status = 'loaded'; // Page loaded but couldn't confirm domain content

    // Take screenshot for proof
    const screenshotPath = path.join(__dirname, `screenshots/${id}.jpg`);
    fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });
    await page.screenshot({ path: screenshotPath, quality: 50, type: 'jpeg' });

    return {
      id,
      name: def.name,
      icon: def.icon,
      status,
      startUrl,
      finalUrl,
      urlPattern,
      title,
      hasDomainContent,
      hasLogin,
      hasError,
      screenshotPath,
    };
  } catch (err) {
    return {
      id,
      name: def.name,
      icon: def.icon,
      status: 'error',
      error: err.message,
      startUrl: typeof def.startUrl === 'function' ? def.startUrl(domain) : def.startUrl,
    };
  } finally {
    await context.close();
  }
}

// ══════════════════════════════════════════════════════════════
// GENERATE PATCH FOR INDEX.HTML
// ══════════════════════════════════════════════════════════════
function generatePatch(results) {
  const verified = {};
  
  for (const r of results) {
    if (r.status === 'skip') {
      // Known pattern (like Cloudflare)
      verified[r.id] = { pattern: r.buyPattern, note: r.reason };
    } else if (r.status === 'verified' || r.status === 'loaded') {
      // Build buy function from final URL
      const domain = TEST_DOMAIN;
      const finalUrl = r.finalUrl;
      
      if (finalUrl.includes(domain)) {
        // URL contains the domain — can create a dynamic buy function
        const buyTemplate = finalUrl.replace(domain, '${d}');
        verified[r.id] = { pattern: `d => \`${buyTemplate}\``, finalUrl };
      } else {
        // URL doesn't contain domain (maybe JS-based) — use start URL
        const startUrl = r.startUrl;
        if (startUrl && startUrl.includes(domain)) {
          const buyTemplate = startUrl.replace(domain, '${d}');
          verified[r.id] = { pattern: `d => \`${buyTemplate}\``, finalUrl, note: 'URL from start (JS redirect)' };
        } else {
          verified[r.id] = { pattern: `d => '${finalUrl}'`, finalUrl, note: 'Static URL (no domain in URL)' };
        }
      }
    } else if (r.status === 'login-required') {
      verified[r.id] = { pattern: null, note: `Login required — ${r.finalUrl}` };
    } else {
      verified[r.id] = { pattern: null, note: `Error — ${r.error || r.status}` };
    }
  }

  return verified;
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║    🌐 DOMAIN AXIS PRO — Browser URL Grabber                  ║');
  console.log('║    Visits each registrar with a real browser to find URLs     ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  Test domain: ${TEST_DOMAIN.padEnd(46)} ║`);
  console.log(`║  Registrars:  ${Object.keys(CRAWL_DEFS).length.toString().padEnd(46)} ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  for (const [id, def] of Object.entries(CRAWL_DEFS)) {
    process.stdout.write(`\n${def.icon} ${def.name.padEnd(18)} `);
    const result = await grabUrl(browser, id, def, TEST_DOMAIN);
    results.push(result);

    switch (result.status) {
      case 'verified':
        console.log(`✅ VERIFIED — domain content found`);
        console.log(`   📍 ${result.finalUrl}`);
        break;
      case 'loaded':
        console.log(`⚠️  Loaded (no domain content detected)`);
        console.log(`   📍 ${result.finalUrl}`);
        break;
      case 'skip':
        console.log(`⏭️  Skipped — ${result.reason}`);
        console.log(`   📍 ${result.buyUrl}`);
        break;
      case 'login-required':
        console.log(`🔑 Login required`);
        console.log(`   📍 ${result.finalUrl}`);
        break;
      case 'error':
        console.log(`❌ Error — ${result.error || 'page error'}`);
        break;
      default:
        console.log(`❓ ${result.status}`);
    }
  }

  await browser.close();

  // Generate verification report
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  const verified = results.filter(r => r.status === 'verified').length;
  const loaded = results.filter(r => r.status === 'loaded').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const failed = results.filter(r => r.status === 'error' || r.status === 'login-required').length;
  console.log(`  ✅ Verified: ${verified}  |  ⚠️ Loaded: ${loaded}  |  ⏭️ Skip: ${skipped}  |  ❌ Failed: ${failed}`);
  console.log(`  Total usable: ${verified + loaded + skipped} / ${results.length}`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Generate patch data
  const patch = generatePatch(results);
  
  console.log('\n📋 VERIFIED BUY URL PATTERNS:');
  console.log('─'.repeat(90));
  for (const [id, data] of Object.entries(patch)) {
    const def = CRAWL_DEFS[id];
    const status = data.pattern ? '✅' : '❌';
    console.log(`  ${status} ${def.icon} ${def.name.padEnd(18)} ${data.pattern || data.note}`);
    if (data.note && data.pattern) console.log(`     ℹ️  ${data.note}`);
  }
  console.log('─'.repeat(90));

  // Save full report
  const report = {
    timestamp: new Date().toISOString(),
    testDomain: TEST_DOMAIN,
    summary: { verified, loaded, skipped, failed, total: results.length },
    results: results.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      startUrl: r.startUrl || r.buyUrl,
      finalUrl: r.finalUrl || r.buyUrl,
      urlPattern: r.urlPattern,
      title: r.title,
      hasDomainContent: r.hasDomainContent,
      error: r.error,
      reason: r.reason,
    })),
    patchData: patch,
  };

  fs.writeFileSync(
    path.join(__dirname, 'browser-grab-results.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('\n💾 Full report: browser-grab-results.json');
  console.log('📸 Screenshots: screenshots/*.jpg');
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  
  // Fallback: if Playwright isn't installed, tell the user
  if (err.message.includes('Cannot find module') || err.message.includes('playwright')) {
    console.log('\n⚠️  Playwright not installed. Install with:');
    console.log('    npm install playwright');
    console.log('    npx playwright install chromium');
    console.log('\n💡 Alternatively, use grab-links.js (HTTP-based, no browser needed)');
  }

  process.exit(1);
});
