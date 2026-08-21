/**
 * Vertofi load smoke test (docs/18). Ramps concurrent virtual users against the
 * gateway to validate the "accept fast, process async" model holds under load.
 *
 *   k6 run -e BASE=http://localhost:4000 tests/load/k6-smoke.js
 *
 * Scale up VUs to model the 50k-concurrent target against a staging cluster.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE = __ENV.BASE || "http://localhost:4000";
export const errorRate = new Rate("errors");

export const options = {
  scenarios: {
    // Steady dashboard-style read load (health + public endpoints).
    reads: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 200 },
        { duration: "2m", target: 1000 },
        { duration: "1m", target: 1000 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<300", "p(99)<800"], // gateway SLO (docs/16)
    errors: ["rate<0.01"],
  },
};

export default function () {
  // Liveness + a public endpoint exercise the gateway + routing path.
  const health = http.get(`${BASE}/health`);
  check(health, { "health 200": (r) => r.status === 200 }) || errorRate.add(1);

  const plans = http.get(`${BASE}/api/v1/billing/plans`);
  check(plans, { "plans reachable": (r) => r.status === 200 || r.status === 404 }) || errorRate.add(1);

  sleep(Math.random() * 1.5);
}
