# 03 — Panels & Role Hierarchy

Vertofi exposes **7 panels** over a shared, access-controlled backend. Authorization rules: [04-rbac-and-access-control.md](./04-rbac-and-access-control.md).

> **Exposure note:** Five panels are public-facing and reachable from the **landing page → Services dropdown** (Business, Associates, Accountants, BHS Intelligence, Legal). **Admin and Teams are internal-only** — served from a separate, internally-hosted portal (`apps/web-admin`), **not linked from or reachable via the public website**. See [23-internal-admin-isolation.md](./23-internal-admin-isolation.md).

## The 7 panels

### 1. Admin Panel — `admin.vertofi`
The super-controller (Vertofi internal).
- Full access to the **entire database** of everything.
- **Monitors user behaviour** (activity, sessions, device/IP — feeds the user-behaviour analytics).
- **CRUD on Teams** (create / modify / delete articleship teams).
- **Owns the access-grant map**: decides which BHS Intelligence company, which Associate, which Legal user, and which Team can see which client's data and at what permission.
- Auth: **password + OTP + Authenticator app**.

### 2. Teams — `teams.vertofi`
Internal articleship members working **under Admin**.
- **View-only** on the companies/files assigned to them.
- Can **see the people associated** with a company (the CA / CMA / etc. and the client contacts).
- **Flag accounting flaws** → raises a notification/exception to the responsible party.
- If they need more (write) access, they **ping/contact Vertofi (Admin)** — an access-request workflow.
- Auth: **2-step — ID + password + verification (OTP)**.

### 3. Vertofi for Associates — `associates.vertofi`
For professionals: **CA, CMA, CPA, CS, ACCA, CFA**.
- **Read + write** on their assigned clients' data (the only external role that can *change* data).
- Can create and manage an **Accountant Panel** sub-team beneath themselves and grant it view access to their own clients.
- Selected by a client during onboarding ("choose your professional").
- Auth: **password + OTP**.

### 4. Accountant Panel — `accountants.vertofi` (sub-panel of #3)
The accounts team **of a specific Associate**.
- **View-only** on the clients of their parent Associate.
- **Pings the Associate** when they find flaws/discrepancies.
- Auth: **password + OTP**. Belongs to the Associate's tenant scope.

### 5. Vertofi for Business — `app.vertofi` (the client product)
For **clients / business owners**.
- Complete the 3-stage onboarding, **submit documents**, connect accounts.
- Use all product features: BHS, MoneyMap, Predictive Tax, ProfitLeak, WhatsApp CFO, etc., gated by subscription plan.
- Owns their organization's data; can invite their own org users (plan-limited).
- Auth: **mobile OTP + email verification**.

### 6. Vertofi for BHS Intelligence — `bhs.vertofi`
For **BHS intelligence companies**.
- View **BHS scores** and the **associated professionals** (CA/CMA/etc.) for the clients **Admin has granted** them.
- Can **ping the associated professional** to provide guidance.
- Strictly scoped: Admin controls exactly which clients' and which professionals' data each company sees.
- Auth: **password + OTP**.

### 7. Vertofi for Legal Services — `legal.vertofi`
For **lawyers**.
- Access **all cases** assigned to them + **legal AI analytics** (notice analysis, case insights, drafting assistance).
- Integrates with Business Lifeguard emergencies that escalate to legal.
- Auth: **password + OTP**.

## Hierarchy diagram

```
ADMIN (super, owns access-grant map, monitors behaviour)
│
├── TEAMS (internal, view-only, flag flaws, request access)
│
├── grants access ─────────────────────────────────────────┐
│                                                            ▼
├── ASSOCIATES (CA/CMA/CPA/CS/ACCA/CFA — read+write on clients)
│      └── ACCOUNTANT PANEL (view-only on the associate's clients, ping associate)
│
├── BHS INTELLIGENCE COMPANIES (view BHS + linked professionals, granted clients only)
│
├── LEGAL SERVICES (lawyers — cases + legal AI)
│
└── BUSINESS / CLIENTS (own their org data, submit docs, use features)
       └── selects an Associate · is monitored by Teams · scored for BHS companies
```

## Cross-panel relationships
- A **client** picks an **Associate** at onboarding → that Associate (and their Accountant Panel) gets scoped access.
- **Admin** can additionally grant a **BHS company** or **Legal user** access to specific clients.
- **Teams** are assigned companies by Admin for monitoring; they cannot write.
- Every grant is recorded in the `access_grants` table and enforced everywhere ([04](./04-rbac-and-access-control.md)).
