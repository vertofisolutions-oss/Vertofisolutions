import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController, PgService } from "@vertofi/nest-common";
import { JwtService, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import { CreditConnector, McaConnector, PayrollConnector } from "./connectors.js";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

@Injectable()
class Connectors {
  readonly payroll = new PayrollConnector();
  readonly credit = new CreditConnector();
  readonly mca = new McaConnector();
}

@Controller("verification")
@Roles("BUSINESS_OWNER", "ASSOCIATE", "ADMIN")
class VerificationController {
  constructor(private readonly c: Connectors) {}

  @Get("status")
  status() {
    return [this.c.payroll, this.c.credit, this.c.mca].map((x) => ({
      connector: x.meta.id,
      category: x.meta.category,
      provider: x.meta.provider,
      status: x.status(),
    }));
  }
}

@Module({
  controllers: [VerificationController, HealthController],
  providers: [
    PgService,
    Connectors,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
