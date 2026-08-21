/**
 * IP Allowlist Service — admin-console.
 *
 * Manages the IP addresses allowed to access the admin and teams panels.
 * Changes are written to DB AND synced to Redis immediately.
 * Middleware calls the /check endpoint which reads from Redis (30s edge cache).
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { PgService } from "@vertofi/nest-common";
import { setSystemContext, type Principal } from "@vertofi/tenancy";

const REDIS_KEY = "admin:panel:ip_allowlist";

interface IpEntry {
  id: string;
  ip_address: string;
  label: string;
  panel: "ADMIN" | "TEAMS" | "BOTH";
  expires_at: string | null;
  added_by: string | null;
  created_at: string;
}

@Injectable()
export class IpAllowlistService {
  private readonly redis: Redis;

  constructor(private readonly pg: PgService) {
    this.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }

  private async audit(adminId: string, action: string, detail?: unknown) {
    await this.pg.query(
      "INSERT INTO adminconsole.admin_access_log (admin_id, action, target, detail) VALUES ($1,$2,$3,$4)",
      [adminId, action, "ip_allowlist", detail ? JSON.stringify(detail) : null],
    );
  }

  // ── Sync DB → Redis ───────────────────────────────────────────────────────

  private async syncToRedis(): Promise<void> {
    try {
      const rows = await this.pg.query<IpEntry>(
        `SELECT ip_address, panel FROM adminconsole.ip_allowlist
         WHERE (expires_at IS NULL OR expires_at > now())
         ORDER BY created_at`,
      );
      // Store as JSON array of { ip, panel }
      const payload = JSON.stringify(rows.map((r) => ({ ip: r.ip_address, panel: r.panel })));
      await this.redis.set(REDIS_KEY, payload);
    } catch {
      // Redis sync failure should not block the DB operation — middleware
      // will pick up the change on its next cache revalidation cycle (30s).
    }
  }

  // ── List all IPs ──────────────────────────────────────────────────────────

  async list(admin: Principal) {
    await this.audit(admin.userId, "LIST_IP_ALLOWLIST");
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const rows = await c.query<IpEntry & { added_by_name: string | null }>(
        `SELECT al.*, u.email AS added_by_name
         FROM adminconsole.ip_allowlist al
         LEFT JOIN auth.users u ON u.id = al.added_by
         ORDER BY al.created_at DESC`,
      );
      return rows.rows;
    });
  }

  // ── Add IP ────────────────────────────────────────────────────────────────

  async add(
    admin: Principal,
    input: {
      ipAddress: string;
      label: string;
      panel: "ADMIN" | "TEAMS" | "BOTH";
      expiresAt?: string;
    },
  ) {
    // Basic IPv4/IPv6 format check
    const ipRegex =
      /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    if (!ipRegex.test(input.ipAddress)) {
      throw new BadRequestException("invalid_ip_address");
    }

    try {
      const row = await this.pg.query<IpEntry>(
        `INSERT INTO adminconsole.ip_allowlist (ip_address, label, panel, expires_at, added_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          input.ipAddress,
          input.label,
          input.panel,
          input.expiresAt ?? null,
          admin.userId,
        ],
      );

      await this.audit(admin.userId, "ADD_IP", { ip: input.ipAddress, panel: input.panel });
      await this.syncToRedis();
      return row[0]!;
    } catch (e: any) {
      if (e.code === "23505") throw new BadRequestException("ip_already_exists");
      throw e;
    }
  }

  // ── Remove IP ─────────────────────────────────────────────────────────────

  async remove(admin: Principal, id: string) {
    const row = await this.pg.query<{ ip_address: string }>(
      "DELETE FROM adminconsole.ip_allowlist WHERE id = $1 RETURNING ip_address",
      [id],
    );
    if (!row[0]) throw new BadRequestException("ip_not_found");

    await this.audit(admin.userId, "REMOVE_IP", { ip: row[0].ip_address, id });
    await this.syncToRedis();
    return { ok: true };
  }

  // ── Check IP (called by Next.js middleware, no JWT — uses X-Panel-Secret) ─

  async checkIp(ip: string, panel: "ADMIN" | "TEAMS"): Promise<{ allowed: boolean }> {
    // 1. Try Redis first (O(1), sub-millisecond)
    try {
      const cached = await this.redis.get(REDIS_KEY);
      if (cached) {
        const list: Array<{ ip: string; panel: string }> = JSON.parse(cached);
        // Empty list = allow all (no IPs configured yet — security warning shown in UI)
        if (list.length === 0) return { allowed: true };
        const allowed = list.some(
          (entry) => entry.ip === ip && (entry.panel === "BOTH" || entry.panel === panel),
        );
        return { allowed };
      }
    } catch {
      // Redis unreachable — fall through to DB
    }

    // 2. Fallback to DB, then re-sync Redis
    const rows = await this.pg.query<{ ip_address: string; panel: string }>(
      `SELECT ip_address, panel FROM adminconsole.ip_allowlist
       WHERE (expires_at IS NULL OR expires_at > now())`,
    );

    await this.syncToRedis().catch(() => undefined);

    if (rows.length === 0) return { allowed: true };
    const allowed = rows.some(
      (r) => r.ip_address === ip && (r.panel === "BOTH" || r.panel === panel),
    );
    return { allowed };
  }
}
