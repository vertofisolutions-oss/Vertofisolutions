"use client";

/**
 * Typed client for the Vertofi API gateway. Tokens are kept in memory +
 * localStorage for this client app; production hardening moves them to
 * httpOnly cookies via a Next route handler (docs/13). All calls go through
 * the gateway (docs/02) which enforces auth, rate-limits and routing.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

/** Normalized GSTIN taxpayer profile returned by /gst/lookup (matches gst-connector). */
export interface GstinProfile {
  gstin: string;
  structurallyValid: boolean;
  checksumValid: boolean;
  stateCode: string;
  state: string | null;
  pan: string | null;
  legalName?: string;
  tradeName?: string;
  constitution?: string;
  status?: string;
  taxpayerType?: string;
  registrationDate?: string;
  natureOfBusiness?: string[];
  address?: { line?: string; city?: string; state?: string; pincode?: string };
  centreJurisdiction?: string;
  stateJurisdiction?: string;
  eInvoiceEnabled?: boolean;
  source: "DETERMINISTIC" | "GSP";
  connector: string;
}

const ACCESS_KEY = "vertofi.access";
const REFRESH_KEY = "vertofi.refresh";

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  // Also drop the cached org id — otherwise a different user signing in on the
  // same browser could momentarily carry the previous user's org (stale tenant
  // data). getOrgId() is token-authoritative now, but clearing it here removes
  // any window for stale cross-tenant state.
  localStorage.removeItem("vertofi.orgId");
}
export function getAccess(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY);
}

const ORG_KEY = "vertofi.orgId";
export function setOrgId(orgId: string): void {
  localStorage.setItem(ORG_KEY, orgId);
}
export function getOrgId(): string | null {
  if (typeof window === "undefined") return null;
  // The access token's orgId claim is AUTHORITATIVE: the backend authorizes
  // every org-scoped call against it (authz requires principal.orgId === the
  // requested org). localStorage can go stale — e.g. a second org created
  // during a re-onboarding leaves a different id cached than the one the token
  // is linked to — and trusting it over the token caused org_not_owned 403s on
  // every feature. So prefer the token claim and keep localStorage in sync.
  // Fall back to the stored id only before the token carries an org (the brief
  // pre-link window during onboarding).
  try {
    const token = localStorage.getItem(ACCESS_KEY);
    if (token) {
      const claims = JSON.parse(atob(token.split(".")[1] ?? "")) as { orgId?: string };
      if (claims.orgId) {
        localStorage.setItem(ORG_KEY, claims.orgId);
        return claims.orgId;
      }
    }
  } catch {
    /* malformed token — fall back to stored id */
  }
  return localStorage.getItem(ORG_KEY);
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

/**
 * Single-flight refresh: access tokens live 15 minutes, so a parked tab's
 * next click fires many parallel 401s. They must all await ONE refresh —
 * the backend rotates refresh tokens and treats reuse as theft (revokes the
 * whole session family), so two concurrent refreshes would log the user out.
 */
let refreshing: Promise<boolean> | null = null;
function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const rt = typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY);
      if (!rt) return false;
      try {
        const res = await fetch(`${BASE}/auth/token/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) {
          clearTokens();
          return false;
        }
        const t = (await res.json()) as { accessToken: string; refreshToken: string };
        setTokens(t.accessToken, t.refreshToken);
        return true;
      } catch {
        clearTokens();
        return false;
      }
    })().finally(() => {
      // allow a future refresh after this one settles
      setTimeout(() => { refreshing = null; }, 0);
    });
  }
  return refreshing;
}

/** Authorized PDF fetch → file download (single-flight refresh, no popup). */
/** Auth-fetch a PDF and open it in a new tab for preview (token isn't sent on plain links). */
async function openPdf(url: string): Promise<void> {
  const get = async (retried: boolean): Promise<Response> => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getAccess()}` } });
    if (res.status === 401 && !retried && (await tryRefresh())) return get(true);
    return res;
  };
  const res = await get(false);
  if (!res.ok) throw new ApiError(res.status, `pdf_failed_${res.status}`);
  const objUrl = URL.createObjectURL(await res.blob());
  window.open(objUrl, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
}

/** POST a JSON body and download the returned PDF (e.g. the report engine). */
async function downloadPdfPost(url: string, body: unknown, filename: string): Promise<void> {
  const post = async (retried: boolean): Promise<Response> => {
    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${getAccess()}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.status === 401 && !retried && (await tryRefresh())) return post(true);
    return res;
  };
  const res = await post(false);
  if (!res.ok) throw new ApiError(res.status, `pdf_failed_${res.status}`);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
}

async function downloadPdf(url: string, filename: string): Promise<void> {
  const get = async (retried: boolean): Promise<Response> => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getAccess()}` } });
    if (res.status === 401 && !retried && (await tryRefresh())) return get(true);
    return res;
  };
  const res = await get(false);
  if (!res.ok) throw new ApiError(res.status, res.status === 402 ? "payment_required" : `pdf_failed_${res.status}`);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
}

async function request<T>(path: string, init: RequestInit = {}, auth = true, retried = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getAccess();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  // Expired access token → refresh once and retry. If the refresh token is
  // also dead, the session is truly over → clean sign-out instead of a page
  // full of silent 401s.
  if (res.status === 401 && auth && !retried) {
    if (await tryRefresh()) return request<T>(path, init, auth, true);
    throw new ApiError(401, "session_expired");
  }
  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const body = await res.json();
      // NestJS class-validator returns `message` as an ARRAY of strings; coerce to
      // a single string so callers (which render error.replaceAll(...)) never crash.
      const raw = body?.errors?.[0]?.code ?? body?.message ?? body?.code ?? code;
      code = Array.isArray(raw) ? raw.join("; ") : String(raw);
    } catch {
      /* non-json error */
    }
    // Subscription gate: the gateway returns 402 when the org is PAST_DUE / trial
    // expired. Route the user to the reactivation (payment) screen.
    if (res.status === 402 && typeof window !== "undefined" && !window.location.pathname.startsWith("/reactivate")) {
      window.location.href = "/reactivate";
    }
    throw new ApiError(res.status, code);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  // ── auth ──
  register: (mobile: string, email: string, password?: string) =>
    request<{ userId: string; mobileChallengeId: string; emailChallengeId: string }>(
      "/auth/register",
      // Send the password so the server-OTP signup path persists it — without
      // this the account is created with no password and login always 401s.
      { method: "POST", body: JSON.stringify({ mobile, email, password }) },
      false,
    ),
  /** Forgot-password via Firebase phone OTP (the configured delivery path —
   *  no SMTP/SMS provider needed). Verify the phone in the browser, then post
   *  the Firebase ID token + new password; the backend matches the phone to the
   *  account, sets the password and revokes all sessions. */
  firebaseResetPassword: (idToken: string, newPassword: string) =>
    request<{ reset: boolean }>(
      "/auth/firebase/reset-password",
      { method: "POST", body: JSON.stringify({ idToken, newPassword }) },
      false,
    ),
  sendOtp: (channel: "MOBILE" | "EMAIL", destination: string, purpose: string) =>
    request<{ challengeId: string }>(
      "/auth/otp/send",
      { method: "POST", body: JSON.stringify({ channel, destination, purpose }) },
      false,
    ),
  verifyOtp: (challengeId: string, code: string) =>
    request<{ accessToken: string; refreshToken: string }>(
      "/auth/otp/verify",
      { method: "POST", body: JSON.stringify({ challengeId, code }) },
      false,
    ),

  // Firebase phone-OTP exchange (replaces MSG91). REGISTER = first-time business
  // signup (verified phone + email + password); returns Vertofi tokens.
  firebaseExchange: (input: { idToken: string; mode: "REGISTER" | "MFA"; email?: string; password?: string; userId?: string }) =>
    request<{ tokens: { accessToken: string; refreshToken: string }; userId: string; emailChallengeId?: string }>(
      "/auth/firebase/exchange",
      { method: "POST", body: JSON.stringify(input) },
      false,
    ),

  // Password login for returning business owners (OTP only at first registration).
  passwordLogin: (identifier: string, password: string) =>
    request<{ mfaRequired: boolean; tokens?: { accessToken: string; refreshToken: string }; userId: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ identifier, password }) },
      false,
    ),

  // ── billing (after-payment-only gate) ──
  access: (orgId: string) => request<{ active: boolean; plan: string | null; status: string | null }>(`/billing/${orgId}/access`),
  subscribe: (
    orgId: string,
    plan: string,
    cycle: "MONTHLY" | "YEARLY" = "MONTHLY",
    profile?: { legalName?: string; gstin?: string; email?: string; phone?: string; addressLine?: string; city?: string; state?: string; pincode?: string },
  ) =>
    request<{ subscriptionId: string; shortUrl: string; keyId: string; trialDays: number; cycle: "MONTHLY" | "YEARLY"; amount: number }>("/billing/subscribe", {
      method: "POST",
      body: JSON.stringify({ orgId, plan, cycle, profile }),
    }),

  // ── legal consent (Terms & Conditions / Privacy) ──
  legalDocuments: () =>
    request<{ documents: { id: string; doc_type: string; version: string; title: string; url: string }[] }>("/legal/documents/current", {}, false),
  acceptLegal: (documentIds: string[]) =>
    request<{ accepted: { documentId: string; version: string; recorded: boolean }[] }>("/legal/accept", { method: "POST", body: JSON.stringify({ documentIds }) }),

  // ── onboarding ──
  onboarding: (orgId: string) => request<Record<string, unknown>>(`/onboarding/${orgId}`),
  registerBusinessUser: (mobile: string, email: string) =>
    request<{ userId: string }>("/auth/register-business-user", { method: "POST", body: JSON.stringify({ mobile, email }) }),

  // ── tenant ──
  createOrg: (body: { legalName: string; businessType?: string; industry?: string; gstin?: string; pan?: string; ownerName?: string }) =>
    // Send ONLY the fields CreateOrgDto accepts — the form also collects ownerName,
    // and the gateway's whitelist pipe rejects unknown properties with a 400.
    request<{ id: string }>("/tenant/orgs", {
      method: "POST",
      body: JSON.stringify({
        legalName: body.legalName,
        businessType: body.businessType || undefined,
        industry: body.industry || undefined,
        gstin: body.gstin || undefined,
        pan: body.pan || undefined,
      }),
    }),

  // ── onboarding writes ──
  saveSection: (orgId: string, key: string, payload: Record<string, unknown>) =>
    request<{ sections: Record<string, Record<string, unknown>> }>(`/onboarding/${orgId}/section/${key}`, {
      method: "PUT",
      body: JSON.stringify({ payload }),
    }),
  saveStage: (orgId: string, stage: number, payload: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/onboarding/${orgId}/stage/${stage}`, {
      method: "PUT",
      body: JSON.stringify({ payload }),
    }),
  completeOnboarding: (orgId: string) =>
    request<{ confidence_score: number | null; financial_maturity: string; compliance_risk: string; cashflow_risk: string; completeness: number }>(
      `/onboarding/${orgId}/complete`,
      { method: "POST" },
    ),
  startTrial: (orgId: string) => request<{ status: string }>(`/billing/${orgId}/trial`, { method: "POST" }),
  saveRiskAnswers: (orgId: string, answers: Record<string, boolean>) =>
    request<Record<string, unknown>>(`/onboarding/${orgId}/risk`, { method: "PUT", body: JSON.stringify(answers) }),
  selectProfessional: (orgId: string, professionalId: string) =>
    request<{ selected: string }>(`/onboarding/${orgId}/professional`, {
      method: "POST",
      body: JSON.stringify({ professionalId }),
    }),

  // ── link org → fresh tokens carrying org_id (after onboarding) ──
  linkOrg: (orgId: string) =>
    request<{ accessToken: string; refreshToken: string }>("/auth/link-org", {
      method: "POST",
      body: JSON.stringify({ orgId }),
    }),

  // ── current user's own profile (mobile/email/role) ──
  me: () =>
    request<{ id: string; mobile: string | null; email: string | null; role: string; plan: string; status: string; publicId: string | null }>("/auth/me"),

  // ── final signup activation (PENDING_ONBOARDING → ACTIVE) → fresh tokens ──
  activate: () =>
    request<{ accessToken: string; refreshToken: string }>("/auth/activate", { method: "POST" }),

  // ── Accounting Workspace ──
  acc: {
    customers: (orgId: string, q = "") => request<Record<string, unknown>[]>(`/accounting/${orgId}/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    lookupCustomer: (orgId: string, name: string) => request<Record<string, unknown> | null>(`/accounting/${orgId}/customers/lookup?name=${encodeURIComponent(name)}`),
    addCustomer: (orgId: string, body: Record<string, unknown>) => request<{ id: string }>(`/accounting/${orgId}/customers`, { method: "POST", body: JSON.stringify(body) }),
    products: (orgId: string, q = "") => request<Record<string, unknown>[]>(`/accounting/${orgId}/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    addProduct: (orgId: string, body: Record<string, unknown>) => request<{ id: string }>(`/accounting/${orgId}/products`, { method: "POST", body: JSON.stringify(body) }),
    lookupProduct: (orgId: string, name: string) => request<Record<string, unknown> | null>(`/accounting/${orgId}/products/lookup?name=${encodeURIComponent(name)}`),
    /** Auto-detect HSN/SAC code + GST rate for an item name. Null when unclassifiable. */
    detectHsn: (orgId: string, name: string) =>
      request<{ hsn: string; gstRate: number; description: string; source: string; confidence: string } | null>(`/accounting/${orgId}/products/hsn?name=${encodeURIComponent(name)}`),
    scanProducts: (orgId: string, imageB64: string, mime: string) =>
      request<{ degraded: boolean; products: { name: string; rate: number; hsn?: string; unit?: string; taxRate?: number }[]; reason?: string }>(`/accounting/${orgId}/products/scan`, { method: "POST", body: JSON.stringify({ imageB64, mime }) }),
    bulkProducts: (orgId: string, products: Record<string, unknown>[]) =>
      request<{ added: number; skipped: number }>(`/accounting/${orgId}/products/bulk`, { method: "POST", body: JSON.stringify({ products }) }),
    sales: (orgId: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/sales`),
    createSale: (orgId: string, body: Record<string, unknown>) => request<Record<string, unknown>>(`/accounting/${orgId}/sales`, { method: "POST", body: JSON.stringify(body) }),
    purchases: (orgId: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/purchases`),
    inventory: (orgId: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/inventory`),
    // ── Inventory management ──
    inventoryValuation: (orgId: string) => request<{ skus: number; totalQty: number; totalValue: number; lowStock: number; outOfStock: number }>(`/accounting/${orgId}/inventory/valuation`),
    lowStock: (orgId: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/inventory/low-stock`),
    stockLedger: (orgId: string, productId: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/inventory/${productId}/ledger`),
    adjustStock: (orgId: string, body: Record<string, unknown>) => request<Record<string, unknown>>(`/accounting/${orgId}/inventory`, { method: "POST", body: JSON.stringify(body) }),
    transferStock: (orgId: string, body: Record<string, unknown>) => request<{ transferred: number }>(`/accounting/${orgId}/inventory/transfer`, { method: "POST", body: JSON.stringify(body) }),
    warehouses: (orgId: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/warehouses`),
    createWarehouse: (orgId: string, body: Record<string, unknown>) => request<Record<string, unknown>>(`/accounting/${orgId}/warehouses`, { method: "POST", body: JSON.stringify(body) }),
    categories: (orgId: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/categories`),
    createCategory: (orgId: string, body: Record<string, unknown>) => request<Record<string, unknown>>(`/accounting/${orgId}/categories`, { method: "POST", body: JSON.stringify(body) }),
    batches: (orgId: string, productId?: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/batches${productId ? `?productId=${productId}` : ""}`),
    createBatch: (orgId: string, body: Record<string, unknown>) => request<{ id: string }>(`/accounting/${orgId}/batches`, { method: "POST", body: JSON.stringify(body) }),
    aiDraft: (orgId: string, command: string, kind: "sales" | "purchase" = "sales") =>
      request<{ degraded: boolean; draft: { kind: string; party: Record<string, unknown> | null; items: { name: string; qty: number; rate: number; taxRate: number }[]; totals: { taxable: number; cgst: number; sgst: number; igst: number; total: number } } | null; reason?: string }>(
        `/accounting/${orgId}/ai/draft`,
        { method: "POST", body: JSON.stringify({ command, kind }) },
      ),
    // ── Document engine: catalog, generated documents, PDF downloads ──
    docTypes: () => request<{ type: string; title: string; category: string; description: string; taxTable: boolean; postsToLedger: boolean; needsReference: boolean }[]>("/accounting/doc-types"),
    documents: (orgId: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/documents`),
    createDocument: (orgId: string, body: Record<string, unknown>) =>
      request<{ id: string; number: string }>(`/accounting/${orgId}/documents`, { method: "POST", body: JSON.stringify(body) }),
    /** Download an existing sales invoice as any statutory document type. */
    downloadSalesPdf: (orgId: string, saleId: string, filename = "invoice.pdf", type = "TAX_INVOICE"): Promise<void> =>
      downloadPdf(`${BASE}/accounting/${orgId}/sales/${saleId}/pdf?type=${type}`, filename),
    /** Download a generated document (quotation, credit note, voucher, …). */
    downloadDocPdf: (orgId: string, docId: string, filename = "document.pdf"): Promise<void> =>
      downloadPdf(`${BASE}/accounting/${orgId}/documents/${docId}/pdf`, filename),
    /** Render + download a report-style document (P&L, statement, BHS report, …) from structured sections. */
    downloadReportPdf: (orgId: string, body: { docType: string; title?: string; subtitle?: string; period?: string; sections: unknown[]; save?: boolean }, filename = "report.pdf"): Promise<void> =>
      downloadPdfPost(`${BASE}/accounting/${orgId}/report-pdf`, body, filename),
    /** Open a generated document's PDF in a new tab (auth-fetched blob → preview). */
    previewDocPdf: (orgId: string, docId: string): Promise<void> => openPdf(`${BASE}/accounting/${orgId}/documents/${docId}/pdf`),
    /** Duplicate a document → fresh copy with a new number. */
    duplicateDoc: (orgId: string, docId: string) => request<{ id: string; number: string }>(`/accounting/${orgId}/documents/${docId}/duplicate`, { method: "POST" }),
    /** Convert a document to another type (e.g. Quotation → Tax Invoice). */
    convertDoc: (orgId: string, docId: string, toType: string) => request<{ kind: string; id?: string; number?: string; invoiceNo?: string }>(`/accounting/${orgId}/documents/${docId}/convert`, { method: "POST", body: JSON.stringify({ toType }) }),
    /** Full document detail incl. audit trail + approval history (timeline drawer). */
    docDetail: (orgId: string, docId: string) => request<{ id: string; doc_type: string; number: string; status: string; whatsapp_status: string | null; party_name: string | null; total: number | null; audit_trail: { action: string; by?: string; at: string; meta?: Record<string, unknown> }[]; approval_history: unknown[]; created_at: string; updated_at: string } | null>(`/accounting/${orgId}/documents/${docId}/detail`),
    /** Record a document lifecycle action (APPROVED/SENT/DOWNLOADED/…). */
    docAction: (orgId: string, docId: string, action: string) =>
      request<{ id: string; action: string }>(`/accounting/${orgId}/documents/${docId}/action`, { method: "POST", body: JSON.stringify({ action }) }),
  },

  // ── GST e-invoice / e-way bill + GSTIN lookup (via GSP connector) ──
  gst: {
    einvoice: (invoice: Record<string, unknown>) => request<{ connector: string; irn?: string; qr?: string }>("/gst/einvoice", { method: "POST", body: JSON.stringify(invoice) }),
    ewaybill: (invoice: Record<string, unknown>) => request<{ connector: string; ewbNo?: string; validUpto?: string }>("/gst/ewaybill", { method: "POST", body: JSON.stringify(invoice) }),
    /** Resolve a GSTIN → normalized taxpayer profile for autofill (state+PAN always; name/address when GSP active). */
    lookup: (gstin: string) => request<GstinProfile>(`/gst/lookup/${encodeURIComponent(gstin.trim().toUpperCase())}`),
  },

  // ── module pages (every sidebar feature → its real backend) ──
  mod: {
    org: (orgId: string) => request<Record<string, unknown>>(`/tenant/orgs/${orgId}`),
    pnl: (orgId: string) => request<Record<string, unknown>>(`/reports/${orgId}/pnl`),
    gstSummary: (orgId: string) => request<Record<string, unknown>>(`/reports/${orgId}/gst-summary`),
    taxWarning: (orgId: string) => request<Record<string, unknown>>(`/predict/${orgId}/tax-warning`),
    profitLeaks: (orgId: string) => request<Record<string, unknown>>(`/predict/${orgId}/profit-leaks`),
    bhsHistory: (orgId: string) => request<Record<string, unknown>[]>(`/bhs/${orgId}/history`),
    // ── Composed reports (built from available endpoints) ──
    trialBalance: async (orgId: string) => {
      const [bs, pnl] = await Promise.all([
        request<Record<string, unknown>>(`/reports/${orgId}/balance-sheet`).catch(() => ({})),
        request<Record<string, unknown>>(`/reports/${orgId}/pnl`).catch(() => ({})),
      ]);
      const toNum = (v: unknown) => (typeof v === "number" ? v : 0);
      const assets = toNum((bs as Record<string, unknown>).totalAssets);
      const liabilities = toNum((bs as Record<string, unknown>).totalLiabilities);
      const equity = toNum((bs as Record<string, unknown>).totalEquity);
      const income = toNum((pnl as Record<string, unknown>).income);
      const expense = toNum((pnl as Record<string, unknown>).expense);
      const netProfit = toNum((pnl as Record<string, unknown>).netProfit);
      return {
        accounts: [
          { account: "Total Assets", debit: assets, credit: 0 },
          { account: "Total Liabilities", debit: 0, credit: liabilities },
          { account: "Owner Equity", debit: 0, credit: equity },
          { account: "Income", debit: 0, credit: income },
          { account: "Expenses", debit: expense, credit: 0 },
          { account: "Net Profit / (Loss)", debit: netProfit < 0 ? Math.abs(netProfit) : 0, credit: netProfit >= 0 ? netProfit : 0 },
        ] as { account: string; debit: number; credit: number }[],
        totalDebit: assets + expense + (netProfit < 0 ? Math.abs(netProfit) : 0),
        totalCredit: liabilities + equity + income + (netProfit >= 0 ? netProfit : 0),
      };
    },
    generalLedger: async (orgId: string) => {
      const [sales, purchases] = await Promise.all([
        request<Record<string, unknown>[]>(`/accounting/${orgId}/sales`).catch(() => [] as Record<string, unknown>[]),
        request<Record<string, unknown>[]>(`/accounting/${orgId}/purchases`).catch(() => [] as Record<string, unknown>[]),
      ]);
      const entries: { date: string; particulars: string; type: string; debit: number; credit: number; ref: string }[] = [];
      for (const s of sales as Record<string, unknown>[]) {
        entries.push({ date: String(s.date ?? s.created_at ?? ""), particulars: String(s.customer_name ?? "Customer"), type: "Sales", debit: 0, credit: Number(s.total ?? 0), ref: String(s.invoice_no ?? s.id ?? "") });
      }
      for (const p of purchases as Record<string, unknown>[]) {
        entries.push({ date: String(p.date ?? p.created_at ?? ""), particulars: String(p.vendor_name ?? "Vendor"), type: "Purchase", debit: Number(p.total ?? 0), credit: 0, ref: String(p.bill_no ?? p.id ?? "") });
      }
      entries.sort((a, b) => a.date.localeCompare(b.date));
      return { entries, totalDebit: entries.reduce((s, e) => s + e.debit, 0), totalCredit: entries.reduce((s, e) => s + e.credit, 0) };
    },
    accountStatement: async (orgId: string) => {
      const sales = await request<Record<string, unknown>[]>(`/accounting/${orgId}/sales`).catch(() => [] as Record<string, unknown>[]);
      let balance = 0;
      const rows = (sales as Record<string, unknown>[]).map(s => {
        balance += Number(s.total ?? 0);
        return { date: String(s.date ?? s.created_at ?? ""), description: `Invoice ${String(s.invoice_no ?? "")} — ${String(s.customer_name ?? "")}`, credit: Number(s.total ?? 0), debit: 0, balance, status: String(s.status ?? "") };
      });
      return { rows, closingBalance: balance };
    },
    itcReconciliation: async (orgId: string) => {
      const [gst, purchases] = await Promise.all([
        request<Record<string, unknown>>(`/reports/${orgId}/gst-summary`).catch(() => ({})),
        request<Record<string, unknown>[]>(`/accounting/${orgId}/purchases`).catch(() => [] as Record<string, unknown>[]),
      ]);
      const inputGst = Number((gst as Record<string, unknown>).inputGst ?? (gst as Record<string, unknown>).input ?? 0);
      const claimedItc = inputGst;
      const eligibleItc = (purchases as Record<string, unknown>[]).reduce((s, p) => s + Number(p.cgst ?? 0) + Number(p.sgst ?? 0) + Number(p.igst ?? 0), 0);
      return {
        items: (purchases as Record<string, unknown>[]).map(p => ({
          vendor: String(p.vendor_name ?? "—"),
          billNo: String(p.bill_no ?? "—"),
          date: String(p.date ?? p.created_at ?? ""),
          igst: Number(p.igst ?? 0),
          cgst: Number(p.cgst ?? 0),
          sgst: Number(p.sgst ?? 0),
          status: "Matched",
        })),
        claimedItc,
        eligibleItc,
        difference: claimedItc - eligibleItc,
      };
    },
    eInvoiceList: async (orgId: string) => {
      const sales = await request<Record<string, unknown>[]>(`/accounting/${orgId}/sales`).catch(() => [] as Record<string, unknown>[]);
      return {
        invoices: (sales as Record<string, unknown>[]).map(s => ({
          invoiceNo: String(s.invoice_no ?? "—"),
          date: String(s.date ?? s.created_at ?? ""),
          buyer: String(s.customer_name ?? "—"),
          gstin: String(s.customer_gstin ?? "—"),
          total: Number(s.total ?? 0),
          status: String(s.status ?? "GENERATED"),
          irn: s.irn ? String(s.irn) : "Pending",
        })),
        total: (sales as Record<string, unknown>[]).length,
      };
    },
    ewayBillSummary: async (orgId: string) => {
      const sales = await request<Record<string, unknown>[]>(`/accounting/${orgId}/sales`).catch(() => [] as Record<string, unknown>[]);
      const eligible = (sales as Record<string, unknown>[]).filter(s => Number(s.total ?? 0) >= 50000);
      return {
        bills: eligible.map(s => ({
          invoiceNo: String(s.invoice_no ?? "—"),
          date: String(s.date ?? s.created_at ?? ""),
          consignee: String(s.customer_name ?? "—"),
          value: Number(s.total ?? 0),
          status: s.eway_bill_no ? "Generated" : "Pending",
          ewbNo: s.eway_bill_no ? String(s.eway_bill_no) : "—",
        })),
        total: eligible.length,
      };
    },
    lifeguard: (orgId: string) => request<Record<string, unknown>[]>(`/lifeguard/${orgId}`),
    lifeguardSos: (orgId: string, body: Record<string, unknown>) => request<Record<string, unknown>>(`/lifeguard/${orgId}/sos`, { method: "POST", body: JSON.stringify(body) }),
    warrantyClaims: (orgId: string) => request<Record<string, unknown>[]>(`/warranty/${orgId}/claims`),
    warrantyClaim: (orgId: string, body: Record<string, unknown>) => request<Record<string, unknown>>(`/warranty/${orgId}/claims`, { method: "POST", body: JSON.stringify(body) }),
    vendorTrust: (orgId: string) => request<Record<string, unknown>>(`/vendors/${orgId}/trust`),
    vendorCheck: (gstin: string) => request<Record<string, unknown>>(`/vendors/check/${gstin}`),
    benchmarks: (industry: string) => request<Record<string, unknown>>(`/benchmarks/industry/${encodeURIComponent(industry)}`),
    vbdSimulate: (orgId: string, body: Record<string, unknown>) => request<Record<string, unknown>>(`/vbd/${orgId}/simulate`, { method: "POST", body: JSON.stringify(body) }),
    reconMatches: (orgId: string) => request<Record<string, unknown>[]>(`/reconcile/${orgId}/matches`),
    reconUnmatched: (orgId: string) => request<Record<string, unknown>[]>(`/reconcile/${orgId}/unmatched`),
    gstStatus: () => request<Record<string, unknown>>("/gst/status"),
    comments: (orgId: string, entityType: string, entityId: string) =>
      request<Record<string, unknown>[]>(`/accounting/${orgId}/comments?entityType=${entityType}&entityId=${entityId}`),
    addComment: (orgId: string, entityType: string, entityId: string, body: string) =>
      request<Record<string, unknown>>(`/accounting/${orgId}/comments`, { method: "POST", body: JSON.stringify({ entityType, entityId, body }) }),
    documents: (orgId: string) => request<Record<string, unknown>[]>(`/documents/${orgId}`),
    balanceSheet: (orgId: string) => request<Record<string, unknown>>(`/reports/${orgId}/balance-sheet`),
    expenses: (orgId: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/expenses`),
    addExpense: (orgId: string, body: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/accounting/${orgId}/expenses`, { method: "POST", body: JSON.stringify(body) }),
    vendors: (orgId: string) => request<Record<string, unknown>[]>(`/accounting/${orgId}/vendors`),
    auditTimeline: (orgId: string, limit = 50) => request<Record<string, unknown>>(`/audit/${orgId}/timeline?limit=${limit}`),
    auditVerify: () => request<{ checked: number; breaks: number; intact: boolean }>("/audit/verify"),
    assignProfessional: (vertofiId: string, scope = "FULL") => request<{ requestId: string; professional: string; status: string }>("/access/assign-professional", { method: "POST", body: JSON.stringify({ vertofiId, scope }) }),
    myProfessionals: () => request<{ grant_id: string | null; request_id: string | null; state: string; grantee_id: string; permission: string; scope: string; public_id: string | null; email: string | null; role: string; professional_type: string | null }[]>("/access/my-professionals"),
    revokeProfessional: (granteeId: string) => request<{ revoked: boolean }>(`/access/my-professionals/${granteeId}`, { method: "DELETE" }),
    cancelProfessionalRequest: (requestId: string) => request<{ cancelled: boolean }>(`/access/my-professionals/request/${requestId}`, { method: "DELETE" }),
    salesPdfUrl: (orgId: string, saleId: string) => `${BASE}/accounting/${orgId}/sales/${saleId}/pdf?type=TAX_INVOICE`,
    /**
     * Download a PDF reliably: authorized fetch (with the same single-flight
     * refresh as every API call), explicit error on failure, and an
     * <a download> click — window.open() in a .then() gets popup-blocked,
     * which made downloads silently "do nothing".
     */
    downloadSalesPdf: async (orgId: string, saleId: string, filename = "invoice.pdf", type = "TAX_INVOICE"): Promise<void> =>
      downloadPdf(`${BASE}/accounting/${orgId}/sales/${saleId}/pdf?type=${type}`, filename),
  },

  // ── dashboard reads ──
  bhs: (orgId: string) => request<{ score: number | null; rating: string }>(`/bhs/${orgId}`),
  moneyMap: (orgId: string) =>
    request<{ inflow: number; outflow: number; net: number; hasData: boolean; spendByCategory: { category: string; amount: number }[] }>(
      `/reports/${orgId}/moneymap`,
    ),
  cashflow: (orgId: string) =>
    request<{ hasData: boolean; runwayDays: number | null; risk: string }>(`/predict/${orgId}/cashflow`),

  // ── notifications feed (Recent activity on the dashboard) ──
  notifications: (unread = false) =>
    request<{ id: string; title: string; body: string; severity: string; created_at: string }[]>(
      `/notifications?unread=${unread ? "true" : "false"}`,
    ),

  // ── documents (real Zero-Data-Entry upload via presigned S3) ──
  presignDoc: (orgId: string, type: string, filename: string, contentType: string) =>
    request<{ documentId: string; uploadUrl: string; key: string }>(`/documents/${orgId}/presign`, {
      method: "POST",
      body: JSON.stringify({ type, filename, contentType }),
    }),
  commitDoc: (orgId: string, documentId: string) =>
    request<{ documentId: string; status: string }>(`/documents/${orgId}/${documentId}/commit`, { method: "POST" }),
};
