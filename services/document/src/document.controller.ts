import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { IsString, MaxLength } from "class-validator";
import { CurrentPrincipal, Roles, Sensitive } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { DocumentService } from "./document.service.js";

class PresignDto {
  @IsString() @MaxLength(64) type!: string;
  @IsString() @MaxLength(255) filename!: string;
  @IsString() @MaxLength(128) contentType!: string;
}

@Controller("documents")
@Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ACCOUNTANT", "ADMIN")
export class DocumentController {
  constructor(private readonly svc: DocumentService) {}

  @Get("storage-status")
  status() {
    return this.svc.storageStatus();
  }

  // ── Professional KYC (user-scoped). Declared BEFORE the :orgId routes so
  //    "/documents/kyc/..." isn't captured by the :orgId param route. ──
  @Post("kyc/presign")
  presignKyc(@CurrentPrincipal() p: Principal, @Body() dto: PresignDto) {
    return this.svc.presignKyc(p, dto.type, dto.filename, dto.contentType);
  }

  @Post("kyc/:documentId/commit")
  commitKyc(@CurrentPrincipal() p: Principal, @Param("documentId") documentId: string) {
    return this.svc.commitKyc(p, documentId);
  }

  @Post("kyc/:documentId/download")
  downloadKyc(@CurrentPrincipal() p: Principal, @Param("documentId") documentId: string) {
    return this.svc.downloadKyc(p, documentId);
  }

  @Get("kyc/list/:userId")
  listKyc(@CurrentPrincipal() p: Principal, @Param("userId") userId: string) {
    return this.svc.listKyc(p, userId);
  }

  @Get(":orgId")
  list(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.list(p, orgId);
  }

  @Post(":orgId/presign")
  presign(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: PresignDto) {
    return this.svc.presign(p, orgId, dto.type, dto.filename, dto.contentType);
  }

  @Post(":orgId/:documentId/commit")
  commit(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("documentId") documentId: string) {
    return this.svc.commit(p, orgId, documentId);
  }

  /** Sensitive download → requires Document Access OTP step-up (docs/06). */
  @Post(":orgId/:documentId/download")
  @Sensitive("DOCUMENT")
  download(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("documentId") documentId: string) {
    return this.svc.download(p, orgId, documentId);
  }
}
