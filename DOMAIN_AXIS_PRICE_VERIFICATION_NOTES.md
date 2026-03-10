# Domain Axis — Price Verification Notes

## Implemented Changes
- Added a price confidence model (verified/estimated/promo/unverified) with reasons, injected into API responses and confidence-aware sorting instead of raw first-year price sorting.
- Updated the UI with confidence badges, legend, promo/renewal risk messaging, and manual-check registrar cards sourced from verified link checks to expand coverage without faking prices.
- Axis Score now penalizes low-confidence and promo-heavy entries; pills and summary reflect priced vs manual coverage for clearer trust signals.
