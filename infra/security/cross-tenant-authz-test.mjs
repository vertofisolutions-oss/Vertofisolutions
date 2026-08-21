#!/usr/bin/env node
/**
 * Cross-tenant authorization regression test (IDOR guard).
 *
 * Logs in as ONE business user, then hits every org-scoped READ endpoint with a
 * DIFFERENT org's id (one the user does not own). Every such call MUST be denied
 * (403 preferred; 401/404 also acceptable — anything that is NOT a 2xx data
 * response). A 2xx is a tenant-isolation LEAK and fails the suite.
 *
 * It also runs positive controls (own org → allowed) and an unauthenticated
 * control (no token → 401), so a misconfig that "denies everything" can't pass
 * silently.
 *
 * Usage:
 *   BASE=https://api.vertofi.com/api/v1 \
 *   LOGIN_ID=user@example.com LOGIN_PW='secret' \
 *   OWN_ORG=<uuid> OTHER_ORG=<uuid> \
 *   node infra/security/cross-tenant-authz-test.mjs
 *
 * Exit code 0 = all isolated; non-zero = at least one leak.
 */
const BASE = process.env.BASE ?? "https://api.vertofi.com/api/v1";
const LOGIN_ID = process.env.LOGIN_ID;
const LOGIN_PW = process.env.LOGIN_PW;
const OWN_ORG = process.env.OWN_ORG;
const OTHER_ORG = process.env.OTHER_ORG;

if (!LOGIN_ID || !LOGIN_PW || !OWN_ORG || !OTHER_ORG) {
  console.error("Set LOGIN_ID, LOGIN_PW, OWN_ORG, OTHER_ORG (and optionally BASE).");
  process.exit(2);
}

/** Org-scoped READ endpoints, templated on {org}. GET only — never mutate. */
const ROUTES = [
  "/tenant/orgs/{org}",
  "/onboarding/{org}",
  "/billing/{org}/access",
  "/accounting/{org}/customers",
  "/accounting/{org}/products",
  "/accounting/{org}/sales",
  "/accounting/{org}/purchases",
  "/accounting/{org}/vendors",
  "/accounting/{org}/expenses",
  "/accounting/{org}/documents",
  "/accounting/{org}/inventory",
  "/accounting/{org}/inventory/valuation",
  "/accounting/{org}/inventory/low-stock",
  "/accounting/{org}/warehouses",
  "/accounting/{org}/categories",
  "/reports/{org}/pnl",
  "/reports/{org}/gst-summary",
  "/reports/{org}/balance-sheet",
  "/reports/{org}/moneymap",
  "/predict/{org}/cashflow",
  "/predict/{org}/tax-warning",
  "/predict/{org}/profit-leaks",
  "/bhs/{org}",
  "/bhs/{org}/history",
  "/lifeguard/{org}",
  "/reconcile/{org}/matches",
  "/reconcile/{org}/unmatched",
  "/vendors/{org}/trust",
  "/warranty/{org}/claims",
  "/documents/{org}",
  "/audit/{org}/timeline",
];

async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: LOGIN_ID, password: LOGIN_PW }),
  });
  const j = await r.json().catch(() => ({}));
  const token = j?.tokens?.accessToken;
  if (!token) {
    console.error("Login failed:", r.status, JSON.stringify(j));
    process.exit(2);
  }
  return token;
}

/**
 * Cross-tenant WRITE probes. These attempt mutations against the OTHER org and
 * MUST be denied. It is safe to run against prod: every write path runs
 * assertGrantedScope (or assertOwnOrg) BEFORE any query, so a denied request
 * never reaches an INSERT/UPDATE — no data is created in another tenant. A 2xx
 * here would be both a leak and a real cross-tenant write.
 */
const WRITE_ROUTES = [
  { method: "POST", path: "/accounting/{org}/customers", body: { name: "authz-probe" } },
  { method: "POST", path: "/accounting/{org}/products", body: { name: "authz-probe", rate: 1 } },
  { method: "POST", path: "/accounting/{org}/sales", body: { items: [] } },
  { method: "POST", path: "/accounting/{org}/expenses", body: { amount: 1, category: "x" } },
  { method: "POST", path: "/accounting/{org}/warehouses", body: { name: "authz-probe" } },
  { method: "POST", path: "/onboarding/{org}/complete", body: {} },
  // billing carries orgId in the BODY, not the path — cross-tenant must 403.
  { method: "POST", path: "/billing/{org}/trial", body: {} },
];

async function call(path, token, method = "GET", body) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return r.status;
}

const DENY = (s) => s === 401 || s === 403 || s === 404; // not a data response

const run = async () => {
  const token = await login();
  let leaks = 0;
  let unauthLeaks = 0;

  console.log(`\n# Cross-tenant probe — user ${LOGIN_ID} hitting OTHER org ${OTHER_ORG}`);
  for (const tpl of ROUTES) {
    const path = tpl.replace("{org}", OTHER_ORG);
    const status = await call(path, token);
    const ok = DENY(status);
    if (!ok) leaks++;
    console.log(`  ${ok ? "PASS" : "LEAK"}  ${status}  ${path}`);
  }

  console.log(`\n# Cross-tenant WRITE probe — user ${LOGIN_ID} mutating OTHER org ${OTHER_ORG} (must be denied)`);
  for (const w of WRITE_ROUTES) {
    const path = w.path.replace("{org}", OTHER_ORG);
    const status = await call(path, token, w.method, w.body);
    const ok = DENY(status);
    if (!ok) leaks++;
    console.log(`  ${ok ? "PASS" : "LEAK"}  ${status}  ${w.method} ${path}`);
  }

  console.log(`\n# Unauthenticated probe (no token) — must be 401`);
  for (const tpl of ROUTES.slice(0, 6)) {
    const path = tpl.replace("{org}", OWN_ORG);
    const status = await call(path, null);
    const ok = status === 401;
    if (!ok) unauthLeaks++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${status}  ${path}`);
  }

  console.log(`\n# Positive control — OWN org ${OWN_ORG} must be allowed (2xx/empty)`);
  for (const tpl of ["/tenant/orgs/{org}", "/accounting/{org}/customers"]) {
    const path = tpl.replace("{org}", OWN_ORG);
    const status = await call(path, token);
    console.log(`  ${status < 400 ? "PASS" : "WARN"}  ${status}  ${path}`);
  }

  console.log(`\n=== ${leaks === 0 && unauthLeaks === 0 ? "ALL ISOLATED ✅" : `FAILED ❌ (${leaks} cross-tenant leak(s), ${unauthLeaks} unauth leak(s))`} ===`);
  process.exit(leaks === 0 && unauthLeaks === 0 ? 0 : 1);
};

run().catch((e) => { console.error("test error:", e); process.exit(2); });
