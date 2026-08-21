import { Body, Controller, Get, Headers, Ip, Module, Param, Post, Query } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ArrayMaxSize, IsArray, IsString, IsUUID, MaxLength } from "class-validator";
import { HealthController, PgService } from "@vertofi/nest-common";
import { CurrentPrincipal, JwtService, Public, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { LegalService } from "./legal.service.js";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

class AnalyzeDto {
  @IsString() @MaxLength(8000) notice!: string;
}

class AcceptDto {
  @IsArray() @ArrayMaxSize(10) @IsUUID("4", { each: true }) documentIds!: string[];
}

@Controller("legal")
@Roles("LAWYER", "ADMIN")
class LegalController {
  constructor(private readonly svc: LegalService) {}

  @Get("cases")
  list(@CurrentPrincipal() p: Principal, @Query("status") status?: string) {
    return this.svc.listForLawyer(p, status ?? "OPEN");
  }

  @Post("cases/:id/analyze")
  analyze(@CurrentPrincipal() p: Principal, @Param("id") id: string, @Body() dto: AnalyzeDto) {
    return this.svc.analyze(p, id, dto.notice);
  }
}

/**
 * Terms & Conditions / Privacy consent. Documents are public (shown before/
 * during signup); recording acceptance requires the authenticated user so it's
 * legally bound to the account, with IP + user-agent captured as evidence.
 */
@Controller("legal")
class LegalConsentController {
  constructor(private readonly svc: LegalService) {}

  @Public()
  @Get("documents/current")
  documents() {
    return this.svc.currentDocuments();
  }

  @Post("accept")
  accept(@CurrentPrincipal() p: Principal, @Body() dto: AcceptDto, @Ip() ip: string, @Headers("user-agent") ua?: string) {
    return this.svc.accept(p.userId, dto.documentIds.map((documentId) => ({ documentId })), { orgId: p.orgId, ip, ua, method: "CHECKBOX" });
  }

  @Get("consent/status")
  status(@CurrentPrincipal() p: Principal) {
    return this.svc.hasAcceptedCurrent(p.userId).then((accepted) => ({ accepted }));
  }
}

@Module({
  controllers: [LegalController, LegalConsentController, HealthController],
  providers: [
    PgService,
    LegalService,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
