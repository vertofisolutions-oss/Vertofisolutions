import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { CurrentPrincipal } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { NotificationService } from "./notification.service.js";

class CreateDto {
  @IsUUID() userId!: string;
  @IsOptional() @IsUUID() orgId?: string;
  @IsString() @MaxLength(64) template!: string;
  @IsString() @MaxLength(160) title!: string;
  @IsString() @MaxLength(1000) body!: string;
}

@Controller("notifications")
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  /** Internal service-to-service create (e.g. flaw flags, alerts). */
  @Post()
  create(@Body() dto: CreateDto) {
    return this.svc.create(dto);
  }

  @Get()
  list(@CurrentPrincipal() p: Principal, @Query("unread") unread?: string) {
    return this.svc.list(p.userId, unread === "true");
  }

  @Post(":id/read")
  async read(@CurrentPrincipal() p: Principal, @Param("id") id: string) {
    await this.svc.markRead(p.userId, id);
    return { read: true };
  }

  @Post("read-all")
  async readAll(@CurrentPrincipal() p: Principal) {
    await this.svc.markAllRead(p.userId);
    return { read: true };
  }
}
