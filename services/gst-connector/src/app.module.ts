import { BadRequestException, Body, Controller, ForbiddenException, Headers, HttpCode, Get, Module, Param, Post } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { IsString, Length } from "class-validator";
import { HealthController, PgService } from "@vertofi/nest-common";
import { JwtService, Public, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import { GspConnector } from "./gsp.connector.js";

/**
 * Public inbound webhook receiver for the GSP/IRP (docs/PROVIDER_ONBOARDING.md).
 * Stable callback URL exists now (gateway: /api/webhooks/gst) so the GSP can be
 * configured ahead of go-live; payload auth/processing is added when the GSP
 * callback contract is enabled. Always ACKs so the provider doesn't retry-storm.
 */
@Controller("gst")
class GstWebhookController {
  @Public()
  @Post("webhook")
  @HttpCode(200)
  webhook(@Body() body: Record<string, unknown>, @Headers("x-webhook-token") token?: string) {
    // Shared-token auth for this public (no-JWT) endpoint. Reject when a token is
    // configured and the caller doesn't present it, so it isn't an open sink.
    const expected = process.env.GST_WEBHOOK_TOKEN;
    if (expected && token !== expected) throw new ForbiddenException("invalid_webhook_token");
    // eslint-disable-next-line no-console
    console.info("[gst:webhook] GSP webhook received", { keys: Object.keys(body ?? {}) });
    return { received: true };
  }
}

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

class VerifyDto {
  @IsString() @Length(15, 15) gstin!: string;
}

@Controller("gst")
@Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ACCOUNTANT", "ADMIN")
class GstController {
  constructor(private readonly gsp: GspConnector) {}

  @Get("status")
  status() {
    return { connector: this.gsp.meta.id, provider: this.gsp.meta.provider, status: this.gsp.status() };
  }

  @Post("verify-vendor")
  verify(@Body() dto: VerifyDto) {
    return this.gsp.verifyVendor(dto.gstin);
  }

  /**
   * Resolve a GSTIN to a normalized taxpayer profile (state + PAN always; legal/
   * trade name + address + status when the GSP is configured). Powers registration
   * autofill, invoice biller autofill (web + WhatsApp), and customer/vendor add.
   */
  @Get("lookup/:gstin")
  lookup(@Param("gstin") gstin: string) {
    const g = (gstin ?? "").trim().toUpperCase();
    if (g.length !== 15) throw new BadRequestException("invalid_gstin_length");
    return this.gsp.lookupTaxpayer(g);
  }

  /** Generate an e-Invoice IRN + QR for a sales invoice (needs GSP credentials). */
  @Post("einvoice")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  einvoice(@Body() invoice: Record<string, unknown>) {
    return this.gsp.generateEInvoice(invoice);
  }

  /** Generate an e-Way Bill number for a consignment (needs GSP credentials). */
  @Post("ewaybill")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  ewaybill(@Body() invoice: Record<string, unknown>) {
    return this.gsp.generateEwayBill(invoice);
  }
}

@Module({
  controllers: [GstController, GstWebhookController, HealthController],
  providers: [
    PgService,
    GspConnector,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
