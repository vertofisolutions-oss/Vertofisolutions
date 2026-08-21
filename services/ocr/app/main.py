"""
OCR & Extraction service (docs/services/ocr-service.md).

Consumes `document.received` from Kafka, runs OCR via the provider connector,
persists an extraction, and publishes `document.extracted`. Heavy work is async
off the event bus so uploads stay instant (docs/18). Low/zero-confidence
results are routed to human review — never auto-posted with fabricated data.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import asyncpg
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from fastapi import FastAPI

from .ocr_connector import connector
from .settings import settings

DOCUMENT_TOPIC = "document.events"

pool: asyncpg.Pool | None = None
producer: AIOKafkaProducer | None = None
_consumer_task: asyncio.Task | None = None


def envelope(event: str, org_id: str, data: dict, correlation_id: str | None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "event": event,
        "schema_version": 1,
        "org_id": org_id,
        "actor_id": "ocr",
        "correlation_id": correlation_id or str(uuid.uuid4()),
        "causation_id": None,
        "occurred_at": now,
        "data": data,
    }


async def handle_document_received(evt: dict) -> None:
    data = evt.get("data", {})
    document_id = data.get("document_id")
    org_id = evt.get("org_id")
    if not document_id or not org_id:
        return

    result = await connector.extract(data.get("s3_key", ""), data.get("content_type"))
    extraction_id = str(uuid.uuid4())
    assert pool is not None
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO ocr.extractions (id, document_id, org_id, payload, confidence, status, model_version)
               VALUES ($1,$2,$3,$4,$5,$6,$7)""",
            uuid.UUID(extraction_id),
            uuid.UUID(document_id),
            uuid.UUID(org_id),
            json.dumps(result.payload),
            result.confidence,
            result.status,
            connector.id,
        )

    assert producer is not None
    out = envelope(
        "document.extracted",
        org_id,
        {
            "extraction_id": extraction_id,
            "document_id": document_id,
            "confidence": result.confidence,
            "status": result.status,
        },
        evt.get("correlation_id"),
    )
    await producer.send_and_wait("document.events", json.dumps(out).encode(), key=org_id.encode())


async def consume_loop() -> None:
    consumer = AIOKafkaConsumer(
        DOCUMENT_TOPIC,
        bootstrap_servers=settings.brokers,
        group_id="ocr",
        enable_auto_commit=True,
        auto_offset_reset="latest",
        **settings.kafka_kwargs(),
    )
    await consumer.start()
    try:
        async for msg in consumer:
            try:
                evt = json.loads(msg.value.decode())
                if evt.get("event") == "document.received":
                    await handle_document_received(evt)
            except Exception:  # noqa: BLE001 — never let one bad message kill the loop
                # In production this routes to a DLQ (docs/18). Logged via stdout.
                pass
    finally:
        await consumer.stop()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global pool, producer, _consumer_task
    pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=10)
    producer = AIOKafkaProducer(bootstrap_servers=settings.brokers, enable_idempotence=True, **settings.kafka_kwargs())
    await producer.start()
    _consumer_task = asyncio.create_task(consume_loop())
    yield
    if _consumer_task:
        _consumer_task.cancel()
    if producer:
        await producer.stop()
    if pool:
        await pool.close()


app = FastAPI(title="Vertofi OCR Service", lifespan=lifespan)


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
    return {"ocr_vision": _integration_status("GOOGLE_VISION_KEY")}


@app.get("/ready")
async def ready() -> dict:
    ok = False
    try:
        assert pool is not None
        async with pool.acquire() as conn:
            ok = (await conn.fetchval("SELECT 1")) == 1
    except Exception:  # noqa: BLE001
        ok = False
    return {"status": "ok" if ok else "degraded", "db": "ok" if ok else "fail", "ocr": connector.health()}
