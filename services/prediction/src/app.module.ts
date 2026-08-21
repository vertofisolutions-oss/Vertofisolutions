import { Controller, Get, Module, Param } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController, PgService } from "@vertofi/nest-common";
import { CurrentPrincipal, JwtService, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { PredictionService } from "./prediction.service.js";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

@Controller("predict")
@Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ACCOUNTANT", "ADMIN")
class PredictionController {
  constructor(private readonly svc: PredictionService) {}

  @Get(":orgId/profit-leaks")
  leaks(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.profitLeaks(p, orgId);
  }

  @Get(":orgId/tax-warning")
  tax(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.taxWarning(p, orgId);
  }

  @Get(":orgId/cashflow")
  cashflow(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.cashflowForecast(p, orgId);
  }
}

@Module({
  controllers: [PredictionController, HealthController],
  providers: [
    PgService,
    PredictionService,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
