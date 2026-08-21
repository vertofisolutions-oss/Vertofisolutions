# 06 — Authentication & OTP

Identity is owned by the **auth service**. JWT access tokens (short-lived, 15 min) + rotating refresh tokens (httpOnly, secure). Sessions tracked with device + IP for behaviour monitoring and revocation.

## Auth per principal

| Principal | Login factors |
|-----------|---------------|
| **Business / Client** | Mobile OTP + email verification |
| **Team member** | ID + password + OTP (2-step) |
| **Associate (CA/CMA/…)** | Password + OTP |
| **Accountant Panel** | Password + OTP |
| **BHS analyst** | Password + OTP |
| **Lawyer** | Password + OTP |
| **Admin** | Password + OTP + Authenticator app (TOTP) |

## OTP types (all real, via providers in [09](./09-integrations-and-connectors.md))

1. **Login OTP** — mobile → send → verify → dashboard.
2. **Registration OTP** — mobile verification on signup (anti-fraud).
3. **Email OTP** — email verification, password reset, new-device login (AWS SES).
4. **MFA** — password → OTP → success (admins/finance/compliance also TOTP authenticator).
5. **Financial Action OTP** — before GST filing approval, tax submission, payroll processing, large data export, bank connection. **Creates legal proof of client approval** (recorded with `approval_otp_id` in `audit_log`).
6. **Document Access OTP** — before downloading sensitive files (GST returns, bank statements, payroll reports).
7. **WhatsApp OTP** — fallback channel when SMS fails.

## Providers
- **Mobile SMS OTP:** MSG91 (primary, India), Twilio (failover).
- **Email OTP:** AWS SES.
- **Authenticator:** TOTP (RFC 6238), Google/Microsoft Authenticator compatible.

## OTP security
- Codes are random 6-digit, **hashed** (bcrypt) at rest in `otp_challenges`, single-use, 5-min TTL, max 5 attempts → lockout.
- Rate-limited per user + per IP (Redis). Resend cooldown. Lockout + alert on abuse.
- Each challenge bound to a `purpose` (login ≠ financial-action) — a login OTP cannot authorize a GST filing.

## Token lifecycle
```
login → validate factors → issue {access JWT (15m), refresh (rotating, 30d)}
JWT claims: sub, role, professional_type?, org_id?, parent_associate_id?, session_id, plan, scope
access expired → refresh rotation (detect reuse → revoke family + alert)
logout / admin revoke → session.revoked_at set → refresh family invalidated
```

## Step-up flow (sensitive action)
```
POST /gst/filings/{id}/approve
  → guard detects sensitive action
  → 428 Precondition Required + challenge_id (OTP sent)
  → client submits {challenge_id, code}
  → verified → action executes, approval_otp_id stamped on the resulting record + audit_log
```

## Account protection
Account lockout after N failed logins, IP/device anomaly detection, session monitoring surfaced to the user ("active sessions") and to Admin (behaviour monitoring). Suspicious events → `security` topic → alerts.
