import { IsBoolean, IsObject, IsOptional, IsUUID } from "class-validator";

export class SaveStageDto {
  @IsObject()
  payload!: Record<string, unknown>;
}

export class RiskAnswersDto {
  @IsOptional() @IsBoolean() gstNotice?: boolean;
  @IsOptional() @IsBoolean() itNotice?: boolean;
  @IsOptional() @IsBoolean() tdsNotice?: boolean;
  @IsOptional() @IsBoolean() cashflowProblems?: boolean;
  @IsOptional() @IsBoolean() pendingGstFilings?: boolean;
  @IsOptional() @IsBoolean() pendingItr?: boolean;
  @IsOptional() @IsBoolean() vendorDisputes?: boolean;
  @IsOptional() @IsBoolean() loanDefaults?: boolean;
}

export class SelectProfessionalDto {
  @IsUUID()
  professionalId!: string;
}

/** The 10 sections of the V3 enterprise onboarding wizard. */
export const SECTION_KEYS = [
  "business",
  "registration",
  "owner",
  "tax",
  "banking",
  "accounting",
  "documents",
  "whatsapp",
  "team",
  "review",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export class SaveSectionDto {
  @IsObject()
  payload!: Record<string, unknown>;
}
