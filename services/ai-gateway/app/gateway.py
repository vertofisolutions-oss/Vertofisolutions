"""
OpenAI gateway core (docs/09, docs/services/ai-gateway-service.md).

The ONLY place OpenAI is called. Provides: model tiering, exact-prompt caching,
retry w/ backoff+jitter, a circuit breaker, per-org cost metering, and honest
degradation (NEEDS_CREDENTIALS / circuit-open → degraded=True so callers fall
back to deterministic logic — never fabricated AI output).
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import random
import time
from dataclasses import dataclass

import redis.asyncio as aioredis

from .settings import settings

try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - import guard
    AsyncOpenAI = None  # type: ignore


@dataclass
class AiResult:
    degraded: bool
    content: dict | None
    model: str | None
    cached: bool = False
    reason: str | None = None


class CircuitBreaker:
    def __init__(self, threshold: int, cooldown_s: int) -> None:
        self.threshold = threshold
        self.cooldown_s = cooldown_s
        self.failures = 0
        self.opened_at = 0.0
        self.state = "closed"

    @property
    def is_open(self) -> bool:
        if self.state == "open" and time.time() - self.opened_at > self.cooldown_s:
            self.state = "half"
        return self.state == "open"

    def record_success(self) -> None:
        self.failures = 0
        self.state = "closed"

    def record_failure(self) -> None:
        self.failures += 1
        if self.failures >= self.threshold:
            self.state = "open"
            self.opened_at = time.time()


class AiGateway:
    def __init__(self) -> None:
        self.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        self.breaker = CircuitBreaker(settings.circuit_threshold, settings.circuit_cooldown_s)
        self.client = (
            AsyncOpenAI(api_key=settings.openai_api_key)
            if settings.openai_api_key and AsyncOpenAI is not None
            else None
        )

    def status(self) -> str:
        if not settings.openai_api_key or self.client is None:
            return "NEEDS_CREDENTIALS"
        if self.breaker.is_open:
            return "DEGRADED"
        return "ACTIVE"

    def _model_for(self, task: str, plan: str | None) -> str:
        # Premium reasoning on the capable model, gated by plan; bulk on mini.
        if task in ("analyze", "vbd") and plan in ("PRO", "ENTERPRISE"):
            return settings.model_pro
        return settings.model_mini

    @staticmethod
    def _cache_key(task: str, model: str, prompt: str) -> str:
        digest = hashlib.sha256(f"{task}|{model}|{prompt}".encode()).hexdigest()
        return f"ai:cache:{digest}"

    async def _meter(self, org_id: str | None, usage_tokens: int) -> None:
        if not org_id:
            return
        period = time.strftime("%Y-%m")
        await self.redis.hincrby(f"ai:usage:{org_id}:{period}", "tokens", usage_tokens)

    async def complete(
        self,
        task: str,
        prompt: str,
        org_id: str | None = None,
        plan: str | None = None,
        json_schema: dict | None = None,
    ) -> AiResult:
        if self.status() == "NEEDS_CREDENTIALS":
            return AiResult(degraded=True, content=None, model=None, reason="openai_not_configured")
        if self.breaker.is_open:
            return AiResult(degraded=True, content=None, model=None, reason="circuit_open")

        model = self._model_for(task, plan)
        key = self._cache_key(task, model, prompt)

        cached = await self.redis.get(key)
        if cached:
            return AiResult(degraded=False, content=json.loads(cached), model=model, cached=True)

        last_err: Exception | None = None
        for attempt in range(settings.max_retries + 1):
            try:
                kwargs: dict = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                }
                if json_schema is not None:
                    kwargs["response_format"] = {"type": "json_object"}
                assert self.client is not None
                resp = await self.client.chat.completions.create(**kwargs)
                text = resp.choices[0].message.content or "{}"
                try:
                    content = json.loads(text) if json_schema is not None else {"text": text}
                except json.JSONDecodeError:
                    content = {"text": text}
                self.breaker.record_success()
                await self.redis.set(key, json.dumps(content), ex=settings.cache_ttl_s)
                usage = getattr(resp, "usage", None)
                await self._meter(org_id, getattr(usage, "total_tokens", 0) or 0)
                return AiResult(degraded=False, content=content, model=model)
            except Exception as e:  # noqa: BLE001
                last_err = e
                self.breaker.record_failure()
                backoff = min(5.0, 0.2 * (2 ** attempt))
                await asyncio.sleep(backoff + random.random() * backoff * 0.3)

        # All retries failed → degrade gracefully (docs/18). No fabricated content.
        return AiResult(degraded=True, content=None, model=model, reason=str(last_err) if last_err else "unavailable")

    async def vision_extract(self, image_b64: str, mime: str, instruction: str, org_id: str | None = None) -> AiResult:
        """ONE vision call to read a photo (e.g. a product/price list) into JSON.
        Uses the mini model with detail='low' (≈85 image tokens) and caches by
        image hash, so re-uploads cost nothing. Never fabricates — degrades."""
        if self.status() == "NEEDS_CREDENTIALS":
            return AiResult(degraded=True, content=None, model=None, reason="openai_not_configured")
        if self.breaker.is_open:
            return AiResult(degraded=True, content=None, model=None, reason="circuit_open")
        model = settings.model_mini
        key = self._cache_key("vision", model, hashlib.sha256(image_b64.encode()).hexdigest() + instruction)
        cached = await self.redis.get(key)
        if cached:
            return AiResult(degraded=False, content=json.loads(cached), model=model, cached=True)
        data_url = f"data:{mime};base64,{image_b64}"
        try:
            assert self.client is not None
            resp = await self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": instruction},
                    {"type": "image_url", "image_url": {"url": data_url, "detail": "low"}},
                ]}],
                temperature=0,
                response_format={"type": "json_object"},
            )
            text = resp.choices[0].message.content or "{}"
            try:
                content = json.loads(text)
            except json.JSONDecodeError:
                content = {}
            self.breaker.record_success()
            await self.redis.set(key, json.dumps(content), ex=settings.cache_ttl_s)
            usage = getattr(resp, "usage", None)
            await self._meter(org_id, getattr(usage, "total_tokens", 0) or 0)
            return AiResult(degraded=False, content=content, model=model)
        except Exception as e:  # noqa: BLE001
            self.breaker.record_failure()
            return AiResult(degraded=True, content=None, model=model, reason=str(e))

    async def transcribe(self, audio: bytes, filename: str = "audio.ogg") -> str | None:
        """Speech-to-text (WhatsApp voice notes). Returns None on any failure —
        callers tell the user honestly instead of guessing."""
        if self.status() != "ACTIVE":
            return None
        try:
            assert self.client is not None
            resp = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=(filename, audio),
            )
            self.breaker.record_success()
            return (resp.text or "").strip() or None
        except Exception:  # noqa: BLE001
            self.breaker.record_failure()
            return None

    async def embed(self, text: str) -> list[float] | None:
        if self.status() != "ACTIVE":
            return None
        try:
            assert self.client is not None
            resp = await self.client.embeddings.create(model=settings.model_embed, input=text)
            return resp.data[0].embedding
        except Exception:  # noqa: BLE001
            self.breaker.record_failure()
            return None


gateway = AiGateway()
