# Service: auth

**Responsibility:** Identity & authentication for all 7 panels — registration, login, OTP (all 7 types), MFA/TOTP, JWT issue/refresh, sessions, device/IP tracking, account lockout.

**Tech:** NestJS. Postgres (own schema). Redis (OTP state, rate limits, session index). Depends on SMS (MSG91/Twilio), Email (SES), TOTP lib.

**Data owned:** `users` (auth fields), `sessions`, `otp_challenges`, `mfa_secrets`, `login_attempts`, `device_registry`. (Profile/role data lives in `tenant`/`access`.)

**API (sync):**
```
POST /auth/register            # business signup → mobile OTP + email verify
POST /auth/login               # factors per role ([06])
POST /auth/otp/send            # {channel, purpose}
POST /auth/otp/verify          # {challenge_id, code}
POST /auth/mfa/setup|verify    # TOTP
POST /auth/token/refresh       # rotating refresh
POST /auth/logout              # revoke session/family
GET  /auth/sessions            # active sessions (user + admin behaviour view)
POST /auth/step-up             # issue Financial/Document Action OTP challenge
```

**Events:** produces `user.registered`, `user.logged_in`, `session.revoked`, `security.suspicious`. Consumes `org.created` (link owner).

**Scaling:** stateless; HPA on CPU/latency. OTP/session state in Redis (shared), so any replica serves any request.

**Failure modes & degradation:** SMS provider down → failover to Twilio, else WhatsApp OTP, else email. Never lock a user out due to provider outage without an alternate path. Refresh-token reuse → revoke family + `security.suspicious`.

**Security:** OTP hashed (bcrypt), single-use, TTL, attempt cap, purpose-bound (login OTP ≠ financial-action OTP). Passwords argon2id. Rate-limited per user+IP. All auth events audited.
