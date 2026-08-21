import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { v7 as uuidv7 } from "uuid";
import { JwtService } from "@vertofi/auth-guards";
import { PgService } from "@vertofi/nest-common";
import { UsersRepository, type UserRow } from "../users.repository.js";
import { OtpService } from "../otp/otp.service.js";
import { FirebaseService } from "../firebase/firebase.service.js";
import { publishCustomerOnboarded } from "./wa-events.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Auth orchestration (docs/06). Issues JWTs, manages sessions + rotating
 * refresh families with reuse detection, and registration/login flows.
 * Emits user.* events via the outbox (wired in module).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly pg: PgService,
    private readonly firebase: FirebaseService,
  ) { }

  /**
   * Exchange a verified Firebase phone-sign-in ID token for Vertofi tokens.
   * Firebase replaces MSG91 for the SMS OTP step (registration + MFA). The
   * email side stays on the free SMTP 6-digit code.
   *
   * - mode REGISTER: business signup — create/find a BUSINESS_OWNER by the
   *   verified phone (PENDING_ONBOARDING), set their password, and kick off the
   *   email 6-digit verification. Returns tokens + the email challenge id.
   * - mode MFA: second factor for staff/professional panels after a correct
   *   password — the Firebase phone must match the user's registered mobile.
   */
  async exchangeFirebasePhone(
    idToken: string,
    opts: { mode: "REGISTER" | "MFA"; email?: string; password?: string; userId?: string },
    deviceMeta: { ip?: string; ua?: string },
  ): Promise<{ tokens: TokenPair; userId: string; emailChallengeId?: string }> {
    console.log(`[exchange] mode=${opts.mode} userId=${opts.userId ?? "-"} idTokenLen=${idToken?.length ?? 0}`);
    const { phone } = await this.firebase.verifyIdToken(idToken);
    if (!phone) throw new UnauthorizedException("no_phone_in_token");
    const norm = (p: string) => p.replace(/\D/g, "").slice(-10); // compare last 10 digits

    if (opts.mode === "MFA") {
      if (!opts.userId) throw new UnauthorizedException("mfa_user_required");
      const user = await this.users.findById(opts.userId);
      if (!user) throw new UnauthorizedException();
      if (norm(user.mobile ?? "") !== norm(phone)) {
        console.error(`[exchange] mfa_phone_mismatch: firebase=${norm(phone)} registered=${norm(user.mobile ?? "")}`);
        throw new UnauthorizedException("mfa_phone_mismatch");
      }
      await this.users.markVerified(user.id, "mobile");
      console.log(`[exchange] MFA OK — issuing tokens for ${user.id} (${user.role})`);
      return { tokens: await this.issueForUser(user, deviceMeta), userId: user.id };
    }

    // REGISTER (business owner)
    let user = (await this.users.findByMobile(phone)) ?? (opts.email ? await this.users.findByEmail(opts.email) : null);
    if (!user) {
      const passwordHash = opts.password ? await bcrypt.hash(opts.password, 12) : undefined;
      user = await this.users.create({ mobile: phone, email: opts.email, passwordHash, role: "BUSINESS_OWNER", status: "PENDING_ONBOARDING" });
    } else if (opts.password) {
      await this.pg.query("UPDATE auth.users SET password_hash=$1, updated_at=now() WHERE id=$2", [await bcrypt.hash(opts.password, 12), user.id]);
    }
    await this.users.markVerified(user.id, "mobile");
    let emailChallengeId: string | undefined;
    if (opts.email) {
      // Email verification is secondary — the phone is already verified via
      // Firebase. Never let an email-delivery problem (e.g. SMTP not configured)
      // block signup: issue best-effort and swallow failures.
      try {
        const ch = await this.otp.issue({ userId: user.id, channel: "EMAIL", purpose: "EMAIL_VERIFY", destination: opts.email });
        emailChallengeId = ch.challengeId;
      } catch (err) {
        console.warn(`[exchange] email_verify issue skipped (non-fatal): ${(err as Error)?.message ?? err}`);
      }
    }
    return { tokens: await this.issueForUser(user, deviceMeta), userId: user.id, emailChallengeId };
  }

  /** Step 1 of business signup: create PENDING user + send mobile + email OTP. */
  async registerBusiness(mobile: string, email: string, password?: string): Promise<{ userId: string; mobileChallengeId: string; emailChallengeId: string }> {
    const existing = (await this.users.findByMobile(mobile)) ?? (await this.users.findByEmail(email));
    // The password the owner set at signup MUST be persisted here on the
    // server-OTP path — the legacy code dropped it (only firebase/exchange set
    // it), so accounts created this way had password_hash = NULL and every
    // later password login failed with invalid_credentials.
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    // New business owners start PENDING_ONBOARDING: identity-verifiable, but the
    // account is only activated (→ ACTIVE) after onboarding + autopay completes.
    const user = existing ?? (await this.users.create({ mobile, email, passwordHash, role: "BUSINESS_OWNER", status: "PENDING_ONBOARDING" }));
    // Re-registration of a still-pending account: backfill the password only
    // when none is set yet. Guarded (password_hash IS NULL) so an unauthenticated
    // register call can NEVER overwrite an existing/active account's password.
    if (existing && passwordHash) {
      await this.pg.query(
        "UPDATE auth.users SET password_hash=$1, updated_at=now() WHERE id=$2 AND password_hash IS NULL",
        [passwordHash, existing.id],
      );
    }
    const mobileChallenge = await this.otp.issue({ userId: user.id, channel: "MOBILE", purpose: "REGISTER", destination: mobile });
    const emailChallenge = await this.otp.issue({ userId: user.id, channel: "EMAIL", purpose: "EMAIL_VERIFY", destination: email });
    return { userId: user.id, mobileChallengeId: mobileChallenge.challengeId, emailChallengeId: emailChallenge.challengeId };
  }

  /**
   * Issue an OTP for the public send-otp endpoint. For LOGIN/MFA we must bind
   * the challenge to the existing user (resolved by mobile/email), otherwise
   * verifyAndIssue can't mint tokens ("challenge_not_bound_to_user"). To avoid
   * user enumeration we still issue a challenge when no user is found — it just
   * won't verify. REGISTER/EMAIL_VERIFY are bound by the register flow instead.
   */
  async sendOtp(input: {
    channel: "MOBILE" | "EMAIL" | "WHATSAPP";
    destination: string;
    purpose: "LOGIN" | "REGISTER" | "EMAIL_VERIFY" | "RESET" | "MFA";
    userId?: string;
  }): Promise<{ challengeId: string }> {
    let userId = input.userId;
    if (!userId && (input.purpose === "LOGIN" || input.purpose === "MFA" || input.purpose === "RESET")) {
      const user =
        input.channel === "EMAIL"
          ? await this.users.findByEmail(input.destination)
          : await this.users.findByMobile(input.destination);
      userId = user?.id;
    }
    return this.otp.issue({
      userId,
      channel: input.channel,
      purpose: input.purpose,
      destination: input.destination,
    });
  }

  async verifyAndIssue(challengeId: string, code: string, deviceMeta: { ip?: string; ua?: string }): Promise<TokenPair> {
    const { userId } = await this.otp.verify(challengeId, code);
    if (!userId) throw new UnauthorizedException("challenge_not_bound_to_user");
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    await this.users.markVerified(userId, "mobile");
    return this.issueForUser(user, deviceMeta);
  }

  async passwordLogin(identifier: string, password: string, deviceMeta: { ip?: string; ua?: string }): Promise<{ mfaRequired: boolean; tokens?: TokenPair; userId: string; mobile?: string }> {
    // Trim the identifier — browser autofill/paste frequently appends a trailing
    // space, which previously made a correct email/mobile + password fail.
    identifier = (identifier ?? "").trim();
    // Brute-force lockout: refuse after too many recent FAILED attempts for this
    // identifier (login_attempts now records real outcomes). Backs the global
    // gateway IP rate-limit with a per-account control so password guessing
    // can't run unbounded against one account from rotating IPs.
    const lock = await this.pg.query<{ n: string }>(
      `SELECT count(*) n FROM auth.login_attempts
        WHERE identifier = $1 AND success = false
          AND created_at > now() - ($2 || ' minutes')::interval`,
      [identifier, 15],
    );
    if (Number(lock[0]?.n ?? 0) >= 10) {
      console.warn(`[login] locked_out identifier=${identifier} (>=10 fails/15min)`);
      throw new UnauthorizedException("too_many_attempts");
    }
    // Resolve user by email (preferred for team members) or mobile
    const user = identifier.includes("@")
      ? await this.users.findByEmail(identifier)
      : await this.users.findByMobile(identifier);
    // Record the REAL outcome (not just "was a user found"). The old code logged
    // success = !!user, so every attempt where the user existed looked like a
    // success even when the password was wrong — useless for diagnosing
    // failures. We compute the actual result, log the attempt, then throw.
    const reason =
      !user ? "no_user"
        : !user.password_hash ? "no_password_set"
          : user.status === "LOCKED" || user.status === "SUSPENDED" ? "account_locked"
            : user.status === "DEACTIVATED" ? "account_deactivated"
              : (await bcrypt.compare(password, user.password_hash)) ? null
                : "bad_password";
    await this.pg.query(
      "INSERT INTO auth.login_attempts(identifier, ip, success) VALUES ($1,$2,$3)",
      [identifier, deviceMeta.ip ?? null, reason === null],
    );
    if (reason) {
      // Log the precise reason server-side (never leaked to the client, which
      // always sees invalid_credentials/account_* to avoid user enumeration).
      console.warn(`[login] denied identifier=${identifier} reason=${reason} userId=${user?.id ?? "-"}`);
      if (reason === "account_locked") throw new UnauthorizedException("account_locked");
      if (reason === "account_deactivated") throw new UnauthorizedException("account_deactivated");
      throw new UnauthorizedException("invalid_credentials");
    }
    // reason === null guarantees the user exists, has a password, and is active.
    const authed = user!;

    // BUSINESS_OWNER, TEAM_MEMBER and TEAM_LEAD log in with password only — no OTP
    // MFA step. Business owners verify their phone once at registration (Firebase),
    // then use a password they set at signup; team credentials are admin-assigned.
    if (authed.role === "BUSINESS_OWNER" || authed.role === "TEAM_MEMBER" || authed.role === "TEAM_LEAD") {
      const tokens = await this.issueForUser(authed, deviceMeta);
      return { mfaRequired: false, tokens, userId: authed.id };
    }

    // Staff/professional panels use password + Firebase phone OTP MFA (docs/06).
    // Return the user's registered mobile so the client sends the OTP to the
    // CORRECT number automatically — no manual re-entry (which is the common
    // cause of mfa_phone_mismatch). Safe: the password was already verified.
    return { mfaRequired: true, userId: authed.id, mobile: authed.mobile ?? undefined };
  }

  /**
   * Change password — used by team members after admin-assigned credentials.
   * Validates the current password before setting the new one.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (newPassword.length < 8) throw new UnauthorizedException("password_too_short");
    const user = await this.users.findById(userId);
    if (!user || !user.password_hash) throw new UnauthorizedException("invalid_credentials");
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw new UnauthorizedException("current_password_incorrect");
    const hash = await bcrypt.hash(newPassword, 12);
    await this.pg.query(
      "UPDATE auth.users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [hash, userId],
    );
  }

  /**
   * Forgot-password reset: verifies a RESET-purpose OTP challenge and sets the
   * new password in one step (no session required). The challenge is bound to
   * the user at send time, single-use, and attempt-limited by OtpService.
   */
  async resetPassword(challengeId: string, code: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) throw new UnauthorizedException("password_too_short");
    const { userId } = await this.otp.verify(challengeId, code, "RESET");
    if (!userId) throw new UnauthorizedException("challenge_not_bound_to_user");
    const hash = await bcrypt.hash(newPassword, 12);
    await this.pg.query(
      "UPDATE auth.users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [hash, userId],
    );
    // Revoke every existing session — a reset must log out anyone holding
    // stolen credentials.
    await this.pg.query("UPDATE auth.sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [userId]);
  }

  /**
   * Firebase-phone variant of forgot-password (the delivery path that's
   * actually configured in prod — MSG91/SMTP are not). The client completes a
   * Firebase phone OTP; we verify the ID token, match the phone to a user,
   * set the password and revoke all sessions.
   */
  async resetPasswordWithFirebase(idToken: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) throw new UnauthorizedException("password_too_short");
    const decoded = await this.firebase.verifyIdToken(idToken);
    if (!decoded.phone) throw new UnauthorizedException("phone_required");
    const mobile = decoded.phone.replace(/\D/g, "").slice(-10);
    // Resolve the account to reset by the VERIFIED phone, scoped to password-
    // login accounts. ADMIN accounts are MFA-protected and never resettable via
    // this public flow — so when a number is shared with an admin (test setups),
    // the reset always targets the business/team account, not the admin.
    const user = await this.users.findResettableByMobile(mobile);
    if (!user) {
      console.warn(`[reset] no resettable (non-admin) account for phone …${mobile.slice(-4)}`);
      throw new UnauthorizedException("no_resettable_account");
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await this.pg.query(
      "UPDATE auth.users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [hash, user.id],
    );
    await this.pg.query("UPDATE auth.sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [user.id]);
    console.log(`[reset] password reset for userId=${user.id} role=${user.role} via phone …${mobile.slice(-4)}`);
  }

  async issueForUser(user: UserRow, deviceMeta: { ip?: string; ua?: string }): Promise<TokenPair> {
    const sessionId = uuidv7();
    const family = uuidv7();
    await this.pg.query(
      `INSERT INTO auth.sessions (id, user_id, family, ip, user_agent, expires_at)
       VALUES ($1,$2,$3,$4,$5, now() + ($6 || ' seconds')::interval)`,
      [sessionId, user.id, family, deviceMeta.ip ?? null, deviceMeta.ua ?? null, process.env.JWT_REFRESH_TTL ?? "2592000"],
    );
    await this.users.touchLogin(user.id);
    const accessToken = this.jwt.signAccess({
      sub: user.id,
      role: user.role,
      professionalType: user.professional_type ?? undefined,
      orgId: user.org_id ?? undefined,
      parentAssociateId: user.parent_associate_id ?? undefined,
      plan: user.plan,
      sid: sessionId,
    });
    const refreshToken = this.jwt.signRefresh({ sub: user.id, sid: sessionId, family });
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: string; sid: string; family: string };
    try {
      payload = this.jwt.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException("invalid_refresh");
    }
    const sessions = await this.pg.query<{ revoked_at: string | null }>(
      "SELECT revoked_at FROM auth.sessions WHERE id = $1 AND family = $2",
      [payload.sid, payload.family],
    );
    const session = sessions[0];
    if (!session || session.revoked_at) {
      // Reuse / revoked → revoke whole family (docs/06 reuse detection).
      await this.pg.query("UPDATE auth.sessions SET revoked_at = now() WHERE family = $1", [payload.family]);
      throw new UnauthorizedException("refresh_reuse_detected");
    }
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    // Rotate: revoke old session row, issue a fresh one in the same family.
    await this.pg.query("UPDATE auth.sessions SET revoked_at = now() WHERE id = $1", [payload.sid]);
    return this.issueForUser(user, {});
  }

  async logout(sessionId: string): Promise<void> {
    await this.pg.query("UPDATE auth.sessions SET revoked_at = now() WHERE id = $1", [sessionId]);
  }

  /**
   * Link a business owner to the org they created during onboarding and issue
   * fresh tokens carrying org_id. Only permitted while the user has no org yet,
   * so a business user can't attach themselves to an arbitrary organization.
   */
  async linkOrg(userId: string, orgId: string): Promise<TokenPair> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (user.role !== "BUSINESS_OWNER") throw new UnauthorizedException("only_business_owner_can_link");
    if (user.org_id && user.org_id !== orgId) throw new UnauthorizedException("org_already_linked");
    await this.users.setOrg(userId, orgId);
    const updated = (await this.users.findById(userId))!;
    return this.issueForUser(updated, {});
  }

  /**
   * Final signup activation (last step of the segmented business signup, after
   * onboarding + autopay mandate): PENDING_ONBOARDING → ACTIVE. Re-issues tokens
   * so downstream services see the activated account. Idempotent.
   */
  async activateOnboarded(userId: string): Promise<TokenPair> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (user.role !== "BUSINESS_OWNER") throw new UnauthorizedException("only_business_owner_can_activate");
    const firstActivation = user.status !== "ACTIVE";
    await this.users.markActive(userId);
    const updated = (await this.users.findById(userId))!;
    // First successful onboarding → WhatsApp CFO welcome (fire-and-forget;
    // the number is already auto-linked because it's the registered mobile).
    if (firstActivation) {
      void publishCustomerOnboarded({ userId, orgId: updated.org_id, mobile: updated.mobile, email: updated.email });
    }
    return this.issueForUser(updated, {});
  }

  async registerAccountant(parentAssociateId: string, mobile: string, email: string): Promise<{ userId: string }> {
    const existing = (await this.users.findByMobile(mobile)) ?? (await this.users.findByEmail(email));
    if (existing) {
      throw new Error("user_already_exists");
    }
    const user = await this.users.create({
      mobile,
      email,
      role: "ACCOUNTANT",
      parentAssociateId,
    });
    return { userId: user.id };
  }

  async listAccountants(parentAssociateId: string): Promise<UserRow[]> {
    return this.users.findByParentAssociateId(parentAssociateId);
  }

  /**
   * Owner provisions a team member in THEIR org (V3 wizard team step). The
   * member is ACTIVE immediately and signs in with Firebase phone OTP on the
   * given mobile — no password to distribute.
   */
  async registerBusinessUser(ownerOrgId: string, mobile: string, email: string): Promise<{ userId: string }> {
    const existing = (await this.users.findByMobile(mobile)) ?? (await this.users.findByEmail(email));
    if (existing) throw new Error("user_already_exists");
    const user = await this.users.create({
      mobile,
      email,
      role: "BUSINESS_USER",
      orgId: ownerOrgId,
      status: "ACTIVE",
    });
    return { userId: user.id };
  }

  /** The signed-in user's own profile (mobile/email/role) for display in panels. */
  async getMe(userId: string): Promise<{ id: string; mobile: string | null; email: string | null; role: string; plan: string; status: string; publicId: string | null }> {
    const u = await this.users.findById(userId);
    if (!u) throw new NotFoundException("user_not_found");
    const pub = (await this.pg.query<{ public_id: string | null }>("SELECT public_id FROM auth.users WHERE id=$1", [userId]))[0]?.public_id ?? null;
    return { id: u.id, mobile: u.mobile, email: u.email, role: u.role, plan: u.plan, status: u.status, publicId: pub };
  }

  // ── Professional (CA/CMA/CS/…) self-registration + verification ──────
  /**
   * Statutory documents required to verify a professional, by type. The admin
   * checks these against the relevant institute's public register before
   * approving. Returned to the registration UI so it shows the right checklist.
   */
  static requiredDocs(type: string): { type: string; label: string; required: boolean }[] {
    const inst = type === "CMA" ? "ICMAI" : type === "CS" ? "ICSI" : "ICAI";
    const base = [
      { type: "MEMBERSHIP_CERTIFICATE", label: `${inst} membership certificate`, required: true },
      { type: "COP", label: "Certificate of Practice (COP)", required: true },
      { type: "PAN", label: "PAN card", required: true },
      { type: "PHOTO_ID", label: "Photo ID (Aadhaar / passport / DL)", required: true },
      { type: "FIRM_REGISTRATION", label: "Firm registration certificate (if practising in a firm)", required: false },
    ];
    return base;
  }

  /**
   * Self-serve professional sign-up. Creates an ASSOCIATE in PENDING_VERIFICATION
   * with a profile row, and returns tokens so they can immediately upload their
   * KYC documents. The account stays unverified (and unassignable) until an admin
   * approves it. Login still works so they can track status + upload docs.
   */
  async registerProfessional(
    dto: {
      mobile: string; email: string; password: string; professionalType: string; fullName: string; membershipNo: string;
      copNo?: string; firmName?: string; firmRegistrationNo?: string; yearsExperience?: number;
      specializations?: string[]; officeAddress?: string; city?: string; state?: string; pincode?: string;
    },
    deviceMeta: { ip?: string; ua?: string },
  ): Promise<{ userId: string; publicId: string | null; tokens: TokenPair }> {
    const existing = (await this.users.findByMobile(dto.mobile)) ?? (await this.users.findByEmail(dto.email));
    if (existing) throw new ConflictException("user_already_exists");
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create({
      mobile: dto.mobile,
      email: dto.email,
      passwordHash,
      role: "ASSOCIATE",
      professionalType: dto.professionalType as never,
      status: "PENDING_VERIFICATION",
    });
    await this.pg.query(
      `INSERT INTO auth.professional_profiles
         (user_id, professional_type, full_name, membership_no, cop_no, firm_name, firm_registration_no,
          years_experience, specializations, office_address, city, state, pincode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [user.id, dto.professionalType, dto.fullName, dto.membershipNo, dto.copNo ?? null, dto.firmName ?? null,
       dto.firmRegistrationNo ?? null, dto.yearsExperience ?? null, dto.specializations ?? null,
       dto.officeAddress ?? null, dto.city ?? null, dto.state ?? null, dto.pincode ?? null],
    );
    const fresh = (await this.users.findById(user.id))!;
    const publicId = (await this.pg.query<{ public_id: string | null }>(
      "SELECT public_id FROM auth.users WHERE id=$1", [user.id]))[0]?.public_id ?? null;
    const tokens = await this.issueForUser(fresh, deviceMeta);
    return { userId: user.id, publicId, tokens };
  }

  /** The professional's own profile + verification status (for their setup page). */
  async getProfessionalProfile(userId: string): Promise<Record<string, unknown> | null> {
    return (await this.pg.query<Record<string, unknown>>(
      "SELECT * FROM auth.professional_profiles WHERE user_id=$1", [userId]))[0] ?? null;
  }

  /** Professional updates their own profile / attaches uploaded KYC document refs. */
  async updateProfessionalProfile(userId: string, patch: Record<string, unknown>): Promise<{ updated: boolean }> {
    const cols: Record<string, string> = {
      fullName: "full_name", membershipNo: "membership_no", copNo: "cop_no", firmName: "firm_name",
      firmRegistrationNo: "firm_registration_no", yearsExperience: "years_experience",
      specializations: "specializations", officeAddress: "office_address", city: "city", state: "state", pincode: "pincode",
    };
    const sets: string[] = [];
    const vals: unknown[] = [userId];
    for (const [k, col] of Object.entries(cols)) {
      if (patch[k] !== undefined) { vals.push(patch[k]); sets.push(`${col}=$${vals.length}`); }
    }
    if (patch.documents !== undefined) { vals.push(JSON.stringify(patch.documents)); sets.push(`documents=$${vals.length}::jsonb`); }
    if (sets.length === 0) return { updated: false };
    await this.pg.query(
      `UPDATE auth.professional_profiles SET ${sets.join(", ")}, updated_at=now() WHERE user_id=$1`, vals);
    return { updated: true };
  }

  /** Admin: professionals awaiting verification, newest first. */
  async listPendingProfessionals(): Promise<Record<string, unknown>[]> {
    return this.pg.query<Record<string, unknown>>(
      `SELECT p.*, u.email, u.mobile, u.public_id, u.status AS account_status
         FROM auth.professional_profiles p
         JOIN auth.users u ON u.id = p.user_id
        WHERE p.verification_status = 'PENDING_VERIFICATION'
        ORDER BY p.created_at ASC`);
  }

  /** Admin approves/rejects a professional. Approval activates the account. */
  async verifyProfessional(adminId: string, userId: string, approve: boolean, note?: string): Promise<{ status: string }> {
    const prof = (await this.pg.query<{ user_id: string }>(
      "SELECT user_id FROM auth.professional_profiles WHERE user_id=$1", [userId]))[0];
    if (!prof) throw new NotFoundException("professional_not_found");
    const status = approve ? "VERIFIED" : "REJECTED";
    await this.pg.query(
      `UPDATE auth.professional_profiles
          SET verification_status=$2, verification_note=$3, verified_by=$4, verified_at=now(), updated_at=now()
        WHERE user_id=$1`,
      [userId, status, note ?? null, adminId]);
    await this.pg.query(
      "UPDATE auth.users SET status=$2, updated_at=now() WHERE id=$1",
      [userId, approve ? "ACTIVE" : "DISABLED"]);
    return { status };
  }
}
