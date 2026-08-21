# Vertofi — Engineering & Knowledge Documentation

> **Predictive Accounting & Financial Intelligence Platform for Indian MSMEs.**  
> Production-grade, multi-tenant, event-driven. Built to serve **50,000+ concurrent users**, **500,000+ businesses**, and **100M+ transactions** at **99.99% availability**.

This `docs/` folder is the central knowledge base for the Vertofi platform. Documentation is organized into clear domains below:

---

## Documentation Categories

```
docs/
├── architecture/       # System architecture blueprints (00-27) & current topology
├── setup/              # Setup runbooks, environment configs, and API key references
├── product/            # Business requirement specifications & feature blueprints
├── legal/              # Corporate & legal policies (Markdown) and generated PDFs
│   ├── markdown/
│   └── pdfs/
├── reports/            # Production readiness, deployment reports & bug audits
│   └── completion/     # Project completion dossiers
├── services/           # Individual microservice specification sheets
└── templates/          # E-Invoice, credit note, debit note & purchase templates
```

---

## 1. Architecture & Blueprint (`docs/architecture/`)

| Document | Description |
| :--- | :--- |
| [00 — Production Requirements](./architecture/00-production-requirements.md) | Non-negotiable engineering rules, zero-mock policy & DoD |
| [01 — Product Overview](./architecture/01-product-overview.md) | Platform vision, 15 core innovations & business model |
| [02 — System Architecture](./architecture/02-system-architecture.md) | High-level topology, microservice map & Kafka event flow |
| [03 — Panels & Role Hierarchy](./architecture/03-panels-and-hierarchy.md) | Front-end panel breakdown & user persona mappings |
| [04 — RBAC & Access Control](./architecture/04-rbac-and-access-control.md) | Multi-tenant RBAC + ABAC fine-grained access model |
| [05 — Data Model](./architecture/05-data-model.md) | PostgreSQL schema, tenancy isolation & partitioning |
| [06 — Authentication & OTP](./architecture/06-authentication-and-otp.md) | MSG91 OTP, JWT signing & step-up authentication |
| [07 — Onboarding Flow](./architecture/07-onboarding-flow.md) | 3-stage business onboarding & confidence scoring |
| [08 — Services Catalog](./architecture/08-services-catalog.md) | Microservice registry, event schemas & REST API routes |
| [09 — Integrations & Connectors](./architecture/09-integrations-and-connectors.md) | Banking, GST & accounting sync connectors |
| [10 — WhatsApp CFO](./architecture/10-whatsapp-cfo.md) | 24/7 autonomous WhatsApp conversational CFO |
| [11 — Features (15 Innovations)](./architecture/11-features-15-innovations.md) | Computational models for proprietary features |
| [12 — UI Design System](./architecture/12-ui-design-system.md) | Design tokens, typography & Mission Control UI |
| [13 — Frontend Architecture](./architecture/13-frontend-architecture.md) | Next.js 15 App Router architecture & state flow |
| [14 — Infrastructure & Deployment](./architecture/14-infrastructure-and-deployment.md) | GKE / EKS, Docker, Terraform & local Docker Compose |
| [15 — Security & Compliance](./architecture/15-security-and-compliance.md) | Encryption, audit logging, SOC2/ISO controls |
| [16 — Observability](./architecture/16-observability.md) | Metrics, distributed tracing, structured logging |
| [17 — CI/CD](./architecture/17-ci-cd.md) | GitHub Actions pipelines & container build triggers |
| [18 — Scalability & Reliability](./architecture/18-scalability-and-reliability.md) | High concurrency design & graceful degradation |
| [19 — API Standards](./architecture/19-api-standards.md) | REST API conventions, versioning & idempotency |
| [20 — Roadmap & Build Plan](./architecture/20-roadmap-and-build-plan.md) | Platform phase delivery order |
| [21 — Disaster Recovery](./architecture/21-disaster-recovery.md) | Backup policies, RTO / RPO & failover runbooks |
| [22 — SOC2 & ISO Controls](./architecture/22-soc2-iso-controls.md) | Security control mapping & evidence collection |
| [23 — Internal Admin Isolation](./architecture/23-internal-admin-isolation.md) | Isolation boundaries for internal admin portals |
| [24 — Admin Console Security](./architecture/24-admin-console-and-data-security.md) | Data masking, audit logs & staff access gates |
| [25 — Usage Workflow & Gaps](./architecture/25-usage-workflow-and-gaps.md) | End-to-end user workflows & gap analysis |
| [27 — Startup Review](./architecture/27-startup-review-and-field-model.md) | Startup operational model & field specifications |
| [Current Hierarchy & Topology](./architecture/current-hierarchy.md) | Live deployed system architecture & network layout |

---

## 2. Setup & Operations (`docs/setup/`)

- [00 — Prerequisites & Local Setup](./setup/00-PREREQUISITES-AND-LOCAL-SETUP.md)
- [01 — Environment Variables Reference](./setup/01-ENV-REFERENCE.md)
- [02 — GCP Complete Setup](./setup/02-GCP-COMPLETE-SETUP.md)
- [02 — AWS Complete Setup](./setup/02-AWS-COMPLETE-SETUP.md)
- [03 — API Keys & Credentials Guide](./setup/03-API-KEYS-AND-CREDENTIALS.md)
- [04 — Payment Gateway Guide](./setup/04-PAYMENT-GATEWAY-GUIDE.md)
- [05 — Feature Access Hierarchy](./setup/05-FEATURE-ACCESS-HIERARCHY.md)
- [06 — Project Hierarchy](./setup/06-PROJECT-HIERARCHY.md)
- [07 — Panels & Pages Setup](./setup/07-PANELS-AND-PAGES-SETUP.md)
- [08 — First Launch Checklist](./setup/08-FIRST-LAUNCH-CHECKLIST.md)
- [Keys & Credentials Setup](./setup/keyssetup.md)
- [Environment Setup](./setup/ENVIRONMENT_SETUP.md)
- [Provider Onboarding](./setup/PROVIDER_ONBOARDING.md)

---

## 3. Product Specifications (`docs/product/`)

Contains detailed product documents:
- Accounting Warranty, Business Life Guard, Business Health Score (BHS)
- Financial Black Box, Financial Wellness Program, Invisible Accounting
- Money Map Live, On-Demand Accountant, Predictive Tax Warnings
- Pricing Plans, Profit Leak Finder, WhatsApp Micro Accounting
- Zero Data Entry, API Specifications, Industry Benchmarks, Master Document
- Vendor Trust Score, Virtual Business Director

---

## 4. Legal & Corporate Policies (`docs/legal/`)

- **Markdown Policies (`docs/legal/markdown/`):** Privacy Policy, Terms of Service, DPA, Acceptable Use, SLA, InfoSec Policy, Grievance Redressal, Refund Policy, Cookie Policy.
- **Printable PDFs (`docs/legal/pdfs/`):** Auto-generated archival PDFs + generator script (`_generate.py`).

---

## 5. Reports & Audits (`docs/reports/`)

- [Bugs Audit & Findings](./reports/bugs.md)
- [Suggested Fixes](./reports/suggested-fix.md)
- [Issues Tracker](./reports/issues.md)
- [Production Readiness Report](./reports/PRODUCTION_READINESS.md)
- [Deployment Ready Report](./reports/DEPLOYMENT_READY_REPORT.md)
- **Completion Dossiers (`docs/reports/completion/`):** Project completion report, service inventory, feature matrix, API reference, data model reference, runbooks.

---

## 6. Services & Templates

- [Microservice Specs (`docs/services/`)](./services/README.md)
- [Document Templates (`docs/templates/`)](./templates/)

