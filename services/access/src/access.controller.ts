import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CurrentPrincipal, Roles } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { AccessService } from "./access.service.js";
import { AssignProfessionalDto, CreateGrantDto, CreateRequestDto, DecideRequestDto, RespondRequestDto } from "./dto.js";

@Controller("access")
export class AccessController {
  constructor(private readonly access: AccessService) {}

  /** Internal: resolve a principal's effective scope (called by the gateway/services). */
  @Get("resolve")
  resolve(@CurrentPrincipal() principal: Principal) {
    return this.access.resolve(principal);
  }

  @Post("grants")
  @Roles("ADMIN", "ASSOCIATE")
  async createGrant(@CurrentPrincipal() actor: Principal, @Body() dto: CreateGrantDto) {
    await this.access.authorizeGrantCreation(actor, dto.granteeId, dto.orgId);
    return this.access.createGrant({ ...dto, grantedBy: actor.userId });
  }

  @Delete("grants/:id")
  @Roles("ADMIN", "ASSOCIATE")
  async revoke(@Param("id") id: string) {
    await this.access.revokeGrant(id);
    return { revoked: true };
  }

  /** Teams (view-only) request elevated access → notifies Admin (docs/03). */
  @Post("access-requests")
  @Roles("TEAM_LEAD", "TEAM_MEMBER")
  request(@CurrentPrincipal() actor: Principal, @Body() dto: CreateRequestDto) {
    return this.access.createRequest(actor.userId, dto.orgId, dto.reason);
  }

  @Post("access-requests/:id/decide")
  @Roles("ADMIN")
  async decide(@CurrentPrincipal() actor: Principal, @Param("id") id: string, @Body() dto: DecideRequestDto) {
    await this.access.decideRequest(id, actor.userId, dto.decision === "APPROVE");
    return { decided: dto.decision };
  }

  // ── Owner → CA assignment by Vertofi ID ─────────────────────────────
  /** Owner assigns a professional to their books by the professional's VRU- id. */
  @Post("assign-professional")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER")
  assignProfessional(@CurrentPrincipal() actor: Principal, @Body() dto: AssignProfessionalDto) {
    return this.access.assignProfessional(actor, dto.vertofiId, dto.scope ?? "FULL");
  }

  /** Professional's assigned clients (active grants) — the My Clients picker. */
  @Get("my-clients")
  @Roles("ACCOUNTANT", "ASSOCIATE", "LAWYER", "BHS_ANALYST", "ADMIN")
  myClients(@CurrentPrincipal() actor: Principal) {
    return this.access.myClients(actor);
  }

  /** Owner: professionals assigned to my org (active + pending) — for managing access. */
  @Get("my-professionals")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER")
  myProfessionals(@CurrentPrincipal() actor: Principal) {
    return this.access.assignedProfessionals(actor);
  }

  /** Owner: revoke a professional's access to my org. */
  @Delete("my-professionals/:granteeId")
  @Roles("BUSINESS_OWNER")
  revokeAssignment(@CurrentPrincipal() actor: Principal, @Param("granteeId") granteeId: string) {
    return this.access.revokeAssignment(actor, granteeId);
  }

  /** Owner: cancel a still-pending assignment request. */
  @Delete("my-professionals/request/:requestId")
  @Roles("BUSINESS_OWNER")
  cancelAssignment(@CurrentPrincipal() actor: Principal, @Param("requestId") requestId: string) {
    return this.access.cancelAssignmentRequest(actor, requestId);
  }

  /** Professional's inbox of pending assignment requests. */
  @Get("requests/incoming")
  @Roles("ACCOUNTANT", "ASSOCIATE", "LAWYER", "BHS_ANALYST")
  incoming(@CurrentPrincipal() actor: Principal) {
    return this.access.incomingRequests(actor);
  }

  /** Professional accepts (→ active grant) or declines an assignment request. */
  @Post("requests/:id/respond")
  @Roles("ACCOUNTANT", "ASSOCIATE", "LAWYER", "BHS_ANALYST")
  respond(@CurrentPrincipal() actor: Principal, @Param("id") id: string, @Body() dto: RespondRequestDto) {
    return this.access.respondToRequest(actor, id, dto.accept);
  }
}
