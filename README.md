# Vertofi — Predictive Accounting & Financial Intelligence Platform

> **Production-grade, multi-tenant, event-driven accounting platform for Indian MSMEs.**  
> Built to serve **50,000+ concurrent users**, **500,000+ businesses**, and **100M+ transactions** at **99.99% availability**.

---

## 📁 Repository Structure

```
├── apps/                 # 8 Next.js 15 Web Applications
│   ├── web-landing/      # Public marketing site (vertofi.com)
│   ├── web-business/     # Client product & dashboard (business.vertofi.com)
│   ├── web-associates/   # CA / CMA / CS professional panel
│   ├── web-accountants/  # Accountant staff panel
│   ├── web-bhs/          # BHS Intelligence panel
│   ├── web-legal/        # Legal counsel panel
│   ├── web-admin/        # Internal Vertofi admin console
│   └── web-teams/        # Internal ops and team portal
│
├── services/             # 32 Microservices (NestJS & Python/FastAPI)
│   ├── api-gateway/      # Single public entrypoint (Port 4000)
│   ├── auth/             # Authentication & OTP (Port 4001)
│   ├── tenant/           # Multi-tenant management (Port 4002)
│   ├── access/           # RBAC & permission gates (Port 4003)
│   ├── audit/            # Financial Black Box & immutable audit logs (Port 4004)
│   ├── onboarding/       # Business onboarding (Port 4005)
│   ├── document/         # Document management & storage (Port 4006)
│   ├── billing/          # Razorpay billing & subscriptions (Port 4007)
│   ├── ocr/              # AI/OCR extraction engine (Python)
│   ├── ai-gateway/       # OpenAI / LLM gateway (Python)
│   ├── accounting-ledger/# Real-time double-entry ledger (Port 4011)
│   ├── categorization/   # Transaction categorization (Python)
│   ├── reconciliation/   # Bank & invoice reconciliation (Port 4013)
│   ├── bhs-engine/       # Business Health Score engine
│   ├── whatsapp/         # WhatsApp conversational CFO
│   └── ...               # Connectors, reporting & intelligence services
│
├── packages/             # 8 Shared Monorepo Packages
│   ├── auth-guards/      # JWT, NestJS guards & RBAC decorators
│   ├── config/           # Design tokens & shared TypeScript configs
│   ├── connectors/       # Third-party connector base & circuit breakers
│   ├── events/           # Kafka event schema, outbox & DLQ
│   ├── nest-common/      # NestJS database pooling & bootstrap utilities
│   ├── observability/   # Structured logging & OpenTelemetry
│   ├── tenancy/          # PostgreSQL RLS & tenant principal context
│   └── ui/               # Shared React UI component library
│
├── assets/               # Static Media & Brand Assets
│   └── logos/            # Application and panel branding logos
│
├── docs/                 # Documentation & Engineering Blueprints
│   ├── architecture/     # System architecture (00-27) & current topology
│   ├── setup/            # Setup runbooks, environment configs & credentials
│   ├── product/          # Product feature specifications & requirements (.docx)
│   ├── legal/            # Markdown legal policies & archival PDFs
│   ├── reports/          # Readiness reports, bug audits & completion dossiers
│   ├── services/         # Microservice API specifications
│   └── templates/        # Business document & invoice templates
│
├── infra/                # Infrastructure as Code & Cloud Deployments
│   ├── docker/           # Dockerfiles & container configs
│   ├── docker-compose.yml# Local development stack (Postgres, Redis, Kafka, MinIO)
│   ├── terraform/        # Terraform IaC modules (AWS / GCP)
│   ├── gke/              # Google Kubernetes Engine deployment scripts & YAMLs
│   ├── eks/              # Amazon EKS cluster templates & configs
│   ├── aws/              # AWS MSK & service configurations
│   ├── dns/              # Route53 / DNS batch records
│   ├── k8s/              # Kubernetes jobs & specifications
│   ├── migrations/       # Database migrations
│   ├── postgres/         # PostgreSQL initialization scripts
│   ├── scripts/          # PowerShell deployment & domain linking scripts
│   ├── security/         # Security test suites (cross-tenant authz, etc.)
│   └── tools/            # Codegen & login page templates
│
├── deploy/               # Kubernetes Helm Charts
│   └── helm/             # Generic microservice Helm chart
│
├── scripts/              # Monorepo Build & Validation Scripts
│   ├── check-event-wiring.mjs
│   └── scan-templates.py
│
└── tests/                # Testing Suites
    └── load/             # k6 smoke and load testing scripts
```

---

## ⚡ Prerequisites

- **Node.js** `>= 22`
- **pnpm** `>= 10`
- **Python** `>= 3.11` (for AI / OCR / ML services)
- **Docker Desktop** (for local datastores)

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Configure environment variables
cp .env.example .env

# 3. Start local infrastructure (Postgres, Redis, Redpanda Kafka, MinIO)
pnpm infra:up

# 4. Run database migrations
pnpm --filter @vertofi/auth migrate
pnpm --filter @vertofi/tenant migrate

# 5. Start all apps and services in development mode
pnpm dev
```

---

## 🧭 Documentation & Guides

- **Engineering Blueprints:** [`docs/architecture/`](./docs/architecture/)
- **Setup & API Credentials:** [`docs/setup/`](./docs/setup/)
- **Bug Trackers & Readiness Reports:** [`docs/reports/`](./docs/reports/)
- **Product Feature Specs:** [`docs/product/`](./docs/product/)
- **Legal Policies:** [`docs/legal/markdown/`](./docs/legal/markdown/)

