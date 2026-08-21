"use client";
import { getAccess } from "./auth";

/** Internal portal API client. Points at the same gateway (role-gated on the
 *  server), but the portal itself is served only on the internal network. */
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

export interface ProfessionalProfile {
  user_id: string;
  professional_type: string;
  full_name: string | null;
  membership_no: string | null;
  cop_no: string | null;
  firm_name: string | null;
  firm_registration_no: string | null;
  years_experience: number | null;
  specializations: string[] | null;
  office_address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  verification_status: string;
  documents: { type: string; filename: string; documentId?: string; status?: string }[];
  email: string | null;
  mobile: string | null;
  public_id: string | null;
  account_status: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  employee_id: string;
  user_id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  job_title: string | null;
  status: string;
  pending_requests: number;
  assignment_count: number;
  created_at: string;
}

export interface CompanyAssignment {
  id: string;
  team_member_id: string;
  org_id: string;
  org_name: string;
  access_level: "READ" | "READ_WRITE";
  assigned_at: string;
}

export interface AccessRequest {
  id: string;
  team_member_id: string;
  team_member_name: string;
  employee_id: string;
  org_id: string;
  org_name: string;
  reason: string | null;
  status: string;
  requested_at: string;
}

export interface IpEntry {
  id: string;
  ip_address: string;
  label: string;
  panel: "ADMIN" | "TEAMS" | "BOTH";
  expires_at: string | null;
  added_by_name: string | null;
  created_at: string;
}

export interface PanelToken {
  id: string;
  panel: "ADMIN" | "TEAMS";
  label: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  team_member_id: string | null;
  team_member_name: string | null;
  employee_id: string | null;
}

// ── API client ────────────────────────────────────────────────────────────────

export const api = {
  // ── Auth (admin OTP login, unchanged) ──
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

  // ── Admin console (ADMIN-only) ──
  overview: () => request<Record<string, unknown>>("/admin-console/overview"),
  metrics: () => request<{ orgsByMonth: { label: string; orgs: number }[]; revenueByMonth: { label: string; revenue: number }[]; signupsByWeek: { label: string; signups: number }[] }>("/admin-console/metrics"),
  dues: () => request<{ totalDue: number; currency: string; dues: Record<string, unknown>[] }>("/admin-console/billing/dues"),
  aiUsage: () => request<Record<string, unknown>>("/admin-console/ai-usage"),
  cloudBilling: () => request<Record<string, unknown>>("/admin-console/cloud-billing"),
  cloudStatus: () => request<{ connector: string; services: { name: string; status: string; region: string }[] }>("/admin-console/cloud-status"),
  cicd: () => request<{ connector: string; runs: Record<string, unknown>[] }>("/admin-console/cicd"),
  risks: () => request<Record<string, unknown>>("/admin-console/risks"),
  accessLog: () => request<{ log: Record<string, unknown>[] }>("/admin-console/access-log"),
  tables: () => request<{ key: string; label: string; group: string; schema: string; table: string; columns: string[]; editable: string[] }[]>("/admin-console/tables"),
  tableGroups: () => request<{ group: string; entities: { key: string; label: string }[] }[]>("/admin-console/tables/groups"),
  landingContacts: () => request<Record<string, unknown>[]>("/landing-contacts"),
  table: (key: string, limit = 50, offset = 0, q = "") =>
    request<{ key: string; columns: string[]; editable: string[]; pk: string; total: number; rows: Record<string, unknown>[] }>(
      `/admin-console/tables/${key}?limit=${limit}&offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    ),
  updateRow: (key: string, id: string, patch: Record<string, unknown>) =>
    request<{ updated: Record<string, unknown> }>(`/admin-console/tables/${key}/${id}`, { method: "PATCH", body: JSON.stringify({ patch }) }),
  viewDocument: (id: string) =>
    request<{ url: string; filename: string; contentType: string }>(`/admin-console/documents/${id}/view`),

  // ── Team Members (ADMIN) ──
  listTeamMembers: (params: { q?: string; status?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.status) qs.set("status", params.status);
    qs.set("limit", String(params.limit ?? 50));
    qs.set("offset", String(params.offset ?? 0));
    return request<{ members: TeamMember[]; total: number }>(`/admin-console/team-members?${qs}`);
  },
  createTeamMember: (body: { fullName: string; email: string; mobile?: string; jobTitle?: string; password: string }) =>
    request<TeamMember>("/admin-console/team-members", { method: "POST", body: JSON.stringify(body) }),
  getTeamMember: (id: string) =>
    request<{ member: TeamMember; assignments: CompanyAssignment[] }>(`/admin-console/team-members/${id}`),
  updateTeamMember: (id: string, body: { fullName?: string; jobTitle?: string; mobile?: string }) =>
    request<TeamMember>(`/admin-console/team-members/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  resetTeamPassword: (id: string, newPassword: string) =>
    request<{ ok: boolean }>(`/admin-console/team-members/${id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword }) }),
  suspendTeamMember: (id: string) =>
    request<{ ok: boolean }>(`/admin-console/team-members/${id}/suspend`, { method: "POST", body: "{}" }),
  activateTeamMember: (id: string) =>
    request<{ ok: boolean }>(`/admin-console/team-members/${id}/activate`, { method: "POST", body: "{}" }),
  forceLogout: (id: string) =>
    request<{ revokedSessions: number }>(`/admin-console/team-members/${id}/sessions`, { method: "DELETE" }),

  // Company assignments
  listAssignments: (memberId: string) => request<CompanyAssignment[]>(`/admin-console/team-members/${memberId}/assignments`),
  assignCompany: (memberId: string, orgId: string, accessLevel: "READ" | "READ_WRITE") =>
    request<CompanyAssignment>(`/admin-console/team-members/${memberId}/assignments`, { method: "POST", body: JSON.stringify({ orgId, accessLevel }) }),
  updateAssignmentAccess: (memberId: string, orgId: string, accessLevel: "READ" | "READ_WRITE") =>
    request<CompanyAssignment>(`/admin-console/team-members/${memberId}/assignments/${orgId}`, { method: "PATCH", body: JSON.stringify({ accessLevel }) }),
  removeAssignment: (memberId: string, orgId: string) =>
    request<{ ok: boolean }>(`/admin-console/team-members/${memberId}/assignments/${orgId}`, { method: "DELETE" }),

  // Access requests
  listAccessRequests: (status?: string) =>
    request<AccessRequest[]>(`/admin-console/access-requests${status ? `?status=${status}` : ""}`),
  approveRequest: (id: string, accessLevel: "READ" | "READ_WRITE", adminPassword: string) =>
    request<{ ok: boolean }>(`/admin-console/access-requests/${id}/approve`, { method: "POST", body: JSON.stringify({ accessLevel, adminPassword }) }),
  rejectRequest: (id: string, reason?: string) =>
    request<{ ok: boolean }>(`/admin-console/access-requests/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),

  // ── IP Allowlist (ADMIN) ──
  listIpAllowlist: () => request<IpEntry[]>("/admin-console/ip-allowlist"),
  addIp: (body: { ipAddress: string; label: string; panel: "ADMIN" | "TEAMS" | "BOTH"; expiresAt?: string }) =>
    request<IpEntry>("/admin-console/ip-allowlist", { method: "POST", body: JSON.stringify(body) }),
  removeIp: (id: string) => request<{ ok: boolean }>(`/admin-console/ip-allowlist/${id}`, { method: "DELETE" }),

  // ── Panel Access Tokens (ADMIN) ──
  listPanelTokens: (panel?: "ADMIN" | "TEAMS") =>
    request<PanelToken[]>(`/admin-console/panel-tokens${panel ? `?panel=${panel}` : ""}`),
  generateToken: (body: { panel: "ADMIN" | "TEAMS"; label: string; teamMemberId?: string }) =>
    request<{ id: string; token: string; activationUrl: string }>("/admin-console/panel-tokens", { method: "POST", body: JSON.stringify(body) }),
  revokeToken: (id: string) =>
    request<{ ok: boolean }>(`/admin-console/panel-tokens/${id}`, { method: "DELETE" }),

  // ── Professional (CA/CMA/CS/…) verification queue ──
  pendingProfessionals: () => request<ProfessionalProfile[]>("/auth/professional/pending"),
  verifyProfessional: (userId: string, approve: boolean, note?: string) =>
    request<{ status: string }>(`/auth/professional/${userId}/verify`, { method: "POST", body: JSON.stringify({ approve, note }) }),
  professionalKyc: (userId: string) =>
    request<{ id: string; type: string; filename: string; status: string }[]>(`/documents/kyc/list/${userId}`),
  kycDownload: (documentId: string) =>
    request<{ url: string }>(`/documents/kyc/${documentId}/download`, { method: "POST" }),

  // ── Legacy governance (kept for backward compat) ──
  createTeam: (name: string) => request<{ id: string }>("/tenant/teams", { method: "POST", body: JSON.stringify({ name }) }),
  assignTeam: (teamId: string, orgId: string) =>
    request(`/tenant/teams/${teamId}/assign`, { method: "POST", body: JSON.stringify({ orgId }) }),
  createGrant: (body: Record<string, unknown>) => request("/access/grants", { method: "POST", body: JSON.stringify(body) }),
  decideRequest: (id: string, decision: "APPROVE" | "DENY") =>
    request(`/access/access-requests/${id}/decide`, { method: "POST", body: JSON.stringify({ decision }) }),

  // teams panel helpers
  exceptions: (orgId: string, status = "OPEN") => request<unknown[]>(`/exceptions/${orgId}?status=${status}`),
  ledgerEntries: (orgId: string) => request<unknown[]>(`/ledger/${orgId}/entries`),
  bhsLatest: (orgId: string) => request<{ score: number | null; rating: string }>(`/bhs/${orgId}`),
  flagFlaw: (orgId: string, body: { title: string; detail: string; severity?: string }) =>
    request<{ id: string }>(`/exceptions/${orgId}/flag`, { method: "POST", body: JSON.stringify(body) }),
  requestAccess: (orgId: string, reason: string) =>
    request<{ ok: boolean }>(`/admin-console/my/access-requests`, { method: "POST", body: JSON.stringify({ orgId, reason }) }),
};
