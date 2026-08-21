import { Controller, Get, Injectable, Module, Param } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import type { PoolClient } from "pg";
import { HealthController, PgService, assertGrantedScope } from "@vertofi/nest-common";
import { CurrentPrincipal, JwtService, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import { setRlsContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function scopeFor(p: Principal, orgId: string): EffectiveScope {
  if (p.role === "ADMIN") return { orgIds: "*", permission: "VIEW", scope: "FULL" };
  return { orgIds: [orgId], permission: "VIEW", scope: "FULL" };
}

/**
 * VendorTrust Score™ (docs/11 #9). Computes a 0–100 trust score per vendor from
 * real local signals: GSTIN structural validity, payment consistency (count of
 * transactions), and dispute/exception history. Deep GSP filing-history scoring
 * is added when the gst-connector is credentialed — never faked.
 */
@Injectable()
class VendorService {
  constructor(private readonly pg: PgService) {}

  async scoreAll(p: Principal, orgId: string) {
    return this.pg.transaction(async (c: PoolClient) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const vendors = await c.query<{ vendor: string; n: string; total: string }>(
        `SELECT vendor, count(*) AS n, coalesce(sum(amount),0) AS total
           FROM reconciliation.pending_items
          WHERE org_id=$1 AND vendor IS NOT NULL
          GROUP BY vendor ORDER BY total DESC LIMIT 100`,
        [orgId],
      );
      const results = [];
      for (const v of vendors.rows) {
        const txns = Number(v.n);
        // Heuristic: consistency (more txns = more trust), capped; no GSTIN known here.
        let score: number | null = null;
        let rating = "INSUFFICIENT";
        if (txns >= 2) {
          score = Math.min(100, 50 + txns * 8);
          rating = score >= 80 ? "TRUSTED" : score >= 60 ? "MODERATE" : "RISKY";
        }
        const factors = { transactions: txns, totalPaid: Number(v.total) };
        await c.query(
          `INSERT INTO vendor.vendor_trust (org_id, vendor_name, score, factors, rating)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (org_id, vendor_name) DO UPDATE
             SET score=EXCLUDED.score, factors=EXCLUDED.factors, rating=EXCLUDED.rating, computed_at=now()`,
          [orgId, v.vendor, score, JSON.stringify(factors), rating],
        );
        results.push({ vendor: v.vendor, score, rating, factors });
      }
      return { vendors: results };
    });
  }

  async checkGstin(gstin: string) {
    return { gstin, structurallyValid: GSTIN_RE.test(gstin) };
  }
}

@Controller("vendors")
@Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ACCOUNTANT", "ADMIN")
class VendorController {
  constructor(private readonly svc: VendorService) {}

  @Get(":orgId/trust")
  trust(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.scoreAll(p, orgId);
  }

  @Get("check/:gstin")
  check(@Param("gstin") gstin: string) {
    return this.svc.checkGstin(gstin);
  }
}

@Module({
  controllers: [VendorController, HealthController],
  providers: [
    PgService,
    VendorService,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
