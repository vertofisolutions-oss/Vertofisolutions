import { Injectable } from "@nestjs/common";
import { PgService } from "@vertofi/nest-common";
import type { Plan, ProfessionalType, Role } from "@vertofi/tenancy";

export interface UserRow {
  id: string;
  email: string | null;
  mobile: string | null;
  password_hash: string | null;
  role: Role;
  professional_type: ProfessionalType | null;
  org_id: string | null;
  parent_associate_id: string | null;
  plan: Plan;
  status: string;
  email_verified: boolean;
  mobile_verified: boolean;
  mfa_enabled: boolean;
  mfa_secret: string | null;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly pg: PgService) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    // Case-insensitive: emails are case-insensitive in practice and some paths
    // store them lowercased (e.g. admin-assigned team members), so an exact
    // match made a correct password fail with invalid_credentials when the user
    // typed a different case than was stored.
    const rows = await this.pg.query<UserRow>("SELECT * FROM auth.users WHERE lower(email) = lower($1)", [email]);
    return rows[0] ?? null;
  }

  /**
   * Resolve a user by mobile, tolerant of stored format (Firebase stores E.164
   * "+91…", other paths store bare 10 digits) — match on the last 10 digits so
   * formatting never causes a miss.
   *
   * Resolution is deterministic AND role-aware: a phone may be shared across a
   * password-login account (business/team) and an MFA account (admin/staff).
   * Mobile + password login is a business/team flow — admins and professionals
   * authenticate by email + MFA — so we prefer the password-login account,
   * then ACTIVE, then newest. This stops a business owner who logs in by phone
   * from being routed to an admin account that happens to share the number.
   */
  async findByMobile(mobile: string): Promise<UserRow | null> {
    const digits = (mobile ?? "").replace(/\D/g, "").slice(-10);
    if (digits.length < 10) return null;
    const rows = await this.pg.query<UserRow>(
      `SELECT * FROM auth.users
        WHERE right(regexp_replace(coalesce(mobile, ''), '\\D', '', 'g'), 10) = $1
        ORDER BY (role IN ('BUSINESS_OWNER','BUSINESS_USER','TEAM_LEAD','TEAM_MEMBER')) DESC,
                 (status = 'ACTIVE') DESC,
                 created_at DESC
        LIMIT 1`,
      [digits],
    );
    return rows[0] ?? null;
  }

  /**
   * Resolve the account a phone-OTP password reset may target. ADMIN accounts
   * are intentionally excluded — admin credentials are MFA-protected and are
   * never resettable through the public business reset flow. Returns null when
   * the phone only belongs to admin/no account.
   */
  async findResettableByMobile(mobile: string): Promise<UserRow | null> {
    const digits = (mobile ?? "").replace(/\D/g, "").slice(-10);
    if (digits.length < 10) return null;
    const rows = await this.pg.query<UserRow>(
      `SELECT * FROM auth.users
        WHERE right(regexp_replace(coalesce(mobile, ''), '\\D', '', 'g'), 10) = $1
          AND role <> 'ADMIN'
        ORDER BY (status = 'ACTIVE') DESC, created_at DESC
        LIMIT 1`,
      [digits],
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const rows = await this.pg.query<UserRow>("SELECT * FROM auth.users WHERE id = $1", [id]);
    return rows[0] ?? null;
  }

  async create(input: {
    email?: string;
    mobile?: string;
    passwordHash?: string;
    role: Role;
    professionalType?: ProfessionalType;
    orgId?: string;
    parentAssociateId?: string;
    /** Initial lifecycle status. Defaults to the column default ('PENDING'). */
    status?: string;
  }): Promise<UserRow> {
    const rows = await this.pg.query<UserRow>(
      `INSERT INTO auth.users (email, mobile, password_hash, role, professional_type, org_id, parent_associate_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8, 'PENDING')) RETURNING *`,
      [
        input.email ?? null,
        input.mobile ?? null,
        input.passwordHash ?? null,
        input.role,
        input.professionalType ?? null,
        input.orgId ?? null,
        input.parentAssociateId ?? null,
        input.status ?? null,
      ],
    );
    return rows[0]!;
  }

  /** Final signup activation: PENDING_ONBOARDING → ACTIVE (after onboarding + autopay). */
  async markActive(id: string): Promise<void> {
    await this.pg.query(
      "UPDATE auth.users SET status = 'ACTIVE', updated_at = now() WHERE id = $1 AND status = 'PENDING_ONBOARDING'",
      [id],
    );
  }

  async markVerified(id: string, field: "email" | "mobile"): Promise<void> {
    const col = field === "email" ? "email_verified" : "mobile_verified";
    await this.pg.query(
      `UPDATE auth.users SET ${col} = true, status = CASE WHEN status = 'PENDING' THEN 'ACTIVE' ELSE status END, updated_at = now() WHERE id = $1`,
      [id],
    );
  }

  async touchLogin(id: string): Promise<void> {
    await this.pg.query("UPDATE auth.users SET last_login_at = now() WHERE id = $1", [id]);
  }

  /** Link a business owner to their organization (first org only). */
  async setOrg(id: string, orgId: string): Promise<void> {
    await this.pg.query(
      "UPDATE auth.users SET org_id = $2, updated_at = now() WHERE id = $1 AND org_id IS NULL",
      [id, orgId],
    );
  }

  async findByParentAssociateId(parentAssociateId: string): Promise<UserRow[]> {
    return this.pg.query<UserRow>(
      "SELECT * FROM auth.users WHERE parent_associate_id = $1 ORDER BY created_at DESC",
      [parentAssociateId],
    );
  }
}

