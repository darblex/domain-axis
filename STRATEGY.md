# 🌐 DOMAIN AXIS — Master Plan v2
## "The World's Best Free Domain Intelligence Platform"

---

## 🎯 Vision
פלטפורמת חיפוש דומיינים #1 בעולם — **100% חינמית**, מבוססת AI, עם כל מה שהמתחרים גובים עליו כסף.

---

## 🆓 Free-Only Tech Stack

### Domain Data (חינם לגמרי)
| פיצ'ר | מקור חינמי | איך |
|--------|-----------|------|
| זמינות דומיין | DNS over HTTPS (Cloudflare/Google) | `dns.google/resolve?name=x.com` — 0 cost |
| WHOIS/RDAP | RDAP Protocol | `rdap.org/domain/x.com` — public, free, unlimited |
| מחירי רגיסטרארים | tld-list.com via Jina Reader | כבר עובד ב-Rust tool |
| מחירי Cloudflare | Cloudflare API (public pricing) | Hardcoded + periodic scrape |
| DNS Records | DNS over HTTPS | A, AAAA, MX, NS, TXT — חינם |
| SSL Info | crt.sh API | Certificate transparency logs — חינם |
| Domain Age | RDAP creation date | כלול ב-RDAP response |

### AI Features (חינם)
| פיצ'ר | מקור חינמי | מגבלות |
|--------|-----------|--------|
| AI Name Suggestions | Ollama (local) / Groq Free Tier | Groq: 30 req/min, Llama 3.3 70B |
| Brand Scoring | Custom algorithm (no API needed) | Length + pronounceability + patterns |
| SEO Keywords | Google Autocomplete (public) | Unlimited, no key needed |
| Trademark Check | USPTO TSDR API (public) | Free, rate limited |
| Similar Names | Levenshtein + phonetic algorithms | Pure JS, no API |

### Social Handle Checks (חינם)
| פלטפורמה | Method | Cost |
|-----------|--------|------|
| Twitter/X | `twitter.com/[name]` → check HTTP status | Free |
| Instagram | `instagram.com/[name]` → check response | Free |
| GitHub | `api.github.com/users/[name]` → 60 req/hr | Free |
| TikTok | `tiktok.com/@[name]` → check status | Free |
| Reddit | `reddit.com/user/[name]/about.json` | Free |
| YouTube | `youtube.com/@[name]` → check status | Free |

### Infrastructure (חינם)
| שכבה | טכנולוגיה | עלות |
|-------|-----------|------|
| Frontend | Static HTML/JS (single file) | $0 |
| Backend | Node.js on Railway | Free tier (500 hrs/mo) |
| Database | SQLite (file-based) | $0 |
| Cache | In-memory (Map/LRU) | $0 |
| CDN | Cloudflare Free | $0 |
| Domain | TBD | ~$10/yr only cost |
| Git | GitHub Free | $0 |
| AI Local | Ollama / Groq Free | $0 |
| Analytics | Plausible Community / Umami | $0 (self-host) |

**Total Monthly Cost: $0** (חוץ מדומיין ~$10/שנה)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  Static HTML/JS/CSS — Hosted on Railway/CF Pages │
│                                                   │
│  ┌─────────┐ ┌──────────┐ ┌─────────────────┐   │
│  │ Search  │ │ AI Chat  │ │ Price Compare   │   │
│  │  Bar    │ │ Assistant│ │ Dashboard       │   │
│  └────┬────┘ └────┬─────┘ └───────┬─────────┘   │
│       │           │               │               │
└───────┼───────────┼───────────────┼───────────────┘
        │           │               │
        ▼           ▼               ▼
┌─────────────────────────────────────────────────┐
│                 BACKEND API                       │
│           Node.js + Express (Railway)             │
│                                                   │
│  /api/check     → DNS + RDAP availability        │
│  /api/prices    → tld-list scrape + cache        │
│  /api/suggest   → AI name generation (Groq)      │
│  /api/score     → Brand scoring algorithm        │
│  /api/social    → Handle availability check      │
│  /api/whois     → RDAP lookup                    │
│  /api/trademark → USPTO TSDR search              │
│  /api/value     → Domain valuation algorithm     │
│  /api/ssl       → crt.sh certificate info        │
│  /api/dns       → Full DNS record lookup         │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ In-Memory│  │  SQLite  │  │  Groq AI │       │
│  │  Cache   │  │ (prices, │  │  (free)  │       │
│  │ (6hr TTL)│  │  history)│  │          │       │
│  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────┘
```

---

## 📋 Phase 1: "Rock Solid Foundation" (שבוע 1-2)

### 1.1 Backend API Server
```
domain-axis/
├── server.js              # Express server
├── package.json
├── Dockerfile
├── .env.example
├── db/
│   └── prices.sqlite      # Cached prices DB
├── routes/
│   ├── check.js           # Domain availability
│   ├── prices.js          # Price comparison
│   ├── whois.js           # RDAP/WHOIS lookup
│   ├── dns.js             # DNS records
│   └── ssl.js             # SSL/cert info
├── services/
│   ├── dns-checker.js     # DNS over HTTPS
│   ├── rdap-client.js     # RDAP protocol
│   ├── price-scraper.js   # tld-list.com scraper
│   ├── cache.js           # In-memory LRU cache
│   └── tld-data.js        # Static TLD/registrar data
└── public/
    └── index.html          # Frontend (upgraded)
```

### 1.2 Core Features
- [ ] **Availability Check** — DNS over HTTPS (Google + Cloudflare dual check)
- [ ] **Price Engine** — Scrape tld-list.com, cache 6 hours, 50+ registrars
- [ ] **WHOIS/RDAP** — Full domain info (creation, expiry, registrar, nameservers)
- [ ] **DNS Lookup** — A, AAAA, MX, NS, TXT, CNAME records
- [ ] **SSL Check** — Certificate info via crt.sh
- [ ] **Price Compare Table** — Sort by price/renewal/3yr, "Best Deal" badge
- [ ] **Direct Buy Links** — Affiliate-ready URLs to 20+ registrars
- [ ] **Bulk Check** — Check 50 TLDs simultaneously
- [ ] **URL Sharing** — `domainaxis.com/?d=coolname`

### 1.3 Frontend Upgrade
- [ ] Mobile-first responsive design
- [ ] Dark/Light theme toggle
- [ ] Instant search (debounced, 300ms)
- [ ] Loading skeletons
- [ ] i18n: Hebrew + English
- [ ] PWA manifest + service worker
- [ ] Keyboard shortcuts (Enter = search, Tab = navigate results)

### 1.4 Deploy
- [ ] GitHub repo → Railway auto-deploy
- [ ] Custom domain setup
- [ ] Cloudflare DNS + CDN (free tier)
- [ ] Health check endpoint

---

## 📋 Phase 2: "AI Brain" (שבוע 3-4)

### 2.1 AI Domain Name Generator (FREE via Groq)
```
User: "אפליקציית כושר לאמהות עסוקות"
↓
Groq API (Llama 3.3 70B) — FREE
↓
Results:
┌─────────────────────────────────────────┐
│ 🏆 fitmama.com        Score: 92  $8.99 │
│ 💡 momstrong.io       Score: 87  $3.99 │  
│ ✨ busymomfit.com     Score: 84  $9.99 │
│ 🎯 mamaflex.co        Score: 81  $2.99 │
│ 💪 fitbusy.com        Score: 79  $8.99 │
└─────────────────────────────────────────┘
Each with: availability ✓/✗, prices, score breakdown
```

**Groq Free Tier:**
- 30 requests/minute
- 14,400 requests/day (8 hrs)
- Llama 3.3 70B — powerful enough for name generation
- No credit card needed

### 2.2 Smart Brand Score (No API — Pure Algorithm)
```javascript
function brandScore(domain) {
  let score = 100;
  
  // Length (shorter = better)
  if (name.length > 15) score -= 30;
  else if (name.length > 10) score -= 15;
  else if (name.length <= 6) score += 10;
  
  // Pronounceability (consonant/vowel ratio)
  const ratio = vowels(name) / consonants(name);
  if (ratio < 0.2 || ratio > 0.8) score -= 20;
  
  // No numbers or hyphens
  if (/[-\d]/.test(name)) score -= 25;
  
  // Dictionary word bonus
  if (isDictionaryWord(name)) score += 15;
  
  // Double letters penalty
  if (/(.)\1{2}/.test(name)) score -= 10;
  
  // Common TLD bonus
  if (['.com','.io','.co','.dev'].includes(tld)) score += 10;
  
  // Typo safety (keyboard distance analysis)
  score -= typoRisk(name) * 5;
  
  return Math.max(0, Math.min(100, score));
}
```

### 2.3 Social Handle Checker (Free — HTTP checks)
```
coolname → Check all platforms simultaneously:
  Twitter:   ✅ Available  (@coolname)
  Instagram: ❌ Taken       
  GitHub:    ✅ Available  (github.com/coolname)
  TikTok:    ✅ Available  (@coolname)
  Reddit:    ✅ Available  (u/coolname)
  YouTube:   ❌ Taken
```
**Method:** Server-side HEAD/GET requests via backend proxy (avoids CORS)

### 2.4 Trademark Quick Check (Free — USPTO)
```
coolname → USPTO TSDR API (free, public)
  ⚠️ "CoolName" — registered trademark (Class 9: Software)
  ✅ "coolname" in Class 25 — not registered
```

### 2.5 Domain Value Estimator (Free — Algorithm)
```javascript
function estimateValue(domain) {
  let value = 0;
  
  // Base: TLD value
  const tldValues = { '.com': 500, '.io': 200, '.co': 150, '.net': 100 };
  value += tldValues[tld] || 50;
  
  // Length multiplier
  if (name.length <= 3) value *= 50;      // 3-letter = premium
  else if (name.length <= 4) value *= 20;
  else if (name.length <= 5) value *= 8;
  else if (name.length <= 7) value *= 3;
  else if (name.length <= 10) value *= 1.5;
  
  // Dictionary word multiplier
  if (isDictionaryWord(name)) value *= 5;
  
  // Keyword search volume (Google Autocomplete)
  if (hasHighSearchVolume(name)) value *= 3;
  
  // Age bonus (RDAP data)
  if (domainAge > 10) value *= 2;
  
  return { low: value * 0.5, mid: value, high: value * 2 };
}
```

### 2.6 AI Chat Assistant (Free via Groq)
```
┌─────────────────────────────────────────┐
│ 💬 Domain Axis AI Assistant             │
│─────────────────────────────────────────│
│                                         │
│ 🤖 Hi! Tell me about your project and  │
│    I'll help you find the perfect name. │
│                                         │
│ 👤 I'm building a food delivery app     │
│    for Tel Aviv, targeting young people │
│                                         │
│ 🤖 Great! Here are my suggestions:     │
│                                         │
│ 1. 🏆 TLVeats.com — direct, local      │
│    Score: 88 | $9.99 | ✅ Available     │
│                                         │
│ 2. 💡 Foodash.co — short, catchy        │
│    Score: 91 | $2.99 | ✅ Available     │
│                                         │
│ Want me to check social handles for     │
│ any of these? Or try different vibes?   │
│                                         │
│ [Type your message...]          [Send]  │
└─────────────────────────────────────────┘
```

---

## 📋 Phase 3: "Growth Machine" (שבוע 5-8)

### 3.1 User Features (No Login Required)
- [ ] **Favorites** — localStorage, export/import JSON
- [ ] **Search History** — last 50 searches, localStorage
- [ ] **Compare Mode** — side-by-side domain comparison (up to 4)
- [ ] **Share Results** — Copy link / share to WhatsApp/Telegram
- [ ] **CSV/JSON Export** — Download price comparison data

### 3.2 Advanced Tools
- [ ] **Bulk Domain Checker** — Upload CSV of names, check all at once
- [ ] **Domain Expiry Monitor** — Check when any domain expires (RDAP)
- [ ] **DNS Propagation Checker** — Check DNS from multiple global resolvers
- [ ] **Website Tech Stack** — Detect CMS/framework via HTTP headers
- [ ] **Reverse WHOIS** — Find all domains by same registrant (RDAP)
- [ ] **Domain History** — Wayback Machine API (free, public)

### 3.3 Content & SEO (Free Traffic)
- [ ] **Trending TLDs** — Weekly auto-generated page
- [ ] **Price Comparison Pages** — ".com prices 2026" (SEO bait)
- [ ] **Domain Tips Blog** — AI-generated (Groq), human-reviewed
- [ ] **"Domain of the Day"** — Auto-picked interesting available domain
- [ ] **Registrar Reviews** — Community-driven

### 3.4 Monetization (100% Passive)
```
Revenue Streams (All Free to Implement):

1. Affiliate Links (passive)
   ├── Namecheap: 20-35% commission per sale
   ├── Porkbun: up to $10/domain
   ├── Cloudflare: referral program
   ├── Dynadot: $5/referral
   ├── Spaceship: revenue share
   └── Est. Revenue: $500-2000/mo at 10K users

2. Google AdSense (passive)
   ├── "Domain" keywords = high CPC ($2-5)
   ├── Tasteful placement (footer/sidebar only)
   └── Est. Revenue: $200-500/mo at 10K users

3. Donations / Sponsors
   ├── GitHub Sponsors
   ├── Buy Me a Coffee
   └── "Sponsored by [Registrar]" badge
```

### 3.5 PWA & Mobile
- [ ] Full PWA (installable, offline-capable)
- [ ] Push notifications (domain watchlist alerts)
- [ ] Native-feel transitions
- [ ] Share target (share domain name from any app)

---

## 📋 Phase 4: "Platform" (שבוע 9-12)

### 4.1 API for Developers (Free Tier)
```
GET /api/v1/check?domain=example.com
GET /api/v1/suggest?q=fitness+app&limit=10
GET /api/v1/prices?tld=.com
GET /api/v1/whois?domain=example.com
GET /api/v1/score?name=coolbrand

Rate Limits (free):
- Anonymous: 30 req/hour
- With API key (free signup): 200 req/hour
- Future paid tier: unlimited
```

### 4.2 Localization
- [ ] 🇮🇱 Hebrew (RTL, primary)
- [ ] 🇺🇸 English (global)
- [ ] 🇸🇦 Arabic (RTL)
- [ ] 🇷🇺 Russian
- [ ] 🇪🇸 Spanish
- [ ] Auto-detect from browser `navigator.language`

### 4.3 Community Features
- [ ] Upvote/downvote domain suggestions
- [ ] User-submitted name ideas
- [ ] Registrar rating system
- [ ] Domain marketplace links (Afternic, Sedo, Dan.com)

### 4.4 Integrations
- [ ] Chrome Extension — Right-click any word → check as domain
- [ ] Telegram Bot — `/check coolname` → instant results
- [ ] Slack App — `/domain suggest fitness app`
- [ ] Raycast Extension (macOS power users)
- [ ] Alfred Workflow

---

## 🔥 Feature Matrix vs Competitors

| Feature | Domain Axis | GoDaddy | Namecheap | InstantDomain | TLD-List |
|---------|:-----------:|:-------:|:---------:|:-------------:|:--------:|
| Price Compare (50+ registrars) | ✅ | ❌ | ❌ | ❌ | ✅ |
| AI Name Suggestions | ✅ | ❌ | ❌ | ❌ | ❌ |
| Brand Score | ✅ | ❌ | ❌ | ❌ | ❌ |
| Social Handle Check | ✅ | ❌ | ❌ | ❌ | ❌ |
| Trademark Check | ✅ | ❌ | ❌ | ❌ | ❌ |
| Domain Valuation | ✅ | 💰 | ❌ | ❌ | ❌ |
| WHOIS Lookup | ✅ | 💰 | ✅ | ❌ | ❌ |
| DNS Records | ✅ | ❌ | ❌ | ❌ | ❌ |
| AI Chat Assistant | ✅ | ❌ | ❌ | ❌ | ❌ |
| Bulk Check | ✅ | 💰 | 💰 | ❌ | ❌ |
| Hebrew UI | ✅ | ❌ | ❌ | ❌ | ❌ |
| 100% Free | ✅ | ❌ | ❌ | ✅ | ✅ |
| Open Source | ✅ | ❌ | ❌ | ❌ | ❌ |
| No Account Needed | ✅ | ❌ | ❌ | ✅ | ✅ |
| API Access | ✅ | 💰 | 💰 | ❌ | ❌ |
| Mobile PWA | ✅ | ❌ | ❌ | ✅ | ❌ |

**Legend:** ✅ = Free | 💰 = Paid | ❌ = Not available

---

## 🚀 Immediate Build Order

### Week 1: Backend + Core
```
Day 1-2: Express server + Railway deploy
  - /api/check (DNS availability)
  - /api/whois (RDAP lookup)
  - /api/dns (DNS records)
  - In-memory cache layer

Day 3-4: Price Engine
  - Port Rust tld-list logic to Node.js
  - Scrape + cache prices (6hr refresh)
  - 50+ registrars with buy links
  - /api/prices endpoint

Day 5-7: Frontend v2
  - Mobile-first redesign
  - Connect to backend APIs
  - Real-time availability checking
  - Price comparison table
  - Dark/Light mode
```

### Week 2: Polish + AI
```
Day 8-9: AI Integration
  - Groq API setup (free)
  - /api/suggest endpoint
  - AI Chat UI component

Day 10-11: Scoring + Social
  - Brand score algorithm
  - Social handle checker (backend proxy)
  - Domain value estimator

Day 12-14: Launch Prep
  - Custom domain
  - SEO meta tags
  - OpenGraph images
  - Performance optimization
  - Error handling + rate limiting
```

### Week 3-4: Growth
```
- Affiliate link integration
- Share functionality
- PWA setup
- Product Hunt prep
- Reddit/HN launch post draft
```

---

## 📊 Success Metrics

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Daily Users | 50 | 500 | 2,000 | 10,000 |
| Searches/Day | 200 | 2,000 | 10,000 | 50,000 |
| Affiliate Rev | $0 | $100/mo | $500/mo | $3,000/mo |
| API Users | 0 | 10 | 50 | 300 |
| GitHub Stars | 10 | 100 | 500 | 2,000 |
| Monthly Cost | $0 | $0 | $0 | $0* |

*\*May need Railway paid tier at 10K+ daily users (~$5/mo)*

---

## 🏆 Why Domain Axis Will Win

1. **Free-First** — כל מה שאחרים גובים עליו, אנחנו נותנים חינם
2. **AI-Powered** — אף מתחרה חינמי לא מציע AI naming + chat
3. **All-in-One** — pricing + availability + AI + social + trademark בכלי אחד
4. **Fast** — Edge-cached, instant results
5. **Beautiful** — UI ברמה של SaaS בתשלום
6. **Open Source** — קהילה + trust + contributions
7. **Hebrew-First** — שוק ישראלי ללא מתחרה ישיר
8. **No Account** — אפס חיכוך, פשוט תחפש
9. **Privacy** — zero tracking, zero cookies (except essential)
10. **Developer-Friendly** — Free API, good docs

---

*Plan v2 — Updated: 2026-03-09*
*Zero monthly cost. Maximum impact.*
*Built by Darblex + AI* 🚀
