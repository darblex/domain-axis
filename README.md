# 🌐 Domain Axis

**Free Domain Intelligence Platform** — Compare prices across 50+ registrars, check availability, WHOIS, DNS & SSL.

## Features

- 💰 **Price Comparison** — Live prices from 50+ registrars via tld-list.com + Cloudflare
- ✅ **Availability Check** — DNS-based availability verification
- 📋 **WHOIS Lookup** — Full RDAP domain registration info
- 🔍 **DNS Records** — A, AAAA, MX, NS, TXT, CNAME, SOA
- 🔒 **SSL Certificates** — Certificate transparency logs via crt.sh
- 🌙 **Dark/Light Mode**
- 🇮🇱 **Hebrew + English**
- 📱 **Mobile Responsive**
- ⚡ **Cached** — 6hr price cache, 5min DNS cache
- 🆓 **100% Free** — No account needed

## Quick Start

```bash
npm install
npm start
# → http://localhost:3000
```

## Deploy to Railway

```bash
railway login
railway init
railway up
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/check?domain=x.com` | DNS availability check |
| `GET /api/prices?domain=x.com` | Price comparison (50+ registrars) |
| `GET /api/whois?domain=x.com` | RDAP/WHOIS lookup |
| `GET /api/dns?domain=x.com` | Full DNS records |
| `GET /api/ssl?domain=x.com` | SSL certificate info |
| `GET /health` | Health check |

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/JS/CSS (single file)
- **Data:** tld-list.com, DNS over HTTPS, RDAP, crt.sh
- **Hosting:** Railway (free tier)

## License

MIT
