import jwt from "jsonwebtoken";
import type { Plan, Principal, ProfessionalType, Role } from "@vertofi/tenancy";

export interface AccessTokenClaims {
  sub: string; // userId
  role: Role;
  professionalType?: ProfessionalType;
  orgId?: string;
  parentAssociateId?: string;
  plan?: Plan;
  sid: string; // sessionId
  iat?: number;
  exp?: number;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: number; // seconds
  refreshTtl: number; // seconds
  issuer?: string;
}

/** Known insecure dev fallbacks that must never be used in production. */
const INSECURE_SECRETS = new Set([
  "dev-access-secret-change-me",
  "dev-refresh-secret-change-me",
]);

export class JwtService {
  constructor(private readonly cfg: JwtConfig) {
    // Fail-fast: in production, refuse to start with a missing/known-public
    // signing secret. Without this guard a misconfigured deployment would
    // silently sign tokens with a secret that is public in the source tree,
    // letting anyone forge admin tokens. Crashing on boot is the safe choice.
    if (process.env.NODE_ENV === "production") {
      for (const [label, secret] of [
        ["JWT_ACCESS_SECRET", cfg.accessSecret],
        ["JWT_REFRESH_SECRET", cfg.refreshSecret],
      ] as const) {
        if (!secret || INSECURE_SECRETS.has(secret) || secret.length < 16) {
          throw new Error(
            `${label} is missing, too short, or set to a known dev default in production. ` +
              `Set a strong unique value (>=16 chars) before starting.`,
          );
        }
      }
    }
  }

  signAccess(claims: Omit<AccessTokenClaims, "iat" | "exp">): string {
    return jwt.sign(claims, this.cfg.accessSecret, {
      algorithm: "HS256",
      expiresIn: this.cfg.accessTtl,
      issuer: this.cfg.issuer ?? "vertofi",
    });
  }

  signRefresh(payload: { sub: string; sid: string; family: string }): string {
    return jwt.sign(payload, this.cfg.refreshSecret, {
      algorithm: "HS256",
      expiresIn: this.cfg.refreshTtl,
      issuer: this.cfg.issuer ?? "vertofi",
    });
  }

  verifyAccess(token: string): AccessTokenClaims {
    // Pin algorithms to HS256 — without this, jsonwebtoken accepts any algorithm
    // the key validates, opening algorithm-confusion / "alg":"none" forgery.
    return jwt.verify(token, this.cfg.accessSecret, {
      algorithms: ["HS256"],
      issuer: this.cfg.issuer ?? "vertofi",
    }) as AccessTokenClaims;
  }

  verifyRefresh(token: string): { sub: string; sid: string; family: string } {
    return jwt.verify(token, this.cfg.refreshSecret, {
      algorithms: ["HS256"],
      issuer: this.cfg.issuer ?? "vertofi",
    }) as { sub: string; sid: string; family: string };
  }
}

export function claimsToPrincipal(c: AccessTokenClaims): Principal {
  return {
    userId: c.sub,
    role: c.role,
    professionalType: c.professionalType,
    orgId: c.orgId,
    parentAssociateId: c.parentAssociateId,
    plan: c.plan,
    sessionId: c.sid,
  };
}
