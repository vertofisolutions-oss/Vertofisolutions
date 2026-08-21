# Vertofi â€” Issues Report (Backend, Database, Architecture & Frontend)

**Date:** 2026-06-06 (updated 2026-06-07)
**Scope:** Backend services, database, microservices architecture, frontend apps, Vercel deployment pipeline.
**Verdict (short):** The architecture is *well-designed on paper* (microservices + outbox + RLS + Kafka + HPA), but in its **current configuration it will NOT cleanly handle thousands of concurrent users.** There are **4 critical backend blockers** (database connection exhaustion, an undersized single database, a broken/unscalable audit service, and non-distributed rate limiting) plus several high-severity issues. On the **frontend side, a series of deployment and routing issues were identified and fixed on 2026-06-06**. None of the backend issues are architectural dead-ends â€” all are fixable â€” but they must be fixed before a real load test or launch.

---

## 0. System map (what was reviewed)

| Layer | Implementation | Notes |
|---|---|---|
| Frontends | 8 Next.js apps on Vercel (`apps/web-*`) | Out of scale-path (Vercel scales fine) |
| API gateway | 1 Express service (`services/api-gateway`) | JWT verify, CORS, rate-limit, reverse-proxy to 28 route prefixes |
| Microservices | **32 NestJS/Express services** (`services/*`) | ~20 touch Postgres |
| Database | **Single** Cloud SQL Postgres 16, schema-per-service | `db-custom-2-7680` = 2 vCPU / 7.5 GB |
| Cache | Memorystore Redis 7.2 | Provisioned but **barely used** |
| Events | Kafka (Confluent Cloud prod / Redpanda dev), transactional outbox | KafkaJS producer/consumer |
| Storage | GCS bucket (S3-compatible) | |
| Orchestration | GKE Autopilot, Helm chart, HPA, PDB, NetworkPolicy | min 3 / max 30 replicas per service |
| Search | OpenSearch (dev only) | **Missing from prod Terraform** |
| DNS | Google Domains (Cloud DNS) | `*.vertofi.com` â†’ `cname.vercel-dns.com` |

Strong foundations already in place: transactional outbox (`packages/events/src/outbox.ts`), Postgres RLS tenant isolation (`packages/tenancy/src/rls.ts`), idempotent Kafka producer, DLQ on consumers, HPA + PodDisruptionBudget + topology spread + default-deny NetworkPolicies, Workload Identity + External Secrets. These are the right patterns. The problems below are about **configuration and a few correctness gaps**, not the blueprint.

---

## FRONTEND & DEPLOYMENT â€” Issues Addressed (2026-06-06)

> All items below were investigated, fixed, and committed. Deployment is pending Vercel rate-limit reset (ETA: 2026-06-07 ~06:00 IST). Code is correct at commit `8d12982`.

### FE-1. All panel subdomains returning 404 âœ… FIXED
**Severity: CRITICAL (production)** Â· Affected: all 8 panels

**Root cause:** Vercel project settings were misconfigured at the project level (via API/Dashboard):
- `buildCommand` was identical for all 8 projects â€” all were building the `admin` app
- `rootDirectory` was set to the repo root instead of `apps/<app-name>`
- This caused every panel to produce the *admin* build output, so `/login` and other routes were missing for 7 out of 8 panels

**Fix applied (`infra/fix-vercel-project-settings.js`):**
- Patched `buildCommand` to `cd ../.. && pnpm turbo run build --filter=@vertofi/<package>...` per project
- Patched `rootDirectory` to `apps/<app-name>` per project
- Updated all 8 `apps/*/vercel.json` to use `--no-frozen-lockfile` in `installCommand`
- Triggered clean git-based builds (commit `e4436de`)
- Re-aliased all 8 domains to fresh "Ready" deployments

**Domains now working:**
| Domain | Status |
|---|---|
| `vertofi.com` | âœ… Live |
| `associates.vertofi.com` | âœ… Live + branded login |
| `accountants.vertofi.com` | âœ… Live + branded login |
| `legal.vertofi.com` | âœ… Live + branded login |
| `bhs.vertofi.com` | âœ… Live + branded login |
| `business.vertofi.com` | âœ… Live + branded login |
| `admin.vertofi.com` | âœ… Live + branded login |
| `teams.vertofi.com` | âœ… Live + branded login |

---

### FE-2. Two-panel login UI missing from all panels âœ… FIXED
**Severity: HIGH** Â· Affected: `associates`, `accountants`, `legal`, `bhs`, `admin`, `business`, `teams`

All 6 non-business panels had bare, unstyled placeholder login pages with no branding, no UX structure, and no visual identity.

**Fix applied:**
- Implemented standardized two-panel login template across all panels
- Left panel: brand identity, gradient background, feature list, trusted-by logos
- Right panel: clean login form with email + password, proper field validation, links to terms/privacy
- Each panel has its own brand color, icon, and descriptive copy
- Installed `middleware.ts` auth-guard in all panels (redirects `/` â†’ `/login`)

---

### FE-3. `vertofi.com/bhs` â€” BHS Calculator page missing âœ… FIXED (pending deploy)
**Severity: HIGH** Â· `apps/web-landing/src/app/bhs/`

The "Check BHS Score" button in the landing nav existed but routed to `/register` on the business app instead of a dedicated calculator page.

**Fix applied (commit `6eea5d9`, `9ce4fcd`):**
- Created full 8-step BHS Score Assessment wizard at `/bhs`
- Pure mathematical scoring engine (no AI) across 7 financial dimensions
- Google Sheets integration (Apps Script webhook, fire-and-forget POST, no-cors)
- Live score preview during form fill, SVG score ring, detailed diagnostics per dimension
- Settings panel with setup guide, code snippet, and "Send Test Row" button
- Metadata moved to `layout.tsx` (fixes Next.js App Router client-component constraint)

**Fix applied (commit `8d12982`):**
- `links.checkBhs` in `apps/web-landing/src/lib/site.ts` corrected from `${BUSINESS_URL}/register` â†’ `/bhs`
- Both desktop nav and mobile menu now route correctly

**Status:** â³ Awaiting Vercel rate-limit reset â€” code verified locally (`pnpm turbo run build` passes, `/bhs` renders at 9.83 kB)

---

### FE-4. Vercel daily deployment rate limit exhausted âš ï¸ TEMPORARY
**Severity: MEDIUM (operational)** Â· Vercel Hobby plan cap

**Root cause:** Extensive debugging today (canceling + retrying builds across 8 projects) consumed all 100 deployments of the Vercel free tier in a single day.

**Current state:**
- All 8 projects show `"Deployment rate limited â€” retry in 24 hours"`
- All code fixes are committed and correct (`8d12982` on `main`)
- Pending GitHub webhook deployments will fire automatically on rate-limit reset

**Recommended action:**
- Short-term: Wait for reset (~24h from first deploy of the day)
- Long-term: Upgrade to Vercel Pro ($20/month, 3,000 deployments/day) to avoid this in future debug sessions
- Process fix: Run `pnpm turbo run build --filter=@vertofi/<app>` locally before pushing to avoid wasted deployment slots

---

### FE-5. CI build failure â€” `export metadata` in client component âœ… FIXED
**Severity: MEDIUM** Â· `apps/web-landing/src/app/bhs/page.tsx`

Initial BHS page commit (`6eea5d9`) exported `metadata` directly from a `"use client"` component, which is illegal in Next.js App Router and caused the `@vertofi/web-landing#build` CI job to fail.

**Fix applied (commit `9ce4fcd`):**
- Created `apps/web-landing/src/app/bhs/layout.tsx` to export `metadata` as a Server Component
- Removed `export const metadata` from `page.tsx`
- Cleaned up unused lucide-react imports (`ShieldCheck`, `TrendingUp`, `Building`, etc.)
- Local build now passes cleanly: `âœ“ Compiled successfully`, all 13 routes generate

---

## 1. CRITICAL backend issues (block "thousands of users")

### C-1. Database connection exhaustion â€” no connection pooler ðŸ”´ OPEN
**Severity: CRITICAL** Â· `packages/nest-common/src/pg.service.ts`, `deploy/helm/vertofi-service/values.yaml`

Every service opens its own `pg.Pool` with `max = DB_POOL_MAX ?? 20`. The Helm default is `minReplicas: 3`, `maxReplicas: 30`.

Connection math against a **single** Postgres instance:
- Baseline (min replicas): ~20 DB-touching services Ã— 3 replicas Ã— 20 conns = **~1,200 connections**.
- Under load (HPA scales DB services to even 10 replicas avg): 20 Ã— 10 Ã— 20 = **~4,000 connections**.

A Cloud SQL `db-custom-2-7680` (2 vCPU / 7.5 GB) defaults to roughly **400 max_connections**, and no `database_flags` override is set in `infra/terraform/main.tf`. **You exhaust the connection limit at the *minimum* replica count, before a single real user logs in.** New connections will be refused, readiness probes fail (see H-5), and the platform cascades down.

The `PgService` comment literally says "PgBouncer-friendly" but **no PgBouncer / connection pooler is deployed anywhere** (no reference in `infra/`, `deploy/helm`, or Terraform).

**Fix:**
- Deploy **PgBouncer in transaction-pooling mode** (sidecar per service, or a shared Deployment, or Cloud SQL's built-in pooler). Point `DATABASE_URL` at it.
- Set Postgres `max_connections` via `database_flags` to a sane value matched to RAM.
- Drop per-service `DB_POOL_MAX` to a small number (e.g. 5) once PgBouncer fronts the DB.
- **Note:** RLS uses per-transaction `SET LOCAL` GUCs (`set_config(..., true)`), which is **compatible** with PgBouncer transaction pooling. Good â€” this won't break tenant isolation.

---

### C-2. Single, undersized database is the whole-platform bottleneck ðŸ”´ OPEN
**Severity: CRITICAL** Â· `infra/terraform/main.tf`, `infra/terraform/variables.tf`

- **One** Cloud SQL instance hosts **all 32 service schemas** (`google_sql_database "vertofi"`). Every read/write in the entire platform funnels through 2 vCPU / 7.5 GB.
- `availability_type` is `ZONAL` unless `db_ha = true` (default not guaranteed REGIONAL) â†’ a zone outage takes the entire platform down.
- No read replicas. Reporting, benchmarks, BHS intelligence, and admin-console all do cross-tenant aggregate reads (`setSystemContext`) against the same primary that serves user writes.

**Fix:**
- Scale the instance up (8â€“16 vCPU range) **and** add **read replica(s)**; route analytics/reporting/benchmarks reads to replicas.
- Set `db_ha = true` (REGIONAL) for production.
- Plan the heavy aggregate consumers (benchmarks, bhs-intelligence, reporting) onto replicas or a separate analytics store.

---

### C-3. Audit service is correctness-broken AND cannot scale ðŸ”´ OPEN
**Severity: CRITICAL** Â· `services/audit/src/main.ts`, `deploy/helm/.../values.yaml`

The audit service maintains an **in-process** `let lastHash` to build a tamper-evident hash chain, consuming **every** domain topic in consumer group `audit-blackbox`.

Two problems collide:
1. The Helm default is `replicaCount: 3` / `autoscaling.minReplicas: 3`. Running **3 replicas in one consumer group** means Kafka splits partitions across all three. Each replica keeps its **own** `lastHash` â†’ **three divergent, conflicting hash chains** writing to the same `audit.audit_log` table. The hash chain (the entire point of the tamper-evidence feature) is **broken**, and there are races on ordering/`seq`.
2. Even at 1 replica, this is a **single serial writer for every event in the platform** â€” an inherent throughput bottleneck and single point of failure.

**Fix:**
- Pin audit to **exactly 1 replica** (or leader-elect) â€” set `replicaCount: 1`, `autoscaling.enabled: false`, and a single-partition audit topic, **or**
- Redesign the chain to be partition-local (one chain per partition/org) so it can scale, deriving `prev_hash` from the DB per partition key inside the insert transaction rather than from process memory.
- This must be fixed regardless of load â€” it is a *correctness* bug today.

---

### C-4. API-gateway rate limiting is in-memory, not distributed ðŸ”´ OPEN
**Severity: CRITICAL (for abuse protection at scale)** Â· `services/api-gateway/src/main.ts`

The gateway uses `express-rate-limit` with the **default in-memory store**. The code comment even admits: *"Redis-backed store added in prod"* â€” it was never added.

The gateway is HPA'd up to 30 replicas. With an in-memory store:
- The real limit becomes `limit Ã— replica_count` (each pod counts independently), so the configured 600/min effectively becomes 18,000/min at 30 pods â€” useless as a throttle.
- Limits are inconsistent and reset on every pod scale/restart.

At thousands of users this means **no effective protection against bursts/abuse**, and the DB (already constrained by C-1/C-2) takes the full brunt.

**Fix:** Add a Redis-backed store (`rate-limit-redis`) pointed at the already-provisioned Memorystore instance. This also finally puts Redis to use (see H-1).

---

## 2. HIGH-severity backend issues

### H-1. Memorystore Redis is provisioned but effectively unused ðŸ”´ OPEN
**Severity: HIGH** Â· `infra/terraform/main.tf`, code-wide grep

Redis is paid for (Standard HA tier when `db_ha`) but almost nothing uses it:
- Sessions live in `auth.sessions` (Postgres).
- OTP challenges live in `auth.otp_challenges` (Postgres).
- Rate limiting is in-memory (C-4).
- No read-through cache on hot endpoints â€” every `listCustomers`, ledger read, etc. hits Postgres.

**Fix:** Move to Redis: gateway rate limiting, OTP storage/throttling, session validation cache, and a short-TTL read cache for hot reference data (customers, products, grants/scope lookups).

---

### H-2. RLS path is connection- and round-trip-heavy ðŸ”´ OPEN
**Severity: HIGH** Â· `packages/tenancy/src/rls.ts`, `services/accounting/src/accounting.service.ts`

Every tenant request does: `pool.connect()` â†’ `BEGIN` â†’ `assertGrantedScope()` (a DB query) â†’ **4Ã— `set_config()`** round trips â†’ the actual query â†’ `COMMIT`. That's **6â€“8 DB round trips and a held pooled connection** per simple read.

**Fix:**
- Collapse the 4 `set_config` calls into a single round trip.
- Cache `assertGrantedScope` results in Redis (per principal+org, short TTL).
- Avoid opening a transaction for pure reads where a single statement with GUCs suffices.

---

### H-3. Kafka consumers: head-of-line blocking, no batching/concurrency ðŸ”´ OPEN
**Severity: HIGH** Â· `packages/events/src/consumer.ts`

- Uses `eachMessage` (one message at a time), **not** `eachBatch`, and never sets `partitionsConsumedConcurrently`.
- The in-handler retry loop sleeps up to 5 s Ã— 5 attempts before DLQ'ing. A single poisoned/slow message **blocks its partition for ~15 s+**.

**Fix:** Switch hot consumers to `eachBatch`, set `partitionsConsumedConcurrently`, and move retries to a delay topic.

---

### H-4. Outbox relay: runs in every replica, swallows errors, partial adoption ðŸ”´ OPEN
**Severity: HIGH** Â· `packages/events/src/outbox.ts`, `services/*/src/main.ts`

- Polls every **500 ms in every replica** of the 6 services that run it. At 30 replicas that's 60 `SELECT â€¦ FOR UPDATE SKIP LOCKED` per second per service.
- `tick()` **swallows all errors silently** (`catch {}`).
- Only **6 of 32 services** wire the relay.

**Fix:** Emit metrics on failure and backlog depth; consider leader-elected relay; audit all event-emitting services to ensure outbox adoption.

---

### H-5. Readiness probe couples every pod's health to the database ðŸ”´ OPEN
**Severity: HIGH** Â· `packages/nest-common/src/health.controller.ts`

`/ready` pings Postgres. When DB is overloaded â†’ **every pod across all services simultaneously fails readiness** â†’ total outage and a feedback loop preventing recovery.

**Fix:** Make readiness tolerant of transient DB blips; add circuit-breaking; separate liveness from DB health.

---

## 3. MEDIUM-severity backend issues

| # | Issue | Status |
|---|---|---|
| M-1 | No production search backend (OpenSearch missing from Terraform) | ðŸ”´ Open |
| M-2 | Migrations not wired into deploy pipeline â€” relies on undocumented CI job | ðŸ”´ Open |
| M-3 | DLQ has no consumer or alerting â€” poison messages accumulate silently | ðŸ”´ Open |
| M-4 | Shared single secret set (no least-privilege per service) | ðŸ”´ Open |
| M-5 | GCS bucket CORS is `origin: *` | ðŸ”´ Open |
| M-6 | Idempotency not verified despite at-least-once Kafka delivery | ðŸ”´ Open |
| M-7 | Graceful-shutdown vs. outbox/consumer drain not verified | ðŸ”´ Open |

---

## 4. Microservices architecture assessment

**Will the microservices work cleanly?** The decomposition is sound:
- Cross-namespace DNS is correctly generated in `deploy-gke.ps1`.
- Gateway reverse-proxies 28 route prefixes with proper CORS re-assertion.
- Services are stateless (state in Postgres/Kafka/Redis), so they horizontally scale via HPA â€” **except audit (C-3).**

**Caveats:**
- **Synchronous HTTP service-to-service** (e.g. accounting â†’ `AI_GATEWAY_URL`) has no visible circuit breaker or timeout. Add timeouts + circuit breakers or a service mesh.
- **All 32 services share one DB** â€” microservices in code, monolith in data. Schema-level incidents affect everyone.
- Operational surface is large: 32 services Ã— HPA(3â€“30) = up to ~960 pods. The DB is the wall every one of them hits.

---

## 5. Can it handle thousands of users? â€” direct answer

**Not as currently configured.** The application tier (NestJS on GKE Autopilot with HPA/PDB/topology-spread) is genuinely capable of scaling. But three things gate it hard:

1. **Connection exhaustion (C-1)** trips at *minimum* replica count â€” caps at a few hundred concurrent users before DB refuses connections.
2. **The single 2-vCPU database (C-2)** is the throughput ceiling for the entire platform.
3. **In-memory rate limiting (C-4)** means no real abuse protection â€” DB takes uncontrolled load.

Plus the **audit hash chain is broken at the default 3 replicas (C-3)** â€” a correctness bug independent of load.

**Minimum path to "thousands of users, cleanly":**
1. Put **PgBouncer** in front of Postgres + shrink per-service pools (C-1).
2. **Scale up the DB + add a read replica + enable REGIONAL HA** (C-2).
3. **Fix audit** to 1 replica or partition-local chains (C-3).
4. **Redis-backed rate limiting** + use Redis for OTP/sessions/scope cache (C-4, H-1, H-2).
5. **Batch/concurrent Kafka consumers**, DLQ alerting, outbox observability (H-3, H-4, M-3).
6. **Load-test** (k6/Gatling) at target concurrency after the above.

---

## 6. Priority checklist

| # | Issue | Severity | Status | Effort | Blocks scale? |
|---|---|---|---|---|---|
| C-1 | No DB connection pooler / pool math exceeds max_connections | Critical | ðŸ”´ Open | M | Yes |
| C-2 | Single undersized DB, no replica, possibly ZONAL | Critical | ðŸ”´ Open | M | Yes |
| C-3 | Audit hash chain broken at >1 replica; unscalable | Critical | ðŸ”´ Open | M | Yes (+correctness) |
| C-4 | In-memory gateway rate limiting | Critical | ðŸ”´ Open | S | Yes |
| H-1 | Redis provisioned but unused | High | ðŸ”´ Open | M | Indirect |
| H-2 | RLS path: 6â€“8 round trips/request | High | ðŸ”´ Open | M | Indirect |
| H-3 | Kafka head-of-line blocking, no batching | High | ðŸ”´ Open | M | Throughput |
| H-4 | Outbox relay errors swallowed; partial adoption | High | ðŸ”´ Open | S | Reliability |
| H-5 | Readiness coupled to DB â†’ cascade outages | High | ðŸ”´ Open | S | Resilience |
| M-1 | No prod search backend | Medium | ðŸ”´ Open | M | Feature gap |
| M-2 | Migrations not in deploy pipeline | Medium | ðŸ”´ Open | S | Deploy risk |
| M-3 | DLQ unmonitored | Medium | ðŸ”´ Open | S | Data loss |
| M-4 | Shared secret set | Medium | ðŸ”´ Open | S | Security |
| M-5 | GCS CORS `*` | Medium | ðŸ”´ Open | S | Security |
| M-6 | Idempotency unverified | Medium | ðŸ”´ Open | M | Correctness |
| M-7 | Shutdown drain of outbox/consumers | Medium | ðŸ”´ Open | S | Duplicates |
| **FE-1** | **All panel subdomains returning 404** | **Critical** | **âœ… Fixed** | â€” | Frontend |
| **FE-2** | **Two-panel login UI missing from all panels** | **High** | **âœ… Fixed** | â€” | Frontend |
| **FE-3** | **`vertofi.com/bhs` page missing; nav button to wrong URL** | **High** | **âœ… Fixed (pending deploy)** | â€” | Frontend |
| **FE-4** | **Vercel daily deployment rate limit exhausted** | **Medium** | **â³ Pending reset** | â€” | Operational |
| **FE-5** | **CI build failure â€” metadata in client component** | **Medium** | **âœ… Fixed** | â€” | Frontend |

*Effort (backend only): S = <1 day, M = days.*

---

*Backend analysis generated from a static review of the repository (services, packages, Helm chart, Terraform, docker-compose) on 2026-06-06. Frontend issues identified and fixed during session on 2026-06-06â€“07. Recommend confirming C-1/C-2 with a real load test (k6/Gatling) and checking docs/17 for the migration CI job referenced in M-2.*

