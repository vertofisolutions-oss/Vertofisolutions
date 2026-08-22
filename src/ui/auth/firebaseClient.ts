"use client";
import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  type ConfirmationResult,
  RecaptchaVerifier,
  getAuth,
  signInWithPhoneNumber,
} from "firebase/auth";

/**
 * Shared Firebase phone-OTP client for every Vertofi frontend. Replaces MSG91
 * SMS: the browser sends/confirms the OTP here, gets a Firebase ID token, and
 * posts it to `/auth/firebase/exchange` to mint Vertofi JWTs.
 *
 * Config is the (public, safe) Firebase web config, read from NEXT_PUBLIC_*
 * env vars. All values are non-secret — they identify the project, not authorize
 * it (verification happens server-side against Google's certs).
 */
declare const process: { env: Record<string, string | undefined> };

function firebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function firebaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
}

let _app: FirebaseApp | null = null;
function app(): FirebaseApp {
  if (_app) return _app;
  const cfg = firebaseConfig();
  if (!cfg.apiKey) throw new Error("firebase_not_configured");
  _app = getApps().length ? getApp() : initializeApp(cfg);
  return _app;
}

function auth(): Auth {
  const a = getAuth(app());
  a.useDeviceLanguage();
  return a;
}

const _recaptchas = new Map<string, RecaptchaVerifier>();
/**
 * Lazily build an invisible reCAPTCHA bound to a DOM element (Firebase requires
 * app verification for phone auth). `containerId` must be an element id present
 * in the page (e.g. a hidden <div id="recaptcha" />). Cached PER CONTAINER —
 * a verifier bound to an unmounted container (e.g. the MFA one after switching
 * to the reset flow) cannot be reused.
 */
function recaptcha(containerId: string): RecaptchaVerifier {
  const cached = _recaptchas.get(containerId);
  if (cached) return cached;
  const v = new RecaptchaVerifier(auth(), containerId, { size: "invisible" });
  _recaptchas.set(containerId, v);
  return v;
}

/** Normalize a 10-digit Indian mobile (or +91…) to E.164 for Firebase. */
export function toE164(mobile: string): string {
  const d = mobile.replace(/\D/g, "");
  if (mobile.trim().startsWith("+")) return "+" + d;
  if (d.length === 10) return "+91" + d;
  if (d.length === 12 && d.startsWith("91")) return "+" + d;
  return "+" + d;
}

/** Send a phone OTP via Firebase. Returns a confirmation handle for the code. */
export async function sendPhoneOtp(mobile: string, recaptchaContainerId: string): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth(), toE164(mobile), recaptcha(recaptchaContainerId));
}

/** Confirm the entered OTP code → resolves to a Firebase ID token to exchange. */
export async function confirmPhoneOtp(confirmation: ConfirmationResult, code: string): Promise<string> {
  const cred = await confirmation.confirm(code);
  return cred.user.getIdToken();
}

export type { ConfirmationResult };
