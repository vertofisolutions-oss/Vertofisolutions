import type { OtpPurpose } from "./otp.service.js";

/**
 * Purpose-aware OTP templates (docs/06).
 *
 * Every OTP delivered by Vertofi is branded and contextual: a LOGIN code reads
 * differently from a FINANCIAL action-approval code, so the recipient always
 * knows exactly what they are authorizing. This is both a UX and an
 * anti-phishing measure — a user who requested a login but receives a
 * "money movement approval" code knows something is wrong.
 *
 * - Email templates are fully owned here (subject + text + branded HTML).
 * - SMS text is owned here for logging/fallback, but the wire message for
 *   MSG91 is governed by the DLT-registered template_id (see sms.connector).
 *   `msg91TemplateEnvKey()` lets each purpose map to its own approved template.
 */

const BRAND = "Vertofi";
const VALID_MIN = 5;

interface PurposeCopy {
  /** Short human label, e.g. "log in", "approve this payment". */
  action: string;
  /** Email subject line. */
  subject: string;
  /** Optional extra caution line for high-risk actions. */
  caution?: string;
}

const COPY: Record<OtpPurpose, PurposeCopy> = {
  LOGIN: {
    action: "log in to your Vertofi account",
    subject: "Your Vertofi login code",
  },
  REGISTER: {
    action: "create your Vertofi account",
    subject: "Verify your number to start with Vertofi",
  },
  EMAIL_VERIFY: {
    action: "verify your email address",
    subject: "Confirm your email for Vertofi",
  },
  RESET: {
    action: "reset your Vertofi password",
    subject: "Your Vertofi password reset code",
    caution: "If you did not request a password reset, ignore this message and your password stays unchanged.",
  },
  FINANCIAL: {
    action: "approve a financial action (money movement / ledger posting)",
    subject: "Approve a financial action on Vertofi",
    caution: "This code authorizes a financial transaction. Only continue if you initiated it.",
  },
  DOCUMENT: {
    action: "approve a document action",
    subject: "Approve a document action on Vertofi",
    caution: "This code authorizes a document action. Only continue if you initiated it.",
  },
  MFA: {
    action: "complete two-factor verification",
    subject: "Your Vertofi verification code",
  },
};

function copyFor(purpose: OtpPurpose): PurposeCopy {
  return COPY[purpose] ?? COPY.MFA;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export function emailOtpTemplate(purpose: OtpPurpose, code: string): EmailTemplate {
  const c = copyFor(purpose);
  const caution = c.caution
    ? `\n\n${c.caution}`
    : `\n\nIf this wasn't you, you can safely ignore this email.`;
  const text =
    `Use the code below to ${c.action}.\n\n` +
    `${code}\n\n` +
    `This code is valid for ${VALID_MIN} minutes and can be used once. ` +
    `Never share it with anyone — ${BRAND} staff will never ask for it.` +
    caution;

  const cautionHtml = c.caution
    ? `<p style="margin:16px 0 0;color:#b91c1c;font-size:13px;">${c.caution}</p>`
    : `<p style="margin:16px 0 0;color:#6b7280;font-size:13px;">If this wasn't you, you can safely ignore this email.</p>`;

  const html = `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0b1020;color:#e5e7eb;border-radius:16px;">
    <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:0.5px;">${BRAND}</div>
    <p style="margin:24px 0 8px;color:#cbd5e1;font-size:15px;">Use this code to ${c.action}:</p>
    <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#fff;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:18px 0;text-align:center;margin:8px 0 16px;">${code}</div>
    <p style="margin:0;color:#9ca3af;font-size:13px;">Valid for ${VALID_MIN} minutes · single use · never share this code. ${BRAND} will never ask you for it.</p>
    ${cautionHtml}
  </div>`;

  return { subject: c.subject, text, html };
}

/** SMS body for logging/fallback. The wire OTP for MSG91 goes via template_id. */
export function smsOtpTemplate(purpose: OtpPurpose, code: string): string {
  const c = copyFor(purpose);
  return `${code} is your ${BRAND} code to ${c.action}. Valid ${VALID_MIN} min. Do not share. -${BRAND}`;
}

/**
 * Per-purpose MSG91 DLT template env key, e.g. MSG91_TEMPLATE_ID_FINANCIAL.
 * Falls back to the base MSG91_TEMPLATE_ID when a purpose-specific template
 * isn't configured, so the connector keeps working with a single template.
 */
export function msg91TemplateEnvKey(purpose: OtpPurpose): string {
  return `MSG91_TEMPLATE_ID_${purpose}`;
}
