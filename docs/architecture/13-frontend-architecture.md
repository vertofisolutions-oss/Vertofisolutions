# 13 — Frontend Architecture

**Next.js 15** (App Router) + TypeScript + Tailwind + Framer Motion. Web-only (no mobile app). Server Components + streaming + Suspense for fast, progressive loads; WebSockets for real-time (MoneyMap, reconciliation feed, notifications). Target **95+ Lighthouse**, WCAG accessibility.

## Monorepo layout (frontend portion)
```
apps/
  web-landing/        # marketing site + Services dropdown → panels
  web-business/       # Vertofi for Business (client product) — app.vertofi
  web-admin/          # Admin panel
  web-associates/     # Associates (CA/CMA/…) panel
  web-accountants/    # Accountant sub-panel
  web-teams/          # Teams panel
  web-bhs/            # BHS Intelligence panel
  web-legal/          # Legal Services panel
packages/
  ui/                 # design system: tokens, Card, Button, DataGrid, Badge, MoneyMap, charts
  api-client/         # typed client generated from OpenAPI
  auth-client/        # OTP/MFA flows, token refresh, session
  realtime/           # WebSocket hooks
  config/             # tailwind preset, eslint, tsconfig
```
Panels can be separate apps or route groups within one app behind subdomains — decision: **separate Next.js apps sharing `packages/`** for blast-radius isolation and independent deploys.

## Patterns
- **Auth:** middleware guards every route; tokens via httpOnly cookies; role/scope from JWT drives which panel + which UI affordances render. Server Components fetch with the user's scoped token → RLS does the rest.
- **Data fetching:** Server Components for initial render; client components + SWR/React Query for live data; mutations through the typed `api-client` with idempotency keys.
- **Real-time:** `realtime` package subscribes to user/org channels (notifications, reconciliation status, MoneyMap deltas, daily push).
- **Empty states first-class:** any feature whose connector is `NEEDS_CREDENTIALS` renders a designed empty/onboarding state (never fake data) — see [09](./09-integrations-and-connectors.md).
- **Plan gating:** UI reads plan from session; locked features show the gold premium upsell card.
- **Forms:** the 3-stage onboarding ([07](./07-onboarding-flow.md)) with autosave, resume, progress, document upload (presigned S3) + live extraction confidence badges.
- **Design system:** all visuals from `packages/ui` implementing tokens in [12](./12-ui-design-system.md). No ad-hoc styles.

## Performance
- Edge rendering for landing + cacheable shells; streaming dashboards; route-level code splitting; image optimization; dashboard aggregates served from Redis-cached API.
- Optimistic UI for quick actions; Suspense skeletons styled as cards.
