import { Body, Controller, ForbiddenException, Get, Param, Post, Req, Headers, HttpCode } from "@nestjs/common";
import type { Request } from "express";
import { IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CurrentPrincipal, Public, Roles } from "@vertofi/auth-guards";
import type { Plan, Principal } from "@vertofi/tenancy";
import type { BillingCycle } from "./plans.js";
import { BillingService } from "./billing.service.js";
import { RazorpayConnector } from "./razorpay.connector.js";

class CheckoutDto {
  @IsUUID() orgId!: string;
  @IsEnum(["STARTER", "GROWTH", "PRO", "ENTERPRISE"] as const) plan!: Plan;
}

class BillingProfileDto {
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pincode?: string;
}

class SubscribeDto {
  @IsUUID() orgId!: string;
  @IsEnum(["STARTER", "GROWTH", "PRO", "ENTERPRISE"] as const) plan!: Plan;
  @IsOptional() @IsEnum(["MONTHLY", "YEARLY"] as const) cycle?: BillingCycle;
  @IsOptional() @ValidateNested() @Type(() => BillingProfileDto) profile?: BillingProfileDto;
}

@Controller("billing")
export class BillingController {
  constructor(
    private readonly svc: BillingService,
    private readonly razorpay: RazorpayConnector,
  ) {}

  /**
   * Tenant isolation: billing actions act on a specific org, so the caller must
   * own that org (or be ADMIN). Without this a BUSINESS_OWNER could subscribe,
   * read billing status, or start a trial for ANY org id (cross-tenant IDOR).
   */
  private assertOwnOrg(p: Principal, orgId: string): void {
    if (p.role !== "ADMIN" && p.orgId !== orgId) {
      throw new ForbiddenException("org_not_owned");
    }
  }

  @Get("plans")
  @Public()
  plans() {
    return { connector: this.razorpay.status() };
  }

  @Post("checkout")
  @Roles("BUSINESS_OWNER", "ADMIN")
  checkout(@CurrentPrincipal() p: Principal, @Body() dto: CheckoutDto) {
    this.assertOwnOrg(p, dto.orgId);
    return this.svc.checkout(dto.orgId, dto.plan);
  }

  /** Start a trial + autopay subscription (UPI/card mandate), monthly or yearly.
   *  Returns the Razorpay subscription id + short_url for the customer to
   *  authorize. Optional billing profile is stored for GST invoices + RBI notices. */
  @Post("subscribe")
  @Roles("BUSINESS_OWNER", "ADMIN")
  subscribe(@CurrentPrincipal() p: Principal, @Body() dto: SubscribeDto) {
    this.assertOwnOrg(p, dto.orgId);
    return this.svc.subscribe(dto.orgId, dto.plan, dto.cycle ?? "MONTHLY", dto.profile);
  }

  /** The after-payment-only gate, read by the client app + gateway. */
  @Get(":orgId/access")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ADMIN")
  access(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    this.assertOwnOrg(p, orgId);
    return this.svc.access(orgId);
  }

  @Post(":orgId/trial")
  @Roles("BUSINESS_OWNER", "ADMIN")
  async trial(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    this.assertOwnOrg(p, orgId);
    await this.svc.startTrial(orgId);
    return { status: "TRIAL" };
  }

  /** Razorpay webhook — public but signature-verified (docs/09). */
  @Post("webhook/razorpay")
  @Public()
  @HttpCode(200)
  async webhook(@Req() req: Request, @Headers("x-razorpay-signature") sig: string) {
    const raw: string | Buffer = (req as Request & { rawBody?: Buffer }).rawBody ?? JSON.stringify(req.body);
    if (!this.razorpay.verifyWebhook(raw, sig ?? "")) {
      return { ok: false, reason: "invalid_signature" };
    }
    const body = req.body as {
      event: string;
      payload?: {
        payment?: { entity?: { order_id?: string; amount?: number; notes?: { org_id?: string } } };
        subscription?: { entity?: { id?: string; status?: string; notes?: { org_id?: string } } };
      };
    };
    if (body.event === "payment.captured") {
      const e = body.payload?.payment?.entity;
      const orgId = e?.notes?.org_id;
      if (orgId && e?.order_id) {
        await this.svc.activateFromPayment(orgId, e.order_id, (e.amount ?? 0) / 100, body);
      }
    } else if (body.event?.startsWith("subscription.")) {
      // Trial/autopay lifecycle: authenticated → charged → halted/cancelled.
      const e = body.payload?.subscription?.entity;
      if (e) await this.svc.handleSubscriptionEvent(body.event, e);
    }
    return { ok: true };
  }
}
