# Service: ai-gateway

**Responsibility:** The single chokepoint for all OpenAI traffic. No other service calls OpenAI directly. Provides caching, resilience, model tiering, structured outputs, cost metering, and PII minimization. See [../09-integrations-and-connectors.md](../09-integrations-and-connectors.md).

**Tech:** Python + FastAPI. OpenAI SDK. Redis (cache + concurrency limiter + usage counters).

**API (sync, internal only):**
```
POST /ai/complete       # {task, prompt, schema?, plan, org_id} → structured result
POST /ai/categorize     # categorization helper (4o-mini)
POST /ai/analyze        # reasoning tasks (4o, plan-gated)
POST /ai/embed          # embeddings for semantic cache / matching
GET  /ai/health         # circuit-breaker + provider status
```

**Behavior:**
- **Model tiering:** `gpt-4o-mini` for high-volume extraction/categorization; `gpt-4o` for premium reasoning (VBD, deep insights), gated by `plan`.
- **Caching:** exact (hash of normalized prompt) + semantic (embedding similarity) in Redis. Big cost + latency win on repeated vendor/category prompts.
- **Resilience:** retries (exp backoff + jitter), circuit breaker, concurrency limiter honoring OpenAI TPM/RPM tier. On outage → return `degraded` so callers use rules-based fallback (e.g., categorization) or queue for retry.
- **Structured outputs:** JSON mode / function calling; schema-validated (Pydantic) before returning.
- **Cost metering:** per-org token + ₹ cost tracked in `usage_counters`; enforced against plan; emits `ai.cost.recorded`.
- **PII minimization:** redact bank numbers/Aadhaar/etc. before prompts.
- **Batch:** non-urgent monthly reports via OpenAI Batch API.

**Events:** produces `ai.completed`, `ai.cost.recorded`, `ai.degraded`. Consumes none directly (called sync); async tasks arrive via callers.

**Scaling:** stateless; HPA on request latency + queue depth. Concurrency limiter is the backpressure valve protecting the OpenAI account.

**Failure modes & degradation:** OpenAI down/slow → circuit opens → callers degrade gracefully (rules fallback or queued). Never blocks a user-facing request on OpenAI — callers treat AI as best-effort enrichment behind the `202` model ([../18-scalability-and-reliability.md](../18-scalability-and-reliability.md)).

**Security:** API key in vault; no prompt/response logging of raw PII; per-org isolation of cache keys.
