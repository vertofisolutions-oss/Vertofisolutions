import { Injectable } from "@nestjs/common";
import { PgService, assertGrantedScope } from "@vertofi/nest-common";
import type { Principal } from "@vertofi/tenancy";

@Injectable()
export class TenantService {
  constructor(private readonly pg: PgService) {}

  async createOrg(
    input: {
      legalName: string;
      tradeName?: string;
      businessType?: string;
      industry?: string;
      gstin?: string;
      pan?: string;
    },
    principal?: Principal,
  ): Promise<{ id: string }> {
    // One business owner = one organization. If the caller is already linked to
    // an org (their JWT carries orgId), return THAT org instead of inserting a
    // new one. Re-running onboarding (e.g. after a re-login) used to mint a
    // second, orphaned org the user's token was never linked to — every feature
    // then 403'd with org_not_owned. Idempotent here closes that for good.
    // Admins may create orgs freely (no orgId on their token).
    if (principal && principal.role === "BUSINESS_OWNER" && principal.orgId) {
      return { id: principal.orgId };
    }
    const rows = await this.pg.query<{ id: string }>(
      `INSERT INTO tenant.organizations (legal_name, trade_name, business_type, industry, gstin, pan)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [input.legalName, input.tradeName ?? null, input.businessType ?? null, input.industry ?? null, input.gstin ?? null, input.pan ?? null],
    );
    return rows[0]!;
  }

  /**
   * Business-profile read. Tenant-isolated: the caller must be entitled to the
   * org (own it, hold an active grant, or be ADMIN) — previously this endpoint
   * had NO ownership check, so any authenticated user could fetch any org's
   * full profile (legal name, GSTIN, PAN, address) by id (IDOR). assertGrantedScope
   * throws ForbiddenException("org_not_owned") when not entitled.
   */
  async getOrg(id: string, principal: Principal) {
    await this.pg.withClient((c) => assertGrantedScope(c, principal, id, "VIEW"));
    const rows = await this.pg.query("SELECT * FROM tenant.organizations WHERE id = $1", [id]);
    return rows[0] ?? null;
  }

  async createTeam(input: { name: string; leadUserId?: string; createdBy: string }): Promise<{ id: string }> {
    const rows = await this.pg.query<{ id: string }>(
      `INSERT INTO tenant.teams (name, lead_user_id, created_by) VALUES ($1,$2,$3) RETURNING id`,
      [input.name, input.leadUserId ?? null, input.createdBy],
    );
    return rows[0]!;
  }

  async deleteTeam(id: string): Promise<void> {
    await this.pg.query("UPDATE tenant.teams SET status='DISABLED' WHERE id=$1", [id]);
  }

  async assignTeam(teamId: string, orgId: string, assignedBy: string): Promise<{ id: string }> {
    const rows = await this.pg.query<{ id: string }>(
      `INSERT INTO tenant.team_assignments (team_id, org_id, assigned_by)
       VALUES ($1,$2,$3)
       ON CONFLICT (team_id, org_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by
       RETURNING id`,
      [teamId, orgId, assignedBy],
    );
    return rows[0]!;
  }
}
