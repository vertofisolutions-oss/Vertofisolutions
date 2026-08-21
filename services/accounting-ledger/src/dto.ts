import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";

export class CreateAccountDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() type!: string;
}

export class LineDto {
  @IsUUID() accountId!: string;
  @IsOptional() @IsNumber() @Min(0) debit?: number;
  @IsOptional() @IsNumber() @Min(0) credit?: number;
}

export class PostEntryDto {
  @IsDateString() txnDate!: string;
  @IsOptional() @IsString() narration?: string;
  @IsOptional() @IsString() source?: string;
  @IsArray() @ArrayMinSize(2) @ValidateNested({ each: true }) @Type(() => LineDto) lines!: LineDto[];
}
