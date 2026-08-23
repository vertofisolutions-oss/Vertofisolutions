"use client";
import { getAccess } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

/** Single-flight token refresh — see web-business api.ts for the rationale
 *  (refresh tokens rotate; concurrent refreshes would revoke the session). */
let refreshing: Promise<boolean> | null = null;
function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const rt = typeof window === "undefined" ? null : localStorage.getItem("vertofi.panels.refresh");
      if (!rt) return false;
      try {
        const res = await fetch(`${BASE}/auth/token/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) return false;
        const t = (await res.json()) as { accessToken: string; refreshToken: string };
        localStorage.setItem("vertofi.panels.access", t.accessToken);
        localStorage.setItem("vertofi.panels.refresh", t.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      setTimeout(() => { refreshing = null; }, 0);
    });
  }
  return refreshing;
}

async function request<T>(path: string, init: RequestInit = {}, auth = true, retried = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getAccess();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401 && auth && !retried) {
    if (await tryRefresh()) return request<T>(path, init, auth, true);
    // Redirect suppressed
    throw new ApiError(401, "session_expired");
  }
  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const body = await res.json();
      code = body?.errors?.[0]?.code ?? body?.message ?? body?.code ?? code;
    } catch {
      /* non-json */
    }
    throw new ApiError(res.status, code);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  // auth (OTP-first works for every role; the JWT carries the role)
  sendOtp: (destination: string) =>
    request<{ challengeId: string }>(
      "/auth/otp/send",
      { method: "POST", body: JSON.stringify({ channel: "MOBILE", destination, purpose: "LOGIN" }) },
      false,
    ),
  verifyOtp: (challengeId: string, code: string) =>
    request<{ accessToken: string; refreshToken: string }>(
      "/auth/otp/verify",
      { method: "POST", body: JSON.stringify({ challengeId, code }) },
      false,
    ),
  sendResetOtp: (destination: string) =>
    request<{ challengeId: string }>(
      "/auth/otp/send",
      { method: "POST", body: JSON.stringify({ channel: "MOBILE", destination, purpose: "RESET" }) },
      false,
    ),
  resetPassword: (challengeId: string, code: string, newPassword: string) =>
    request<{ reset: boolean }>(
      "/auth/otp/reset-password",
      { method: "POST", body: JSON.stringify({ challengeId, code, newPassword }) },
      false,
    ),
  listAccountants: () => request<Record<string, any>[]>("/auth/accountants"),
  registerAccountant: (mobile: string, email: string) =>
    request<{ userId: string }>("/auth/register-accountant", { method: "POST", body: JSON.stringify({ mobile, email }) }),

  // admin / access
  createGrant: (body: Record<string, unknown>) => request("/access/grants", { method: "POST", body: JSON.stringify(body) }),
  decideRequest: (id: string, decision: "APPROVE" | "DENY") =>
    request(`/access/access-requests/${id}/decide`, { method: "POST", body: JSON.stringify({ decision }) }),
  createTeam: (name: string) => request<{ id: string }>("/tenant/teams", { method: "POST", body: JSON.stringify({ name }) }),

  // teams / associates / accountants — shared exception + reconcile reads
  exceptions: (orgId: string, status = "OPEN") => request<unknown[]>(`/exceptions/${orgId}?status=${status}`),
  flagFlaw: (orgId: string, body: { title: string; detail: string }) =>
    request(`/exceptions/${orgId}/flag`, { method: "POST", body: JSON.stringify(body) }),
  requestAccess: (orgId: string, reason: string) =>
    request("/access/access-requests", { method: "POST", body: JSON.stringify({ orgId, reason }) }),
  reconcileMatches: (orgId: string) => request<unknown[]>(`/reconcile/${orgId}/matches`),
  ledgerEntries: (orgId: string) => request<unknown[]>(`/ledger/${orgId}/entries`),
  bhsLatest: (orgId: string) => request<{ score: number | null; rating: string }>(`/bhs/${orgId}`),

  // bhs intelligence panel
  bhsPortfolio: () => request<{ clients: Record<string, unknown>[] }>("/bhs-intel/portfolio"),

  // the professional's assigned clients (active grants) — My Clients picker
  myClients: () =>
    request<{ org_id: string; org_name: string; vertofi_id: string; permission: string; scope: string }[]>("/access/my-clients"),

  // professional assignment inbox (owner assigned you by your Vertofi ID)
  incomingRequests: () =>
    request<{ id: string; scope: string | null; created_at: string; org_name: string; vertofi_id: string }[]>(
      "/access/requests/incoming",
    ),
  respondRequest: (id: string, accept: boolean) =>
    request<{ status: string; grantId?: string }>(`/access/requests/${id}/respond`, {
      method: "POST",
      body: JSON.stringify({ accept }),
    }),

  // legal panel
  legalCases: (status = "OPEN") => request<Record<string, unknown>[]>(`/legal/cases?status=${status}`),
  legalAnalyze: (id: string, notice: string) =>
    request(`/legal/cases/${id}/analyze`, { method: "POST", body: JSON.stringify({ notice }) }),
};
