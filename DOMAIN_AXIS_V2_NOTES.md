# QA Review Checklist

- Regressions & Core Endpoints
  - /api/check returns true/false/unknown correctly for NXDOMAIN vs NOERROR (A records), caches 5m, rejects invalid domains, and shows availability banner + alternatives trigger when taken.
  - /api/whois, /api/dns, /api/ssl respond within timeouts, respect validation, and render cards/tables without crashing on missing fields or empty responses.
  - SPA fallback still serves public/index.html for unknown routes; static assets served from /public.
  - Rate limits: 60 req/min global, 5/min for /api/suggest; confirm headers present and no accidental blocking of health checks.

- Data Correctness & Pricing Logic
  - /api/prices accepts domain or tld, derives TLD correctly, caches per full domain (purchase URLs differ), and returns sorted by regPrice ascending with score3y = reg + 2*renewal (or reg fallback).
  - tld-list scrape fields parse correctly (registrar names, prices, promo codes, WHOIS privacy flags); no $0 or NaN rows; currency consistently USD; purchaseUrl interpolates domain via registrarPurchaseUrl.
  - Cloudflare hardcoded prices appear once (no duplicate when scraped) and reflect current map; renewal/reg equal; price table shows best badge on cheapest row.
  - Multi-TLD scan cards show accurate availability vs taken vs unknown; price hints match CLOUDFLARE_PRICES; category filters work after multiple searches.
  - Alternatives list respects original domain, excludes duplicates, caps at 15, and labels type (tld vs variation) with correct cheapestPrice/tld.

- AI Summary/Generation Correctness
  - /api/suggest sanitizes q, enforces count <= expected, caches 30m, and surfaces API errors gracefully in UI; Groq key present in env or fallback works.
  - Suggestions list shows availability per extension consistent with checkDNS results; bestDeal and comAvailable flags align with badges; AI stats (total/available/comAvailable) match rendered cards.
  - Trending tiles render available/taken/unknown badges per extension and trigger searchDomain on click.

- RTL/Mobile/UX
  - Language toggle switches dir/language for all data-i18n labels, placeholders, and status badges; Hebrew strings render RTL without layout breakage.
  - Mobile: price table horizontal scroll works; hide-mobile columns collapse cleanly; search bar, tabs, scan grid, and alternatives grid remain readable; buttons accessible tap targets.
  - Theme toggle persists in localStorage and colors keep contrast in both modes (including badges, banners, spinners).
  - Empty/error states render for each panel (prices, whois, dns, ssl, AI) without JS errors after failed fetches.

- Railway Deploy Safety
  - Dockerfile + railway.json build/run node server.js on PORT env, trust proxy enabled; healthcheck /health returns JSON and cached counts.
  - No required secrets besides GROQ_API_KEY; .env.example aligns; app binds 0.0.0.0 and serves static files.
  - Rate limiting and helmet CORS settings compatible with Railway/Cloudflare; cached data TTLs (prices 6h, DNS 5m, trending 1h) acceptable for memory footprint on free tier.
  - Smoke test via `railway up` or `npm start` passes, /health and main page load, endpoints respond within timeouts.

# Implemented Changes
- Added helper chips and AI jump in the hero search bar, refreshed gradient input styling, and introduced homepage trust/“how it works” rows for a more premium pre-search experience.
- Injected a new result summary grid (best deal, 3-year leader, privacy-friendly pick, market snapshot) tied to availability status, displayed above the tab set.
- Introduced Axis Score for compare-friendly ranking: blended 3-year cost plus privacy/promo bonuses, sortable column with visual score bars.
- Enhanced price rendering with summary pills (best/avg), consistent price formatting, and score-aware badges; summary auto-updates after price fetch.
- UX polish: quick-fill buttons, AI scroll helper, availability-aware summary handling, and hiding the summary in scan mode to keep context tight.
