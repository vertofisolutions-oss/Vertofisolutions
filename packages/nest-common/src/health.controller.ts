import { Controller, Get, SetMetadata } from "@nestjs/common";
import { PgService } from "./pg.service.js";
import { integrationsHealth, type IntegrationStatus } from "./integrations.js";

/** Same key as PUBLIC_KEY in @vertofi/auth-guards — marks route as unauthenticated. */
const Public = () => SetMetadata("vertofi:public", true);

/**
 * Standard liveness/readiness endpoints (docs/16). Mount in every service.
 * Public (no auth) — used by Kubernetes probes and the load balancer.
 */
@Controller()
export class HealthController {
  constructor(private readonly pg: PgService) {}

  /** Liveness probe — no auth required (K8s probe). */
  @Public()
  @Get("health")
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  /** Readiness probe — checks DB connectivity, no auth required (K8s probe).
   *
   * H-5 fix: Returns HTTP 200 (not 503) with status:"degraded" when DB is down.
   * Returning 503 causes Kubernetes to remove ALL pods from the load balancer
   * simultaneously the moment the DB blips, triggering a full platform outage
   * and a recovery-blocking feedback loop. A degraded pod can still serve
   * non-DB requests (health, public routes) and the pod should stay in rotation.
   * Only fail readiness (503) if the pod itself is broken, not because of DB.
   */
  @Public()
  @Get("ready")
  async ready(): Promise<{ status: "ok" | "degraded"; db: "ok" | "fail" }> {
    let db: "ok" | "fail" = "fail";
    try {
      db = (await this.pg.ping()) ? "ok" : "fail";
    } catch {
      db = "fail";
    }
    // Always return 200 — let the app tier stay in the load balancer even when
    // DB is degraded. Circuit-breaking happens at the service layer, not here.
    return { status: db === "ok" ? "ok" : "degraded", db };
  }

  /**
   * Integration configuration visibility — no auth, no secret values, no network
   * calls. Reports which external providers are credential-ready for this
   * deployment. See docs/ENVIRONMENT_SETUP.md.
   */
  @Public()
  @Get("health/integrations")
  integrations(): Record<string, IntegrationStatus> {
    return integrationsHealth();
  }
}
