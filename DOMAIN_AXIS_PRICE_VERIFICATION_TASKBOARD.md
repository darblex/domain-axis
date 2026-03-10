# Domain Axis — Price Verification + Wider Registrar Coverage

## Objective
Fix the current mismatch between displayed domain prices and actual checkout prices, and expand Domain Axis to scan many more domain registrars/sites without rewriting the app.

## User Intent
- Build on the current files to avoid wasting tokens
- Use the full team of agents
- Prioritize real/checkout-near pricing over pretty but misleading pricing
- Expand registrar/site coverage significantly

## Current Problem
Current pricing is largely derived from tld-list.com + a small set of hardcoded values. This can differ from the real price the user sees after clicking through, because of:
- first-year promo bait
- cart/checkout-only discounts
- geo/currency differences
- transfer-vs-register confusion
- renewal mismatches
- stale scraped values

## Reuse-First Constraint
Keep and evolve:
- server.js
- services.js
- public/index.html

Avoid rewrites unless absolutely necessary.

## Team Workstreams

### 1) Research / Source Audit
- Audit current pricing pipeline and identify why displayed prices diverge from real checkout prices
- Identify registrar classes:
  - directly verifiable
  - semi-verifiable
  - unreliable/marketing-only
- Identify more registrars worth adding
- Recommend trust/confidence model

### 2) Spec / Architecture
- Design a reuse-first verified pricing pipeline
- Add source confidence / verification state / labels
- Define fallback strategy when real verification is not possible
- Define data model changes with minimal disruption

### 3) Build / Implementation
Implement directly in code, focusing on:
- richer registrar/source model
- more registrar templates/sources
- price confidence/verification labels
- UI warnings for promo/estimated/unverified prices
- better sorting/ranking with confidence awareness
- more registrars if feasible

### 4) QA / Review
- Test sample domains across multiple TLDs
- Compare displayed price vs clickthrough intent / known source pages
- Review for regressions
- Review mobile/RTL
- Review Railway deploy safety

## Output Files
- DOMAIN_AXIS_PRICE_VERIFICATION_NOTES.md
- in-place code changes in current repo

## Acceptance Criteria
- App clearly distinguishes verified vs estimated vs promo pricing
- Users are less likely to see a displayed number that feels like a lie after clickthrough
- Registrar coverage is meaningfully expanded
- Existing core flows still work
