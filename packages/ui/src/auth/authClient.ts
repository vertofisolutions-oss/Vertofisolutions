"use client";
/**
 * Generic auth client shared by the simple-login panels (admin/teams/associates/
 * accountants/bhs/legal). It owns the token store + the auth endpoints every
 * panel needs. Apps with richer needs (e.g. web-business) keep their own `api`
 * lib; this exists so a basic login screen is ~30 lines, not a re-implemented
 * fetch + token layer per app.
 *
 * All calls go through the API gateway (NEXT_PUBLIC_API_URL).
 */
// Next.js statically inlines NEXT_PUBLIC_* at build time; this package has no
// @types/node, so declare the minimal shape we read.
declare const process: { env: Record<string, string | undefined> };

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const ACCESS_KEY = "vertofi.access";
const REFRESH_KEY = "vertofi.refresh";

export class AuthError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  // Session cookie so middleware/SSR can detect an authenticated browser. 30-day
  // lifetime (matches the refresh token) so a logged-in user STAYS logged in
  // until they explicitly log out — the access token silently refreshes.
  document.cookie = "vertofi.session=1; path=/; max-age=2592000; SameSite=Lax";
}
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  document.cookie = "vertofi.session=; path=/; max-age=0; SameSite=Lax";
}
export function getAccess(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = json?.errors?.[0]?.code ?? json?.message ?? json?.code ?? `http_${res.status}`;
    throw new AuthError(res.status, code);
  }
  return json as T;
}

export type Tokens = { accessToken: string; refreshToken: string };

export const authClient = {
  /**
   * Password login. For password-only roles (e.g. team members) returns
   * `{ mfaRequired: false, tokens }`; for roles that require OTP MFA returns
   * `{ mfaRequired: true, userId }` and the caller must run sendOtp/verifyOtp.
   */
  passwordLogin: (identifier: string, password: string) =>
    post<{ mfaRequired: boolean; tokens?: Tokens; userId: string; mobile?: string }>("/auth/login", { identifier, password }),

  /** Send an OTP to a destination for a given purpose (LOGIN | MFA | ...). */
  sendOtp: (channel: "MOBILE" | "EMAIL", destination: string, purpose = "LOGIN") =>
    post<{ challengeId: string }>("/auth/otp/send", { channel, destination, purpose }),

  /** Verify an OTP challenge → tokens. */
  verifyOtp: (challengeId: string, code: string) =>
    post<Tokens>("/auth/otp/verify", { challengeId, code }),

  /** Forgot-password: verify a RESET OTP and set the new password in one step. */
  resetPassword: (challengeId: string, code: string, newPassword: string) =>
    post<{ reset: boolean }>("/auth/otp/reset-password", { challengeId, code, newPassword }),

  /** Forgot-password via Firebase phone OTP (the configured delivery path). */
  firebaseResetPassword: (idToken: string, newPassword: string) =>
    post<{ reset: boolean }>("/auth/firebase/reset-password", { idToken, newPassword }),

  /** Exchange a Firebase phone-OTP ID token for tokens (MFA second factor or
   *  registration). Replaces the MSG91 sendOtp/verifyOtp path. */
  firebaseExchange: (input: { idToken: string; mode: "REGISTER" | "MFA"; userId?: string; email?: string; password?: string }) =>
    post<{ tokens: Tokens; userId: string; emailChallengeId?: string }>("/auth/firebase/exchange", input),

  /** Business self-serve registration → mobile+email OTP challenges. Pass the
   *  password so the server-OTP signup path persists it (else login 401s). */
  register: (mobile: string, email: string, password?: string) =>
    post<{ userId: string; mobileChallengeId: string; emailChallengeId: string }>("/auth/register", { mobile, email, password }),

  /** Exchange a refresh token for a fresh pair. */
  refresh: (refreshToken: string) => post<Tokens>("/auth/token/refresh", { refreshToken }),
};
