import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Matches } from "class-validator";

export class AssignProfessionalDto {
  /** The professional's public Vertofi ID, e.g. VRU-1A2B3C4D. */
  @Matches(/^VRU-[A-Za-z0-9]{8}$/) vertofiId!: string;
  @IsOptional() @IsEnum(["FULL", "BHS_ONLY", "CASES_ONLY", "DOCUMENTS"] as const)
  scope?: "FULL" | "BHS_ONLY" | "CASES_ONLY" | "DOCUMENTS";
}

export class RespondRequestDto {
  @IsBoolean() accept!: boolean;
}

export class CreateGrantDto {
  @IsEnum(["USER", "COMPANY"] as const)
  granteeType!: "USER" | "COMPANY";

  @IsUUID()
  granteeId!: string;

  @IsUUID()
  orgId!: string;

  @IsEnum(["VIEW", "EDIT"] as const)
  permission!: "VIEW" | "EDIT";

  @IsEnum(["FULL", "BHS_ONLY", "CASES_ONLY", "DOCUMENTS"] as const)
  scope!: "FULL" | "BHS_ONLY" | "CASES_ONLY" | "DOCUMENTS";

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateRequestDto {
  @IsUUID()
  orgId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DecideRequestDto {
  @IsEnum(["APPROVE", "DENY"] as const)
  decision!: "APPROVE" | "DENY";
}
