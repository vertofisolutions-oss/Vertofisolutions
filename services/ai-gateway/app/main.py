"""
ai-gateway HTTP API (internal). No other service calls OpenAI directly.
Endpoints return {degraded: true} when the provider is unavailable so callers
fall back to deterministic logic — they never receive fabricated AI output.
"""
from __future__ import annotations

from dataclasses import asdict

from fastapi import FastAPI
from pydantic import BaseModel

from .gateway import gateway

app = FastAPI(title="Vertofi AI Gateway")


class CompleteReq(BaseModel):
    task: str = "complete"
    prompt: str
    org_id: str | None = None
    plan: str | None = None
    json: bool = False


class CategorizeReq(BaseModel):
    org_id: str | None = None
    plan: str | None = None
    vendor: str
    description: str
    amount: float
    categories: list[str]


class EmbedReq(BaseModel):
    text: str


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/ai/health")
async def ai_health() -> dict:
    return {"connector": "ai.openai", "status": gateway.status()}


def _integration_status(*names: str) -> str:
    import os

    placeholders = ("needs_configuration", "change-me", "your-", "example", "placeholder", "sk-proj-your-openai-key-here")
    for n in names:
        v = (os.environ.get(n) or "").strip().lower()
        if not v or any(p in v for p in placeholders):
            return "needs_configuration"
    return "configured"


@app.get("/health/integrations")
async def health_integrations() -> dict:
    # Config visibility only — no secrets, no network calls.
    return {
        "openai": _integration_status("OPENAI_API_KEY"),
        "gemini": _integration_status("GEMINI_API_KEY"),
    }


@app.get("/ready")
async def ready() -> dict:
    return {"status": "ok", "ai": gateway.status()}


@app.post("/ai/complete")
async def complete(req: CompleteReq) -> dict:
    res = await gateway.complete(
        req.task, req.prompt, org_id=req.org_id, plan=req.plan, json_schema={} if req.json else None
    )
    return asdict(res)


@app.post("/ai/categorize")
async def categorize(req: CategorizeReq) -> dict:
    prompt = (
        "You are an accounting categorization engine. Map the transaction to exactly one "
        f"ledger category from this list: {req.categories}. "
        f'Transaction: vendor="{req.vendor}", description="{req.description}", amount={req.amount}. '
        'Respond as JSON: {"category": <one of the list>, "confidence": <0..1>}.'
    )
    res = await gateway.complete("categorize", prompt, org_id=req.org_id, plan=req.plan, json_schema={})
    return asdict(res)


@app.post("/ai/analyze")
async def analyze(req: CompleteReq) -> dict:
    res = await gateway.complete("analyze", req.prompt, org_id=req.org_id, plan=req.plan, json_schema={} if req.json else None)
    return asdict(res)


@app.post("/ai/embed")
async def embed(req: EmbedReq) -> dict:
    vec = await gateway.embed(req.text)
    return {"degraded": vec is None, "embedding": vec}


class VisionExtractReq(BaseModel):
    image_b64: str
    mime: str = "image/jpeg"
    instruction: str
    org_id: str | None = None


@app.post("/ai/vision-extract")
async def vision_extract(req: VisionExtractReq) -> dict:
    from dataclasses import asdict as _asdict

    res = await gateway.vision_extract(req.image_b64, req.mime, req.instruction, org_id=req.org_id)
    return _asdict(res)


class TranscribeReq(BaseModel):
    audio_b64: str
    filename: str = "audio.ogg"


@app.post("/ai/transcribe")
async def transcribe(req: TranscribeReq) -> dict:
    import base64

    try:
        audio = base64.b64decode(req.audio_b64)
    except Exception:
        return {"degraded": True, "text": None, "reason": "bad_base64"}
    text = await gateway.transcribe(audio, req.filename)
    return {"degraded": text is None, "text": text}
