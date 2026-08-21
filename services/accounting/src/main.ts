import "reflect-metadata";
import { bootstrap, PgService, PgOutboxStore } from "@vertofi/nest-common";
import { EventProducer, OutboxRelay } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { AppModule } from "./app.module.js";

const log = createLogger("accounting");

const app = await bootstrap(AppModule, {
  service: "accounting",
  port: Number(process.env.ACCOUNTING_PORT ?? 4031),
  trustProxy: true,
});

const pg = app.get(PgService);
const producer = new EventProducer({ clientId: "accounting", brokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",") });
const relay = new OutboxRelay(new PgOutboxStore(pg, "accounting"), producer, { intervalMs: 500 });
relay.start();
log.info("accounting outbox relay started");

const shutdown = async () => {
  relay.stop();
  await producer.disconnect();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
