import { Controller, Get, Injectable, Module, Param } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController, PgService } from "@vertofi/nest-common";
import { JwtService, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import { setSystemContext } from "@vertofi/tenancy";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

const K_ANONYMITY = 5; // never expose a cohort smaller than this (docs/11 #14)

/**
 * Industry Benchmarks™ (docs/11 #14). Anonymized cross-tenant aggregates with a
 * k-anonymity floor: a cohort is only reported if it contains >= K_ANONYMITY
 * organizations, so no single business is identifiable.
 */
@Injectable()
class BenchmarksService {
  constructor(private readonly pg: PgService) {}

  async byIndustry(industry: string) {
    return this.pg.transaction(async (c) => {
      await setSystemContext(c); // aggregate read across tenants
      const r = await c.query<{ n: string; avg_margin: string | null; avg_expense_ratio: string | null }>(
        `WITH per_org AS (
           SELECT o.id,
                  sum(CASE WHEN a.type='INCOME' THEN l.credit ELSE 0 END) AS income,
                  sum(CASE WHEN a.type='EXPENSE' THEN l.debit ELSE 0 END) AS expense
             FROM tenant.organizations o
             JOIN ledger.ledger_lines l ON l.org_id = o.id
             JOIN ledger.chart_of_accounts a ON a.id = l.account_id
            WHERE o.industry = $1
            GROUP BY o.id
           HAVING sum(CASE WHEN a.type='INCOME' THEN l.credit ELSE 0 END) > 0
         )
         SELECT count(*) AS n,
                avg((income - expense) / income) AS avg_margin,
                avg(expense / income) AS avg_expense_ratio
           FROM per_org`,
        [industry],
      );
      const row = r.rows[0]!;
      const n = Number(row.n);
      if (n < K_ANONYMITY) {
        return { industry, cohortSize: n, available: false, reason: "below_k_anonymity_threshold" };
      }
      return {
        industry,
        cohortSize: n,
        available: true,
        avgMargin: row.avg_margin === null ? null : Number(row.avg_margin),
        avgExpenseRatio: row.avg_expense_ratio === null ? null : Number(row.avg_expense_ratio),
      };
    });
  }
}

@Controller("benchmarks")
@Roles("BUSINESS_OWNER", "ASSOCIATE", "ADMIN")
class BenchmarksController {
  constructor(private readonly svc: BenchmarksService) {}

  @Get("industry/:industry")
  industry(@Param("industry") industry: string) {
    return this.svc.byIndustry(industry);
  }
}

@Module({
  controllers: [BenchmarksController, HealthController],
  providers: [
    PgService,
    BenchmarksService,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
