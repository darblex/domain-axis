# Domain Axis V2 Taskboard

## Goal
Turn Domain Axis from a simple domain checker into a premium domain intelligence cockpit while reusing the existing codebase (`server.js`, `services.js`, `public/index.html`) to minimize token and engineering waste.

## Constraints
- Build on current files, not a rewrite
- Keep deployment path simple: GitHub first, then Railway
- Preserve working endpoints
- Improve UX, AI suggestions, compareability, and premium feel

## Workstreams

### 1. Product/Architecture
Owner: subagent-spec
- Define V2 scope that fits current architecture
- Prioritize features for immediate implementation vs later phases
- Produce implementation blueprint mapped to existing files

### 2. UX / Design
Owner: subagent-ui
- Redesign homepage and result experience inside existing `public/index.html`
- Add premium visual hierarchy, sections, cards, and state presentation
- Keep RTL/hebrew support strong

### 3. Feature Build
Owner: subagent-build
- Implement highest-value V2 features using current backend/frontend
- Focus on score/ranking, compare mode, richer result cards, smarter summaries

### 4. Review / QA
Owner: subagent-review
- Review changes for regressions
- Validate critical paths
- Produce final QA checklist and risks

## Required Outputs
- Updated code in-place in current repo
- Short implementation notes in `DOMAIN_AXIS_V2_NOTES.md`
- Clear commit-ready result
