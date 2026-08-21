import { Body, Controller, ForbiddenException, Module, Param, Post } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { IsNumber, IsString, MaxLength } from "class-validator";
import { HealthController, PgService } from "@vertofi/nest-common";
import { CurrentPrincipal, JwtService, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { VbdService } from "./vbd.service.js";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

class SimulateDto {
  @IsString() @MaxLength(280) decision!: string;
  @IsNumber() monthlyImpact!: number; // ₹ additional monthly cost (or negative saving)
}

@Controller("vbd")
@Roles("BUSINESS_OWNER", "ASSOCIATE", "ADMIN")
class VbdController {
  constructor(private readonly svc: VbdService) {}

  /** Pro/Enterprise only (docs/11 feature gating). */
  @Post(":orgId/simulate")
  simulate(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: SimulateDto) {
    if (p.plan !== "PRO" && p.plan !== "ENTERPRISE" && p.role !== "ADMIN") {
      throw new ForbiddenException({ code: "upgrade_required", feature: "VBD", availableIn: "PRO" });
    }
    return this.svc.simulate(p, orgId, dto.decision, dto.monthlyImpact);
  }
}

@Module({
  controllers: [VbdController, HealthController],
  providers: [
    PgService,
    VbdService,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
