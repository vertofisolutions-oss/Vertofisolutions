# 00 — Prerequisites & Local Setup

## 1. Install the toolchain

| Tool | Version | Why | Get it |
|------|---------|-----|--------|
| Node.js | ≥ 22 | Backend (NestJS) + frontends (Next.js) | nodejs.org |
| pnpm | ≥ 10 | Monorepo package manager | `npm i -g pnpm` |
| Python | ≥ 3.11 | AI gateway, OCR, categorization | python.org |
| Docker Desktop | latest | Local Postgres/Redis/Kafka/MinIO/OpenSearch | docker.com |
| Git | latest | Version control | git-scm.com |

Verify:
```bash
node -v && pnpm -v && python --version && docker -v && git --version
```

## 2. Get the code & install
```bash
cd "Vertofi"            # the repository root
pnpm install           # installs all workspaces (services, apps, packages)
```

## 3. Create your environment file
```bash
cp .env.example .env
```
You can run **immediately** with everything blank — connectors that lack keys
show empty states. Fill keys as you obtain them (Document 01 + 03).

## 4. Start the local infrastructure
```bash
pnpm infra:up          # Postgres, Redis, Redpanda (Kafka), MinIO (S3), OpenSearch
```
This uses `infra/docker-compose.yml`. Data persists under `infra/.data/`.
Useful: `pnpm infra:logs`, `pnpm infra:down`, `pnpm infra:reset`.

| Local service | URL | Credentials |
|---------------|-----|-------------|
| PostgreSQL | localhost:5432 | vertofi / vertofi |
| Redis | localhost:6379 | — |
| Kafka (Redpanda) | localhost:19092 | — |
| MinIO (S3) API | localhost:9000 | vertofi / vertofi-secret |
| MinIO console | localhost:9001 | vertofi / vertofi-secret |
| OpenSearch | localhost:9200 | — |

## 5. Run database migrations
Each service owns a schema. Run these once (and after pulling schema changes):
```bash
for s in auth tenant access audit onboarding document billing accounting-ledger \
  reconciliation exception-workflow notification bhs-engine prediction lifeguard \
  vendor legal-cases warranty admin-console; do
  pnpm --filter @vertofi/$s migrate
done
```
Python service schemas (`ocr`, `categorization`) ship SQL under their
`migrations/`; apply via `psql "$DATABASE_URL" -f services/<svc>/migrations/001_init.sql`.

## 6. Build & run everything
```bash
pnpm build             # compile all TypeScript workspaces (verify green)
pnpm dev               # start all services + apps in watch mode
```

Python services run separately:
```bash
cd services/ai-gateway && pip install -r requirements.txt && uvicorn app.main:app --port 4010
cd services/ocr        && pip install -r requirements.txt && uvicorn app.main:app --port 4008
cd services/categorization && pip install -r requirements.txt && uvicorn app.main:app --port 4012
```

## 7. Open the apps

| App | URL | Notes |
|-----|-----|-------|
| Landing (public) | http://localhost:3000 | Marketing + Services menu |
| Business app | http://localhost:3001 | Client product (register here) |
| Professional panels | http://localhost:3002 | Associates/Accountants/BHS/Legal |
| **Internal admin** | http://localhost:3003 | **Staff only** (Admin + Teams) |
| API gateway | http://localhost:4000 | All `/api/v1/*` traffic |

## 8. Create your first accounts
1. Register a **business** at http://localhost:3001/register (mobile OTP — in dev,
   the OTP is printed to the `auth` service logs because MSG91 isn't configured).
2. To create **staff / professional** accounts, insert users with the right role
   directly (Admin tooling assigns roles), or use the admin console once you have
   an ADMIN user. See Document 05 for roles.

## 9. Troubleshooting
- **OTP not received:** with MSG91 blank, the code is logged by the `auth`
  service (dev only). Configure MSG91 (Document 03) for real SMS.
- **CORS errors:** ensure `CORS_ORIGINS` includes your app origin (it includes
  3000–3003 by default).
- **Upload fails (S3 CORS):** MinIO CORS is preconfigured for 3000–3003 in
  docker-compose; restart MinIO if you changed origins.
- **Migrations:** ensure `pnpm infra:up` is healthy before migrating.
