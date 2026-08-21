import type { PoolClient } from "pg";
import type { EffectiveScope, Principal } from "./principal.js";

/**
 * Row-Level Security context (see docs/04-rbac-and-access-control.md).
 *
 * Every tenant table has RLS policies that read two session GUCs:
 *   - app.current_role     → the principal's role
 *   - app.current_org_ids  → comma-separated org ids the principal may touch
 *                            ("*" means unrestricted, ADMIN only)
 *
 * Services MUST call `withTenantContext` around any query touching tenant data.
 * This is the physical backstop even if an application-level check is missed.
 */
export async function setRlsContext(
  client: PoolClient,
  principal: Principal,
  scope: EffectiveScope,
): Promise<void> {
  const orgIds = scope.orgIds === "*" ? "*" : scope.orgIds.join(",");
  // Collapse all 4 GUC assignments into a single round trip (H-2 fix).
  // set_config(..., true) → scoped to the current transaction only.
  await client.query(
    `SELECT
       set_config('app.current_role',       $1, true),
       set_config('app.current_user_id',    $2, true),
       set_config('app.current_org_ids',    $3, true),
       set_config('app.current_permission', $4, true)`,
    [principal.role, principal.userId, orgIds, scope.permission],
  );
}

/**
 * Set an unrestricted SYSTEM context for trusted internal event consumers
 * (e.g. reconciliation/exception services reacting to Kafka events). These run
 * as the platform, not a user, so they may write across the tenant whose event
 * they are processing. Use ONLY in consumers, never on user-facing HTTP paths.
 */
export async function setSystemContext(client: PoolClient): Promise<void> {
  // Single round trip for all 4 GUCs (H-2 fix).
  await client.query(
    `SELECT
       set_config('app.current_role',       'SYSTEM', true),
       set_config('app.current_user_id',    'system', true),
       set_config('app.current_org_ids',    '*',      true),
       set_config('app.current_permission', 'EDIT',   true)`,
  );
}

/**
 * Run `fn` inside a transaction with RLS context applied. Always use a
 * dedicated client from the pool so GUCs don't leak across requests.
 */
export async function withTenantContext<T>(
  client: PoolClient,
  principal: Principal,
  scope: EffectiveScope,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  await client.query("BEGIN");
  try {
    await setRlsContext(client, principal, scope);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

/**
 * SQL snippet generator for the standard RLS policy on a tenant table.
 * Used in migrations. Enforces: ADMIN sees all; everyone else only rows whose
 * org_id is in app.current_org_ids.
 */
export function tenantRlsPolicySql(schema: string, table: string): string {
  const t = `${schema}.${table}`;
  return `
ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${t} FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${t};
CREATE POLICY ${table}_tenant_isolation ON ${t}
  USING (
    current_setting('app.current_org_ids', true) = '*'
    OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ','))
  );
`;
}
