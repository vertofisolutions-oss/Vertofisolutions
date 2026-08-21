import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from "class-validator";

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const PROFESSIONAL_TYPES = ["CA", "CMA", "CPA", "CS", "ACCA", "CFA"] as const;

export class RegisterBusinessDto {
  @Matches(INDIAN_MOBILE, { message: "mobile must be a valid 10-digit Indian number" })
  mobile!: string;

  @IsEmail()
  email!: string;

  /**
   * Password the owner sets at signup. Optional only so the legacy Firebase
   * path (which sets it via firebase/exchange) keeps working; the server-OTP
   * signup path MUST send it, otherwise the account is created with no
   * password and every later password login fails with invalid_credentials.
   */
  @IsOptional()
  @IsString()
  @Length(8, 128)
  password?: string;
}

export class RegisterAccountantDto {
  @Matches(INDIAN_MOBILE, { message: "mobile must be a valid 10-digit Indian number" })
  mobile!: string;

  @IsEmail()
  email!: string;
}

export class RegisterProfessionalDto {
  @Matches(INDIAN_MOBILE, { message: "mobile must be a valid 10-digit Indian number" })
  mobile!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsEnum(PROFESSIONAL_TYPES)
  professionalType!: (typeof PROFESSIONAL_TYPES)[number];

  @IsString()
  @Length(2, 120)
  fullName!: string;

  @IsString()
  @Length(2, 40)
  membershipNo!: string;

  @IsOptional() @IsString() @Length(1, 40) copNo?: string;
  @IsOptional() @IsString() @Length(1, 160) firmName?: string;
  @IsOptional() @IsString() @Length(1, 40) firmRegistrationNo?: string;
  @IsOptional() @IsInt() @Min(0) @Max(70) yearsExperience?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) specializations?: string[];
  @IsOptional() @IsString() @Length(1, 300) officeAddress?: string;
  @IsOptional() @IsString() @Length(1, 80) city?: string;
  @IsOptional() @IsString() @Length(1, 80) state?: string;
  @IsOptional() @IsString() @Length(6, 6) pincode?: string;
}

export class UpdateProfessionalProfileDto {
  @IsOptional() @IsString() @Length(2, 120) fullName?: string;
  @IsOptional() @IsString() @Length(1, 40) membershipNo?: string;
  @IsOptional() @IsString() @Length(1, 40) copNo?: string;
  @IsOptional() @IsString() @Length(1, 160) firmName?: string;
  @IsOptional() @IsString() @Length(1, 40) firmRegistrationNo?: string;
  @IsOptional() @IsInt() @Min(0) @Max(70) yearsExperience?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) specializations?: string[];
  @IsOptional() @IsString() @Length(1, 300) officeAddress?: string;
  @IsOptional() @IsString() @Length(1, 80) city?: string;
  @IsOptional() @IsString() @Length(1, 80) state?: string;
  @IsOptional() @IsString() @Length(6, 6) pincode?: string;
  /** Document references the professional has uploaded (KYC). */
  @IsOptional() @IsArray() documents?: { type: string; filename: string; documentId?: string; status?: string }[];
}

export class VerifyProfessionalDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional() @IsString() @Length(1, 500) note?: string;
}

export class SendOtpDto {
  @IsEnum(["MOBILE", "EMAIL", "WHATSAPP"] as const)
  channel!: "MOBILE" | "EMAIL" | "WHATSAPP";

  @IsString()
  destination!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(["LOGIN", "REGISTER", "EMAIL_VERIFY", "RESET", "MFA"] as const)
  purpose!: "LOGIN" | "REGISTER" | "EMAIL_VERIFY" | "RESET" | "MFA";
}

export class VerifyOtpDto {
  @IsString()
  challengeId!: string;

  @Length(6, 6)
  code!: string;
}

export class ResetPasswordDto {
  @IsString()
  challengeId!: string;

  @Length(6, 6)
  code!: string;

  @IsString()
  @Length(8, 128)
  newPassword!: string;
}

export class FirebaseResetPasswordDto {
  @IsString()
  idToken!: string;

  @IsString()
  @Length(8, 128)
  newPassword!: string;
}

export class PasswordLoginDto {
  @IsString()
  identifier!: string; // email or mobile

  @IsString()
  @Length(8, 128)
  password!: string;
}

export class StepUpDto {
  @IsEnum(["FINANCIAL", "DOCUMENT"] as const)
  kind!: "FINANCIAL" | "DOCUMENT";

  @IsString()
  destination!: string;

  @IsString()
  userId!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
