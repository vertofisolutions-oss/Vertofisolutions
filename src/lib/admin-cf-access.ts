/**
 * Cloudflare Access identity verification (edge runtime, via `jose`).
 *
 * The admin/teams panels sit behind Cloudflare Access (Zero Trust). After a
 * visitor authenticates with an approved Google identity, Cloudflare injects a
 * signed JWT in the `Cf-Access-Jwt-Assertion` header (and the `CF_Authorization`
 * cookie). We verify that JWT against the team's public keys + the application
 * audience (AUD) tag, so even a direct hit on the Vercel origin that bypasses
 * Cloudflare is rejected — the attacker cannot forge a Cloudflare-signed token.
 *
 * Identity is the PRIMARY gate (works from anywhere after Google auth — no IP
 * allowlist required). When CF Access env is not yet configured this returns
 * "not configured" so the panel can still be protected by the panel-token +
 * session layers during rollout, without locking anyone out.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";

const TEAM = process.env.CF_ACCESS_TEAM_DOMAIN ?? ""; // e.g. "vertofi-ops"
const AUD = process.env.CF_ACCESS_AUD ?? ""; // Access application Audience (AUD) tag
const ISSUER = TEAM ? `https://${TEAM}.cloudflareaccess.com` : "";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks && ISSUER) jwks = createRemoteJWKSet(new URL(`${ISSUER}/cdn-cgi/access/certs`));
  return jwks;
}

/** True once CF Access is wired (team domain + AUD present). */
export function cfAccessConfigured(): boolean {
  return !!(TEAM && AUD);
}

/** Verify the Cloudflare Access assertion → the authenticated email, or null. */
export async function verifyCfAccess(token: string | undefined): Promise<{ email: string } | null> {
  if (!token || !ISSUER || !AUD) return null;
  const keys = getJwks();
  if (!keys) return null;
  try {
    const { payload } = await jwtVerify(token, keys, { issuer: ISSUER, audience: AUD });
    const email = (payload.email as string | undefined) ?? (payload.sub as string | undefined) ?? "";
    return email ? { email } : null;
  } catch {
    return null;
  }
}
