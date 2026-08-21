import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { EventConsumer, EventProducer, Topics } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { AppModule } from "./app.module.js";
import { SyncService } from "./sync.service.js";

const log = createLogger("accounting-sync");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");

const app = await bootstrap(AppModule, {
  service: "accounting-sync",
  port: Number(process.env.ACCOUNTING_SYNC_PORT ?? 4017),
  trustProxy: true,
});

const svc = app.get(SyncService);
const producer = new EventProducer({ clientId: "accounting-sync", brokers });

const consumer = new EventConsumer({
  clientId: "accounting-sync",
  brokers,
  groupId: "accounting-sync",
  topics: [Topics.ledger],
});
consumer.on<Record<string, unknown>>("ledger.posted", async (env) => {
  const outcome = await svc.syncEntry(env);
  if (!outcome) return;
  await producer.publish({
    event: outcome.anySynced ? "external.synced" : "external.sync_pending",
    org_id: outcome.orgId,
    actor_id: "accounting-sync",
    correlation_id: env.correlation_id,
    data: { entry_id: outcome.entryId, results: outcome.results },
  });
});
await consumer.start();
log.info("accounting-sync consumer started");

const shutdown = async () => {
  await consumer.stop();
  await producer.disconnect();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
