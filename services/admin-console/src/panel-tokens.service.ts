/**
 * Panel Access Tokens Service — admin-console.
 *
 * Generates permanent DB-stored tokens for admin/teams panel access.
 * Tokens are set as 10-year httpOnly cookies by the /activate route.
 * Revocation: individual per token (admin clicks Revoke in UI).
 * Middleware validates by calling /check endpoint — result cached 60s.
 */
import { Injectable, NotFoundException } from "@nestjs/common";
import { PgService } from "@vertofi/nest-common";
import { setSystemContext, type Principal } from "@vertofi/tenancy";

interface TokenRow {
  id: string;
  token: string;
  team_member_id: string | null;
  panel: "ADMIN" | "TEAMS";
  label: string;
  is_active: boolean;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  team_member_name?: string | null;
  employee_id?: string | null;
}

@Injectable()
export class PanelTokensService {
  constructor(private readonly pg: PgService) {}

  private async audit(adminId: string, action: string, detail?: unknown) {
    await this.pg.query(
      "INSERT INTO adminconsole.admin_access_log (admin_id, action, target, detail) VALUES ($1,$2,$3,$4)",
      [adminId, action, "panel_access_tokens", detail ? JSON.stringify(detail) : null],
    );
  }

  // ── Generate a new token ──────────────────────────────────────────────────

  async generate(
    admin: Principal,
    input: {
      panel: "ADMIN" | "TEAMS";
      label: string;
      teamMemberId?: string;
    },
  ): Promise<{ id: string; token: string; activationUrl: string }> {
    const row = await this.pg.query<TokenRow>(
      `INSERT INTO adminconsole.panel_access_tokens (team_member_id, panel, label, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.teamMemberId ?? null, input.panel, input.label, admin.userId],
    );

    const tok = row[0]!;

    // Build activation URL based on panel
    const baseUrl =
      input.panel === "ADMIN"
        ? (process.env.ADMIN_PANEL_URL ?? "https://ops-admin.vertofi.com")
        : (process.env.TEAMS_PANEL_URL ?? "https://ops-teams.vertofi.com");

    const activationUrl = `${baseUrl}/activate?tok=${tok.token}`;

    await this.audit(admin.userId, "GENERATE_TOKEN", {
      panel: input.panel,
      label: input.label,
      teamMemberId: input.teamMemberId,
    });

    return { id: tok.id, token: tok.token, activationUrl };
  }

  // ── List active tokens ────────────────────────────────────────────────────

  async list(admin: Principal, panel?: "ADMIN" | "TEAMS") {
    await this.audit(admin.userId, "LIST_TOKENS");
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);

      const rows = await c.query<TokenRow>(
        `SELECT pat.id, pat.panel, pat.label, pat.is_active, pat.last_used_at,
                pat.created_at, pat.team_member_id,
                tm.full_name AS team_member_name, tm.employee_id
         FROM adminconsole.panel_access_tokens pat
         LEFT JOIN adminconsole.team_members tm ON tm.id = pat.team_member_id
         WHERE pat.is_active = true
           ${panel ? "AND pat.panel = $1" : ""}
         ORDER BY pat.created_at DESC`,
        panel ? [panel] : [],
      );

      return rows.rows;
    });
  }

  // ── Revoke a token ────────────────────────────────────────────────────────

  async revoke(admin: Principal, tokenId: string) {
    const row = await this.pg.query<{ label: string; panel: string }>(
      "UPDATE adminconsole.panel_access_tokens SET is_active = false WHERE id = $1 AND is_active = true RETURNING label, panel",
      [tokenId],
    );
    if (!row[0]) throw new NotFoundException("token_not_found_or_already_revoked");
    await this.audit(admin.userId, "REVOKE_TOKEN", { tokenId, label: row[0].label });
    return { ok: true };
  }

  // ── Validate token (called by Next.js middleware, no JWT) ─────────────────
  // This is an internal endpoint protected by X-Panel-Secret header.
  // Result is cached for 60s by Next.js edge — revocation effective within 60s.

  async validate(token: string, panel: "ADMIN" | "TEAMS"): Promise<{ valid: boolean; teamMemberId?: string }> {
    if (!token || token.length < 10) return { valid: false };

    const row = await this.pg.query<{ id: string; team_member_id: string | null; is_active: boolean }>(
      "SELECT id, team_member_id, is_active FROM adminconsole.panel_access_tokens WHERE token = $1 AND panel = $2",
      [token, panel],
    );

    if (!row[0] || !row[0].is_active) return { valid: false };

    // Update last_used_at asynchronously (don't await — don't block the middleware response)
    this.pg
      .query("UPDATE adminconsole.panel_access_tokens SET last_used_at = now() WHERE id = $1", [row[0].id])
      .catch(() => undefined);

    return { valid: true, teamMemberId: row[0].team_member_id ?? undefined };
  }
}
