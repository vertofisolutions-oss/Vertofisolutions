import "reflect-metadata";
import { bootstrap, PgService, PgOutboxStore } from "@vertofi/nest-common";
import { EventConsumer, EventProducer, OutboxRelay, Topics } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { AppModule } from "./app.module.js";
import { LifeguardService } from "./lifeguard.service.js";

const log = createLogger("lifeguard");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");

const app = await bootstrap(AppModule, {
  service: "lifeguard",
  port: Number(process.env.LIFEGUARD_PORT ?? 4022),
  trustProxy: true,
});

const svc = app.get(LifeguardService);
const pg = app.get(PgService);
const producer = new EventProducer({ clientId: "lifeguard", brokers });
const relay = new OutboxRelay(new PgOutboxStore(pg, "lifeguard"), producer, { intervalMs: 1000 });
relay.start();

// SOS arriving from WhatsApp (docs/10 HELP/SOS keyword → lifeguard case).
const consumer = new EventConsumer({
  clientId: "lifeguard",
  brokers,
  groupId: "lifeguard",
  topics: [Topics.lifeguard],
});
consumer.on<Record<string, unknown>>("lifeguard.case.created", async (env) => svc.ingestSos(env));
await consumer.start();
log.info("lifeguard consumer + relay started");

const shutdown = async () => {
  relay.stop();
  await consumer.stop();
  await producer.disconnect();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
