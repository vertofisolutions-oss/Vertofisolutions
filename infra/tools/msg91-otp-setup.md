# MSG91 OTP — setup guide

MSG91 powers **every SMS OTP** on Vertofi (registration, login, MFA, and step-up
Financial/Document approvals). It's already wired in code — `services/auth`
`SmsConnector` → MSG91 v5 OTP API, routed through `otp.service` for all flows.
What's left is **account + DLT registration + credentials**, then run the script.

Current prod state: MSG91 secrets are placeholders (`NEEDS_CONFIGURATION`) and the
platform is in **soft-launch bypass** (`OTP_BYPASS_ENABLED=1`, code `123456`).
Running the setup script stores the real keys and turns the bypass OFF.

## Step 1 — MSG91 account + DLT (TRAI requirement, India)
1. Create a MSG91 account (msg91.com) and complete KYC.
2. **DLT registration** (mandatory for Indian transactional SMS): register your
   **Principal Entity** on a DLT portal (Jio/Airtel/Vodafone/BSNL) — MSG91 guides
   this. You'll get an **Entity ID**.
3. Register a **Sender/Header ID** (6 chars, e.g. `VERTFI`) as *Transactional*.
4. Register an **OTP content template** on DLT, e.g.:
   `{#var#} is your Vertofi code. Valid 5 min. Do not share. -Vertofi`
   Approve it; MSG91 maps it to a **Template ID**.

## Step 2 — Get the 3 credentials from MSG91
- **Auth Key** — MSG91 dashboard → top-right → *API* / *Auth Key*.
- **Sender ID** — the approved 6-char header (e.g. `VERTFI`).
- **Template ID** — the approved OTP template's id.

## Step 3 (optional) — per-purpose branded templates (anti-phishing)
Register separate DLT templates so a LOGIN code reads differently from a
"money-movement approval" code. The code auto-uses `MSG91_TEMPLATE_ID_<PURPOSE>`
for: `LOGIN, REGISTER, MFA, FINANCIAL, DOCUMENT, RESET, EMAIL_VERIFY`
(falls back to the base template if a purpose isn't set).

## Step 4 — run the setup script (stores secrets, syncs, restarts auth)
```powershell
# base (one template):
.\infra\gke\setup-msg91.ps1 -AuthKey <authkey> -SenderId VERTFI -TemplateId <tmpl>

# with per-purpose templates:
.\infra\gke\setup-msg91.ps1 -AuthKey <authkey> -SenderId VERTFI -TemplateId <tmpl> `
  -TemplateLogin <id> -TemplateRegister <id> -TemplateMfa <id> `
  -TemplateFinancial <id> -TemplateDocument <id>
```
The script: stores `vertofi-shared-MSG91_*`, sets `OTP_BYPASS_ENABLED=0`,
forces the External-Secrets sync, and restarts the auth pod.

## Step 5 — verify
- Register/login on app.vertofi.com with a real mobile → the SMS should arrive.
- `123456` should NO LONGER work once the bypass is off.
- Check delivery in the MSG91 dashboard logs; auth pod logs show
  `MSG91 OTP dispatched` with a `requestId`.

## Notes
- Email OTP is a SEPARATE connector (`EmailConnector`) — not MSG91.
- Keep `OTP_BYPASS_ENABLED=0` in production; only flip on for a controlled pilot.
- To stage without disabling the bypass yet: pass `-DisableBypass:$false`.
