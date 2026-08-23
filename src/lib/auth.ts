"use client";

/** Token storage + lightweight JWT claim decoding */
const ACCESS_KEY = "vertofi.panels.access";
const REFRESH_KEY = "vertofi.panels.refresh";

export type Role =
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
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("vertofi.access");
  localStorage.removeItem("vertofi.refresh");
  localStorage.removeItem("vertofi.orgId");
}

export function getAccess(): string | null {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem(ACCESS_KEY) || localStorage.getItem("vertofi.access");
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

export const ROLE_HOME: Record<Role, string> = {
  ASSOCIATE: "/associates",
  ACCOUNTANT: "/accountants",
  BHS_ANALYST: "/bhs-portal",
  LAWYER: "/legal-portal",
  BUSINESS_OWNER: "/workspace",
  BUSINESS_USER: "/workspace",
};
