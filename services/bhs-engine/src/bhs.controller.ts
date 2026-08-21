import { Controller, Get, Param } from "@nestjs/common";
import { CurrentPrincipal, Roles } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { BhsService } from "./bhs.service.js";

@Controller("bhs")
@Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ACCOUNTANT", "TEAM_LEAD", "TEAM_MEMBER", "BHS_ANALYST", "ADMIN")
export class BhsController {
  constructor(private readonly svc: BhsService) {}

  @Get(":orgId")
  latest(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.latest(p, orgId);
  }

  @Get(":orgId/history")
  history(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.history(p, orgId);
  }
}
