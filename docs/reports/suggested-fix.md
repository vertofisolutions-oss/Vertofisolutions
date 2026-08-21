# Vertofi — Suggested Fixes

_Companion to [`bugs.md`](./bugs.md). Concrete, reviewed fixes for each finding. Nothing here has been applied — apply after review._

---

## C1 — 4 panels return 404 (leftover redirect middleware)
**Apps:** `web-associates`, `web-accountants`, `web-bhs`, `web-legal`

**Cause:** each isolated app still has `src/middleware.ts` (from the old unified `web-panels` app) that redirects the subdomain root to `/associates` `/accountants` `/bhs` `/legal` — routes that no longer exist (panel content now lives at root `page.tsx`).

**Fix (recommended): delete the middleware in all 4 apps.** Root already serves the panel; no redirect is needed on a single-role subdomain.

```powershell
Remove-Item apps/web-associates/src/middleware.ts
Remove-Item apps/web-accountants/src/middleware.ts
Remove-Item apps/web-bhs/src/middleware.ts
Remove-Item apps/web-legal/src/middleware.ts
```

**Verify:**
```bash
# each should be 200 at root and at /login (no redirect to a dead path)
curl -s -o /dev/null -w "%{http_code}\n" https://associates.vertofi.com
curl -s -o /dev/null -w "%{http_code}\n" https://associates.vertofi.com/login
# repeat for accountants / bhs / legal
```

> Alternative if you want to keep a guard: change each app's map so the target is `/` (or `/login` for logged-out users) instead of the old sub-path, and add `/login` to the matcher exclusions so it isn't redirected. Deleting is simpler and removes the cross-app copy-paste hazard.

---

## C2 — `business.vertofi.com` does not resolve (NXDOMAIN)
**Cause:** business URL was renamed `app.vertofi.com → business.vertofi.com` (commit `b116549`) and baked into the live landing CTAs, but the new domain was never attached to the Vercel `web-business` project / no DNS record exists.

**Fix (infra — not code):**
1. Add the domain in Vercel:
   ```bash
   vercel domains add business.vertofi.com --scope <team>
   # or: Vercel dashboard → web-business project → Settings → Domains → Add
   ```
2. Create the DNS record your registrar/zone needs (Vercel shows the exact target):
   - `CNAME business → cname.vercel-dns.com.` (subdomain), **or**
   - `A` record to Vercel's IP if your DNS can't CNAME a subdomain.
3. Wait for cert issuance, then verify the env that the landing was built with points here (it already does in production):
   ```
   NEXT_PUBLIC_BUSINESS_URL=https://business.vertofi.com
   ```

**Verify:**
```bash
nslookup business.vertofi.com
curl -s -o /dev/null -w "%{http_code}\n" https://business.vertofi.com/login   # expect 200
```

---

## C3 — `teams.vertofi.com` does not resolve (NXDOMAIN)
**Cause:** internal Teams portal domain has no DNS record / not attached to its Vercel project.

**Fix (infra — not code):** same steps as C2 for `teams.vertofi.com` against the `web-teams` project. Keep it access-protected/internal (it must not be linked from the public site).

```bash
vercel domains add teams.vertofi.com --scope <team>
# add CNAME teams → cname.vercel-dns.com.
nslookup teams.vertofi.com
curl -s -o /dev/null -w "%{http_code}\n" https://teams.vertofi.com   # expect 200/302 to login
```

> `infra/map-domains.ps1` already aliases associates/accountants/bhs/legal/teams but **omits business**, and uses `vercel alias set` against specific deployment URLs (brittle). Prefer attaching domains to the **project** (above) so every production deploy keeps the domain automatically.

---

## M1 — Stale URLs in repo env files
**File:** `.env.production`
```diff
- NEXT_PUBLIC_BUSINESS_URL=https://app.vertofi.com
- NEXT_PUBLIC_PANEL_BASE=https://panels.vertofi.com
+ NEXT_PUBLIC_BUSINESS_URL=https://business.vertofi.com
+ NEXT_PUBLIC_ASSOCIATES_URL=https://associates.vertofi.com
+ NEXT_PUBLIC_ACCOUNTANTS_URL=https://accountants.vertofi.com
+ NEXT_PUBLIC_BHS_URL=https://bhs.vertofi.com
+ NEXT_PUBLIC_LEGAL_URL=https://legal.vertofi.com
```
`NEXT_PUBLIC_PANEL_BASE` is no longer read anywhere (the unified panels app is gone); the landing reads the per-role `NEXT_PUBLIC_*_URL` vars (`apps/web-landing/src/lib/panels.ts`). Also update `.env.vercel.example` and its "panels.vertofi.com" comments to match the new per-subdomain layout.

> These are repo-local files; production Vercel envs are already correct (the live landing links to `business.vertofi.com` and the right panel subdomains). This is consistency/hygiene so the next person isn't misled.

---

## M2 — Cosmetic old domain in landing UI
**File:** `apps/web-landing/src/components/ProductPreview.tsx:33`
```diff
-          app.vertofi.com
+          business.vertofi.com
```
Fake browser-chrome label only; no functional impact.

---

## M3 — `web-admin` local typecheck fails on stale `.next/types`
**Cause:** `.next/types/app/{admin,teams}/page.ts` are stale generated files referencing routes removed during the admin/teams consolidation; `tsconfig.json` `include`s `.next/types/**/*.ts`.

**Fix:** clear the cache (CI is unaffected — `.next` is gitignored):
```powershell
Remove-Item -Recurse -Force apps/web-admin/.next
pnpm --filter @vertofi/web-admin typecheck   # passes after clean
```
Optional hardening: add a `clean` step before `typecheck` in the app, or drop `.next/types/**/*.ts` from `include` and rely on `next build` for route-type validation.

---

## Suggested apply order
1. **C2** — `business.vertofi.com` DNS/domain (unblocks all customer login/signup).
2. **C1** — delete the 4 panel middlewares (unblocks all professional panels). Lowest-risk code change; ship with C2.
3. **C3** — `teams.vertofi.com` DNS/domain.
4. **M1 / M2** — env + UI URL hygiene (bundle into one small commit).
5. **M3** — local cache clear (no commit needed).

## Post-fix verification checklist
```bash
for u in https://vertofi.com https://business.vertofi.com \
         https://associates.vertofi.com https://accountants.vertofi.com \
         https://bhs.vertofi.com https://legal.vertofi.com \
         https://teams.vertofi.com https://admin.vertofi.com; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -L "$u")  $u"
done
# all should be 200 (or 302→login that resolves to 200), none 000/404
```
After the C1 code change, also run `pnpm build` for the 4 panel apps to confirm they build without the middleware.
