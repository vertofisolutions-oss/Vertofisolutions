import "reflect-metadata";
import { bootstrap, PgService, PgOutboxStore } from "@vertofi/nest-common";
import { EventProducer, OutboxRelay } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { AppModule } from "./app.module.js";

const log = createLogger("document");

const app = await bootstrap(AppModule, {
  service: "document",
  port: Number(process.env.DOCUMENT_PORT ?? 4006),
  trustProxy: true,
});

// Outbox relay: drains document.* events to Kafka (docs/18 transactional outbox).
const pg = app.get(PgService);
const producer = new EventProducer({
  clientId: "document",
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
});
const relay = new OutboxRelay(new PgOutboxStore(pg, "document"), producer, { intervalMs: 500 });
relay.start();
log.info("document outbox relay started");

const shutdown = async () => {
  relay.stop();
  await producer.disconnect();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
