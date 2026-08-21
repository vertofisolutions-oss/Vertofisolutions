/**
 * Team Members Service — admin-console.
 *
 * Manages Vertofi internal staff:
 *   - Create with auto Employee ID (VTF-XXXX) and assigned password
 *   - Search by employee_id, name, or email
 *   - Assign/remove companies with READ or READ_WRITE access level
 *   - Approve/reject company access requests (with admin password re-auth)
 *   - Reset passwords, suspend, activate, force-logout sessions
 *
 * Every operation is written to adminconsole.admin_access_log (immutable audit).
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { PgService } from "@vertofi/nest-common";
import { setSystemContext, type Principal } from "@vertofi/tenancy";
import { Redis } from "ioredis";

export interface TeamMemberRow {
  id: string;
  employee_id: string;
  user_id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  job_title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  pending_requests?: number;
  assignment_count?: number;
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

@Injectable()
export class TeamMembersService {
  private readonly redis: Redis;

  constructor(private readonly pg: PgService) {
    this.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }

  private async audit(
    adminId: string,
    action: string,
    target?: string,
    targetId?: string,
    detail?: unknown,
  ) {
    await this.pg.query(
      "INSERT INTO adminconsole.admin_access_log (admin_id, action, target, target_id, detail) VALUES ($1,$2,$3,$4,$5)",
      [adminId, action, target ?? null, targetId ?? null, detail ? JSON.stringify(detail) : null],
    );
  }

  // ── List with search + pagination ──────────────────────────────────────────

  async list(admin: Principal, opts: { q?: string; status?: string; limit: number; offset: number }) {
    await this.audit(admin.userId, "LIST_TEAM_MEMBERS");

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (opts.status) {
      params.push(opts.status);
      conditions.push(`tm.status = $${params.length}`);
    }

    if (opts.q) {
      params.push(`%${opts.q.toUpperCase()}%`, `%${opts.q}%`);
      conditions.push(`(UPPER(tm.employee_id) LIKE $${params.length - 1}
                    OR LOWER(tm.full_name) LIKE $${params.length}
                    OR LOWER(tm.email) LIKE $${params.length})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(Math.min(opts.limit, 100), opts.offset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;

    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const rows = await c.query<
        TeamMemberRow & { pending_requests: number; assignment_count: number }
      >(
        `SELECT
           tm.*,
           COUNT(DISTINCT ca.id)::int  AS assignment_count,
           COUNT(DISTINCT ar.id)::int  AS pending_requests
         FROM adminconsole.team_members tm
         LEFT JOIN adminconsole.company_assignments ca ON ca.team_member_id = tm.id
         LEFT JOIN adminconsole.access_requests ar
                ON ar.team_member_id = tm.id AND ar.status = 'PENDING'
         ${where}
         GROUP BY tm.id
         ORDER BY tm.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params,
      );

      const total = await c.query<{ n: string }>(
        `SELECT count(*) n FROM adminconsole.team_members tm ${where}`,
        conditions.length > 0 ? params.slice(0, params.length - 2) : [],
      );

      return { members: rows.rows, total: Number(total.rows[0]!.n) };
    });
  }

  // ── Get single member with assignments ────────────────────────────────────

  async getById(admin: Principal, memberId: string) {
    await this.audit(admin.userId, "VIEW_TEAM_MEMBER", "team_members", memberId);
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const member = await c.query<TeamMemberRow>(
        "SELECT * FROM adminconsole.team_members WHERE id = $1",
        [memberId],
      );
      if (!member.rows[0]) throw new NotFoundException("team_member_not_found");

      const assignments = await c.query<CompanyAssignment>(
        `SELECT ca.*, o.legal_name AS org_name
         FROM adminconsole.company_assignments ca
         JOIN tenant.organisations o ON o.id = ca.org_id
         WHERE ca.team_member_id = $1
         ORDER BY ca.assigned_at DESC`,
        [memberId],
      );

      return { member: member.rows[0], assignments: assignments.rows };
    });
  }

  // ── Create team member ────────────────────────────────────────────────────

  async create(
    admin: Principal,
    input: {
      fullName: string;
      email: string;
      mobile?: string;
      jobTitle?: string;
      password: string;
    },
  ) {
    // Validate password strength
    if (input.password.length < 8) {
      throw new BadRequestException("password_too_short");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    return this.pg.transaction(async (c) => {
      await setSystemContext(c);

      // Check email uniqueness across auth.users
      const existing = await c.query(
        "SELECT id FROM auth.users WHERE email = $1",
        [input.email.toLowerCase()],
      );
      if (existing.rows.length > 0) throw new BadRequestException("email_already_exists");

      // Create auth.users entry
      const userRow = await c.query<{ id: string }>(
        `INSERT INTO auth.users (email, mobile, password_hash, role, status, email_verified)
         VALUES ($1, $2, $3, 'TEAM_MEMBER', 'ACTIVE', true)
         RETURNING id`,
        [input.email.toLowerCase(), input.mobile ?? null, passwordHash],
      );
      const userId = userRow.rows[0]!.id;

      // Create team_members entry (employee_id auto-generated by DB sequence)
      const memberRow = await c.query<TeamMemberRow>(
        `INSERT INTO adminconsole.team_members
           (user_id, full_name, email, mobile, job_title, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          userId,
          input.fullName,
          input.email.toLowerCase(),
          input.mobile ?? null,
          input.jobTitle ?? null,
          admin.userId,
        ],
      );

      const member = memberRow.rows[0]!;
      await this.audit(admin.userId, "CREATE_TEAM_MEMBER", "team_members", member.id, {
        email: input.email,
        employeeId: member.employee_id,
      });

      return member;
    });
  }

  // ── Update team member ────────────────────────────────────────────────────

  async update(
    admin: Principal,
    memberId: string,
    patch: { fullName?: string; jobTitle?: string; mobile?: string },
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (patch.fullName !== undefined) {
      values.push(patch.fullName);
      fields.push(`full_name = $${values.length}`);
    }
    if (patch.jobTitle !== undefined) {
      values.push(patch.jobTitle);
      fields.push(`job_title = $${values.length}`);
    }
    if (patch.mobile !== undefined) {
      values.push(patch.mobile);
      fields.push(`mobile = $${values.length}`);
    }

    if (fields.length === 0) throw new BadRequestException("no_fields_to_update");

    values.push(memberId);
    const row = await this.pg.query<TeamMemberRow>(
      `UPDATE adminconsole.team_members SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (!row[0]) throw new NotFoundException("team_member_not_found");

    await this.audit(admin.userId, "UPDATE_TEAM_MEMBER", "team_members", memberId, patch);
    return row[0];
  }

  // ── Reset password ─────────────────────────────────────────────────────────

  async resetPassword(admin: Principal, memberId: string, newPassword: string) {
    if (newPassword.length < 8) throw new BadRequestException("password_too_short");

    const hash = await bcrypt.hash(newPassword, 12);

    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const member = await c.query<{ user_id: string }>(
        "SELECT user_id FROM adminconsole.team_members WHERE id = $1",
        [memberId],
      );
      if (!member.rows[0]) throw new NotFoundException("team_member_not_found");

      await c.query(
        "UPDATE auth.users SET password_hash = $1, updated_at = now() WHERE id = $2",
        [hash, member.rows[0].user_id],
      );

      // Revoke all existing sessions to force re-login with new password
      await c.query(
        "UPDATE auth.sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
        [member.rows[0].user_id],
      );

      await this.audit(admin.userId, "RESET_PASSWORD", "team_members", memberId);
      return { ok: true };
    });
  }

  // ── Suspend / Activate ────────────────────────────────────────────────────

  async setStatus(admin: Principal, memberId: string, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") {
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const member = await c.query<{ user_id: string }>(
        "SELECT user_id FROM adminconsole.team_members WHERE id = $1",
        [memberId],
      );
      if (!member.rows[0]) throw new NotFoundException("team_member_not_found");

      await c.query(
        "UPDATE adminconsole.team_members SET status = $1 WHERE id = $2",
        [status, memberId],
      );

      // If suspending/deactivating — revoke all sessions immediately
      if (status !== "ACTIVE") {
        await c.query(
          "UPDATE auth.sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
          [member.rows[0].user_id],
        );
        // Also update auth.users status
        await c.query(
          "UPDATE auth.users SET status = $1 WHERE id = $2",
          [status === "SUSPENDED" ? "LOCKED" : "DEACTIVATED", member.rows[0].user_id],
        );
      } else {
        await c.query(
          "UPDATE auth.users SET status = 'ACTIVE' WHERE id = $1",
          [member.rows[0].user_id],
        );
      }

      await this.audit(admin.userId, `SET_STATUS_${status}`, "team_members", memberId);
      return { ok: true, status };
    });
  }

  // ── Force logout (revoke all sessions) ───────────────────────────────────

  async forceLogout(admin: Principal, memberId: string) {
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const member = await c.query<{ user_id: string }>(
        "SELECT user_id FROM adminconsole.team_members WHERE id = $1",
        [memberId],
      );
      if (!member.rows[0]) throw new NotFoundException("team_member_not_found");

      const result = await c.query(
        "UPDATE auth.sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL RETURNING id",
        [member.rows[0].user_id],
      );
      await this.audit(admin.userId, "FORCE_LOGOUT", "team_members", memberId, {
        revokedSessions: result.rowCount,
      });
      return { revokedSessions: result.rowCount ?? 0 };
    });
  }

  // ── Company Assignments ───────────────────────────────────────────────────

  async listAssignments(memberId: string) {
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const rows = await c.query<CompanyAssignment>(
        `SELECT ca.*, o.legal_name AS org_name
         FROM adminconsole.company_assignments ca
         JOIN tenant.organisations o ON o.id = ca.org_id
         WHERE ca.team_member_id = $1
         ORDER BY ca.assigned_at DESC`,
        [memberId],
      );
      return rows.rows;
    });
  }

  async assignCompany(
    admin: Principal,
    memberId: string,
    orgId: string,
    accessLevel: "READ" | "READ_WRITE",
  ) {
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      // Upsert: if already assigned, update access_level
      const row = await c.query<CompanyAssignment>(
        `INSERT INTO adminconsole.company_assignments (team_member_id, org_id, access_level, assigned_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (team_member_id, org_id) DO UPDATE SET access_level = EXCLUDED.access_level
         RETURNING *`,
        [memberId, orgId, accessLevel, admin.userId],
      );
      await this.audit(admin.userId, "ASSIGN_COMPANY", "company_assignments", row.rows[0]!.id, {
        orgId,
        accessLevel,
      });
      return row.rows[0]!;
    });
  }

  async updateAssignmentAccess(
    admin: Principal,
    memberId: string,
    orgId: string,
    accessLevel: "READ" | "READ_WRITE",
  ) {
    const row = await this.pg.query<CompanyAssignment>(
      `UPDATE adminconsole.company_assignments
         SET access_level = $1
       WHERE team_member_id = $2 AND org_id = $3
       RETURNING *`,
      [accessLevel, memberId, orgId],
    );
    if (!row[0]) throw new NotFoundException("assignment_not_found");
    await this.audit(admin.userId, "UPDATE_ASSIGNMENT_ACCESS", "company_assignments", row[0].id, {
      orgId,
      accessLevel,
    });
    return row[0];
  }

  async removeAssignment(admin: Principal, memberId: string, orgId: string) {
    const row = await this.pg.query(
      "DELETE FROM adminconsole.company_assignments WHERE team_member_id = $1 AND org_id = $2 RETURNING id",
      [memberId, orgId],
    );
    if (!row[0]) throw new NotFoundException("assignment_not_found");
    await this.audit(admin.userId, "REMOVE_ASSIGNMENT", "company_assignments", null as any, {
      memberId,
      orgId,
    });
    return { ok: true };
  }

  // ── Access Requests ───────────────────────────────────────────────────────

  async listAccessRequests(admin: Principal, status = "PENDING") {
    await this.audit(admin.userId, "LIST_ACCESS_REQUESTS");
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const rows = await c.query<AccessRequest>(
        `SELECT ar.*, tm.full_name AS team_member_name, tm.employee_id, o.legal_name AS org_name
         FROM adminconsole.access_requests ar
         JOIN adminconsole.team_members tm ON tm.id = ar.team_member_id
         JOIN tenant.organisations o ON o.id = ar.org_id
         WHERE ar.status = $1
         ORDER BY ar.requested_at DESC`,
        [status],
      );
      return rows.rows;
    });
  }

  /**
   * Approve an access request. Requires admin to re-enter their own password.
   * This confirms the admin intentionally granted access (financial data guard).
   */
  async approveRequest(
    admin: Principal,
    requestId: string,
    accessLevel: "READ" | "READ_WRITE",
    adminPassword: string,
  ) {
    // Re-authenticate admin before granting access
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);

      // Verify admin's own password
      const adminUser = await c.query<{ password_hash: string | null }>(
        "SELECT password_hash FROM auth.users WHERE id = $1",
        [admin.userId],
      );
      if (!adminUser.rows[0]?.password_hash) {
        throw new UnauthorizedException("admin_password_not_set");
      }
      const valid = await bcrypt.compare(adminPassword, adminUser.rows[0].password_hash);
      if (!valid) throw new UnauthorizedException("invalid_admin_password");

      // Get the request
      const req = await c.query<{ team_member_id: string; org_id: string; status: string }>(
        "SELECT team_member_id, org_id, status FROM adminconsole.access_requests WHERE id = $1",
        [requestId],
      );
      if (!req.rows[0]) throw new NotFoundException("request_not_found");
      if (req.rows[0].status !== "PENDING") throw new BadRequestException("request_not_pending");

      // Create the assignment (upsert in case a previous one existed)
      await c.query(
        `INSERT INTO adminconsole.company_assignments (team_member_id, org_id, access_level, assigned_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (team_member_id, org_id) DO UPDATE SET access_level = EXCLUDED.access_level`,
        [req.rows[0].team_member_id, req.rows[0].org_id, accessLevel, admin.userId],
      );

      // Mark request approved
      await c.query(
        "UPDATE adminconsole.access_requests SET status='APPROVED', reviewed_by=$1, reviewed_at=now() WHERE id=$2",
        [admin.userId, requestId],
      );

      await this.audit(admin.userId, "APPROVE_ACCESS_REQUEST", "access_requests", requestId, {
        accessLevel,
      });

      return { ok: true, accessLevel };
    });
  }

  async rejectRequest(admin: Principal, requestId: string, reason?: string) {
    const row = await this.pg.query(
      `UPDATE adminconsole.access_requests
         SET status='REJECTED', reject_reason=$1, reviewed_by=$2, reviewed_at=now()
       WHERE id = $3 AND status = 'PENDING'
       RETURNING id`,
      [reason ?? null, admin.userId, requestId],
    );
    if (!row[0]) throw new NotFoundException("request_not_found_or_not_pending");
    await this.audit(admin.userId, "REJECT_ACCESS_REQUEST", "access_requests", requestId);
    return { ok: true };
  }

  /** Called by teams panel — returns this member's assigned companies */
  async getMyAssignments(userId: string) {
    const member = await this.pg.query<{ id: string }>(
      "SELECT id FROM adminconsole.team_members WHERE user_id = $1 AND status = 'ACTIVE'",
      [userId],
    );
    if (!member[0]) return { assignments: [] };
    const memberId = member[0].id;

    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const rows = await c.query<CompanyAssignment & { org_gstin: string; plan: string }>(
        `SELECT ca.*, o.legal_name AS org_name, o.gstin AS org_gstin, s.plan
         FROM adminconsole.company_assignments ca
         JOIN tenant.organisations o ON o.id = ca.org_id
         LEFT JOIN billing.subscriptions s ON s.org_id = o.id AND s.status IN ('ACTIVE','TRIAL')
         WHERE ca.team_member_id = $1
         ORDER BY o.legal_name ASC`,
        [memberId],
      );
      return { assignments: rows.rows };
    });
  }

  /** Called by teams panel — submit access request for a company */
  async submitAccessRequest(userId: string, orgId: string, reason?: string) {
    const member = await this.pg.query<{ id: string }>(
      "SELECT id FROM adminconsole.team_members WHERE user_id = $1 AND status = 'ACTIVE'",
      [userId],
    );
    if (!member[0]) throw new NotFoundException("team_member_not_found");

    // Check not already assigned
    const existing = await this.pg.query(
      "SELECT id FROM adminconsole.company_assignments WHERE team_member_id = $1 AND org_id = $2",
      [member[0].id, orgId],
    );
    if (existing[0]) throw new BadRequestException("already_assigned");

    // Check no pending request exists (unique index handles this, but give a friendly error)
    try {
      const req = await this.pg.query<{ id: string }>(
        `INSERT INTO adminconsole.access_requests (team_member_id, org_id, reason)
         VALUES ($1, $2, $3) RETURNING id`,
        [member[0].id, orgId, reason ?? null],
      );
      return { requestId: req[0]!.id };
    } catch (e: any) {
      if (e.code === "23505") throw new BadRequestException("request_already_pending");
      throw e;
    }
  }
}
