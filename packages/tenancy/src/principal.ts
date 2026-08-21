/** Roles across the 7 panels (see docs/03 & docs/04). */
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

export type ProfessionalType = "CA" | "CMA" | "CPA" | "CS" | "ACCA" | "CFA";

export type Permission = "VIEW" | "EDIT";

export type GrantScope = "FULL" | "BHS_ONLY" | "CASES_ONLY" | "DOCUMENTS";

export type Plan = "STARTER" | "GROWTH" | "PRO" | "ENTERPRISE";

/** The authenticated principal, derived from a verified JWT. */
export interface Principal {
  userId: string;
  role: Role;
  professionalType?: ProfessionalType;
  /** The principal's own org (for BUSINESS_* roles). */
  orgId?: string;
  /** For ACCOUNTANT: the associate they belong to. */
  parentAssociateId?: string;
  plan?: Plan;
  sessionId: string;
}

/** The resolved access scope a principal currently has (from the access service). */
export interface EffectiveScope {
  /** Orgs this principal may touch. "*" means all (ADMIN). */
  orgIds: string[] | "*";
  permission: Permission;
  scope: GrantScope;
}

export const ROLES_WITH_GLOBAL_ACCESS: Role[] = ["ADMIN"];
export const READ_ONLY_ROLES: Role[] = ["TEAM_LEAD", "TEAM_MEMBER", "ACCOUNTANT", "BHS_ANALYST"];

export function isReadOnly(role: Role): boolean {
  return READ_ONLY_ROLES.includes(role);
}
