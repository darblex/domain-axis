// ── Domain Axis Services ──
const cheerio = require('cheerio');

// ═══════════════════════════════════════
// DNS Availability Check (Google + Cloudflare)
// ═══════════════════════════════════════
async function checkDNS(domain) {
  const checks = await Promise.allSettled([
    fetch(`https://dns.google/resolve?name=${domain}&type=A`).then(r => r.json()),
    fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
      headers: { Accept: 'application/dns-json' }
    }).then(r => r.json()),
  ]);

  const google = checks[0].status === 'fulfilled' ? checks[0].value : null;
  const cf = checks[1].status === 'fulfilled' ? checks[1].value : null;

  // NXDOMAIN (Status 3) = available
  const googleAvail = google && google.Status === 3;
  const cfAvail = cf && cf.Status === 3;
  // NOERROR (Status 0) with answers = taken
  const googleTaken = google && google.Status === 0 && google.Answer && google.Answer.length > 0;
  const cfTaken = cf && cf.Status === 0 && cf.Answer && cf.Answer.length > 0;

  let available = 'unknown';
  if (googleAvail || cfAvail) available = true;
  else if (googleTaken || cfTaken) available = false;

  const ips = [];
  if (google?.Answer) ips.push(...google.Answer.filter(a => a.type === 1).map(a => a.data));
  if (cf?.Answer) ips.push(...cf.Answer.filter(a => a.type === 1).map(a => a.data));

  return {
    domain,
    available,
    ips: [...new Set(ips)],
    checkedAt: new Date().toISOString()
  };
}

// ═══════════════════════════════════════
// RDAP/WHOIS Lookup
// ═══════════════════════════════════════
async function lookupRDAP(domain) {
  // First get the right RDAP server for this TLD
  const tld = domain.split('.').pop();
  
  // Try direct RDAP
  const urls = [
    `https://rdap.org/domain/${domain}`,
    `https://rdap.verisign.com/com/v1/domain/${domain}`,
    `https://rdap.verisign.com/net/v1/domain/${domain}`,
  ];

  for (const url of urls) {
    try {
      const resp = await fetch(url, { 
        headers: { Accept: 'application/rdap+json,application/json' },
        signal: AbortSignal.timeout(10000)
      });
      if (!resp.ok) continue;
      
      const data = await resp.json();
      
      // Parse RDAP response
      const events = data.events || [];
      const registration = events.find(e => e.eventAction === 'registration')?.eventDate;
      const expiration = events.find(e => e.eventAction === 'expiration')?.eventDate;
      const lastChanged = events.find(e => e.eventAction === 'last changed')?.eventDate;
      
      // Get registrar from entities
      const registrarEntity = (data.entities || []).find(e => 
        (e.roles || []).includes('registrar')
      );
      const registrar = registrarEntity?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] 
        || registrarEntity?.publicIds?.[0]?.identifier
        || 'Unknown';

      // Nameservers
      const nameservers = (data.nameservers || []).map(ns => ns.ldhName || ns.unicodeName).filter(Boolean);

      // Status
      const status = data.status || [];

      return {
        domain,
        registrar,
        registration: registration || null,
        expiration: expiration || null,
        lastChanged: lastChanged || null,
        nameservers,
        status,
        dnssec: status.includes('server dnssec signed zone') || data.secureDNS?.delegationSigned || false,
        raw: {
          handle: data.handle,
          ldhName: data.ldhName,
        }
      };
    } catch {
      continue;
    }
  }

  return { domain, error: 'RDAP lookup failed — domain may not exist or TLD not supported' };
}

// ═══════════════════════════════════════
// DNS Records Lookup
// ═══════════════════════════════════════
async function lookupDNSRecords(domain) {
  const types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];
  
  const results = await Promise.allSettled(
    types.map(async type => {
      const resp = await fetch(`https://dns.google/resolve?name=${domain}&type=${type}`);
      const data = await resp.json();
      return {
        type,
        records: (data.Answer || []).map(a => ({
          name: a.name,
          type: a.type,
          ttl: a.TTL,
          data: a.data
        }))
      };
    })
  );

  const records = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      records[types[i]] = r.value.records;
    } else {
      records[types[i]] = [];
    }
  });

  return { domain, records, checkedAt: new Date().toISOString() };
}

// ═══════════════════════════════════════
// SSL Certificate Lookup (crt.sh)
// ═══════════════════════════════════════
async function lookupSSL(domain) {
  try {
    const resp = await fetch(`https://crt.sh/?q=${domain}&output=json`, {
      signal: AbortSignal.timeout(15000)
    });
    if (!resp.ok) return { domain, certificates: [], error: 'crt.sh request failed' };
    
    const data = await resp.json();
    
    // Get unique certs, sorted by most recent
    const seen = new Set();
    const certs = data
      .filter(c => {
        const key = c.serial_number;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.not_before) - new Date(a.not_before))
      .slice(0, 10)
      .map(c => ({
        issuer: c.issuer_name,
        commonName: c.common_name,
        notBefore: c.not_before,
        notAfter: c.not_after,
        serialNumber: c.serial_number,
        matchingIdentities: c.name_value?.split('\n') || []
      }));

    return { domain, certificates: certs, total: data.length };
  } catch (e) {
    return { domain, certificates: [], error: e.message };
  }
}

// ═══════════════════════════════════════
// Price Comparison Engine (ported from Rust)
// ═══════════════════════════════════════

// Registrar purchase URL mapping (from Rust tool)
function registrarPurchaseUrl(registrar, domain) {
  const r = registrar.toLowerCase();
  if (r.includes('namecheap')) return `https://www.namecheap.com/domains/registration/results/?domain=${domain}`;
  if (r.includes('godaddy')) return `https://www.godaddy.com/domainsearch/find?domainToCheck=${domain}`;
  if (r.includes('porkbun')) return `https://porkbun.com/checkout/search?q=${domain}`;
  if (r.includes('cloudflare')) return `https://www.cloudflare.com/products/registrar/`;
  if (r.includes('namesilo')) return `https://www.namesilo.com/domain/search-domains?query=${domain}`;
  if (r.includes('spaceship')) return `https://www.spaceship.com/domain/${domain}/`;
  if (r.includes('dynadot')) return `https://www.dynadot.com/domain/search?domain=${domain}`;
  if (r.includes('squarespace') || r.includes('google')) return `https://domains.squarespace.com/?query=${domain}`;
  if (r.includes('sav')) return `https://www.sav.com/domain/${domain}`;
  if (r.includes('hostinger')) return `https://www.hostinger.com/domain-name-search?domain=${domain}`;
  if (r.includes('name.com') || r.includes('namecom')) return `https://www.name.com/domain/search/${domain}`;
  if (r.includes('cosmotown')) return `https://cosmotown.com/search?q=${domain}`;
  if (r.includes('gandi')) return `https://www.gandi.net/en/domain/search?q=${domain}`;
  if (r.includes('hover')) return `https://www.hover.com/domains/results?q=${domain}`;
  if (r.includes('ionos') || r.includes('1&1')) return `https://www.ionos.com/domain/check?domain=${domain}`;
  if (r.includes('dreamhost')) return `https://www.dreamhost.com/domains/?domain=${domain}`;
  if (r.includes('bluehost')) return `https://www.bluehost.com/domains?domain=${domain}`;
  if (r.includes('epik')) return `https://www.epik.com/domain/${domain}`;
  if (r.includes('regery')) return `https://regery.com/en/domain/search?query=${domain}`;
  if (r.includes('101domain')) return `https://www.101domain.com/search/?q=${domain}`;
  if (r.includes('inwx')) return `https://www.inwx.com/en/domain/check#search=${domain}`;
  if (r.includes('ovh')) return `https://www.ovhcloud.com/en/domains/search/?q=${domain}`;
  if (r.includes('netim')) return `https://www.netim.com/domain-name/search?q=${domain}`;
  if (r.includes('crazy')) return `https://www.crazydomains.com/domain-names/?s=${domain}`;
  if (r.includes('domain.com')) return `https://www.domain.com/registration/?flow=domainDFE&domain=${domain}`;
  if (r.includes('register.com')) return `https://www.register.com/domain/search?domain=${domain}`;
  if (r.includes('123')) return `https://www.123reg.co.uk/domain-names/search/?domain=${domain}`;
  return `https://www.google.com/search?q=buy+domain+${domain}+at+${registrar.replace(/ /g, '+')}`;
}

// Cloudflare hardcoded prices (at-cost registrar)
const CLOUDFLARE_PRICES = {
  com: { reg: 10.11, renewal: 10.11 },
  net: { reg: 10.26, renewal: 10.26 },
  org: { reg: 10.11, renewal: 10.11 },
  io: { reg: 33.98, renewal: 33.98 },
  co: { reg: 11.69, renewal: 11.69 },
  dev: { reg: 13.00, renewal: 13.00 },
  app: { reg: 14.00, renewal: 14.00 },
  me: { reg: 8.18, renewal: 8.18 },
  info: { reg: 10.11, renewal: 10.11 },
  xyz: { reg: 10.11, renewal: 10.11 },
  uk: { reg: 7.00, renewal: 7.00 },
  de: { reg: 5.49, renewal: 5.49 },
  eu: { reg: 5.49, renewal: 5.49 },
  nl: { reg: 6.49, renewal: 6.49 },
  fr: { reg: 7.49, renewal: 7.49 },
  it: { reg: 7.49, renewal: 7.49 },
  es: { reg: 7.49, renewal: 7.49 },
  ca: { reg: 11.50, renewal: 11.50 },
  us: { reg: 6.50, renewal: 6.50 },
  tv: { reg: 29.00, renewal: 29.00 },
  cc: { reg: 9.95, renewal: 9.95 },
  biz: { reg: 10.11, renewal: 10.11 },
};

function extractPrice(text) {
  const compact = text.replace(/,/g, '');
  const match = compact.match(/\$(\d+\.?\d*)/);
  if (match) {
    const v = parseFloat(match[1]);
    if (v >= 0.01 && v < 50000) return v;
  }
  return null;
}

async function fetchPrices(domain, tld) {
  const results = [];
  
  // ── Source 1: tld-list.com via Jina Reader (bypasses bot blocking) ──
  try {
    const url = `https://r.jina.ai/https://tld-list.com/tld/${tld}`;
    const resp = await fetch(url, {
      headers: {
        'Accept': 'text/html',
        'X-Return-Format': 'html',
      },
      signal: AbortSignal.timeout(30000)
    });
    
    if (resp.ok) {
      const html = await resp.text();
      const $ = cheerio.load(html);
      
      $('#registrars-table tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 7) return;
        
        const name = $(cells[0]).find("span[itemprop='name']").text().trim();
        if (!name) return;
        
        const goLink = $(cells[0]).find("a[itemprop='url']").attr('href');
        const regHtml = $(cells[1]).html() || '';
        const renewHtml = $(cells[2]).html() || '';
        const transferHtml = $(cells[3]).html() || '';
        const whoisHtml = $(cells[4]).html() || '';
        
        const regPrice = extractPrice(regHtml);
        const renewalPrice = extractPrice(renewHtml);
        const transferPrice = extractPrice(transferHtml);
        const whoisPrice = extractPrice(whoisHtml);
        
        const whoisFree = (whoisPrice !== null && whoisPrice < 0.01) ||
          whoisHtml.toLowerCase().includes('free') ||
          whoisHtml.includes('$0.00');
        
        // Check features list for WHOIS
        const features = [];
        $(cells[6]).find('ul.feature-list li').each((_, li) => {
          features.push($(li).text().trim());
        });
        const whoisInFeatures = features.some(f => f.toLowerCase().includes('whois'));
        
        // Extract promo code
        let promo = null;
        const promoMatch = regHtml.match(/Promo code.*?<strong>(.*?)<\/strong>/);
        if (promoMatch) promo = promoMatch[1].trim();
        
        const purchaseUrl = goLink 
          ? (goLink.startsWith('http') ? goLink : `https://tld-list.com${goLink}`)
          : registrarPurchaseUrl(name, domain);
        
        if (regPrice !== null) {
          results.push({
            registrar: name,
            regPrice,
            renewalPrice,
            transferPrice,
            currency: 'USD',
            purchaseUrl,
            promoCode: promo,
            whoisPrivacyFree: whoisFree || whoisInFeatures,
            score3y: regPrice + (renewalPrice || regPrice) * 2,
            source: 'tld-list'
          });
        }
      });
    }
  } catch (e) {
    console.error('tld-list scrape error:', e.message);
  }

  // ── Source 2: Cloudflare hardcoded prices ──
  const cfPrice = CLOUDFLARE_PRICES[tld];
  if (cfPrice) {
    // Check if Cloudflare is already in results from tld-list
    const hasCF = results.some(r => r.registrar.toLowerCase().includes('cloudflare'));
    if (!hasCF) {
      results.push({
        registrar: 'Cloudflare',
        regPrice: cfPrice.reg,
        renewalPrice: cfPrice.renewal,
        transferPrice: cfPrice.reg,
        currency: 'USD',
        purchaseUrl: 'https://www.cloudflare.com/products/registrar/',
        promoCode: null,
        whoisPrivacyFree: true,
        score3y: cfPrice.reg + cfPrice.renewal * 2,
        source: 'cloudflare'
      });
    }
  }

  // Sort by registration price
  results.sort((a, b) => a.regPrice - b.regPrice);
  
  return {
    domain,
    tld,
    registrars: results,
    total: results.length,
    cachedAt: new Date().toISOString()
  };
}

module.exports = { checkDNS, lookupRDAP, lookupDNSRecords, lookupSSL, fetchPrices };
