"use client";

/** Token storage + lightweight JWT claim decoding (client-side display only;
 *  the gateway + services re-verify every token). */
const ACCESS_KEY = "vertofi.panels.access";
const REFRESH_KEY = "vertofi.panels.refresh";

export type Role =
  | "ADMIN"
  | "TEAM_LEAD"
  | "TEAM_MEMBER"
  | "ASSOCIATE"
  | "ACCOUNTANT"
  | "BUSINESS_OWNER"
  | "BUSINESS_USER"
  | "BHS_ANALYST"
  | "LAWYER";

export interface Claims {
  sub: string;
  role: Role;
  professionalType?: string;
  orgId?: string;
  plan?: string;
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
export function getAccess(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY);
}

export function decodeClaims(): Claims | null {
  const token = getAccess();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))));
    return { sub: json.sub, role: json.role, professionalType: json.professionalType, orgId: json.orgId, plan: json.plan };
  } catch {
    return null;
  }
}

/**
 * Which panel route a role lands on by default. Admin and Team roles are NOT
 * served here — they live in the isolated internal portal (apps/web-admin),
 * deployed separately and not linked from the public site. If such a token ever
 * reaches this public app, it is bounced to login.
 */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/login",
  TEAM_LEAD: "/login",
  TEAM_MEMBER: "/login",
  ASSOCIATE: "/associates",
  ACCOUNTANT: "/accountants",
  BHS_ANALYST: "/bhs",
  LAWYER: "/legal",
  BUSINESS_OWNER: "/associates", // business users belong in the business app
  BUSINESS_USER: "/associates",
};
