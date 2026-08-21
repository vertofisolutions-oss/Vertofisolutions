# 06 — Project Hierarchy

The complete repository structure and what each part is for. Vertofi is a
**pnpm + Turborepo monorepo**: many independently-buildable workspaces (services,
apps, packages) plus infrastructure and documentation.

## Top-level layout
```
Vertofi/
├── apps/                    # 4 web applications (Next.js 15)
├── services/               # 31 backend microservices (NestJS + Python)
├── packages/               # 8 shared libraries
├── infra/                  # local docker-compose + Terraform (IaC) + Dockerfiles
├── deploy/                 # Helm charts
├── tests/                  # load tests (k6)
├── docs/                   # engineering blueprint (00–24 + service specs)
├── completion-docs/        # printable completion dossier
├── legal-docs/             # corporate & legal templates (DRAFT)
├── setup-guide/            # THIS guide
├── documents for product understanding/   # original product concept docs
├── package.json · pnpm-workspace.yaml · turbo.json · tsconfig.base.json
├── .env.example            # environment template (copy to .env)
└── README.md
```

## apps/ — front-end applications
```
apps/
├── web-landing/    (port 3000)  Public marketing site + Services menu
├── web-business/   (port 3001)  Client product: onboarding, dashboard, WhatsApp
├── web-panels/     (port 3002)  Professional panels: associates, accountants, bhs, legal
└── web-admin/      (port 3003)  INTERNAL ONLY: Admin console + Teams
```
Each app: `src/app/*` (routes/pages), `src/components/*`, `src/lib/*` (API client,
auth), `tailwind.config.ts`, `next.config.ts`.

## services/ — backend microservices (ports 4000–4030)
```
Identity & access:   api-gateway, auth, tenant, access, audit
Onboarding/docs/pay:  onboarding, document, billing
Pipeline (Zero Data Entry): ocr*, ai-gateway*, categorization*, accounting-ledger,
                            reconciliation, exception-workflow, accounting-sync
Connectors:          bank-connector, gst-connector, verification-connectors
Intelligence:        bhs-engine, reporting, prediction, lifeguard
Engagement:          notification, whatsapp
Professional/premium: vendor, vbd, legal-cases, bhs-intelligence, benchmarks, warranty
Internal:            admin-console
                     (* = Python/FastAPI; all others NestJS/TypeScript)
```
Each TS service: `src/main.ts`, `src/app.module.ts`, `src/*.service.ts`,
`src/*.controller.ts`, `migrations/*.sql`, `scripts/migrate.ts`, `package.json`,
`tsconfig.json`. Python services: `app/main.py`, `app/*.py`, `requirements.txt`,
`Dockerfile`, `migrations/`.

## packages/ — shared libraries
```
config         Design tokens (Tailwind preset) + shared tsconfig
events         Kafka envelope, producer, consumer, transactional outbox, DLQ
tenancy        Principal/roles, Postgres RLS context helpers
auth-guards    JWT sign/verify + NestJS guards + decorators (@Roles, @Sensitive)
connectors     Connector base class, credential vault, retry, circuit breaker
observability  Structured logging (PII-redacted), health checks
nest-common    PgService (pooling), bootstrap, health controller, migration runner
ui             Design system (Card, Button, Badge, EmptyState, HealthScoreCard)
```

## infra/ — infrastructure
```
infra/
├── docker-compose.yml      Local stack: Postgres, Redis, Redpanda, MinIO, OpenSearch
├── postgres/init/          DB bootstrap (schemas, roles, extensions)
├── docker/                 Dockerfile.node (services) · Dockerfile.next (apps)
└── terraform/              Root + modules/network + modules/aurora (extend for EKS, etc.)
```

## deploy/ — Kubernetes
```
deploy/helm/vertofi-service/   Generic chart: Deployment, HPA, PDB, NetworkPolicy,
                               ServiceMonitor, ExternalSecret
```

## docs/ — engineering blueprint (the authoritative design)
00 production requirements · 01 product · 02 architecture · 03 panels · 04 RBAC ·
05 data model · 06 auth · 07 onboarding · 08 services catalog · 09 integrations ·
10 WhatsApp CFO · 11 the 15 features · 12 UI system · 13 frontend · 14 infra ·
15 security · 16 observability · 17 CI/CD · 18 scalability · 19 API standards ·
20 roadmap · 21 disaster recovery · 22 SOC2/ISO · 23 admin isolation ·
24 admin console & data security · plus `services/*.md` specs.

## Documentation folders (all printable)
| Folder | Audience |
|--------|----------|
| `docs/` | Engineers — authoritative design |
| `completion-docs/` | Stakeholders/auditors — what's built + verification |
| `legal-docs/` | Counsel/corporate — policies (DRAFT) |
| `setup-guide/` | Operators — how to obtain keys, configure, run |

## Build & dependency flow
`packages/*` are built first (Turbo `^build`), then `services/*` and `apps/*`
depend on them. `pnpm build` runs the whole graph; `pnpm dev` runs everything in
watch mode. Python services run independently via `uvicorn`.

## Port map (single source of truth)
- Web apps: 3000 (landing) · 3001 (business) · 3002 (panels) · 3003 (admin/internal)
- Gateway: 4000 · Services: 4001–4030 (see `02-SERVICE-INVENTORY` in completion-docs)
- Infra: Postgres 5432 · Redis 6379 · Kafka 19092 · MinIO 9000/9001 · OpenSearch 9200
