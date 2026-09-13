import { v7 as uuidv7 } from "uuid";

/**
 * Canonical event envelope — every Kafka message uses this shape.
 * See docs/19-api-standards.md. Consumers must tolerate unknown fields
 * (forward-compatible) and check `schema_version`.
 */
export interface EventEnvelope<T = unknown> {
  /** Fully-qualified event name, e.g. "document.extracted". */
  event: string;
  /** Bumped on breaking payload changes. */
  schema_version: number;
  /** Tenant the event belongs to (null only for platform-wide events). */
  org_id: string | null;
  /** Who/what caused this event (user id or service name). */
  actor_id: string | null;
  /** Correlates all events in one logical flow (propagated end-to-end). */
  correlation_id: string;
  /** The event id that directly caused this one (causation chain). */
  causation_id: string | null;
  /** Unique id of this event. */
  id: string;
  occurred_at: string;
  data: T;
}

export interface NewEvent<T> {
  event: string;
  data: T;
  org_id?: string | null;
  actor_id?: string | null;
  correlation_id?: string;
  causation_id?: string | null;
  schema_version?: number;
}

export function buildEnvelope<T>(input: NewEvent<T>): EventEnvelope<T> {
  return {
    id: uuidv7(),
    event: input.event,
    schema_version: input.schema_version ?? 1,
    org_id: input.org_id ?? null,
    actor_id: input.actor_id ?? null,
    correlation_id: input.correlation_id ?? uuidv7(),
    causation_id: input.causation_id ?? null,
    occurred_at: new Date().toISOString(),
    data: input.data,
  };
}

/** Canonical topics (see docs/19-api-standards.md). */
export const Topics = {
  user: "user.events",
  org: "org.events",
  grant: "grant.events",
  document: "document.events",
  accounting: "accounting.events",
  transaction: "transaction.events",
  bank: "bank.events",
  gst: "gst.events",
  payroll: "payroll.events",
  vendor: "vendor.events",
  reconciliation: "reconciliation.events",
  exception: "exception.events",
  ledger: "ledger.events",
  external: "external.events",
  bhs: "bhs.events",
  prediction: "prediction.events",
  vbd: "vbd.events",
  whatsapp: "whatsapp.events",
  notification: "notification.events",
  lifeguard: "lifeguard.events",
  subscription: "subscription.events",
  audit: "audit.events",
  security: "security.events",
} as const;

export type TopicName = (typeof Topics)[keyof typeof Topics];

/** Maps an event name (e.g. "document.extracted") to its topic. */
export function topicForEvent(event: string): TopicName {
  const domain = event.split(".")[0] as keyof typeof Topics;
  const topic = Topics[domain];
  if (!topic) throw new Error(`No topic mapping for event domain "${domain}"`);
  return topic;
}
