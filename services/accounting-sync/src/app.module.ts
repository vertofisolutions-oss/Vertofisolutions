import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController, PgService } from "@vertofi/nest-common";
import { JwtService, Roles, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import { SyncService } from "./sync.service.js";
import { TallyConnector, ZohoConnector, QuickBooksConnector } from "./external.connectors.js";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

@Controller("external-sync")
@Roles("BUSINESS_OWNER", "ASSOCIATE", "ADMIN")
class SyncController {
  constructor(private readonly svc: SyncService) {}

  @Get("targets")
  targets() {
    return this.svc.targets();
  }
}

@Module({
  controllers: [SyncController, HealthController],
  providers: [
    PgService,
    SyncService,
    TallyConnector,
    ZohoConnector,
    QuickBooksConnector,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
