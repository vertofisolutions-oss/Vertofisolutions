import { Controller, Get, Module, Param } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController, PgService } from "@vertofi/nest-common";
import { CurrentPrincipal, JwtService, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { ReportingService } from "./reporting.service.js";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

@Controller("reports")
@Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ACCOUNTANT", "ADMIN")
class ReportingController {
  constructor(private readonly svc: ReportingService) {}

  @Get(":orgId/pnl")
  pnl(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.profitAndLoss(p, orgId);
  }

  @Get(":orgId/balance-sheet")
  balanceSheet(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.balanceSheet(p, orgId);
  }

  @Get(":orgId/gst-summary")
  gst(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.gstSummary(p, orgId);
  }

  @Get(":orgId/moneymap")
  moneymap(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.moneyMap(p, orgId);
  }
}

@Module({
  controllers: [ReportingController, HealthController],
  providers: [
    PgService,
    ReportingService,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
