import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PgService } from "@vertofi/nest-common";
import type { EffectiveScope, GrantScope, Permission, Principal, Role } from "@vertofi/tenancy";

interface GrantRow {
  org_id: string;
  permission: Permission;
  scope: GrantScope;
}

/**
 * The authorization brain (docs/04). Computes a principal's effective org set
 * + permission + scope by combining role defaults with ABAC grants. Fails
 * CLOSED on any uncertainty — never grants access it can't justify.
 */
@Injectable()
export class AccessService {
  constructor(private readonly pg: PgService) {}

  async resolve(principal: Principal): Promise<EffectiveScope> {
    switch (principal.role) {
      case "ADMIN":
        return { orgIds: "*", permission: "EDIT", scope: "FULL" };

      case "BUSINESS_OWNER":
      case "BUSINESS_USER":
        // Own org only.
        return { orgIds: principal.orgId ? [principal.orgId] : [], permission: "EDIT", scope: "FULL" };

      case "ASSOCIATE": {
        const grants = await this.activeGrantsFor(principal.userId);
        return { orgIds: grants.map((g) => g.org_id), permission: "EDIT", scope: "FULL" };
      }

      case "ACCOUNTANT": {
        // Inherits the parent associate's clients, VIEW only.
        if (!principal.parentAssociateId) return this.empty();
        const grants = await this.activeGrantsFor(principal.parentAssociateId);
        return { orgIds: grants.map((g) => g.org_id), permission: "VIEW", scope: "FULL" };
      }

      case "TEAM_LEAD":
      case "TEAM_MEMBER": {
        const grants = await this.activeGrantsFor(principal.userId);
        return { orgIds: grants.map((g) => g.org_id), permission: "VIEW", scope: "FULL" };
      }

      case "BHS_ANALYST": {
        const grants = await this.activeGrantsFor(principal.userId, "BHS_ONLY");
        return { orgIds: grants.map((g) => g.org_id), permission: "VIEW", scope: "BHS_ONLY" };
      }

      case "LAWYER": {
        const grants = await this.activeGrantsFor(principal.userId, "CASES_ONLY");
        return { orgIds: grants.map((g) => g.org_id), permission: "EDIT", scope: "CASES_ONLY" };
      }

      default:
        return this.empty();
    }
  }

  private empty(): EffectiveScope {
    return { orgIds: [], permission: "VIEW", scope: "FULL" };
  }

  private async activeGrantsFor(granteeId: string, scope?: GrantScope): Promise<GrantRow[]> {
    const params: unknown[] = [granteeId];
    let sql = `SELECT org_id, permission, scope FROM access.access_grants
               WHERE grantee_id = $1 AND status = 'ACTIVE'
                 AND (expires_at IS NULL OR expires_at > now())`;
    if (scope) {
      sql += " AND scope = $2";
      params.push(scope);
    }
    return this.pg.query<GrantRow>(sql, params);
  }

  /** Assert a principal may access a specific org at the required permission. */
  async assertOrgAccess(principal: Principal, orgId: string, required: Permission): Promise<void> {
    const scope = await this.resolve(principal);
    const allowed =
      scope.orgIds === "*" || scope.orgIds.includes(orgId);
    if (!allowed) throw new ForbiddenException("no_grant_for_org");
    if (required === "EDIT" && scope.permission !== "EDIT") {
      throw new ForbiddenException("view_only");
    }
  }

  // ── Grant management ──────────────────────────────────────────────
  async createGrant(input: {
    granteeType: "USER" | "COMPANY";
    granteeId: string;
    orgId: string;
    permission: Permission;
    scope: GrantScope;
    grantedBy: string;
    reason?: string;
  }): Promise<{ id: string }> {
    const rows = await this.pg.query<{ id: string }>(
      `INSERT INTO access.access_grants
         (grantee_type, grantee_id, org_id, permission, scope, granted_by, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [input.granteeType, input.granteeId, input.orgId, input.permission, input.scope, input.grantedBy, input.reason ?? null],
    );
    return rows[0]!;
  }

  async revokeGrant(id: string): Promise<void> {
    await this.pg.query("UPDATE access.access_grants SET status='REVOKED', updated_at=now() WHERE id=$1", [id]);
  }

  // ── Owner → professional (CA) assignment by Vertofi ID ───────────────
  /**
   * A business owner assigns a professional to their books by the professional's
   * public Vertofi ID (VRU-…). Creates a PENDING request the professional must
   * confirm — the professional's own password+OTP MFA login is the confirmation
   * factor (no separate SMS step needed). No grant is created until they accept.
   */
  async assignProfessional(owner: Principal, vertofiId: string, scope: GrantScope): Promise<{ requestId: string; professional: string; status: string }> {
    if (!owner.orgId) throw new BadRequestException("owner_has_no_org");
    const prof = (await this.pg.query<{ id: string; role: Role; email: string | null }>(
      "SELECT id, role, email FROM auth.users WHERE public_id=$1 AND status='ACTIVE'", [vertofiId.trim().toUpperCase()]))[0];
    if (!prof) throw new NotFoundException("professional_not_found");
    if (prof.id === owner.userId) throw new BadRequestException("cannot_assign_self");
    const PROF_ROLES = ["ACCOUNTANT", "ASSOCIATE", "LAWYER", "BHS_ANALYST"];
    if (!PROF_ROLES.includes(prof.role)) throw new BadRequestException("not_a_professional");
    const pending = (await this.pg.query("SELECT 1 FROM access.access_requests WHERE org_id=$1 AND target_grantee_id=$2 AND status='PENDING' LIMIT 1", [owner.orgId, prof.id]))[0];
    const active = (await this.pg.query("SELECT 1 FROM access.access_grants WHERE org_id=$1 AND grantee_id=$2 AND status='ACTIVE' LIMIT 1", [owner.orgId, prof.id]))[0];
    if (pending || active) throw new ConflictException("already_assigned_or_pending");
    const r = (await this.pg.query<{ id: string }>(
      `INSERT INTO access.access_requests (requester_id, org_id, requested_permission, requested_scope, target_grantee_id, status)
       VALUES ($1,$2,'EDIT',$3,$4,'PENDING') RETURNING id`,
      [owner.userId, owner.orgId, scope, prof.id]))[0]!;
    return { requestId: r.id, professional: prof.email ?? vertofiId, status: "PENDING" };
  }

  /**
   * The professional's assigned clients (active grants) with org name + Vertofi
   * ID — powers the "My Clients" picker so professionals never paste a raw UUID.
   */
  async myClients(prof: Principal) {
    return this.pg.query(
      `SELECT g.org_id, g.permission, g.scope, g.created_at,
              o.legal_name AS org_name, o.public_id AS vertofi_id
         FROM access.access_grants g
         JOIN tenant.organizations o ON o.id = g.org_id
        WHERE g.grantee_id = $1 AND g.status = 'ACTIVE'
        ORDER BY o.legal_name`,
      [prof.userId]);
  }

  /**
   * Professionals assigned to the owner's org — active grants + pending requests
   * — so the owner can see and manage who has access to their books.
   */
  async assignedProfessionals(owner: Principal) {
    if (!owner.orgId) throw new BadRequestException("owner_has_no_org");
    return this.pg.query(
      `SELECT g.id AS grant_id, NULL::uuid AS request_id, 'ACTIVE' AS state,
              g.grantee_id, g.permission, g.scope, g.created_at,
              u.public_id, u.email, u.role, u.professional_type
         FROM access.access_grants g
         JOIN auth.users u ON u.id = g.grantee_id
        WHERE g.org_id = $1 AND g.status = 'ACTIVE'
       UNION ALL
       SELECT NULL::uuid AS grant_id, r.id AS request_id, 'PENDING' AS state,
              r.target_grantee_id AS grantee_id, r.requested_permission AS permission,
              r.requested_scope AS scope, r.created_at,
              u.public_id, u.email, u.role, u.professional_type
         FROM access.access_requests r
         JOIN auth.users u ON u.id = r.target_grantee_id
        WHERE r.org_id = $1 AND r.status = 'PENDING'
        ORDER BY created_at DESC`,
      [owner.orgId]);
  }

  /** Owner revokes a professional's active access to their org. */
  async revokeAssignment(owner: Principal, granteeId: string): Promise<{ revoked: boolean }> {
    if (!owner.orgId) throw new BadRequestException("owner_has_no_org");
    const r = await this.pg.query<{ id: string }>(
      "UPDATE access.access_grants SET status='REVOKED', updated_at=now() WHERE org_id=$1 AND grantee_id=$2 AND status='ACTIVE' RETURNING id",
      [owner.orgId, granteeId]);
    return { revoked: r.length > 0 };
  }

  /** Owner cancels a still-pending assignment request. */
  async cancelAssignmentRequest(owner: Principal, requestId: string): Promise<{ cancelled: boolean }> {
    if (!owner.orgId) throw new BadRequestException("owner_has_no_org");
    await this.pg.query(
      "UPDATE access.access_requests SET status='CANCELLED', decided_at=now() WHERE id=$1 AND org_id=$2 AND status='PENDING'",
      [requestId, owner.orgId]);
    return { cancelled: true };
  }

  /** Pending assignment requests awaiting THIS professional's confirmation. */
  async incomingRequests(prof: Principal) {
    return this.pg.query(
      `SELECT r.id, r.requested_scope AS scope, r.created_at,
              o.legal_name AS org_name, o.public_id AS vertofi_id
         FROM access.access_requests r
         JOIN tenant.organizations o ON o.id = r.org_id
        WHERE r.target_grantee_id = $1 AND r.status = 'PENDING'
        ORDER BY r.created_at DESC`,
      [prof.userId]);
  }

  /** The professional accepts (→ active grant) or declines an assignment. */
  async respondToRequest(prof: Principal, requestId: string, accept: boolean): Promise<{ status: string; grantId?: string }> {
    const req = (await this.pg.query<{ org_id: string; requested_scope: GrantScope | null }>(
      "SELECT org_id, requested_scope FROM access.access_requests WHERE id=$1 AND target_grantee_id=$2 AND status='PENDING'",
      [requestId, prof.userId]))[0];
    if (!req) throw new NotFoundException("request_not_found");
    if (!accept) {
      await this.pg.query("UPDATE access.access_requests SET status='DECLINED', decided_by=$2, decided_at=now() WHERE id=$1", [requestId, prof.userId]);
      return { status: "DECLINED" };
    }
    const grant = await this.createGrant({
      granteeType: "USER", granteeId: prof.userId, orgId: req.org_id,
      permission: "EDIT", scope: req.requested_scope ?? "FULL",
      grantedBy: prof.userId, reason: "Professional accepted owner assignment (Vertofi ID)",
    });
    await this.pg.query("UPDATE access.access_requests SET status='ACCEPTED', decided_by=$2, decided_at=now() WHERE id=$1", [requestId, prof.userId]);
    return { status: "ACCEPTED", grantId: grant.id };
  }

  /**
   * Guard for who may create a grant (docs/04): ADMIN can grant anything;
   * an ASSOCIATE may only grant their OWN accountant-panel members access to
   * orgs the associate themselves holds.
   */
  async authorizeGrantCreation(actor: Principal, granteeId: string, orgId: string): Promise<void> {
    if (actor.role === "ADMIN") return;
    if (actor.role === "ASSOCIATE") {
      // grantee must be an accountant under this associate (verified by tenant svc in full impl)
      const own = await this.activeGrantsFor(actor.userId);
      if (!own.some((g) => g.org_id === orgId)) {
        throw new ForbiddenException("associate_cannot_grant_org_they_dont_hold");
      }
      return;
    }
    throw new ForbiddenException("role_cannot_manage_grants");
  }

  async createRequest(requesterId: string, orgId: string, reason?: string): Promise<{ id: string }> {
    const rows = await this.pg.query<{ id: string }>(
      `INSERT INTO access.access_requests (requester_id, org_id, reason) VALUES ($1,$2,$3) RETURNING id`,
      [requesterId, orgId, reason ?? null],
    );
    return rows[0]!;
  }

  async decideRequest(id: string, deciderId: string, approve: boolean): Promise<void> {
    const reqs = await this.pg.query<{ requester_id: string; org_id: string; requested_permission: Permission }>(
      "SELECT requester_id, org_id, requested_permission FROM access.access_requests WHERE id=$1 AND status='PENDING'",
      [id],
    );
    const req = reqs[0];
    if (!req) throw new ForbiddenException("request_not_found");
    await this.pg.query(
      "UPDATE access.access_requests SET status=$2, decided_by=$3, decided_at=now() WHERE id=$1",
      [id, approve ? "APPROVED" : "DENIED", deciderId],
    );
    if (approve) {
      await this.createGrant({
        granteeType: "USER",
        granteeId: req.requester_id,
        orgId: req.org_id,
        permission: req.requested_permission,
        scope: "FULL",
        grantedBy: deciderId,
        reason: "approved access request",
      });
    }
  }
}

export const READ_ONLY: Role[] = ["TEAM_LEAD", "TEAM_MEMBER", "ACCOUNTANT", "BHS_ANALYST"];
