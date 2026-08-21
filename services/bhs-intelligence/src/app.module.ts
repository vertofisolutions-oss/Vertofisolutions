import { Body, Controller, Get, Injectable, Module, Post } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { IsUUID } from "class-validator";
import { HealthController, PgService } from "@vertofi/nest-common";
import { CurrentPrincipal, JwtService, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import { setSystemContext, type Principal } from "@vertofi/tenancy";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

/**
 * BHS-Intelligence panel (docs/03 #6). A BHS company sees ONLY the clients
 * Admin granted it (scope BHS_ONLY): each client's latest Business Health Score
 * + the associated professional (the CA/CMA chosen at onboarding). It can ping
 * that professional. No financial detail beyond the score is exposed.
 */
@Injectable()
class BhsIntelService {
  constructor(private readonly pg: PgService) {}

  private async grantedOrgs(analystId: string): Promise<string[]> {
    const r = await this.pg.query<{ org_id: string }>(
      `SELECT org_id FROM access.access_grants
        WHERE grantee_id=$1 AND scope='BHS_ONLY' AND status='ACTIVE'
          AND (expires_at IS NULL OR expires_at > now())`,
      [analystId],
    );
    return r.map((x) => x.org_id);
  }

  async portfolio(analyst: Principal) {
    const orgs = analyst.role === "ADMIN" ? null : await this.grantedOrgs(analyst.userId);
    if (orgs && orgs.length === 0) return { clients: [] };
    const params: unknown[] = [];
    let orgFilter = "";
    if (orgs) {
      orgFilter = "WHERE o.id = ANY($1::uuid[])";
      params.push(orgs);
    }
    // bhs_scores + onboarding_profiles have RLS → read under system context
    // (already constrained to the analyst's granted orgs via orgFilter).
    const rows = await this.pg.transaction(async (c) => {
      await setSystemContext(c);
      return (
        await c.query(
          `SELECT o.id AS org_id, o.legal_name,
                  b.score, b.rating, b.computed_at,
                  op.selected_professional_id AS professional_id,
                  u.full_name AS professional_name, u.professional_type
             FROM tenant.organizations o
             LEFT JOIN LATERAL (
                SELECT score, rating, computed_at FROM bhs.bhs_scores
                 WHERE org_id = o.id ORDER BY computed_at DESC LIMIT 1
             ) b ON true
             LEFT JOIN onboarding.onboarding_profiles op ON op.org_id = o.id
             LEFT JOIN auth.users u ON u.id = op.selected_professional_id
             ${orgFilter}
             ORDER BY b.score NULLS LAST
             LIMIT 500`,
          params,
        )
      ).rows;
    });
    return { clients: rows };
  }
}

@Controller("bhs-intel")
@Roles("BHS_ANALYST", "ADMIN")
class BhsIntelController {
  constructor(private readonly svc: BhsIntelService) {}

  @Get("portfolio")
  portfolio(@CurrentPrincipal() p: Principal) {
    return this.svc.portfolio(p);
  }
}

@Module({
  controllers: [BhsIntelController, HealthController],
  providers: [
    PgService,
    BhsIntelService,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
