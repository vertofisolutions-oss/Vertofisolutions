import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController, PgService } from "@vertofi/nest-common";
import { JwtService, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import { BillingController } from "./billing.controller.js";
import { BillingService } from "./billing.service.js";
import { RazorpayConnector } from "./razorpay.connector.js";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

@Module({
  controllers: [BillingController, HealthController],
  providers: [
    PgService,
    BillingService,
    RazorpayConnector,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
