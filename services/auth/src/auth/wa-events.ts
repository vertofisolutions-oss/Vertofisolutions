/**
 * Fire-and-forget activation event → WhatsApp CFO welcome. Auth has no outbox
 * (its writes are user rows, not financial facts), so a direct publish with a
 * non-fatal catch is the right weight: a Kafka blip must never fail signup,
 * and the welcome message is best-effort by nature (Meta template rules).
 */
import { EventProducer } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";

const log = createLogger("auth-wa-events");

let producer: EventProducer | null = null;
function getProducer(): EventProducer {
  if (!producer) {
    producer = new EventProducer({
      clientId: "auth",
      brokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
    });
  }
  return producer;
}

export async function publishCustomerOnboarded(input: { userId: string; orgId: string | null; mobile: string | null; email: string | null }): Promise<void> {
  try {
    await getProducer().publish({
      event: "whatsapp.customer.onboarded",
      org_id: input.orgId,
      actor_id: input.userId,
      data: { mobile: input.mobile, email: input.email },
    });
    log.warn({ orgId: input.orgId }, "customer onboarded event published");
  } catch (err) {
    log.error({ err: String(err) }, "onboarded event publish failed (signup unaffected)");
  }
}
