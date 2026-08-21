import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CurrentPrincipal, Roles } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { TenantService } from "./tenant.service.js";
import { AssignTeamDto, CreateOrgDto, CreateTeamDto } from "./dto.js";

@Controller("tenant")
export class TenantController {
  constructor(private readonly tenant: TenantService) {}

  /** Business owner creates their org during onboarding; Admin can too. */
  @Post("orgs")
  @Roles("BUSINESS_OWNER", "ADMIN")
  createOrg(@CurrentPrincipal() p: Principal, @Body() dto: CreateOrgDto) {
    return this.tenant.createOrg(dto, p);
  }

  /** Business-profile read — tenant-isolated (ownership enforced in the service). */
  @Get("orgs/:id")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "TEAM_LEAD", "TEAM_MEMBER", "ASSOCIATE", "ACCOUNTANT", "ADMIN")
  getOrg(@CurrentPrincipal() p: Principal, @Param("id") id: string) {
    return this.tenant.getOrg(id, p);
  }

  // ── Teams: Admin-only management (docs/03) ──
  @Post("teams")
  @Roles("ADMIN")
  createTeam(@CurrentPrincipal() actor: Principal, @Body() dto: CreateTeamDto) {
    return this.tenant.createTeam({ ...dto, createdBy: actor.userId });
  }

  @Delete("teams/:id")
  @Roles("ADMIN")
  async deleteTeam(@Param("id") id: string) {
    await this.tenant.deleteTeam(id);
    return { deleted: true };
  }

  @Post("teams/:id/assign")
  @Roles("ADMIN")
  assign(@CurrentPrincipal() actor: Principal, @Param("id") teamId: string, @Body() dto: AssignTeamDto) {
    return this.tenant.assignTeam(teamId, dto.orgId, actor.userId);
  }
}
