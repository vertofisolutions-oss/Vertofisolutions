import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateOrgDto {
  @IsString()
  @MaxLength(200)
  legalName!: string;

  @IsOptional() @IsString() tradeName?: string;
  @IsOptional() @IsString() businessType?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() pan?: string;
}

export class CreateTeamDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional() @IsUUID() leadUserId?: string;
}

export class AssignTeamDto {
  @IsUUID() orgId!: string;
}
