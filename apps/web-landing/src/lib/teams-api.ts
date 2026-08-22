"use client";
import { getAccess } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getAccess();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompanyAssignment {
  id: string;
  org_id: string;
  org_name: string;
  access_level: "READ" | "READ_WRITE";
  assigned_at: string;
}

export interface AccessRequest {
  id: string;
  org_id: string;
  org_name: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  requested_at: string;
  decided_at?: string;
}

// ── API client ────────────────────────────────────────────────────────────────

export const api = {
  // Auth endpoints
  sendOtp: (destination: string) =>
    request<{ challengeId: string }>("/auth/otp/send", { method: "POST", body: JSON.stringify({ channel: "MOBILE", destination, purpose: "LOGIN" }) }, false),
  verifyOtp: (challengeId: string, code: string) =>
    request<{ accessToken: string; refreshToken: string }>("/auth/otp/verify", { method: "POST", body: JSON.stringify({ challengeId, code }) }, false),

  // Teams-specific endpoints
  myAssignments: () => request<CompanyAssignment[]>("/admin-console/my/assignments"),
  requestAccess: (orgId: string, reason?: string) =>
    request<{ ok: boolean }>("/admin-console/my/access-requests", { method: "POST", body: JSON.stringify({ orgId, reason }) }),

  // Client workspace (from existing structure)
  exceptions: (orgId: string, status = "OPEN") => request<unknown[]>(`/exceptions/${orgId}?status=${status}`),
  flagFlaw: (orgId: string, body: { title: string; detail: string }) =>
    request(`/exceptions/${orgId}/flag`, { method: "POST", body: JSON.stringify(body) }),
  ledgerEntries: (orgId: string) => request<unknown[]>(`/ledger/${orgId}/entries`),
  bhsLatest: (orgId: string) => request<{ score: number | null; rating: string }>(`/bhs/${orgId}`),
};
