# Service: access

**Responsibility:** The authorization brain — resolves RBAC + ABAC, manages `access_grants` and `access_requests`, computes each principal's **effective org set + permissions**, and sets the Postgres RLS context. See [../04-rbac-and-access-control.md](../04-rbac-and-access-control.md).

**Tech:** NestJS. Postgres (grants). Redis (resolution cache, invalidated on grant change).

**Data owned:** `access_grants`, `access_requests`, `team_assignments`.

**API (sync):**
```
POST   /grants                 # Admin (or Associate→own accountant panel) creates a grant
DELETE /grants/{id}            # revoke
GET    /grants?grantee=&org=   # list
POST   /access-requests        # Team requests more access → notifies Admin
POST   /access-requests/{id}/decide   # Admin approve/deny → creates grant
GET    /resolve                # internal: principal → {org_ids, permission, scope} (cached)
```

**Events:** produces `grant.created`, `grant.revoked`, `access_request.created`, `access_request.decided`. Consumes `org.created`, `user.created`, `onboarding.professional_selected` (auto-grant chosen Associate).

**Scaling:** stateless; resolution is Redis-cached per (user, version); cache busted on any grant mutation for affected grantees.

**Failure modes & degradation:** on cache miss + DB slowness, fail **closed** (deny) — never fail open for authorization. Grants are append-with-status (revoke ≠ delete) for audit.

**Security:** only Admin manages cross-tenant grants; Associates may only grant their **own** Accountant Panel access to their **own** clients (validated). Every grant change audited with actor + reason. BHS/Legal grants carry restricted `scope` (BHS_ONLY / CASES_ONLY).
