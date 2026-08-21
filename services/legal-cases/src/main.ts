import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { EventConsumer, Topics } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { AppModule } from "./app.module.js";
import { LegalService } from "./legal.service.js";

const log = createLogger("legal-cases");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");

const app = await bootstrap(AppModule, {
  service: "legal-cases",
  port: Number(process.env.LEGAL_PORT ?? 4025),
  trustProxy: true,
});

const svc = app.get(LegalService);
const consumer = new EventConsumer({
  clientId: "legal-cases",
  brokers,
  groupId: "legal-cases",
  topics: [Topics.lifeguard],
});
consumer.on<Record<string, unknown>>("lifeguard.case.escalated", async (env) => svc.ingestEscalation(env));
await consumer.start();
log.info("legal-cases consumer started");

const shutdown = async () => {
  await consumer.stop();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
