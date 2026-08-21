# Admin + Teams Panel Isolation — Cloudflare Access + dedicated domain

Goal: the internal panels are **not publicly discoverable or reachable**. Identity
(Google login via Cloudflare Access) is the primary gate; the existing panel-token
+ session layers remain underneath; IP allowlist is optional. Approved decision
(2026-06-08): **Cloudflare Access + separate dedicated domain + Google identity**.

Final architecture:
```
Visitor → Cloudflare Access (Google identity policy)
        → [pass] → Vercel app → middleware (Layer 0 verifies CF-signed JWT,
                                  Layer 2 panel-token, Layer 3 session)
        → [fail] → blocked at Cloudflare; app never loads
admin.vertofi.com / teams.vertofi.com → REMOVED (NXDOMAIN)
```

## Code already shipped (this repo)
- `apps/web-{admin,teams}/src/lib/cf-access.ts` — verifies the Cloudflare Access
  JWT (`Cf-Access-Jwt-Assertion`) against `https://<team>.cloudflareaccess.com`
  certs + the application AUD. Edge-runtime (`jose`).
- `apps/web-{admin,teams}/src/middleware.ts` — Layer 0 (CF Access identity,
  enforced when configured), IP allowlist now **optional** (`PANEL_REQUIRE_IP`),
  panel-token + session retained, all denials → 404, hardening headers added.
- Forward-compatible: until `CF_ACCESS_*` env is set, Layer 0 is skipped so no one
  is locked out during rollout.

Env vars to set on the admin + teams Vercel projects (after Cloudflare setup):
- `CF_ACCESS_TEAM_DOMAIN` = your Cloudflare team slug (e.g. `vertofi-ops`)
- `CF_ACCESS_AUD` = the Access application's Audience (AUD) tag
- (optional) `PANEL_REQUIRE_IP=true` only if you also want IP allowlisting

## YOUR action items (provider accounts — I can't do these)
1. **Buy the dedicated domain** (e.g. `vertofi-ops.com`).
2. **Create a Cloudflare account**, add that domain as a zone (Free plan is fine).
3. At the **registrar**, point the domain's nameservers to the Cloudflare ones.
4. In **Cloudflare Zero Trust → Access**: connect Google as an identity provider;
   create two **Access applications** (`console.<domain>`, `team.<domain>`) with a
   policy allowing only your specific Google emails. Copy each app's **AUD tag**.
5. Send me: the **domain**, a **Cloudflare API token** (Zone DNS + Access edit),
   the two **AUD tags**, and the **allowed Google emails**.

## MY action items once you provide the above
1. Add `console.<domain>` / `team.<domain>` to the admin/teams **Vercel projects**
   (`vercel domains add` / alias) + the proxied DNS records in Cloudflare.
2. Set `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` (+ `PANEL_SECRET`) as Vercel envs;
   redeploy both panels.
3. Verify: new host loads only after Google auth; a direct origin hit without the
   CF JWT → 404; old hosts removed.
4. **Only then** remove `admin.vertofi.com` / `teams.vertofi.com` — the Vercel
   aliases AND the Cloud DNS CNAMEs (`gcloud dns record-sets ... delete`) — so the
   public hosts go NXDOMAIN. (Sequenced last so you're never locked out.)

## Hardening notes
- Origin lock (optional, stronger): add a Cloudflare Transform Rule injecting a
  secret header and have middleware require it, so the Vercel origin only serves
  requests proxied through Cloudflare.
- Enforce TOTP/authenticator for ADMIN once the backend gains a TOTP endpoint.
- Keep `PANEL_SECRET` in Vercel env only; rotate periodically.

## Pre-existing blockers to fix before the next admin deploy (NOT from this work)
- `apps/web-admin/src/app/team-members/page.tsx:654` ref type mismatch
- `apps/web-admin/src/components/ClientWorkspace.tsx` `api.flagFlaw` / `api.requestAccess` missing
