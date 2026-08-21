import { BadRequestException, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { PgService } from "@vertofi/nest-common";
import { SmsConnector } from "./sms.connector.js";
import { EmailConnector } from "./email.connector.js";

export type OtpChannel = "MOBILE" | "EMAIL" | "WHATSAPP";
export type OtpPurpose =
  | "LOGIN"
  | "REGISTER"
  | "EMAIL_VERIFY"
  | "RESET"
  | "FINANCIAL"
  | "DOCUMENT"
  | "MFA";

const TTL_SECONDS = 300; // 5 min
const MAX_ATTEMPTS = 5;

/**
 * OTP engine (docs/06). Codes are 6-digit, hashed at rest, single-use,
 * purpose-bound (a LOGIN otp can't authorize a FINANCIAL action), TTL'd,
 * and attempt-capped. Delivery goes through real connectors with failover.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly pg: PgService,
    private readonly sms: SmsConnector,
    private readonly email: EmailConnector,
  ) {}

  async issue(input: {
    userId?: string;
    channel: OtpChannel;
    purpose: OtpPurpose;
    destination: string;
  }): Promise<{ challengeId: string }> {
    // Rate limit per destination to prevent OTP/SMS/email bombing and brute
    // amplification: cap sends to one mobile/email within a short window.
    const rl = await this.pg.query<{ n: string }>(
      `SELECT count(*) n FROM auth.otp_challenges
        WHERE destination = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
      [input.destination, 10],
    );
    if (Number(rl[0]?.n ?? 0) >= 5) {
      throw new BadRequestException("otp_rate_limited");
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = await bcrypt.hash(code, 10);
    const rows = await this.pg.query<{ id: string }>(
      `INSERT INTO auth.otp_challenges
         (user_id, channel, purpose, destination, code_hash, max_attempts, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6, now() + ($7 || ' seconds')::interval)
       RETURNING id`,
      [
        input.userId ?? null,
        input.channel,
        input.purpose,
        input.destination,
        codeHash,
        MAX_ATTEMPTS,
        TTL_SECONDS,
      ],
    );
    const challengeId = rows[0]!.id;

    // Deliver via the appropriate channel (docs/06). Fail loudly in production —
    // never pretend an OTP was sent.
    try {
      if (input.channel === "MOBILE") {
        await this.sms.sendOtp(input.destination, code, input.purpose);
      } else if (input.channel === "EMAIL") {
        await this.email.sendOtp(input.destination, code, input.purpose);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === "production") {
        throw new BadRequestException("otp_delivery_failed");
      }
      // eslint-disable-next-line no-console
      console.warn(`[OtpService] OTP delivery failed (dev, non-fatal): ${msg}`);
    }
    return { challengeId };
  }

  /** Verify a code for a challenge. Enforces purpose, TTL, attempts, single-use. */
  async verify(challengeId: string, code: string, expectedPurpose?: OtpPurpose): Promise<{ userId: string | null }> {
    // Normalize: OTP autofill / copy-paste often carries spaces or invisible
    // characters ("1 2 3 4 5 6", trailing newline). Strip everything but digits
    // so a correct code is never rejected over formatting. The stored hash is of
    // the 6-digit string, so this matches what issue() hashed.
    code = (code ?? "").replace(/\D/g, "");
    const rows = await this.pg.query<{
      id: string;
      user_id: string | null;
      purpose: string;
      code_hash: string;
      attempts: number;
      max_attempts: number;
      expired: boolean;
      consumed: boolean;
    }>(
      `SELECT id, user_id, purpose, code_hash, attempts, max_attempts,
              (expires_at < now()) AS expired,
              (consumed_at IS NOT NULL) AS consumed
         FROM auth.otp_challenges WHERE id = $1`,
      [challengeId],
    );
    const ch = rows[0];
    if (!ch) throw new BadRequestException("invalid_challenge");
    if (ch.consumed) throw new BadRequestException("otp_already_used");
    if (ch.expired) throw new BadRequestException("otp_expired");
    if (ch.attempts >= ch.max_attempts) throw new BadRequestException("otp_locked");
    if (expectedPurpose && ch.purpose !== expectedPurpose) {
      throw new BadRequestException("otp_purpose_mismatch");
    }

    // The OTP break-glass bypass (OTP_BYPASS_ENABLED/OTP_BYPASS_CODE) has been
    // removed entirely — no code path can satisfy verification except a correct,
    // single-use, TTL'd code that matches the stored bcrypt hash.
    const ok = await bcrypt.compare(code, ch.code_hash);
    if (!ok) {
      await this.pg.query("UPDATE auth.otp_challenges SET attempts = attempts + 1 WHERE id = $1", [
        challengeId,
      ]);
      throw new BadRequestException("otp_incorrect");
    }
    await this.pg.query("UPDATE auth.otp_challenges SET consumed_at = now() WHERE id = $1", [
      challengeId,
    ]);
    return { userId: ch.user_id };
  }
}
