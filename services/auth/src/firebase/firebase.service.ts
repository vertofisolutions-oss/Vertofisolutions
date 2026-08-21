import { Injectable, UnauthorizedException } from "@nestjs/common";
import admin from "firebase-admin";

/**
 * Verifies Firebase Authentication ID tokens (phone sign-in). Firebase replaces
 * MSG91 for SMS OTP: the browser runs the phone OTP via the Firebase SDK, gets
 * an ID token, and posts it here — we verify it and mint our own Vertofi JWTs.
 *
 * Keyless: the Admin SDK uses Application Default Credentials (GKE Workload
 * Identity), so no service-account key is needed (the org policy blocks SA keys
 * anyway). Token verification only needs the project id + Google's public certs.
 */
@Injectable()
export class FirebaseService {
  private app: admin.app.App | null = null;

  configured(): boolean {
    return !!(process.env.FIREBASE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT);
  }

  private get auth(): admin.auth.Auth {
    if (!this.app) {
      const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
      this.app = admin.apps.length ? admin.app() : admin.initializeApp({ projectId });
    }
    return admin.auth(this.app);
  }

  /** Verify a Firebase phone-sign-in ID token → the verified phone (E.164). */
  async verifyIdToken(idToken: string): Promise<{ uid: string; phone?: string; email?: string }> {
    if (!this.configured()) throw new UnauthorizedException("firebase_not_configured");
    try {
      // Plain verification (no checkRevoked): validates the signature + claims
      // against Google's public certs. checkRevoked=true would make an
      // authenticated backend call needing extra IAM on the Workload Identity
      // SA — unnecessary for one-shot OTP/MFA and the cause of false rejects.
      const decoded = await this.auth.verifyIdToken(idToken);
      return { uid: decoded.uid, phone: decoded.phone_number, email: decoded.email };
    } catch (e) {
      // Surface the real reason (project mismatch, clock skew, cert fetch, etc.)
      console.error("[firebase] verifyIdToken failed:", (e as Error)?.message ?? e);
      throw new UnauthorizedException("invalid_firebase_token");
    }
  }
}
