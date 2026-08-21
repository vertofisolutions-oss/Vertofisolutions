import { Body, Controller, ForbiddenException, Get, Injectable, Module, Param, Post } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { HealthController, PgService, assertGrantedScope } from "@vertofi/nest-common";
import { CurrentPrincipal, JwtService, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import { setRlsContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

function scopeFor(p: Principal, orgId: string): EffectiveScope {
  if (p.role === "ADMIN") return { orgIds: "*", permission: "EDIT", scope: "FULL" };
  return { orgIds: [orgId], permission: "EDIT", scope: "FULL" };
}

class SubmitDto {
  @IsEnum(["GST_PENALTY", "TAX_PENALTY", "PAYROLL", "OTHER"] as const) type!: string;
  @IsNumber() @Min(0) penaltyAmount!: number;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}
class VerdictDto {
  @IsEnum(["APPROVED", "REJECTED", "PAID"] as const) status!: string;
  @IsOptional() @IsString() note?: string;
}

/** Accounting Warranty+™ claims (docs/11 #10). Pro plan; verdict by Admin. */
@Injectable()
class WarrantyService {
  constructor(private readonly pg: PgService) {}

  submit(p: Principal, orgId: string, dto: SubmitDto) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query<{ id: string }>(
        `INSERT INTO warranty.warranty_claims (org_id, type, penalty_amount, description, submitted_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [orgId, dto.type, dto.penaltyAmount, dto.description ?? null, p.userId],
      );
      return { id: r.rows[0]!.id, status: "SUBMITTED" };
    });
  }

  list(p: Principal, orgId: string) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      return (await c.query("SELECT * FROM warranty.warranty_claims WHERE org_id=$1 ORDER BY created_at DESC", [orgId])).rows;
    });
  }

  verdict(p: Principal, orgId: string, id: string, dto: VerdictDto) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      await c.query(
        "UPDATE warranty.warranty_claims SET status=$3, verdict=$4, updated_at=now() WHERE id=$1 AND org_id=$2",
        [id, orgId, dto.status, JSON.stringify({ note: dto.note, by: p.userId })],
      );
      return { id, status: dto.status };
    });
  }
}

@Controller("warranty")
class WarrantyController {
  constructor(private readonly svc: WarrantyService) {}

  @Post(":orgId/claims")
  @Roles("BUSINESS_OWNER", "ASSOCIATE", "ADMIN")
  submit(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: SubmitDto) {
    if (p.plan !== "PRO" && p.plan !== "ENTERPRISE" && p.role !== "ADMIN") {
      throw new ForbiddenException({ code: "upgrade_required", feature: "Accounting Warranty+", availableIn: "PRO" });
    }
    return this.svc.submit(p, orgId, dto);
  }

  @Get(":orgId/claims")
  @Roles("BUSINESS_OWNER", "ASSOCIATE", "ADMIN")
  list(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.list(p, orgId);
  }

  @Post(":orgId/claims/:id/verdict")
  @Roles("ADMIN")
  verdict(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("id") id: string, @Body() dto: VerdictDto) {
    return this.svc.verdict(p, orgId, id, dto);
  }
}

@Module({
  controllers: [WarrantyController, HealthController],
  providers: [
    PgService,
    WarrantyService,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
