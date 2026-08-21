import { type Producer, Partitioners } from "kafkajs";
import { createKafka } from "./kafka-factory.js";
import { buildEnvelope, topicForEvent, type NewEvent, type EventEnvelope } from "./envelope.js";

export interface ProducerConfig {
  clientId: string;
  brokers: string[];
}

/**
 * Thin, resilient Kafka producer. Messages are keyed by org_id so a tenant's
 * events stay ordered within a partition (see docs/18-scalability-and-reliability.md).
 */
export class EventProducer {
  private producer: Producer | undefined;
  private connected = false;

  constructor(config: ProducerConfig) {
    // createKafka is async (MSK IAM token fetch) — store promise, resolve in connect()
    this._kafkaPromise = createKafka(config.clientId, config.brokers);
  }

  private _kafkaPromise: Promise<import("kafkajs").Kafka>;

  private async getProducer(): Promise<Producer> {
    if (!this.producer) {
      const kafka = await this._kafkaPromise;
      this.producer = kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner,
        idempotent: true,
        maxInFlightRequests: 5,
      });
    }
    return this.producer;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    const p = await this.getProducer();
    await p.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    const p = await this.getProducer();
    await p.disconnect();
    this.connected = false;
  }

  /** Publish a single event. Topic is derived from the event name. */
  async publish<T>(input: NewEvent<T>): Promise<EventEnvelope<T>> {
    await this.connect();
    const p = await this.getProducer();
    const envelope = buildEnvelope(input);
    await p.send({
      topic: topicForEvent(envelope.event),
      messages: [
        {
          key: envelope.org_id ?? envelope.id,
          value: JSON.stringify(envelope),
          headers: { event: envelope.event, "correlation-id": envelope.correlation_id },
        },
      ],
    });
    return envelope;
  }

  /** Publish a batch of pre-built envelopes (used by the outbox relay). */
  async publishEnvelopes(envelopes: EventEnvelope[]): Promise<void> {
    if (envelopes.length === 0) return;
    await this.connect();
    const p = await this.getProducer();
    const byTopic = new Map<string, EventEnvelope[]>();
    for (const e of envelopes) {
      const t = topicForEvent(e.event);
      (byTopic.get(t) ?? byTopic.set(t, []).get(t)!).push(e);
    }
    await p.sendBatch({
      topicMessages: [...byTopic.entries()].map(([topic, evs]) => ({
        topic,
        messages: evs.map((e) => ({
          key: e.org_id ?? e.id,
          value: JSON.stringify(e),
          headers: { event: e.event, "correlation-id": e.correlation_id },
        })),
      })),
    });
  }
}
