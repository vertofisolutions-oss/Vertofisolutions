# API Reference

**VERTOFI PRIVATE LIMITED** · CIN U62099TS2026PTC211039 · 3 June 2026

All client traffic flows through the **API gateway** at `/api/v1/*`. The gateway
authenticates (JWT), authorizes (role), rate-limits, applies CORS, and routes to
the owning service. Endpoints below are relative to `/api/v1`.

## Authentication (`/auth`)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /auth/register | public | Business signup (mobile + email OTP) |
| POST | /auth/otp/send | public | Send OTP (login/verify) |
| POST | /auth/otp/verify | public | Verify OTP → issue tokens |
| POST | /auth/login | public | Password login (→ MFA) |
| POST | /auth/token/refresh | public | Rotate refresh token |
| POST | /auth/step-up | token | Issue Financial/Document Action OTP |
| POST | /auth/link-org | token | Link business owner to org → reissue token with org_id |

## Tenancy & access
| POST | /tenant/orgs · /tenant/teams · /tenant/teams/:id/assign |
| GET | /tenant/orgs/:id |
| POST/DELETE | /access/grants · /access/access-requests · /access/access-requests/:id/decide |
| GET | /access/resolve (internal) |

## Onboarding · Documents · Billing
| PUT | /onboarding/:orgId/stage/:n · /onboarding/:orgId/risk |
| POST | /onboarding/:orgId/professional · /onboarding/:orgId/complete |
| POST | /documents/:orgId/presign · /documents/:orgId/:id/commit · /documents/:orgId/:id/download (step-up OTP) |
| GET/POST | /billing/:orgId/access · /billing/checkout · /billing/:orgId/trial · /billing/webhook/razorpay (public) |

## Accounting & pipeline
| POST | /ledger/:orgId/accounts · /ledger/:orgId/entries (Financial OTP) · /ledger/:orgId/entries/:id/reverse |
| GET | /ledger/:orgId/entries |
| GET | /reconcile/:orgId/matches · /reconcile/:orgId/unmatched |
| GET/POST | /exceptions/:orgId · /exceptions/:orgId/flag · /exceptions/:orgId/:id/resolve |
| GET/POST | /bank/status · /bank/:orgId/connect |
| GET/POST | /gst/status · /gst/verify-vendor |
| GET | /external-sync/targets |

## Intelligence
| GET | /bhs/:orgId · /bhs/:orgId/history |
| GET | /reports/:orgId/pnl · /reports/:orgId/gst-summary · /reports/:orgId/moneymap |
| GET | /predict/:orgId/profit-leaks · /predict/:orgId/tax-warning · /predict/:orgId/cashflow |
| GET/POST | /lifeguard/:orgId · /lifeguard/:orgId/sos · /lifeguard/:orgId/:id/resolve |

## Professional & premium
| GET | /vendors/:orgId/trust · /vendors/check/:gstin |
| POST | /vbd/:orgId/simulate (Pro) |
| GET/POST | /legal/cases · /legal/cases/:id/analyze |
| GET | /bhs-intel/portfolio |
| GET | /benchmarks/industry/:industry |
| GET/POST | /warranty/:orgId/claims · /warranty/:orgId/claims/:id/verdict |
| GET | /verification/status |

## Internal admin console (ADMIN only)
| GET | /admin-console/overview · /billing/dues · /ai-usage · /cloud-billing · /aws-status · /cicd · /risks · /access-log |
| GET | /admin-console/tables · /admin-console/tables/:key |
| PATCH | /admin-console/tables/:key/:id (column-allowlisted, audited) |

## Conventions
- **Versioning:** path-based `/api/v1`. Breaking changes → new version.
- **Auth:** `Authorization: Bearer <JWT>`; sensitive actions return `428` to trigger step-up OTP.
- **Idempotency:** `Idempotency-Key` on mutations.
- **Errors:** problem+json with stable machine-readable `code`.
- **Events:** canonical Kafka envelope with `org_id`, `correlation_id`, `causation_id`, `schema_version` (see `../docs/19`).
- **OpenAPI** specs are generated per service for production documentation.
