import { Controller, Get, Param, Query } from "@nestjs/common";
import { CurrentPrincipal, Roles } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { ReconciliationService } from "./reconciliation.service.js";

@Controller("reconcile")
@Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ACCOUNTANT", "ADMIN")
export class ReconciliationController {
  constructor(private readonly svc: ReconciliationService) {}

  @Get(":orgId/matches")
  matches(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("status") status?: string) {
    return this.svc.list(p, orgId, status ?? "CONFIRMED");
  }

  @Get(":orgId/unmatched")
  unmatched(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.unmatched(p, orgId);
  }
}
