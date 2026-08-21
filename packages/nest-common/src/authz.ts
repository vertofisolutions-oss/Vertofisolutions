import { ForbiddenException } from "@nestjs/common";
import type { PoolClient } from "pg";
import type { EffectiveScope, Permission, Principal } from "@vertofi/tenancy";

const BUSINESS_ROLES = ["BUSINESS_OWNER", "BUSINESS_USER"];
const READ_ONLY_ROLES = ["TEAM_LEAD", "TEAM_MEMBER", "ACCOUNTANT", "BHS_ANALYST"];

/**
 * Object-level authorization for org-scoped requests (closes the IDOR class):
 * proves the principal is ACTUALLY entitled to the requested `orgId` before any
 * query runs — not just that their role is allowed on the route.
 *
 *  - ADMIN              → all orgs
 *  - BUSINESS_OWNER/USER→ only their own org (org_id in the JWT must match)
 *  - ASSOCIATE          → must hold an ACTIVE grant for the org
 *  - ACCOUNTANT         → inherits their parent associate's grant (VIEW)
 *  - TEAM_LEAD/MEMBER   → must hold an ACTIVE grant for the org (VIEW)
 *  - BHS_ANALYST        → ACTIVE grant with scope BHS_ONLY (VIEW)
 *  - LAWYER             → ACTIVE grant with scope CASES_ONLY
 *
 * Throws ForbiddenException when not entitled. Returns the EffectiveScope to
 * feed into setRlsContext(). Reads `access.access_grants` (no RLS) on the same
 * transaction client.
 */
export async function assertGrantedScope(
  client: PoolClient,
  principal: Principal,
  orgId: string,
  required: Permission = "VIEW",
): Promise<EffectiveScope> {
  if (principal.role === "ADMIN") {
    return { orgIds: "*", permission: "EDIT", scope: "FULL" };
  }

  if (BUSINESS_ROLES.includes(principal.role)) {
    if (principal.orgId !== orgId) throw new ForbiddenException("org_not_owned");
    return { orgIds: [orgId], permission: "EDIT", scope: "FULL" };
  }

  // Professional roles must hold an explicit grant for this org.
  const granteeId = principal.role === "ACCOUNTANT" ? principal.parentAssociateId : principal.userId;
  if (!granteeId) throw new ForbiddenException("no_grant_for_org");

  const scopeFilter =
    principal.role === "BHS_ANALYST" ? "BHS_ONLY" : principal.role === "LAWYER" ? "CASES_ONLY" : null;

  const params: unknown[] = [granteeId, orgId];
  let sql =
    `SELECT permission, scope FROM access.access_grants
       WHERE grantee_id = $1 AND org_id = $2 AND status = 'ACTIVE'
         AND (expires_at IS NULL OR expires_at > now())`;
  if (scopeFilter) {
    sql += " AND scope = $3";
    params.push(scopeFilter);
  }
  sql += " LIMIT 1";

  const res = await client.query<{ permission: Permission; scope: EffectiveScope["scope"] }>(sql, params);
  const grant = res.rows[0];
  if (!grant) throw new ForbiddenException("no_grant_for_org");

  // Read-only roles can never gain EDIT, regardless of the grant's permission.
  const permission: Permission = READ_ONLY_ROLES.includes(principal.role) ? "VIEW" : grant.permission;
  if (required === "EDIT" && permission !== "EDIT") throw new ForbiddenException("view_only");

  return { orgIds: [orgId], permission, scope: grant.scope };
}
