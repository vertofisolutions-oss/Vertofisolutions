# Service: whatsapp

**Responsibility:** The 24/7 WhatsApp CFO — webhook ingestion, conversation engine, action engine, long-term memory, plan-aware AI, approvals. Full UX in [../10-whatsapp-cfo.md](../10-whatsapp-cfo.md).

**Tech:** NestJS gateway + FastAPI conversation/NLU (via ai-gateway). Meta WhatsApp Business API (via Interakt/Gupshup/AiSensy connector). STT for voice. Postgres + Redis (conversation state/memory).

**Data owned:** `whatsapp_conversations`, `whatsapp_messages`.

**API:** `POST /webhook/whatsapp` (signature-verified, idempotent). Internal `POST /whatsapp/send`.

**Flow:** webhook → verify + dedupe → map `wa_user` → org (tenancy) → normalize (text/voice/image/PDF) → emit `whatsapp.message.received`. Conversation engine: intent detection + dialog state + memory → either answer (read) or propose action. Action engine: create invoice / record expense / file GST / etc. → **approval + OTP** for sensitive actions → execute via the relevant service → reply.

**Inputs:** text (Q&A over financial data), voice (STT → intent → ledger draft), image (OCR → expense), PDF (parse → analyze, e.g. GST notice → offer Lifeguard).

**Memory:** business memory (type, GSTIN, vendors, customers, filings, accounts) + conversation memory (past questions, decisions, uploads, pending tasks). So follow-ups need no re-upload/re-explain.

**Plan-aware:** checks subscription before premium analyses (e.g., VendorTrust → "Available in Pro").

**Events:** produces `whatsapp.media.received` (→ document), `whatsapp.message.received`, `lifeguard.case.created` (SOS). Consumes `notification.whatsapp` (daily push, alerts), `bhs.computed`, `prediction.created`.

**Scaling:** stateless; webhook accepts + queues instantly (Kafka) → processed async. Autoscale on lag.

**Failure modes & degradation:** Meta/OpenAI/STT outage → message still **accepted + queued**, acknowledged to user, processed on recovery. Provider failover for STT/OCR. Never a hard error to the user.

**Security:** signature-verified webhooks, tenant mapping enforced, sensitive actions require OTP (legal proof in audit log), media access-controlled via document service.
