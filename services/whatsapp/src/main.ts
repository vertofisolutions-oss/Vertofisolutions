import "reflect-metadata";
import express from "express";
import helmet from "helmet";
import { EventProducer } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { WhatsappConnector } from "./whatsapp.connector.js";
import { route as routeMenu } from "./menu.js";
import { expectProducts, fetchDocPdf, fetchSalesPdf, handleAction, handleConfirm, handleLink, isExpectingProducts, isActionCommand, planFor, resolveUser, scanProductsFor, stashScannedProducts } from "./actions.js";
import { handleGuided } from "./guided.js";
import { handleReport } from "./reports.js";
import { buildOnboardingMessage, startBriefingScheduler } from "./onboarding.js";
import { startNotificationConsumer } from "./notification.consumer.js";

/**
 * WhatsApp CFO gateway (docs/10). Inbound webhooks are ALWAYS accepted and
 * queued (Kafka) so messages are never lost even if AI/Meta are down. Text
 * questions are answered via the ai-gateway; media is forwarded to the document
 * pipeline. Outbound replies require WhatsApp credentials (else no fake send).
 *
 * Architecture:
 *   Inbound:  Meta → POST /webhook/whatsapp → Kafka + handleText()
 *   Outbound: notification.consumer (Kafka) → sendTemplate() → Meta
 *   Scheduler: 9 AM IST → daily briefing Kafka events → notification.consumer
 */
const log = createLogger("whatsapp");
const PORT = Number(process.env.WHATSAPP_PORT ?? 4018);
const AI_URL = process.env.AI_GATEWAY_URL ?? "http://localhost:4010";
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");

const connector = new WhatsappConnector();
const producer = new EventProducer({ clientId: "whatsapp", brokers });

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
// H-5 fix applied: always 200, never cascade on credential absence
app.get("/ready", (_req, res) => res.json({ status: "ok", connector: connector.status() }));

// Integration configuration visibility (no secrets, no network calls).
app.get("/health/integrations", (_req, res) => {
  const ok = (...vars: string[]) => {
    const set = (n: string) => {
      const v = (process.env[n] ?? "").trim().toLowerCase();
      return !!v && !["needs_configuration", "change-me", "your-", "example", "placeholder"].some((p) => v.includes(p));
    };
    return vars.every(set) ? "configured" : "needs_configuration";
  };
  res.json({
    whatsapp: ok("WHATSAPP_API_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_VERIFY_TOKEN"),
    ai_gateway: ok("AI_GATEWAY_URL"),
    accounting: ok("ACCOUNTING_URL"),
    kafka: ok("KAFKA_BROKERS"),
    redis: ok("REDIS_URL"),
  });
});

// ── Meta webhook verification handshake ──────────────────────────────────────
app.get("/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === connector.verifyToken() && connector.verifyToken()) {
    return res.status(200).send(String(challenge));
  }
  return res.sendStatus(403);
});

interface WaMessage {
  from: string;
  type: string;
  text?: { body: string };
  image?: { id: string };
  document?: { id: string };
}

// ── AI natural-language answering ─────────────────────────────────────────────
async function answer(from: string, question: string): Promise<void> {
  try {
    const r = await fetch(`${AI_URL}/ai/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "analyze",
        prompt: `You are Vertofi, a financial CFO assistant for an Indian MSME. Answer concisely. Question: ${question}`,
      }),
    });
    const body = (await r.json()) as { degraded?: boolean; content?: { text?: string } };
    const reply = body.degraded || !body.content?.text
      ? "Got it — I'm processing your request and will follow up shortly."
      : body.content.text;
    await connector.sendText(from, reply);
  } catch (e) {
    log.error({ err: String(e) }, "answer failed");
  }
}

/**
 * Inbound text router:
 *   1. Pending YES/NO confirmation → handleConfirm
 *   2. Menu navigation (numbers, keywords) → routeMenu
 *   3. Accounting command ("invoice ABC ...") → handleAction (draft + confirm flow)
 *   4. Unregistered number → onboarding flow (GAP-4 fix)
 *   5. Everything else → AI assistant
 */
async function handleText(from: string, text: string): Promise<void> {
  try {
    // Step 1: resolve the sender — registered mobile, explicit link, or the
    // wizard's WhatsApp number all auto-link. Unknown numbers get the in-chat
    // "link <mobile>" code flow before the generic onboarding welcome.
    const user = await resolveUser(from);
    if (!user) {
      const linkReply = await handleLink(from, text);
      if (linkReply) return void (await connector.sendText(from, linkReply));
      return void (await connector.sendText(from, buildOnboardingMessage(from)));
    }

    // Step 2: confirmation gate (must run before anything else). When a sales
    // invoice was created, deliver its PDF straight into the chat.
    const confirm = await handleConfirm(from, text, user);
    if (confirm) {
      await connector.sendText(from, confirm.text);
      if (confirm.pdf) {
        const buf = await fetchSalesPdf(confirm.pdf.u, confirm.pdf.saleId);
        if (buf) await connector.sendDocument(from, buf, `${confirm.pdf.number.replace(/[^\w.-]/g, "_")}.pdf`, `Invoice ${confirm.pdf.number}`);
        else await connector.sendText(from, "PDF generation is taking a moment — you can also download it from the app → Invoices.");
      }
      if (confirm.docPdf) {
        const buf = await fetchDocPdf(confirm.docPdf.u, confirm.docPdf.docId);
        if (buf) await connector.sendDocument(from, buf, `${confirm.docPdf.number.replace(/[^\w.-]/g, "_")}.pdf`, confirm.docPdf.number);
        else await connector.sendText(from, "PDF generation is taking a moment — you can also download it from the app → Documents.");
      }
      return;
    }

    // Step 2.3: "add products" → expect a product-list photo next.
    if (/^(add|scan|upload)\s+products?$/i.test(text.trim())) {
      return void (await connector.sendText(from, await expectProducts(from)));
    }

    // Step 2.5: guided one-question-at-a-time invoice flow ("new invoice").
    const guided = await handleGuided(from, text, user);
    if (guided) return void (await connector.sendText(from, guided));

    // Step 3: live report phrases (pnl / cash / gst due / health / briefing)
    // answer with REAL org-scoped numbers — must run before the static menus.
    const report = await handleReport(text, user);
    if (report) return void (await connector.sendText(from, report));

    // Step 4: menu navigation using the user's plan
    const menuReply = routeMenu(text, user.plan);
    if (menuReply) return void (await connector.sendText(from, menuReply));

    // Step 5: accounting action command
    if (isActionCommand(text)) {
      const actionReply = await handleAction(from, text, user);
      return void (await connector.sendText(from, actionReply));
    }

    // Step 6: AI natural language
    await answer(from, text);
  } catch (e) {
    log.error({ err: String(e) }, "handleText failed");
  }
}

/** Product-list photo → vision scan → review list + YES to add. */
async function handleProductPhoto(from: string, mediaId: string): Promise<void> {
  try {
    const user = await resolveUser(from);
    if (!user) return;
    const media = await connector.downloadMedia(mediaId);
    if (!media) return void (await connector.sendText(from, "I couldn't fetch that photo — please send it again."));
    const rows = await scanProductsFor(user, media.buffer.toString("base64"), media.mime || "image/jpeg");
    if (rows.length === 0) {
      return void (await connector.sendText(from, "I couldn't read products from that photo — try a clearer, well-lit shot, or add them in the app."));
    }
    await stashScannedProducts(from, rows);
    const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;
    const lines = rows.slice(0, 30).map((p, i) => `${i + 1}. ${p.name} — ${inr(p.rate)}${p.taxRate ? ` (${p.taxRate}% GST)` : ""}`);
    await connector.sendText(from, [
      `📦 I found *${rows.length} products*:`,
      ...lines,
      rows.length > 30 ? `…and ${rows.length - 30} more` : "",
      "",
      "Reply *YES* to add them all to your product list, or *NO* to discard.",
    ].filter(Boolean).join("\n"));
  } catch (e) {
    log.error({ err: String(e) }, "handleProductPhoto failed");
  }
}

/** Voice note → STT → the normal text router. Honest failure messages. */
async function handleVoice(from: string, mediaId?: string): Promise<void> {
  try {
    if (!mediaId) return;
    const media = await connector.downloadMedia(mediaId);
    if (!media) {
      return void (await connector.sendText(from, "I couldn't fetch that voice note — please try once more or type your request."));
    }
    const ext = media.mime.includes("mpeg") ? "mp3" : media.mime.includes("mp4") ? "mp4" : "ogg";
    const r = await fetch(`${AI_URL}/ai/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_b64: media.buffer.toString("base64"), filename: `note.${ext}` }),
    });
    const body = (await r.json()) as { degraded?: boolean; text?: string | null };
    if (body.degraded || !body.text) {
      return void (await connector.sendText(from, "I couldn't make out that voice note — please try again or type your request."));
    }
    await connector.sendText(from, `🎤 I heard: _"${body.text}"_`);
    await handleText(from, body.text);
  } catch (e) {
    log.error({ err: String(e) }, "handleVoice failed");
  }
}

// ── Inbound webhook (messages + media) ───────────────────────────────────────
app.post("/webhook/whatsapp", async (req, res) => {
  // Acknowledge immediately so Meta doesn't retry (must respond within 15 s).
  res.sendStatus(200);
  try {
    const entries = req.body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const messages: WaMessage[] = change.value?.messages ?? [];
        for (const m of messages) {
          // Publish to Kafka for audit/analytics regardless of type.
          await producer.publish({
            event: "whatsapp.message.received",
            org_id: null, // resolved from wa_user → org mapping in actions.ts
            actor_id: m.from,
            data: { from: m.from, type: m.type, text: m.text?.body },
          });

          if (m.type === "text" && m.text?.body) {
            await handleText(m.from, m.text.body);
          } else if (m.type === "image" || m.type === "document") {
            const mediaId = m.image?.id ?? m.document?.id;
            // If the user just said "add products", treat this photo as a
            // product/price list to scan; otherwise the normal bill pipeline.
            if (m.type === "image" && mediaId && (await isExpectingProducts(m.from))) {
              await handleProductPhoto(m.from, mediaId);
            } else {
              await producer.publish({
                event: "whatsapp.media.received",
                org_id: null,
                actor_id: m.from,
                data: { from: m.from, media_id: mediaId, kind: m.type },
              });
              await connector.sendText(
                m.from,
                "📄 Got it! I'm reading your document now. I'll send you the extracted details to confirm in a moment.",
              );
            }
          } else if (m.type === "audio") {
            // Voice note → download from Meta → Whisper via ai-gateway → the
            // exact same text router as a typed message.
            await handleVoice(m.from, (m as { audio?: { id: string } }).audio?.id);
          }
        }
      }
    }
  } catch (e) {
    log.error({ err: String(e) }, "webhook processing failed");
  }
});

// ── Start everything ──────────────────────────────────────────────────────────
function start(): void {
  // Listen FIRST so /health, /ready and the Meta webhook are available
  // immediately. Joining the Kafka consumer group can take 15-20 s; if the
  // server only starts listening after that, the liveness/readiness probes fail
  // and Kubernetes kills the pod (Exit 137) before it ever serves a request —
  // and inbound WhatsApp webhooks get dropped during that window.
  app.listen(PORT, () =>
    log.warn({ port: PORT, connector: connector.status() }, "whatsapp gateway listening"),
  );

  // Background: notification consumer (GAP-3: Kafka → WhatsApp template messages).
  // A Kafka outage must never take down the inbound webhook, so failures here are
  // logged, not fatal.
  startNotificationConsumer().catch((err) =>
    log.error({ err: String(err) }, "notification consumer failed to start"),
  );

  // Background: daily briefing scheduler at 9 AM IST (GAP-3 / daily_briefing topic).
  startBriefingScheduler(producer);
}

start();
