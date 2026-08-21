import "reflect-metadata";
import { bootstrap, PgService, PgOutboxStore } from "@vertofi/nest-common";
import { EventConsumer, EventProducer, OutboxRelay, Topics } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { AppModule } from "./app.module.js";
import { BhsService } from "./bhs.service.js";

const log = createLogger("bhs-engine");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");

const app = await bootstrap(AppModule, {
  service: "bhs-engine",
  port: Number(process.env.BHS_PORT ?? 4019),
  trustProxy: true,
});

const svc = app.get(BhsService);
const pg = app.get(PgService);
const producer = new EventProducer({ clientId: "bhs-engine", brokers });
const relay = new OutboxRelay(new PgOutboxStore(pg, "bhs"), producer, { intervalMs: 1000 });
relay.start();

// Recompute the score whenever the financial picture changes (docs/11 #1).
const consumer = new EventConsumer({
  clientId: "bhs-engine",
  brokers,
  groupId: "bhs-engine",
  topics: [Topics.ledger, Topics.reconciliation, Topics.gst],
});
const recompute = async (env: { org_id: string | null; correlation_id: string }) => {
  if (!env.org_id) return;
  const result = await svc.recompute(env.org_id);
  await producer.publish({
    event: "bhs.computed",
    org_id: env.org_id,
    actor_id: "bhs-engine",
    correlation_id: env.correlation_id,
    data: { score: result.score, rating: result.rating },
  });
};
consumer.on<Record<string, unknown>>("ledger.posted", recompute);
consumer.on<Record<string, unknown>>("reconciliation.completed", recompute);
consumer.on<Record<string, unknown>>("gst.return.fetched", recompute);
await consumer.start();
log.info("bhs-engine consumer + relay started");

const shutdown = async () => {
  relay.stop();
  await consumer.stop();
  await producer.disconnect();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
