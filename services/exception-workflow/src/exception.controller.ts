import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentPrincipal, Roles } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { ExceptionService } from "./exception.service.js";

class FlawDto {
  @IsString() @MaxLength(160) title!: string;
  @IsString() @MaxLength(2000) detail!: string;
  @IsOptional() @IsString() severity?: string;
}
class ResolveDto {
  @IsObject() resolution!: Record<string, unknown>;
  @IsOptional() dismiss?: boolean;
}

@Controller("exceptions")
export class ExceptionController {
  constructor(private readonly svc: ExceptionService) {}

  @Get(":orgId")
  @Roles("BUSINESS_OWNER", "ASSOCIATE", "ACCOUNTANT", "TEAM_LEAD", "TEAM_MEMBER", "ADMIN")
  list(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("status") status?: string) {
    return this.svc.list(p, orgId, status ?? "OPEN");
  }

  /** Teams + Accountants flag flaws; pings the responsible associate (docs/03). */
  @Post(":orgId/flag")
  @Roles("TEAM_LEAD", "TEAM_MEMBER", "ACCOUNTANT", "ASSOCIATE", "ADMIN")
  flag(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: FlawDto) {
    return this.svc.flagFlaw(p, orgId, dto);
  }

  @Post(":orgId/:id/resolve")
  @Roles("ASSOCIATE", "ADMIN")
  resolve(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("id") id: string, @Body() dto: ResolveDto) {
    return this.svc.resolve(p, orgId, id, dto.resolution, dto.dismiss ?? false);
  }
}
