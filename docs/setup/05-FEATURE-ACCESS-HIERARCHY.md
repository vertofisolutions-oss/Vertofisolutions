# 05 — Feature Access Hierarchy

Exactly who can access which feature, and how access is enforced. Authorization
is layered: **(1)** gateway JWT + role check → **(2)** service role guard →
**(3)** access-service ABAC grant resolution → **(4)** Postgres row-level security
→ **(5)** column-level security on sensitive data → **(6)** step-up OTP for
sensitive financial actions → **(7)** plan gating for premium features → and every
action is **audited**.

## Roles
| Role | Belongs to | Default data scope | Writes? |
|------|-----------|--------------------|---------|
| ADMIN | Internal portal | Everything | Yes (governs all) |
| TEAM_LEAD / TEAM_MEMBER | Internal portal | Assigned client orgs | **View-only** + flag flaws |
| ASSOCIATE (CA/CMA/CPA/CS/ACCA/CFA) | Panels | Granted client orgs | **Yes** |
| ACCOUNTANT | Panels | Their associate's clients | View-only + ping |
| BUSINESS_OWNER | Business app | Own org | Yes (own org) |
| BUSINESS_USER | Business app | Own org | Limited (own org) |
| BHS_ANALYST | Panels | Granted clients' BHS only | No |
| LAWYER | Panels | Assigned legal cases | Case docs |

## Master access matrix (✅ allowed · 👁 view-only · 🔒 needs grant · ➖ no)

| Feature / Action | Owner | User | Associate | Accountant | Team | BHS | Lawyer | Admin |
|------------------|:----:|:----:|:---------:|:----------:|:----:|:---:|:------:|:----:|
| Register / onboard own business | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ |
| Upload documents (own org) | ✅ | ✅ | 🔒 | ➖ | ➖ | ➖ | ➖ | ✅ |
| View Business Health Score | ✅ own | ✅ own | 🔒 | 🔒👁 | 🔒👁 | 🔒👁 | ➖ | ✅ |
| MoneyMap / P&L / GST reports | ✅ own | ✅ own | 🔒 | 🔒👁 | 🔒👁 | ➖ | ➖ | ✅ |
| Predictions (tax/leak/cashflow) | ✅ own | ✅ own | 🔒 | 🔒👁 | ➖ | ➖ | ➖ | ✅ |
| Post ledger entry (Financial OTP) | ✅ own | ✅ own | 🔒✅ | ➖ | ➖ | ➖ | ➖ | ✅ |
| Reconciliation view | ✅ own | ✅ own | 🔒 | 🔒👁 | 🔒👁 | ➖ | ➖ | ✅ |
| Resolve exceptions | ✅ own | ➖ | 🔒✅ | ➖ | ➖ | ➖ | ➖ | ✅ |
| Flag accounting flaw | ➖ | ➖ | ✅ | ✅ | ✅ | ➖ | ➖ | ✅ |
| Request elevated access | ➖ | ➖ | ➖ | ➖ | ✅ | ➖ | ➖ | ➖ |
| VendorTrust score | ✅ own | ✅ own | 🔒 | 🔒👁 | ➖ | ➖ | ➖ | ✅ |
| Virtual Business Director (Pro) | ✅ Pro | ➖ | 🔒 | ➖ | ➖ | ➖ | ➖ | ✅ |
| Accounting Warranty+ claim (Pro) | ✅ Pro | ➖ | 🔒 | ➖ | ➖ | ➖ | ➖ | ✅ (verdict) |
| Lifeguard SOS | ✅ own | ✅ own | 🔒 | ➖ | ➖ | ➖ | ➖ | ✅ |
| Legal cases + AI analysis | 👁 own | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ 🔒 | ✅ |
| BHS-Intelligence portfolio | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ 🔒 | ➖ | ✅ |
| Industry benchmarks | ✅ own | ➖ | 🔒 | ➖ | ➖ | ➖ | ➖ | ✅ |
| Manage teams | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ |
| Create/revoke access grants | ➖ | ➖ | own acct-panel | ➖ | ➖ | ➖ | ➖ | ✅ |
| Admin DB browser (Excel) | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ |
| Billing dues / AI & cloud cost | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ |
| Risk register / CI-CD / AWS | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ |
| Observability (Grafana) | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ |
| Monitor user behaviour / audit | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ |

🔒 = requires an Admin-granted (or, for an associate's accountant, associate-granted) access grant to that client org.

## How each layer enforces it
1. **Gateway** — verifies the JWT, blocks unauthenticated calls, applies CORS,
   rate-limits, and forwards identity.
2. **Service role guard** (`@Roles(...)`) — rejects roles not allowed on the route.
3. **Access service (ABAC)** — resolves the principal's *effective org set* from
   `access_grants`: Admin → all; Business → own org; Associate → granted orgs;
   Accountant → the associate's granted orgs (view); Team → assigned orgs (view);
   BHS analyst → granted orgs (BHS-only scope); Lawyer → granted orgs (cases-only).
4. **Row-level security** — Postgres policies physically restrict every query to
   the principal's org set, even if an app check is missed.
5. **Column-level security** — sensitive columns (password hashes, secrets,
   encrypted fields) are never selectable, including via the admin DB browser.
6. **Step-up OTP** — posting books, GST filing, payroll, exports, bank connect,
   and sensitive downloads require a Financial/Document Action OTP, recorded as
   legal proof.
7. **Plan gating** — VBD, VendorTrust, Warranty+, Benchmarks, Black Box and API
   access are gated to Growth/Pro; usage limits enforced via `usage_counters`.
8. **Audit** — every domain event and every admin view/edit is written to the
   immutable, hash-chained log.

## The grant lifecycle (how a professional gets access to a client)
1. A **business** picks its professional (CA/etc.) at onboarding → an access grant
   is created for that Associate.
2. **Admin** can additionally grant a BHS company or Lawyer access to specific
   clients (scoped: BHS-only / cases-only).
3. An **Associate** can grant their own **Accountant Panel** view access to their
   clients.
4. **Teams** are assigned client orgs by Admin (view-only); they **request**
   elevated access, which Admin approves to create a grant.
5. Revoking a grant immediately removes access everywhere (RLS + cache bust).

## Internal isolation
**Admin** and **Teams** run only in the internal portal (`web-admin`, port 3003),
served on an internal-only network — never linked from or reachable via the public
site (see `../docs/23`).
