"use client";

/** Internal portal auth. Separate storage keys so an admin/team session never
 *  collides with a public-app session in the same browser. Only Admin + Team
 *  roles are permitted here; everyone else is rejected. */
const ACCESS_KEY = "vertofi.access";
const REFRESH_KEY = "vertofi.refresh";

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

export const INTERNAL_ROLES: Role[] = ["ADMIN", "TEAM_LEAD", "TEAM_MEMBER"];

export interface Claims {
  sub: string;
  role: Role;
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
    return { sub: json.sub, role: json.role };
  } catch {
    return null;
  }
}

export function homeFor(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "TEAM_LEAD" || role === "TEAM_MEMBER") return "/teams";
  return "/login"; // non-internal roles are not allowed in this portal
}

export function isInternal(role: Role): boolean {
  return INTERNAL_ROLES.includes(role);
}
