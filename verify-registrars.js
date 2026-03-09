#!/usr/bin/env node
/**
 * DOMAIN AXIS PRO — Registrar Link Verifier & Auto-Fixer
 * 
 * Crawls each registrar's domain search URL to verify it works,
 * finds the correct URL pattern, and generates a verified config.
 * 
 * Usage: node verify-registrars.js [domain]
 * Example: node verify-registrars.js ai-group.com
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const TEST_DOMAIN = process.argv[2] || 'test-domain-check.com';
const TEST_IL_DOMAIN = process.argv[3] || 'test-domain-check.co.il';

// ============================================================
// REGISTRAR DEFINITIONS — each has multiple URL candidates
// ============================================================
const REGISTRARS = {
  cloudflare: {
    name: 'Cloudflare',
    icon: '☁️',
    candidates: [
      d => `https://dash.cloudflare.com/?to=/:account/domains/register/${d}`,
    ],
    note: 'Requires login — URL is correct, redirects to login first',
    expectLogin: true,
  },
  spaceship: {
    name: 'Spaceship',
    icon: '🚀',
    candidates: [
      d => `https://www.spaceship.com/domain/search/?query=${d}`,
      d => `https://www.spaceship.com/domain/search/${d}`,
    ],
  },
  dynadot: {
    name: 'Dynadot',
    icon: '🔷',
    candidates: [
      d => `https://www.dynadot.com/domain/search?domain=${d}`,
      d => `https://www.dynadot.com/domain/search.html?domain=${d}`,
    ],
  },
  porkbun: {
    name: 'Porkbun',
    icon: '🐷',
    candidates: [
      d => `https://porkbun.com/checkout/search?q=${d}`,
      d => `https://porkbun.com/products/domains?q=${d}`,
    ],
  },
  namecheap: {
    name: 'Namecheap',
    icon: '🟠',
    candidates: [
      d => `https://www.namecheap.com/domains/registration/results/?domain=${d}`,
      d => `https://www.namecheap.com/domains/registration/results.aspx?domain=${d}`,
    ],
  },
  godaddy: {
    name: 'GoDaddy',
    icon: '🟢',
    candidates: [
      d => `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${d}`,
      d => `https://www.godaddy.com/domainsearch/find?domainToCheck=${d}`,
    ],
  },
  hover: {
    name: 'Hover',
    icon: '🔵',
    candidates: [
      d => `https://www.hover.com/domains/results?q=${d}`,
      d => `https://www.hover.com/domain-search?q=${d}`,
    ],
  },
  squarespace: {
    name: 'Squarespace',
    icon: '⬛',
    candidates: [
      d => `https://domains.squarespace.com/search?query=${d}`,
      d => `https://domains.squarespace.com/?query=${d}`,
    ],
  },
  ionos: {
    name: 'IONOS',
    icon: '💙',
    candidates: [
      d => `https://www.ionos.com/domains/domain-names`,
      d => `https://www.ionos.com/domains`,
    ],
    note: 'IONOS uses JS form — no query param support, links to search page',
  },
  dreamhost: {
    name: 'DreamHost',
    icon: '🌙',
    candidates: [
      d => `https://www.dreamhost.com/domains/?domain=${d}`,
      d => `https://www.dreamhost.com/domains/`,
    ],
  },
  gandi: {
    name: 'Gandi',
    icon: '🦎',
    candidates: [
      d => `https://shop.gandi.net/en/domain/suggest?search=${d}`,
      d => `https://www.gandi.net/en/domain/search?search=${d}`,
    ],
  },
  godaddy_il: {
    name: 'GoDaddy 🇮🇱',
    icon: '🟢',
    candidates: [
      d => `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${d}`,
    ],
    testDomain: TEST_IL_DOMAIN,
  },
};

// ============================================================
// HTTP HEAD/GET check with redirect following
// ============================================================
function checkUrl(urlStr, maxRedirects = 5) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    function follow(url, redirectsLeft) {
      try {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        
        const req = lib.request(url, {
          method: 'GET',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        }, (res) => {
          // Consume response body to prevent memory leaks
          let body = '';
          res.on('data', (chunk) => { body += chunk.toString().slice(0, 5000); });
          res.on('end', () => {
            const ms = Date.now() - startTime;
            
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
              const nextUrl = new URL(res.headers.location, url).toString();
              return follow(nextUrl, redirectsLeft - 1);
            }
            
            // Check if page has domain search indicators
            const hasDomainSearch = /domain|search|register|checkout|available|unavailable/i.test(body);
            const hasLoginPage = /login|sign.?in|log.?in|password/i.test(body);
            const title = (body.match(/<title[^>]*>(.*?)<\/title>/i) || [])[1] || '';
            
            resolve({
              url: urlStr,
              finalUrl: url,
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 400,
              ms,
              title: title.trim().slice(0, 100),
              hasDomainSearch,
              hasLoginPage,
              redirected: url !== urlStr,
            });
          });
        });
        
        req.on('error', (err) => {
          resolve({
            url: urlStr,
            status: 0,
            ok: false,
            ms: Date.now() - startTime,
            error: err.message,
          });
        });
        
        req.on('timeout', () => {
          req.destroy();
          resolve({
            url: urlStr,
            status: 0,
            ok: false,
            ms: Date.now() - startTime,
            error: 'timeout',
          });
        });
        
        req.end();
      } catch (err) {
        resolve({
          url: urlStr,
          status: 0,
          ok: false,
          ms: Date.now() - startTime,
          error: err.message,
        });
      }
    }
    
    follow(urlStr, maxRedirects);
  });
}

// ============================================================
// Main verification
// ============================================================
async function verify() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         DOMAIN AXIS PRO — Registrar Link Verifier          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Test domain: ${TEST_DOMAIN.padEnd(44)} ║`);
  console.log(`║  IL domain:   ${TEST_IL_DOMAIN.padEnd(44)} ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const verified = {};
  let passed = 0, failed = 0, loginRequired = 0;

  for (const [id, reg] of Object.entries(REGISTRARS)) {
    const domain = reg.testDomain || TEST_DOMAIN;
    console.log(`🔍 ${reg.icon} ${reg.name}`);
    
    let bestCandidate = null;
    
    for (let i = 0; i < reg.candidates.length; i++) {
      const url = reg.candidates[i](domain);
      process.stdout.write(`   Candidate ${i + 1}: ${url.slice(0, 70)}... `);
      
      const result = await checkUrl(url);
      
      if (result.ok) {
        if (reg.expectLogin && result.hasLoginPage) {
          console.log(`⚠️  ${result.status} (login page, expected) [${result.ms}ms]`);
          if (!bestCandidate) bestCandidate = { index: i, result, url };
        } else if (result.hasDomainSearch || result.status === 200) {
          console.log(`✅ ${result.status} [${result.ms}ms]${result.title ? ` — "${result.title}"` : ''}`);
          bestCandidate = { index: i, result, url };
          break; // Found a good one, stop checking
        } else {
          console.log(`⚠️  ${result.status} (no domain search detected) [${result.ms}ms]`);
          if (!bestCandidate) bestCandidate = { index: i, result, url };
        }
      } else {
        console.log(`❌ ${result.status || 'ERR'} — ${result.error || 'failed'} [${result.ms}ms]`);
      }
    }
    
    if (bestCandidate) {
      verified[id] = {
        name: reg.name,
        icon: reg.icon,
        buyIndex: bestCandidate.index,
        buyUrl: reg.candidates[bestCandidate.index].toString(),
        testResult: bestCandidate.result,
      };
      if (reg.expectLogin) {
        loginRequired++;
        console.log(`   → 🔑 Login required (URL is correct)`);
      } else {
        passed++;
        console.log(`   → ✅ VERIFIED: candidate ${bestCandidate.index + 1}`);
      }
    } else {
      failed++;
      console.log(`   → ❌ ALL CANDIDATES FAILED`);
    }
    
    if (reg.note) console.log(`   ℹ️  ${reg.note}`);
    console.log('');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ✅ ${passed} passed  |  🔑 ${loginRequired} login-required  |  ❌ ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Generate the JS config
  console.log('\n📝 Generating verified registrar config...\n');
  
  const configLines = [];
  for (const [id, reg] of Object.entries(REGISTRARS)) {
    const v = verified[id];
    const status = v ? '✅' : '❌';
    const buyFn = reg.candidates[v?.buyIndex || 0].toString()
      .replace(/^.*=>/, 'd =>')
      .trim();
    configLines.push(`  // ${status} ${reg.name} — ${v ? `HTTP ${v.testResult.status}` : 'FAILED'}`);
    configLines.push(`  ${id}: { name:'${reg.name}', icon:'${reg.icon}', buy: ${buyFn} },`);
  }
  
  console.log('const VERIFIED_REGS = {');
  console.log(configLines.join('\n'));
  console.log('};');
  
  // Write results to JSON
  const fs = require('fs');
  const output = {
    timestamp: new Date().toISOString(),
    testDomain: TEST_DOMAIN,
    testIlDomain: TEST_IL_DOMAIN,
    results: {},
  };
  
  for (const [id, v] of Object.entries(verified)) {
    output.results[id] = {
      name: v.name,
      status: v.testResult.ok ? 'ok' : 'failed',
      httpStatus: v.testResult.status,
      ms: v.testResult.ms,
      finalUrl: v.testResult.finalUrl,
      title: v.testResult.title,
    };
  }
  
  fs.writeFileSync(
    __dirname + '/registrar-verification.json',
    JSON.stringify(output, null, 2)
  );
  console.log('\n💾 Results saved to registrar-verification.json');
}

verify().catch(console.error);
