import { Body, Controller, ForbiddenException, Headers, HttpCode, Get, Module, Param, Post } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController, PgService } from "@vertofi/nest-common";
import { CurrentPrincipal, JwtService, Public, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { AaConnector } from "./aa.connector.js";

/**
 * Public inbound webhook receiver for the Account Aggregator (docs/PROVIDER_ONBOARDING.md).
 * Stable callback URL exists now (gateway: /api/webhooks/banking) so the AA can
 * post consent/data-ready notifications; processing is added when the AA callback
 * contract is enabled. Always ACKs to avoid provider retry storms.
 */
@Controller("bank")
class BankWebhookController {
  @Public()
  @Post("webhook")
  @HttpCode(200)
  webhook(@Body() body: Record<string, unknown>, @Headers("x-webhook-token") token?: string) {
    // Authenticate the caller via a shared verify-token. When BANK_WEBHOOK_TOKEN
    // is configured, reject any request that doesn't present it — this endpoint
    // is public (no JWT), so without a check it's an open, unauthenticated sink.
    const expected = process.env.BANK_WEBHOOK_TOKEN;
    if (expected && token !== expected) throw new ForbiddenException("invalid_webhook_token");
    // eslint-disable-next-line no-console
    console.info("[bank:webhook] AA webhook received", { keys: Object.keys(body ?? {}) });
    return { received: true };
  }
}

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

@Controller("bank")
@Roles("BUSINESS_OWNER", "ADMIN")
class BankController {
  constructor(private readonly aa: AaConnector) {}

  @Get("status")
  status() {
    return { connector: this.aa.meta.id, provider: this.aa.meta.provider, status: this.aa.status() };
  }

  @Post(":orgId/connect")
  connect(@CurrentPrincipal() _p: Principal, @Param("orgId") orgId: string) {
    return this.aa.startConsent(orgId);
  }
}

@Module({
  controllers: [BankController, BankWebhookController, HealthController],
  providers: [
    PgService,
    AaConnector,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
