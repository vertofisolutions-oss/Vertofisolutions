import "reflect-metadata";
import { bootstrap, PgService, PgOutboxStore } from "@vertofi/nest-common";
import { EventProducer, OutboxRelay } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { AppModule } from "./app.module.js";

const log = createLogger("accounting-ledger");

const app = await bootstrap(AppModule, {
  service: "accounting-ledger",
  port: Number(process.env.LEDGER_PORT ?? 4011),
  trustProxy: true,
});

const pg = app.get(PgService);
const producer = new EventProducer({
  clientId: "accounting-ledger",
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
});
const relay = new OutboxRelay(new PgOutboxStore(pg, "ledger"), producer, { intervalMs: 500 });
relay.start();
log.info("ledger outbox relay started");

// Workspace invoices → balanced journal entries (one book, not two).
// Failures are logged, never fatal — Kafka outage must not kill the API.
import("./events.consumer.js")
  .then((m) => m.startLedgerPostingConsumer())
  .catch((err) => log.error({ err: String(err) }, "ledger posting consumer failed to start"));

const shutdown = async () => {
  relay.stop();
  await producer.disconnect();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
