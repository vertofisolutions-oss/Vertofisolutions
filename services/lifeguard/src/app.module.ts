import { Body, Controller, Get, Module, Param, Post, Query } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { IsEnum } from "class-validator";
import { HealthController, PgService } from "@vertofi/nest-common";
import { CurrentPrincipal, JwtService, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { LifeguardService } from "./lifeguard.service.js";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

class RaiseDto {
  @IsEnum(["GST_NOTICE", "TAX_NOTICE", "FRAUD", "CASHFLOW_CRISIS", "VENDOR_DISPUTE"] as const)
  category!: string;
}

@Controller("lifeguard")
@Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
class LifeguardController {
  constructor(private readonly svc: LifeguardService) {}

  @Post(":orgId/sos")
  raise(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: RaiseDto) {
    return this.svc.raise(p, orgId, dto.category);
  }

  @Get(":orgId")
  list(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("status") status?: string) {
    return this.svc.list(p, orgId, status ?? "OPEN");
  }

  @Post(":orgId/:id/resolve")
  resolve(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("id") id: string) {
    return this.svc.resolve(p, orgId, id);
  }
}

@Module({
  controllers: [LifeguardController, HealthController],
  providers: [
    PgService,
    LifeguardService,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
