import { Body, Controller, Get, Param, Post, Query, Headers } from "@nestjs/common";
import { CurrentPrincipal, Roles, Sensitive } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { LedgerService } from "./ledger.service.js";
import { CreateAccountDto, PostEntryDto } from "./dto.js";

@Controller("ledger")
@Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
export class LedgerController {
  constructor(private readonly svc: LedgerService) {}

  @Post(":orgId/accounts")
  account(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: CreateAccountDto) {
    return this.svc.createAccount(p, orgId, dto.code, dto.name, dto.type);
  }

  /** Posting books is a sensitive financial action → Financial Action OTP (docs/06). */
  @Post(":orgId/entries")
  @Sensitive("FINANCIAL")
  post(
    @CurrentPrincipal() p: Principal,
    @Param("orgId") orgId: string,
    @Body() dto: PostEntryDto,
    @Headers("x-approval-otp-id") approvalOtpId?: string,
  ) {
    return this.svc.postEntry(p, orgId, { ...dto, approvalOtpId });
  }

  @Post(":orgId/entries/:entryId/reverse")
  @Sensitive("FINANCIAL")
  reverse(
    @CurrentPrincipal() p: Principal,
    @Param("orgId") orgId: string,
    @Param("entryId") entryId: string,
    @Headers("x-approval-otp-id") approvalOtpId?: string,
  ) {
    return this.svc.reverseEntry(p, orgId, entryId, approvalOtpId);
  }

  @Get(":orgId/entries")
  list(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("limit") limit?: string) {
    return this.svc.listEntries(p, orgId, limit ? Number(limit) : 50);
  }
}
