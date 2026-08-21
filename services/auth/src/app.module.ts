import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController, PgService } from "@vertofi/nest-common";
import { JwtService, RolesGuard, createJwtAuthGuard } from "@vertofi/auth-guards";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { OtpService } from "./otp/otp.service.js";
import { SmsConnector } from "./otp/sms.connector.js";
import { EmailConnector } from "./otp/email.connector.js";
import { UsersRepository } from "./users.repository.js";
import { FirebaseService } from "./firebase/firebase.service.js";

const jwtService = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

@Module({
  controllers: [AuthController, HealthController],
  providers: [
    PgService,
    UsersRepository,
    AuthService,
    OtpService,
    SmsConnector,
    EmailConnector,
    FirebaseService,
    { provide: JwtService, useValue: jwtService },
    { provide: APP_GUARD, useClass: createJwtAuthGuard(jwtService) },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
