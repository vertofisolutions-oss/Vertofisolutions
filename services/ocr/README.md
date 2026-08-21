# OCR Service (Python / FastAPI)

Spec: [`../../docs/services/ocr-service.md`](../../docs/services/ocr-service.md).

Consumes `document.received` → runs OCR via the provider connector → persists an
extraction → publishes `document.extracted`. With no OCR credentials the
connector reports `NEEDS_CREDENTIALS` and extractions are marked `NEEDS_REVIEW`
(empty payload) — **never fabricated** (docs/00).

## Run locally
```bash
cd services/ocr
python -m venv .venv && . .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# apply migration (psql or the platform migrate job):
psql "$DATABASE_URL" -f migrations/001_init.sql
uvicorn app.main:app --port 4008 --reload
```
