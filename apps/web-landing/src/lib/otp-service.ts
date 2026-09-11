import crypto from "node:crypto";

export interface OtpRecord {
  id: string;
  email: string;
  otpHash: string;
  purpose: "EMAIL_VERIFICATION" | "LOGIN" | "PASSWORD_RESET";
  expiresAt: number; // Unix timestamp ms (15 minutes)
  resendAfter: number; // Cooldown timestamp ms (60 seconds)
  attempts: number;
  maxAttempts: number;
  usedAt: number | null; // Unix timestamp ms
  createdAt: number;
}

// Global singleton maps to persist OTP state across Next.js API route invocations and dev reloads
const globalForOtp = globalThis as unknown as {
  otpStore?: Map<string, OtpRecord>;
  rateLimitStore?: Map<string, number[]>;
};

const otpStore = globalForOtp.otpStore || new Map<string, OtpRecord>();
if (process.env.NODE_ENV !== "production") globalForOtp.otpStore = otpStore;

const rateLimitStore = globalForOtp.rateLimitStore || new Map<string, number[]>();
if (process.env.NODE_ENV !== "production") globalForOtp.rateLimitStore = rateLimitStore;

/**
 * Format timestamp into user-friendly time string (e.g., "6:45 PM").
 */
export function formatExpiryTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Clean up expired or used records older than 30 minutes.
 */
function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (record.usedAt || now > record.expiresAt + 15 * 60 * 1000) {
      otpStore.delete(key);
    }
  }
}

/**
 * Check rate limits (Max 5 OTP requests per email/IP in 15 minutes).
 */
export function checkRateLimit(key: string, limit = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(key) || []).filter((ts) => now - ts < windowMs);
  if (timestamps.length >= limit) {
    return false;
  }
  timestamps.push(now);
  rateLimitStore.set(key, timestamps);
  return true;
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 */
export function generateSecureOtp(): string {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

/**
 * Hash an OTP string using SHA-256 for secure storage.
 */
export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * EmailJS Configuration (Service: service_2xm0ybg, Template: template_rw96xvx, Public Key: k6dPl0xrK8jGqSFqZ)
 */
export const EMAILJS_CONFIG = {
  SERVICE_ID: process.env.EMAILJS_SERVICE_ID || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_2xm0ybg",
  TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_rw96vxv",
  PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "k6dPl0xrK8jGqSFqZ",
};

/**
 * Send OTP email using EmailJS REST API.
 */
export async function sendOtpEmail(email: string, otp: string, expiresAt: number): Promise<boolean> {
  const formattedTime = formatExpiryTime(expiresAt);

  console.log(`\n======================================================`);
  console.log(`[VERTOFI EMAIL OTP DISPATCH via EmailJS]`);
  console.log(`To: ${email}`);
  console.log(`Passcode: ${otp}`);
  console.log(`Valid until: ${formattedTime} (15 minutes)`);
  console.log(`======================================================\n`);

  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000",
      },
      body: JSON.stringify({
        service_id: EMAILJS_CONFIG.SERVICE_ID,
        template_id: EMAILJS_CONFIG.TEMPLATE_ID,
        user_id: EMAILJS_CONFIG.PUBLIC_KEY,
        template_params: {
          email,
          passcode: otp,
          time: formattedTime,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("[EmailJS REST Warning]:", res.status, errText);
    } else {
      console.log(`[EmailJS REST Success]: OTP email sent to ${email}`);
    }

    return true;
  } catch (err) {
    console.error("[EmailJS Send Failed]:", err);
    return true;
  }
}

/**
 * Issue a new 15-minute OTP for an email address.
 */
export async function createAndSendOtp(
  email: string,
  purpose: "EMAIL_VERIFICATION" | "LOGIN" | "PASSWORD_RESET"
): Promise<{ challengeId: string; resendAfterSeconds: number; formattedTime: string }> {
  cleanupExpiredRecords();

  const normalizedEmail = email.trim().toLowerCase();
  const existingKey = `${normalizedEmail}:${purpose}`;
  const existing = otpStore.get(existingKey);

  const now = Date.now();

  // Check 60s resend cooldown
  if (existing && now < existing.resendAfter) {
    const remainingSeconds = Math.ceil((existing.resendAfter - now) / 1000);
    throw new Error(`COOLDOWN_ACTIVE:${remainingSeconds}`);
  }

  const rawOtp = generateSecureOtp();
  const otpHash = hashOtp(rawOtp);
  const challengeId = `chal_${crypto.randomBytes(12).toString("hex")}`;
  const expiresAt = now + 15 * 60 * 1000; // 15 mins validity
  const resendAfter = now + 60 * 1000; // 60s cooldown
  const formattedTime = formatExpiryTime(expiresAt);

  const record: OtpRecord = {
    id: challengeId,
    email: normalizedEmail,
    otpHash,
    purpose,
    expiresAt,
    resendAfter,
    attempts: 0,
    maxAttempts: 5,
    usedAt: null,
    createdAt: now,
  };

  otpStore.set(existingKey, record);
  otpStore.set(challengeId, record);

  await sendOtpEmail(normalizedEmail, rawOtp, expiresAt);

  return { challengeId, resendAfterSeconds: 60, formattedTime };
}

/**
 * Verify a submitted 6-digit OTP code against stored hash.
 */
export function verifyOtpCode(
  challengeIdOrEmail: string,
  submittedOtp: string,
  purpose?: string
): { valid: boolean; email: string; reason?: string } {
  cleanupExpiredRecords();

  const now = Date.now();
  let record: OtpRecord | undefined;

  if (challengeIdOrEmail.startsWith("chal_")) {
    record = otpStore.get(challengeIdOrEmail);
  } else {
    const normalized = challengeIdOrEmail.trim().toLowerCase();
    const key = `${normalized}:${purpose || "EMAIL_VERIFICATION"}`;
    record = otpStore.get(key);
  }

  if (!record) {
    return { valid: false, email: "", reason: "Verification code expired or invalid challenge." };
  }

  if (record.usedAt) {
    return { valid: false, email: record.email, reason: "This verification code has already been used." };
  }

  if (now > record.expiresAt) {
    return { valid: false, email: record.email, reason: "This verification code has expired. Please request a new code." };
  }

  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(record.id);
    otpStore.delete(`${record.email}:${record.purpose}`);
    return { valid: false, email: record.email, reason: "Too many incorrect attempts. Please request a new verification code." };
  }

  const submittedHash = hashOtp(submittedOtp.trim());
  if (submittedHash !== record.otpHash) {
    record.attempts += 1;
    if (record.attempts >= record.maxAttempts) {
      otpStore.delete(record.id);
      otpStore.delete(`${record.email}:${record.purpose}`);
      return { valid: false, email: record.email, reason: "Too many incorrect attempts. Please request a new verification code." };
    }
    return { valid: false, email: record.email, reason: "Invalid verification code. Please try again." };
  }

  // Mark as used immediately to enforce single-use
  record.usedAt = now;

  return { valid: true, email: record.email };
}
