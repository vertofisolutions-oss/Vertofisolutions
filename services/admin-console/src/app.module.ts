import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Module,
  Param,
  Patch,
  Post,
  Query,
  HttpCode,
  UnauthorizedException,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from "class-validator";
import { HealthController, PgService } from "@vertofi/nest-common";
import { CurrentPrincipal, JwtService, Public, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { AdminService } from "./admin.service.js";
import { TeamMembersService } from "./team-members.service.js";
import { IpAllowlistService } from "./ip-allowlist.service.js";
import { PanelTokensService } from "./panel-tokens.service.js";
import { CloudHealthConnector, CloudBillingConnector, CicdConnector } from "./cloud.connectors.js";
import { StorageConnector } from "./storage.connector.js";
import { LandingAdminController } from "./landing-admin.controller.js";

// ── DTOs ──────────────────────────────────────────────────────────────────────

class PatchDto {
  @IsObject() patch!: Record<string, unknown>;
}

class CreateTeamMemberDto {
  @IsString() fullName!: string;
  @IsString() email!: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsString() password!: string;
}

class UpdateTeamMemberDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() mobile?: string;
}

class ResetPasswordDto {
  @IsString() newPassword!: string;
}

class AssignCompanyDto {
  @IsUUID() orgId!: string;
  @IsEnum(["READ", "READ_WRITE"]) accessLevel!: "READ" | "READ_WRITE";
}

class UpdateAccessLevelDto {
  @IsEnum(["READ", "READ_WRITE"]) accessLevel!: "READ" | "READ_WRITE";
}

class ApproveRequestDto {
  @IsEnum(["READ", "READ_WRITE"]) accessLevel!: "READ" | "READ_WRITE";
  @IsString() adminPassword!: string;
}

class RejectRequestDto {
  @IsOptional() @IsString() reason?: string;
}

class AddIpDto {
  @IsString() ipAddress!: string;
  @IsString() label!: string;
  @IsEnum(["ADMIN", "TEAMS", "BOTH"]) panel!: "ADMIN" | "TEAMS" | "BOTH";
  @IsOptional() @IsString() expiresAt?: string;
}

class GenerateTokenDto {
  @IsEnum(["ADMIN", "TEAMS"]) panel!: "ADMIN" | "TEAMS";
  @IsString() label!: string;
  @IsOptional() @IsUUID() teamMemberId?: string;
}

class SubmitAccessRequestDto {
  @IsUUID() orgId!: string;
  @IsOptional() @IsString() reason?: string;
}

// ── JWT setup ─────────────────────────────────────────────────────────────────

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

// Panel secret for middleware-to-service calls (no JWT)
const PANEL_SECRET = process.env.PANEL_SECRET ?? "";

function validatePanelSecret(header: string | undefined) {
  if (!PANEL_SECRET || header !== PANEL_SECRET) {
    throw new UnauthorizedException("invalid_panel_secret");
  }
}

// ── Controllers ───────────────────────────────────────────────────────────────

/** All existing admin operations (overview, billing, AI usage, etc.) */
@Controller("admin-console")
@Roles("ADMIN")
class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get("overview")
  overview(@CurrentPrincipal() p: Principal) { return this.svc.overview(p); }

  @Get("metrics")
  metrics(@CurrentPrincipal() p: Principal) { return this.svc.metrics(p); }

  @Get("billing/dues")
  dues(@CurrentPrincipal() p: Principal) { return this.svc.billingDues(p); }

  @Get("ai-usage")
  ai(@CurrentPrincipal() p: Principal, @Query("period") period?: string) {
    return this.svc.aiUsage(p, period);
  }

  @Get("cloud-billing")
  cloud() { return this.svc.cloudCost(); }

  @Get("cloud-status")
  cloudStatus() { return this.svc.cloudStatus(); }

  @Get("cicd")
  cicd() { return this.svc.pipelines(); }

  @Get("risks")
  risks(@CurrentPrincipal() p: Principal) { return this.svc.risks(p); }

  @Get("access-log")
  accessLog(@CurrentPrincipal() p: Principal) { return this.svc.accessLog(p); }

  @Get("tables")
  tables() { return this.svc.listTables(); }

  // Declared BEFORE tables/:key so "groups" isn't captured as a table key.
  @Get("tables/groups")
  groups() { return this.svc.tableGroups(); }

  // Presigned, time-limited view URL for any uploaded document (audited).
  @Get("documents/:id/view")
  viewDocument(@CurrentPrincipal() p: Principal, @Param("id") id: string) {
    return this.svc.viewDocument(p, id);
  }

  @Get("tables/:key")
  table(
    @CurrentPrincipal() p: Principal,
    @Param("key") key: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("q") q?: string,
  ) {
    return this.svc.getTable(p, key, { limit: limit ? Number(limit) : 50, offset: offset ? Number(offset) : 0, q });
  }

  @Patch("tables/:key/:id")
  update(@CurrentPrincipal() p: Principal, @Param("key") key: string, @Param("id") id: string, @Body() dto: PatchDto) {
    return this.svc.updateRow(p, key, id, dto.patch);
  }
}

/** Team member management — ADMIN only */
@Controller("admin-console/team-members")
@Roles("ADMIN")
class TeamMembersController {
  constructor(private readonly svc: TeamMembersService) {}

  @Get()
  list(
    @CurrentPrincipal() p: Principal,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.svc.list(p, { q, status, limit: Number(limit ?? 50), offset: Number(offset ?? 0) });
  }

  @Post()
  create(@CurrentPrincipal() p: Principal, @Body() dto: CreateTeamMemberDto) {
    return this.svc.create(p, dto);
  }

  @Get(":id")
  getById(@CurrentPrincipal() p: Principal, @Param("id") id: string) {
    return this.svc.getById(p, id);
  }

  @Patch(":id")
  update(@CurrentPrincipal() p: Principal, @Param("id") id: string, @Body() dto: UpdateTeamMemberDto) {
    return this.svc.update(p, id, dto);
  }

  @Post(":id/reset-password")
  resetPassword(@CurrentPrincipal() p: Principal, @Param("id") id: string, @Body() dto: ResetPasswordDto) {
    return this.svc.resetPassword(p, id, dto.newPassword);
  }

  @Post(":id/suspend")
  @HttpCode(200)
  suspend(@CurrentPrincipal() p: Principal, @Param("id") id: string) {
    return this.svc.setStatus(p, id, "SUSPENDED");
  }

  @Post(":id/activate")
  @HttpCode(200)
  activate(@CurrentPrincipal() p: Principal, @Param("id") id: string) {
    return this.svc.setStatus(p, id, "ACTIVE");
  }

  @Post(":id/deactivate")
  @HttpCode(200)
  deactivate(@CurrentPrincipal() p: Principal, @Param("id") id: string) {
    return this.svc.setStatus(p, id, "DEACTIVATED");
  }

  @Delete(":id/sessions")
  forceLogout(@CurrentPrincipal() p: Principal, @Param("id") id: string) {
    return this.svc.forceLogout(p, id);
  }

  // Company assignments
  @Get(":id/assignments")
  assignments(@Param("id") id: string) {
    return this.svc.listAssignments(id);
  }

  @Post(":id/assignments")
  assign(@CurrentPrincipal() p: Principal, @Param("id") id: string, @Body() dto: AssignCompanyDto) {
    return this.svc.assignCompany(p, id, dto.orgId, dto.accessLevel);
  }

  @Patch(":id/assignments/:orgId")
  updateAccess(
    @CurrentPrincipal() p: Principal,
    @Param("id") id: string,
    @Param("orgId") orgId: string,
    @Body() dto: UpdateAccessLevelDto,
  ) {
    return this.svc.updateAssignmentAccess(p, id, orgId, dto.accessLevel);
  }

  @Delete(":id/assignments/:orgId")
  removeAssignment(@CurrentPrincipal() p: Principal, @Param("id") id: string, @Param("orgId") orgId: string) {
    return this.svc.removeAssignment(p, id, orgId);
  }
}

/** Access request management — ADMIN approve/reject */
@Controller("admin-console/access-requests")
@Roles("ADMIN")
class AccessRequestsController {
  constructor(private readonly svc: TeamMembersService) {}

  @Get()
  list(@CurrentPrincipal() p: Principal, @Query("status") status?: string) {
    return this.svc.listAccessRequests(p, status ?? "PENDING");
  }

  @Post(":id/approve")
  @HttpCode(200)
  approve(@CurrentPrincipal() p: Principal, @Param("id") id: string, @Body() dto: ApproveRequestDto) {
    return this.svc.approveRequest(p, id, dto.accessLevel, dto.adminPassword);
  }

  @Post(":id/reject")
  @HttpCode(200)
  reject(@CurrentPrincipal() p: Principal, @Param("id") id: string, @Body() dto: RejectRequestDto) {
    return this.svc.rejectRequest(p, id, dto.reason);
  }
}

/** Teams-facing endpoints — used by the teams panel (TEAM_MEMBER / TEAM_LEAD roles) */
@Controller("admin-console/my")
@Roles("TEAM_MEMBER", "TEAM_LEAD")
class TeamsMemberSelfController {
  constructor(private readonly svc: TeamMembersService) {}

  @Get("assignments")
  myAssignments(@CurrentPrincipal() p: Principal) {
    return this.svc.getMyAssignments(p.userId);
  }

  @Post("access-requests")
  @HttpCode(202)
  requestAccess(@CurrentPrincipal() p: Principal, @Body() dto: SubmitAccessRequestDto) {
    return this.svc.submitAccessRequest(p.userId, dto.orgId, dto.reason);
  }
}

/** IP Allowlist — ADMIN CRUD + public check endpoint for middleware */
@Controller("admin-console/ip-allowlist")
class IpAllowlistController {
  constructor(private readonly svc: IpAllowlistService) {}

  @Roles("ADMIN")
  @Get()
  list(@CurrentPrincipal() p: Principal) { return this.svc.list(p); }

  @Roles("ADMIN")
  @Post()
  add(@CurrentPrincipal() p: Principal, @Body() dto: AddIpDto) {
    return this.svc.add(p, dto);
  }

  @Roles("ADMIN")
  @Delete(":id")
  remove(@CurrentPrincipal() p: Principal, @Param("id") id: string) {
    return this.svc.remove(p, id);
  }

  /** No JWT — called by Next.js middleware. Protected by X-Panel-Secret. */
  @Public()
  @Get("check")
  async check(
    @Headers("x-check-ip") ip: string,
    @Headers("x-panel") panel: string,
    @Headers("x-panel-secret") secret: string,
  ) {
    validatePanelSecret(secret);
    return this.svc.checkIp(ip ?? "", panel as "ADMIN" | "TEAMS");
  }
}

/** Panel Tokens — ADMIN manage + public validate endpoint for middleware */
@Controller("admin-console/panel-tokens")
class PanelTokensController {
  constructor(private readonly svc: PanelTokensService) {}

  @Roles("ADMIN")
  @Get()
  list(@CurrentPrincipal() p: Principal, @Query("panel") panel?: string) {
    return this.svc.list(p, panel as "ADMIN" | "TEAMS" | undefined);
  }

  @Roles("ADMIN")
  @Post()
  generate(@CurrentPrincipal() p: Principal, @Body() dto: GenerateTokenDto) {
    return this.svc.generate(p, dto);
  }

  @Roles("ADMIN")
  @Delete(":id")
  revoke(@CurrentPrincipal() p: Principal, @Param("id") id: string) {
    return this.svc.revoke(p, id);
  }

  /** No JWT — called by Next.js middleware. Protected by X-Panel-Secret. */
  @Public()
  @Get("validate")
  async validate(
    @Headers("x-token") token: string,
    @Headers("x-panel") panel: string,
    @Headers("x-panel-secret") secret: string,
  ) {
    validatePanelSecret(secret);
    return this.svc.validate(token ?? "", panel as "ADMIN" | "TEAMS");
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  controllers: [
    AdminController,
    TeamMembersController,
    AccessRequestsController,
    TeamsMemberSelfController,
    IpAllowlistController,
    PanelTokensController,
    HealthController,
    LandingAdminController,
  ],
  providers: [
    PgService,
    AdminService,
    TeamMembersService,
    IpAllowlistService,
    PanelTokensService,
    CloudHealthConnector,
    CloudBillingConnector,
    CicdConnector,
    StorageConnector,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
