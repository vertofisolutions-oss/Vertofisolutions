"""
OCR provider connector (docs/09). Mirrors the TS connector framework: when no
provider credentials are present it reports NEEDS_CREDENTIALS and extraction is
routed to human review — it NEVER fabricates extracted values.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from .settings import settings


@dataclass
class Extraction:
    payload: dict
    confidence: float
    status: str  # EXTRACTED | NEEDS_REVIEW | FAILED


class OcrConnector:
    id = "ocr.google_vision"
    provider = "Google Vision / AWS Textract"

    def has_credentials(self) -> bool:
        return bool(settings.google_vision_key) or bool(settings.aws_access_key_id)

    def status(self) -> str:
        return "ACTIVE" if self.has_credentials() else "NEEDS_CREDENTIALS"

    def health(self) -> dict:
        return {"connector": self.id, "status": self.status(), "checked_at": datetime.now(timezone.utc).isoformat()}

    async def extract(self, s3_key: str, content_type: str | None) -> Extraction:
        """
        Run OCR on the stored document. With no active provider, return a
        NEEDS_REVIEW extraction (empty payload) so the document is queued for a
        human reviewer instead of being auto-posted with fake data (docs/00).
        """
        if self.status() != "ACTIVE":
            return Extraction(
                payload={"_note": "ocr_provider_not_configured", "s3_key": s3_key},
                confidence=0.0,
                status="NEEDS_REVIEW",
            )
        # Real provider calls (Google Vision / Textract) are wired here when
        # credentials are provisioned. Until then we never return synthetic data.
        return Extraction(payload={}, confidence=0.0, status="NEEDS_REVIEW")


connector = OcrConnector()
