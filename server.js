const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const path = require('path');
const { checkDNS, lookupRDAP, lookupDNSRecords, lookupSSL, fetchPrices } = require('./services');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (Railway / Cloudflare)
app.set('trust proxy', 1);

// Cache: 6hr for prices, 5min for DNS/WHOIS
const priceCache = new NodeCache({ stdTTL: 21600 });
const dnsCache = new NodeCache({ stdTTL: 300 });

app.use(cors());
app.use(express.json());

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  validate: { xForwardedForHeader: false },
  max: 100,
  message: { error: 'Too many requests, try again in a minute' }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), cache: { prices: priceCache.keys().length, dns: dnsCache.keys().length } });
});

// ── API: Check domain availability ──
app.get('/api/check', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'domain parameter required' });
    
    const cacheKey = `check:${domain}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await checkDNS(domain);
    dnsCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: WHOIS/RDAP lookup ──
app.get('/api/whois', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'domain parameter required' });
    
    const cacheKey = `whois:${domain}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await lookupRDAP(domain);
    dnsCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: DNS records ──
app.get('/api/dns', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'domain parameter required' });
    
    const cacheKey = `dns:${domain}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await lookupDNSRecords(domain);
    dnsCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: SSL certificate info ──
app.get('/api/ssl', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'domain parameter required' });
    
    const cacheKey = `ssl:${domain}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await lookupSSL(domain);
    dnsCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Price comparison ──
app.get('/api/prices', async (req, res) => {
  try {
    const { domain, tld } = req.query;
    const searchTld = tld || (domain ? domain.split('.').slice(1).join('.') : null);
    const searchDomain = domain || `example.${searchTld || 'com'}`;
    if (!searchTld && !domain) return res.status(400).json({ error: 'domain or tld parameter required' });

    const cacheKey = `prices:${searchTld || domain}`;
    const cached = priceCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await fetchPrices(searchDomain, searchTld || searchDomain.split('.').slice(1).join('.'));
    priceCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Domain Axis running on http://0.0.0.0:${PORT}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err.message);
  process.exit(1);
});
