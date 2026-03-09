const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const path = require('path');
const { checkDNS, lookupRDAP, lookupDNSRecords, lookupSSL, fetchPrices, generateAlternatives, multiTldScan, aiSuggest, getTrending } = require('./services');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (Railway / Cloudflare)
app.set('trust proxy', 1);

// Cache: 6hr for prices, 5min for DNS/WHOIS
const priceCache = new NodeCache({ stdTTL: 21600 });
const dnsCache = new NodeCache({ stdTTL: 300 });
const trendingCache = new NodeCache({ stdTTL: 3600 }); // 1hr cache for trending

// Security headers (helmet closes 7 findings at once)
app.use(helmet({
  contentSecurityPolicy: false, // disabled so inline scripts in index.html work
  crossOriginEmbedderPolicy: false
}));

// CORS — allow all origins (public API) but restrict methods
app.use(cors({ methods: ['GET'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '10kb' }));

// Input validation helper
function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  if (domain.length > 253) return false;
  // Allow only valid domain characters
  return /^[a-zA-Z0-9][a-zA-Z0-9\-\.]{0,251}[a-zA-Z0-9]$/.test(domain);
}

function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length > 100) return false;
  return /^[a-zA-Z0-9\-]+$/.test(name);
}

function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.slice(0, 500).replace(/[<>"']/g, '');
}

// Rate limiting — fix: use req.ip directly (trust proxy already set)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many requests, try again in a minute' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limiter for AI endpoint
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  message: { error: 'AI suggestions limited to 5/minute' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

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
    if (!validateDomain(domain)) return res.status(400).json({ error: 'Invalid domain format' });

    const cacheKey = `check:${domain.toLowerCase()}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await checkDNS(domain.toLowerCase());
    dnsCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    console.error('/api/check error:', e.message);
    res.status(500).json({ error: 'Domain check failed' });
  }
});

// ── API: WHOIS/RDAP lookup ──
app.get('/api/whois', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'domain parameter required' });
    if (!validateDomain(domain)) return res.status(400).json({ error: 'Invalid domain format' });

    const cacheKey = `whois:${domain.toLowerCase()}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await lookupRDAP(domain.toLowerCase());
    dnsCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    console.error('/api/whois error:', e.message);
    res.status(500).json({ error: 'WHOIS lookup failed' });
  }
});

// ── API: DNS records ──
app.get('/api/dns', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'domain parameter required' });
    if (!validateDomain(domain)) return res.status(400).json({ error: 'Invalid domain format' });

    const cacheKey = `dns:${domain.toLowerCase()}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await lookupDNSRecords(domain.toLowerCase());
    dnsCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    console.error('/api/dns error:', e.message);
    res.status(500).json({ error: 'DNS lookup failed' });
  }
});

// ── API: SSL certificate info ──
app.get('/api/ssl', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'domain parameter required' });
    if (!validateDomain(domain)) return res.status(400).json({ error: 'Invalid domain format' });

    const cacheKey = `ssl:${domain.toLowerCase()}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await lookupSSL(domain.toLowerCase());
    dnsCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    console.error('/api/ssl error:', e.message);
    res.status(500).json({ error: 'SSL lookup failed' });
  }
});

// ── API: Price comparison ──
app.get('/api/prices', async (req, res) => {
  try {
    const { domain, tld } = req.query;
    const searchTld = tld || (domain ? domain.split('.').slice(1).join('.') : null);
    const searchDomain = domain || `example.${searchTld || 'com'}`;
    if (!searchTld && !domain) return res.status(400).json({ error: 'domain or tld parameter required' });
    if (domain && !validateDomain(domain)) return res.status(400).json({ error: 'Invalid domain format' });

    // Cache by full domain (not just TLD) — purchaseUrls are domain-specific
    const cacheKey = `prices:${searchDomain.toLowerCase()}`;
    const cached = priceCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await fetchPrices(searchDomain.toLowerCase(), searchTld || searchDomain.split('.').slice(1).join('.'));
    priceCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    console.error('/api/prices error:', e.message);
    res.status(500).json({ error: 'Price lookup failed' });
  }
});

// ── API: Multi-TLD scan (search across many extensions) ──
app.get('/api/scan', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'name parameter required' });
    if (!validateName(name)) return res.status(400).json({ error: 'Invalid name — use letters, numbers, hyphens only (max 100 chars)' });

    const cacheKey = `scan:${name.toLowerCase()}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await multiTldScan(name.toLowerCase());
    dnsCache.set(cacheKey, result, 600); // 10min cache
    res.json(result);
  } catch (e) {
    console.error('/api/scan error:', e.message);
    res.status(500).json({ error: 'Domain scan failed' });
  }
});

// ── API: AI domain name suggestions ──
app.get('/api/suggest', aiLimiter, async (req, res) => {
  try {
    const { q, count } = req.query;
    if (!q) return res.status(400).json({ error: 'q (description) parameter required' });
    const cleanQ = sanitizeText(q);
    if (!cleanQ) return res.status(400).json({ error: 'Invalid query' });

    const cacheKey = `suggest:${cleanQ}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await aiSuggest(cleanQ, parseInt(count) || 12);
    if (!result.error) dnsCache.set(cacheKey, result, 1800); // 30min cache
    res.json(result);
  } catch (e) {
    console.error('/api/suggest error:', e.message);
    res.status(500).json({ error: 'AI suggestion failed' });
  }
});

// ── API: Trending domains ──
app.get('/api/trending', async (req, res) => {
  try {
    const cacheKey = 'trending:global';
    const cached = trendingCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await getTrending();
    trendingCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    console.error('/api/trending error:', e.message);
    res.status(500).json({ error: 'Trending fetch failed' });
  }
});

// ── API: Smart alternatives when domain is taken ──
app.get('/api/alternatives', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'domain parameter required' });
    if (!validateDomain(domain)) return res.status(400).json({ error: 'Invalid domain format' });

    const cacheKey = `alts:${domain.toLowerCase()}`;
    const cached = dnsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await generateAlternatives(domain.toLowerCase());
    dnsCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    console.error('/api/alternatives error:', e.message);
    res.status(500).json({ error: 'Alternatives lookup failed' });
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
