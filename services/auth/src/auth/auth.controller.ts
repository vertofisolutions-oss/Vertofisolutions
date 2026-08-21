import { Body, Controller, Headers, Ip, Param, Post, Put, Get, HttpCode, ConflictException } from "@nestjs/common";
import { IsEmail, IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { CurrentPrincipal, Public, Roles } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { AuthService } from "./auth.service.js";
import { OtpService } from "../otp/otp.service.js";
import {
  FirebaseResetPasswordDto,
  PasswordLoginDto,
  RefreshDto,
  RegisterBusinessDto,
  RegisterAccountantDto,
  RegisterProfessionalDto,
  UpdateProfessionalProfileDto,
  VerifyProfessionalDto,
  ResetPasswordDto,
  SendOtpDto,
  StepUpDto,
  VerifyOtpDto,
} from "./dto.js";

class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() newPassword!: string;
}

// NOTE: must be declared BEFORE AuthController. With emitDecoratorMetadata the
// controller's @Body() dto: LinkOrgDto reference is evaluated when the class is
// decorated at module load; a class declared later would be in the temporal
// dead zone → "Cannot access 'LinkOrgDto' before initialization" at runtime.
class LinkOrgDto {
  @IsUUID()
  orgId!: string;
}

// Firebase phone-OTP exchange (replaces MSG91 SMS). REGISTER = business signup
// (verified phone + email + password); MFA = staff/professional second factor.
class FirebaseExchangeDto {
  @IsString() idToken!: string;
  @IsIn(["REGISTER", "MFA"] as const) mode!: "REGISTER" | "MFA";
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsUUID() userId?: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
  ) {}

  @Public()
  @Post("register")
  @HttpCode(202)
  register(@Body() dto: RegisterBusinessDto) {
    return this.auth.registerBusiness(dto.mobile, dto.email, dto.password);
  }

  @Public()
  @Post("otp/send")
  @HttpCode(202)
  sendOtp(@Body() dto: SendOtpDto) {
    // Routed through AuthService so LOGIN/MFA challenges get bound to the
    // existing user (resolved by mobile/email) — otherwise verify can't issue.
    return this.auth.sendOtp(dto);
  }

  /** Verify a mobile/login OTP and issue tokens. */
  @Public()
  @Post("otp/verify")
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Ip() ip: string,
    @Headers("user-agent") ua?: string,
  ) {
    return this.auth.verifyAndIssue(dto.challengeId, dto.code, { ip, ua });
  }

  /**
   * Forgot-password: verify the RESET OTP and set the new password in one
   * step. Lives under otp/ so it inherits the gateway's public auth prefix.
   */
  @Public()
  @Post("otp/reset-password")
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.challengeId, dto.code, dto.newPassword);
    return { reset: true };
  }

  /** Forgot-password via Firebase phone OTP (the configured delivery path). */
  @Public()
  @Post("firebase/reset-password")
  @HttpCode(200)
  async resetPasswordFirebase(@Body() dto: FirebaseResetPasswordDto) {
    await this.auth.resetPasswordWithFirebase(dto.idToken, dto.newPassword);
    return { reset: true };
  }

  @Public()
  @Post("login")
  login(@Body() dto: PasswordLoginDto, @Ip() ip: string, @Headers("user-agent") ua?: string) {
    return this.auth.passwordLogin(dto.identifier, dto.password, { ip, ua });
  }

  /** Exchange a verified Firebase phone-OTP ID token for Vertofi tokens
   *  (registration or panel MFA). Replaces the MSG91 SMS OTP path. */
  @Public()
  @Post("firebase/exchange")
  firebaseExchange(@Body() dto: FirebaseExchangeDto, @Ip() ip: string, @Headers("user-agent") ua?: string) {
    return this.auth.exchangeFirebasePhone(
      dto.idToken,
      { mode: dto.mode, email: dto.email, password: dto.password, userId: dto.userId },
      { ip, ua },
    );
  }

  @Public()
  @Post("token/refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  /**
   * Step-up: issue a Financial/Document Action OTP (docs/06). Authenticated
   * routes call this when they need legal proof of approval.
   */
  @Post("step-up")
  @HttpCode(202)
  stepUp(@Body() dto: StepUpDto) {
    return this.otp.issue({
      userId: dto.userId,
      channel: "MOBILE",
      purpose: dto.kind,
      destination: dto.destination,
    });
  }

  /**
   * Link the authenticated business owner to the org they just created during
   * onboarding, and re-issue tokens carrying org_id (authenticated route).
   */
  @Post("link-org")
  linkOrg(@CurrentPrincipal() principal: Principal, @Body() dto: LinkOrgDto) {
    return this.auth.linkOrg(principal.userId, dto.orgId);
  }

  /** Final signup step: activate the onboarded business owner (PENDING_ONBOARDING → ACTIVE). */
  @Post("activate")
  activate(@CurrentPrincipal() principal: Principal) {
    return this.auth.activateOnboarded(principal.userId);
  }

  /** Current user's own profile (mobile/email/role) for the panel UI. */
  @Get("me")
  me(@CurrentPrincipal() principal: Principal) {
    return this.auth.getMe(principal.userId);
  }

  // ── Professional (CA/CMA/CS/…) self-registration + verification ──────
  /** Self-serve professional sign-up → PENDING_VERIFICATION + tokens to upload KYC. */
  @Public()
  @Post("register-professional")
  async registerProfessional(@Body() dto: RegisterProfessionalDto, @Ip() ip: string, @Headers("user-agent") ua?: string) {
    return this.auth.registerProfessional(dto, { ip, ua });
  }

  /** The statutory document checklist a professional must upload, by type. */
  @Public()
  @Get("professional/required-docs/:type")
  requiredDocs(@Param("type") type: string) {
    return AuthService.requiredDocs(type.toUpperCase());
  }

  /** The signed-in professional's own profile + verification status. */
  @Get("professional/profile")
  @Roles("ASSOCIATE", "ACCOUNTANT", "ADMIN")
  myProfessionalProfile(@CurrentPrincipal() principal: Principal) {
    return this.auth.getProfessionalProfile(principal.userId);
  }

  /** The professional updates their own profile / attaches uploaded KYC refs. */
  @Put("professional/profile")
  @Roles("ASSOCIATE", "ACCOUNTANT", "ADMIN")
  updateProfessionalProfile(@CurrentPrincipal() principal: Principal, @Body() dto: UpdateProfessionalProfileDto) {
    return this.auth.updateProfessionalProfile(principal.userId, dto as unknown as Record<string, unknown>);
  }

  /** Admin: professionals awaiting verification. */
  @Get("professional/pending")
  @Roles("ADMIN")
  pendingProfessionals() {
    return this.auth.listPendingProfessionals();
  }

  /** Admin: approve/reject a professional (approval activates the account). */
  @Post("professional/:userId/verify")
  @Roles("ADMIN")
  verifyProfessional(@CurrentPrincipal() principal: Principal, @Param("userId") userId: string, @Body() dto: VerifyProfessionalDto) {
    return this.auth.verifyProfessional(principal.userId, userId, dto.approve, dto.note);
  }

  @Get("accountants")
  @Roles("ASSOCIATE", "ADMIN")
  getAccountants(@CurrentPrincipal() principal: Principal) {
    return this.auth.listAccountants(principal.userId);
  }

  @Post("register-accountant")
  @Roles("ASSOCIATE", "ADMIN")
  async registerAccountant(@CurrentPrincipal() principal: Principal, @Body() dto: RegisterAccountantDto) {
    try {
      return await this.auth.registerAccountant(principal.userId, dto.mobile, dto.email);
    } catch (e: any) {
      if (e.message === "user_already_exists") {
        throw new ConflictException("user_already_exists");
      }
      throw e;
    }
  }

  /** Owner adds a team member to their own org (wizard team step). */
  @Post("register-business-user")
  @Roles("BUSINESS_OWNER")
  async registerBusinessUser(@CurrentPrincipal() principal: Principal, @Body() dto: RegisterAccountantDto) {
    if (!principal.orgId) throw new ConflictException("owner_has_no_org");
    try {
      return await this.auth.registerBusinessUser(principal.orgId, dto.mobile, dto.email);
    } catch (e: any) {
      if (e.message === "user_already_exists") throw new ConflictException("user_already_exists");
      throw e;
    }
  }

  /**
   * Change password — TEAM_MEMBER / TEAM_LEAD only.
   * Validates current password before accepting the new one.
   * Called on first login (admin-assigned password) and subsequent changes.
   */
  @Post("change-password")
  @Roles("TEAM_MEMBER", "TEAM_LEAD")
  @HttpCode(200)
  changePassword(@CurrentPrincipal() principal: Principal, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(principal.userId, dto.currentPassword, dto.newPassword);
  }
}
