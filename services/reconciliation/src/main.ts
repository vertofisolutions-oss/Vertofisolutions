import "reflect-metadata";
import { bootstrap, PgService, PgOutboxStore } from "@vertofi/nest-common";
import { EventConsumer, EventProducer, OutboxRelay, Topics } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { AppModule } from "./app.module.js";
import { ReconciliationService } from "./reconciliation.service.js";

const log = createLogger("reconciliation");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");

const app = await bootstrap(AppModule, {
  service: "reconciliation",
  port: Number(process.env.RECONCILIATION_PORT ?? 4013),
  trustProxy: true,
});

const svc = app.get(ReconciliationService);
const pg = app.get(PgService);

// Outbox relay → reconciliation.completed events
const producer = new EventProducer({ clientId: "reconciliation", brokers });
const relay = new OutboxRelay(new PgOutboxStore(pg, "reconciliation"), producer, { intervalMs: 500 });
relay.start();

// Consume the pipeline: categorized items + bank transactions
const consumer = new EventConsumer({
  clientId: "reconciliation",
  brokers,
  groupId: "reconciliation",
  topics: [Topics.transaction, Topics.bank],
});
consumer.on<Record<string, unknown>>("transaction.categorized", async (env) => svc.ingestPendingItem(env));
consumer.on<Record<string, unknown>>("bank.transaction", async (env) => svc.ingestBankTxn(env));
await consumer.start();
log.info("reconciliation consumer + relay started");

const shutdown = async () => {
  relay.stop();
  await consumer.stop();
  await producer.disconnect();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
