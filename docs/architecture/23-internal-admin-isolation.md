# 23 — Internal Admin & Teams Isolation

**Requirement:** Admin and Teams tooling must be completely isolated from the public website — separate app, separate hosting, and unreachable from the main site.

## What changed

- The **Admin** and **Teams** panels were removed from the public panels app (`apps/web-panels`) and from the landing-page **Services** dropdown (`apps/web-landing`). They are not linked anywhere public.
- They now live in a dedicated **internal portal**: `apps/web-admin` (port 3003), deployed separately.
- The public panels app bounces any Admin/Team token to its login (they don't belong there); the internal portal rejects any non-internal role at the login boundary.

## App boundaries

| App | Port | Audience | Exposure |
|-----|------|----------|----------|
| `web-landing` | 3000 | Public | Public internet (CloudFront + WAF) |
| `web-business` | 3001 | Clients | Public internet |
| `web-panels` | 3002 | Associates · Accountants · BHS · Legal | Public internet |
| **`web-admin`** | **3003** | **Admin · Teams (Vertofi staff)** | **Internal network only** |

## Deployment isolation (production)

The internal portal must NOT be served from the public ingress. Recommended posture:

1. **Separate hosting / cluster boundary** — deploy `web-admin` to an internal namespace (or a separate cluster), behind an **internal-only Application Load Balancer** (scheme `internal`), not the public CloudFront/ALB.
2. **Private DNS** — expose at e.g. `admin.internal.vertofi` in a **private hosted zone**; no public DNS record. `robots: noindex` + `X-Robots-Tag` set in `next.config.ts` as defense in depth.
3. **Network access** — reachable only over **corporate VPN** (or AWS Client VPN / zero-trust proxy). Optionally an **IP allowlist** on the internal ALB / WAF for office egress IPs.
4. **mTLS / SSO** — front with an identity-aware proxy (e.g., Cloudflare Access / AWS Verified Access / oauth2-proxy) requiring staff SSO before the app even loads.
5. **Headers** — `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'` (already set) so the portal can't be embedded.
6. **Separate image & pipeline** — built as its own image (`docker build -f infra/docker/Dockerfile.next --build-arg APP=web-admin`) and deployed via its own Helm release into the internal namespace.

### Defense in depth (server side)
Even if the UI were reached, every admin action is **role-gated at the gateway + services** (RBAC/ABAC) and written to the immutable audit log. The UI isolation is the outer layer; the API authorization is the hard boundary.

## Helm

Deploy `web-admin` with an internal service/ingress and a tighter NetworkPolicy:

```yaml
# values.web-admin.yaml (excerpt)
name: web-admin
port: 3003
ingress:
  internalOnly: true          # scheme: internal on the ALB
  ipAllowlist: ["203.0.113.0/24"]   # office egress
networkPolicy:
  enabled: true
  allowFromNamespaces: ["vertofi-internal-ingress"]
```

The internal portal's `NEXT_PUBLIC_API_URL` should point at the gateway via the internal path; it never needs a public route.
