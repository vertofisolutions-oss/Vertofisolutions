"""
Token-light fill-in-the-blanks field extractor (docs/27 ERP field model).

Strategy — deterministic FIRST, AI LAST:
  1. Regex + checksum validators pull every Indian identifier and structured
     value straight from raw text (GSTIN with the real GSTN mod-36 check
     digit, PAN, IFSC, CIN, Udyam, TAN, IEC, mobile, email, pincode, dates,
     amounts, invoice numbers, HSN). Zero tokens.
  2. ONLY the still-missing keys go to the AI gateway in ONE compact call:
     a trimmed text excerpt + the missing-key list, instructed to return
     bare JSON with nothing else. Typical cost: a few hundred tokens, and
     zero when the regexes already filled everything.

Used by the OCR pipeline to turn bill/invoice text into master-data fields,
and runnable standalone:  python -m app.field_fill < raw.txt
"""
from __future__ import annotations

import json
import os
import re
import sys
from typing import Any

import httpx

AI_URL = os.environ.get("AI_GATEWAY_URL", "http://localhost:4010")

# ── Validators (checksums where the registry defines one) ────────────────────
_GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def valid_gstin(g: str) -> bool:
    g = g.upper()
    if not re.fullmatch(r"\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]", g):
        return False
    total = 0
    for i, ch in enumerate(g[:14]):
        v = _GSTIN_CHARS.index(ch)
        p = v * (1 if i % 2 == 0 else 2)
        total += p // 36 + p % 36
    return _GSTIN_CHARS[(36 - total % 36) % 36] == g[14]


# field → (regex, optional post-validator). Ordered: identifiers before
# generic numbers so greedy patterns can't steal them.
PATTERNS: list[tuple[str, re.Pattern[str], Any]] = [
    ("gstin", re.compile(r"\b(\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b"), valid_gstin),
    ("pan", re.compile(r"\b([A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z])\b"), None),
    ("tan", re.compile(r"\b([A-Z]{4}\d{5}[A-Z])\b"), None),
    ("cin", re.compile(r"\b([UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})\b"), None),
    ("udyam", re.compile(r"\b(UDYAM-[A-Z]{2}-\d{2}-\d{7})\b", re.I), None),
    ("iec_code", re.compile(r"\bIEC\s*(?:No\.?|Code)?\s*[:\-]?\s*(\d{10})\b", re.I), None),
    ("ifsc", re.compile(r"\b([A-Z]{4}0[A-Z0-9]{6})\b"), None),
    ("bank_account", re.compile(r"\b(?:A/?C|Account)\s*(?:No\.?|Number)?\s*[:\-]?\s*(\d{9,18})\b", re.I), None),
    ("email", re.compile(r"\b([\w.+-]+@[\w-]+\.[\w.]+)\b"), None),
    ("mobile", re.compile(r"\b(?:\+?91[\s-]?)?([6-9]\d{9})\b"), None),
    ("pincode", re.compile(r"\b([1-9]\d{5})\b"), None),
    ("invoice_no", re.compile(r"\b(?:Invoice|Bill|Inv)\s*(?:No\.?|Number|#)\s*[:\-]?\s*([A-Z0-9][\w/\-]{2,24})\b", re.I), None),
    ("invoice_date", re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b"), None),
    ("hsn", re.compile(r"\bHSN\s*(?:Code)?\s*[:\-]?\s*(\d{4,8})\b", re.I), None),
    ("ewb_no", re.compile(r"\b(?:E-?Way\s*Bill)\s*(?:No\.?)?\s*[:\-]?\s*(\d{12})\b", re.I), None),
    ("irn", re.compile(r"\bIRN\s*[:\-]?\s*([0-9a-f]{64})\b", re.I), None),
    ("total_amount", re.compile(r"\b(?:Grand\s+Total|Total\s+Amount|Total)\s*[:\-]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)\b", re.I), None),
    ("taxable_amount", re.compile(r"\bTaxable\s*(?:Value|Amount)\s*[:\-]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)\b", re.I), None),
]


def deterministic_fill(text: str, wanted: list[str]) -> dict[str, str]:
    """Regex pass: returns every wanted field found (validated). Zero tokens."""
    out: dict[str, str] = {}
    for field, pattern, check in PATTERNS:
        if field not in wanted or field in out:
            continue
        for m in pattern.finditer(text):
            value = m.group(1).strip()
            if check and not check(value):
                continue
            out[field] = value
            break
    return out


async def ai_fill(text: str, missing: list[str], timeout: float = 20.0) -> dict[str, str]:
    """ONE compact AI call for whatever regexes couldn't find. Trims the text
    to 1500 chars and asks for bare JSON of ONLY the missing keys — the
    cheapest possible shape. Returns {} on any failure (never fabricates)."""
    if not missing:
        return {}
    excerpt = text[:1500]
    prompt = (
        "Extract from this Indian business document text. Return ONLY a JSON "
        f"object with these keys (omit any you cannot find): {', '.join(missing)}.\n"
        f"Text:\n{excerpt}"
    )
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(f"{AI_URL}/ai/complete", json={"task": "extract", "prompt": prompt})
            body = r.json()
            raw = (body.get("content") or {}).get("text") or ""
            m = re.search(r"\{.*\}", raw, re.S)
            if not m:
                return {}
            parsed = json.loads(m.group(0))
            return {k: str(v) for k, v in parsed.items() if k in missing and v}
    except Exception:
        return {}


async def fill_fields(text: str, wanted: list[str]) -> dict[str, Any]:
    """Deterministic-first hybrid. Returns {fields, sources} where sources
    marks each value REGEX (verified pattern) or AI (needs review)."""
    found = deterministic_fill(text, wanted)
    missing = [w for w in wanted if w not in found]
    ai = await ai_fill(text, missing)
    return {
        "fields": {**ai, **found},  # regex wins on any overlap
        "sources": {**{k: "AI" for k in ai}, **{k: "REGEX" for k in found}},
        "missing": [w for w in wanted if w not in found and w not in ai],
    }


DEFAULT_WANTED = [f for f, _, _ in PATTERNS]

if __name__ == "__main__":
    import asyncio

    raw = sys.stdin.read()
    print(json.dumps(asyncio.run(fill_fields(raw, DEFAULT_WANTED)), indent=1))
