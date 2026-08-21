"""
Categorization service (docs/08, docs/11 #8 Invisible Accounting).

Consumes `document.extracted` → loads the OCR extraction → asks the ai-gateway
to map it to a ledger category → falls back to deterministic rules when AI is
degraded → emits `transaction.categorized`. Anything below the review threshold
(or with no confident answer) emits `transaction.needs_review` for the
exception-workflow — it is NEVER auto-categorized with a fabricated guess.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import asyncpg
import httpx
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from fastapi import FastAPI

from .rules import LEDGER_CATEGORIES, categorize as rules_categorize
from .settings import settings

pool: asyncpg.Pool | None = None
producer: AIOKafkaProducer | None = None
http: httpx.AsyncClient | None = None
_task: asyncio.Task | None = None


def envelope(event: str, org_id: str, data: dict, correlation_id: str | None) -> bytes:
    return json.dumps(
        {
            "id": str(uuid.uuid4()),
            "event": event,
            "schema_version": 1,
            "org_id": org_id,
            "actor_id": "categorization",
            "correlation_id": correlation_id or str(uuid.uuid4()),
            "causation_id": None,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
    ).encode()


async def ai_categorize(org_id: str, vendor: str, description: str, amount: float) -> tuple[str | None, float, bool]:
    """Returns (category, confidence, degraded)."""
    assert http is not None
    try:
        r = await http.post(
            f"{settings.ai_gateway_url}/ai/categorize",
            json={
                "org_id": org_id,
                "vendor": vendor,
                "description": description,
                "amount": amount,
                "categories": LEDGER_CATEGORIES,
            },
            timeout=20.0,
        )
        body = r.json()
        if body.get("degraded") or not body.get("content"):
            return None, 0.0, True
        content = body["content"]
        return content.get("category"), float(content.get("confidence", 0)), False
    except Exception:  # noqa: BLE001
        return None, 0.0, True


async def handle_extracted(evt: dict) -> None:
    data = evt.get("data", {})
    org_id = evt.get("org_id")
    extraction_id = data.get("extraction_id")
    if not org_id or not extraction_id:
        return

    assert pool is not None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT payload, confidence, status, document_id FROM ocr.extractions WHERE id = $1",
            uuid.UUID(extraction_id),
        )
    if row is None:
        return

    payload = row["payload"] if isinstance(row["payload"], dict) else json.loads(row["payload"] or "{}")
    # If OCR couldn't extract, never invent a category — send to review.
    if row["status"] != "EXTRACTED":
        await emit_review(org_id, data, "ocr_needs_review", evt.get("correlation_id"))
        return

    vendor = str(payload.get("vendor_name", ""))
    description = " ".join(str(li.get("desc", "")) for li in payload.get("line_items", []))
    amount = float(payload.get("total", 0) or 0)

    category, confidence, degraded = await ai_categorize(org_id, vendor, description, amount)
    if degraded or not category:
        # Deterministic fallback so the pipeline keeps working (docs/18).
        category, confidence = rules_categorize(vendor, description)

    if not category or confidence < settings.review_threshold:
        await emit_review(org_id, data, "low_confidence", evt.get("correlation_id"))
        return

    assert producer is not None
    await producer.send_and_wait(
        "transaction.events",
        envelope(
            "transaction.categorized",
            org_id,
            {
                "extraction_id": extraction_id,
                "document_id": data.get("document_id"),
                "category": category,
                "confidence": confidence,
                "ai_degraded": degraded,
                "vendor": vendor,
                "amount": amount,
                "invoice_no": payload.get("invoice_number"),
                "invoice_date": payload.get("invoice_date"),
            },
            evt.get("correlation_id"),
        ),
        key=org_id.encode(),
    )


async def emit_review(org_id: str, data: dict, reason: str, correlation_id: str | None) -> None:
    assert producer is not None
    await producer.send_and_wait(
        "exception.events",
        envelope(
            "transaction.needs_review",
            org_id,
            {"document_id": data.get("document_id"), "extraction_id": data.get("extraction_id"), "reason": reason},
            correlation_id,
        ),
        key=org_id.encode(),
    )


async def consume_loop() -> None:
    consumer = AIOKafkaConsumer(
        "document.events",
        bootstrap_servers=settings.brokers,
        group_id="categorization",
        enable_auto_commit=True,
        auto_offset_reset="latest",
        **settings.kafka_kwargs(),
    )
    await consumer.start()
    try:
        async for msg in consumer:
            try:
                evt = json.loads(msg.value.decode())
                if evt.get("event") == "document.extracted":
                    await handle_extracted(evt)
            except Exception:  # noqa: BLE001
                pass
    finally:
        await consumer.stop()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global pool, producer, http, _task
    pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=10)
    producer = AIOKafkaProducer(bootstrap_servers=settings.brokers, enable_idempotence=True, **settings.kafka_kwargs())
    await producer.start()
    http = httpx.AsyncClient()
    _task = asyncio.create_task(consume_loop())
    yield
    if _task:
        _task.cancel()
    if http:
        await http.aclose()
    if producer:
        await producer.stop()
    if pool:
        await pool.close()


app = FastAPI(title="Vertofi Categorization Service", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


def _integration_status(*names: str) -> str:
    import os

    placeholders = ("needs_configuration", "change-me", "your-", "example", "placeholder")
    for n in names:
        v = (os.environ.get(n) or "").strip().lower()
        if not v or any(p in v for p in placeholders):
            return "needs_configuration"
    return "configured"


@app.get("/health/integrations")
async def health_integrations() -> dict:
    # Config visibility only — no secrets, no network calls.
    return {"ai_gateway": _integration_status("AI_GATEWAY_URL")}


@app.get("/ready")
async def ready() -> dict:
    ok = False
    try:
        assert pool is not None
        async with pool.acquire() as conn:
            ok = (await conn.fetchval("SELECT 1")) == 1
    except Exception:  # noqa: BLE001
        ok = False
    return {"status": "ok" if ok else "degraded", "db": "ok" if ok else "fail"}
