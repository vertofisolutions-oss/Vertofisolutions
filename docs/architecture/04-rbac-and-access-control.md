# 04 — RBAC & Access Control

The security backbone. Combines **multi-tenant isolation** + **RBAC** (role → permissions) + **ABAC** (per-resource Admin-controlled grants). Enforced at three layers: API gateway, service-level guards, and Postgres Row-Level Security (defense in depth).

## Principals & roles

| Role | Panel | Default scope | Write? |
|------|-------|---------------|--------|
| `ADMIN` | Admin | All tenants | Yes (everything) |
| `TEAM_LEAD`, `TEAM_MEMBER` | Teams | Assigned orgs | **No (view-only)** |
| `ASSOCIATE` (CA/CMA/CPA/CS/ACCA/CFA) | Associates | Granted client orgs | **Yes** |
| `ACCOUNTANT` | Accountant Panel | Parent associate's clients | No (view-only) |
| `BUSINESS_OWNER`, `BUSINESS_USER` | Business | Own org | Yes (own org, plan-limited) |
| `BHS_ANALYST` | BHS Intelligence | Granted clients' BHS + linked professionals | No |
| `LAWYER` | Legal | Assigned cases | Yes (case docs) |

A `professional_type` attribute (`CA|CMA|CPA|CS|ACCA|CFA`) further qualifies `ASSOCIATE`.

## Tenancy model

- Every business is an **organization (tenant)**. Every domain row carries `org_id`.
- **Postgres Row-Level Security (RLS)** policies key off a session GUC `app.current_org_ids` + `app.current_role`, set per request from the validated JWT. A query can only ever touch orgs the principal is entitled to.
- Storage (S3) objects are prefixed by `org_id/`; signed URLs are scoped and short-lived.

## The access-grant model (ABAC core)

`access_grants` is the table Admin (and Associates, for their own Accountant Panel) manage:

```
access_grants(
  id, grantee_type, grantee_id,        -- who gets access (user or company)
  org_id,                              -- which client org
  permission,                          -- VIEW | EDIT
  scope,                               -- FULL | BHS_ONLY | CASES_ONLY | DOCUMENTS
  granted_by, reason, expires_at,
  status,                              -- ACTIVE | REVOKED | PENDING
  created_at, updated_at
)
```

Resolution at request time (gateway → `access` service, cached in Redis):
1. Decode JWT → `principal{user_id, role, org_id?, professional_type?, parent_associate_id?}`.
2. Compute the **effective org set**:
   - `ADMIN` → all.
   - `BUSINESS_*` → own `org_id`.
   - `ASSOCIATE` → orgs where an ACTIVE grant exists for them.
   - `ACCOUNTANT` → orgs granted to their parent associate (inherited, VIEW only).
   - `TEAM_*` → orgs assigned via team-assignment grants (VIEW only).
   - `BHS_ANALYST` → granted orgs, **scope=BHS_ONLY**.
   - `LAWYER` → orgs/cases via CASES_ONLY grants.
3. Set the Postgres session GUCs → RLS enforces it physically.
4. Permission (`VIEW`/`EDIT`) checked by service guards before any mutation.

## Access-request workflow (Teams → Vertofi)

Teams are view-only. To get more, a Team member submits an **access request** (`access_requests` table) → notifies Admin → Admin approves/denies → on approve, an `access_grant` is created. Fully audited.

## Permission matrix (high level)

| Action | Admin | Associate | Accountant | Team | Business | BHS | Lawyer |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| View client financials | ✅ | granted | granted (RO) | assigned (RO) | own | — | — |
| Edit client books | ✅ | granted | ❌ | ❌ | own | ❌ | ❌ |
| View BHS score | ✅ | granted | granted | assigned | own | granted | — |
| View/flag flaws | ✅ | ✅ | ping only | ✅ | own | ping prof. | — |
| Manage teams | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage grants | ✅ | own acct-panel | ❌ | request | ❌ | ❌ | ❌ |
| Legal cases + AI | ✅ | ❌ | ❌ | ❌ | own (view) | ❌ | ✅ |
| Monitor user behaviour | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Step-up authorization

Sensitive actions require **Financial Action OTP** or **Document Access OTP** regardless of role (see [06](./06-authentication-and-otp.md)). The OTP approval is recorded in the audit log as legal proof.

## Enforcement checklist (every endpoint)
1. Valid JWT (gateway). 2. Role allowed for route (RBAC guard). 3. Target `org_id` ∈ effective org set (ABAC). 4. Permission ≥ required (VIEW/EDIT). 5. Step-up OTP if sensitive. 6. RLS as final backstop. 7. Audit event emitted.
