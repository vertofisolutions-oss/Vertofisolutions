import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { EventConsumer, Topics } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { AppModule } from "./app.module.js";
import { ExceptionService } from "./exception.service.js";

const log = createLogger("exception-workflow");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");

const app = await bootstrap(AppModule, {
  service: "exception-workflow",
  port: Number(process.env.EXCEPTION_PORT ?? 4014),
  trustProxy: true,
});

const svc = app.get(ExceptionService);

const consumer = new EventConsumer({
  clientId: "exception-workflow",
  brokers,
  groupId: "exception-workflow",
  topics: [Topics.exception],
});
consumer.on<Record<string, unknown>>("transaction.needs_review", async (env) => svc.ingest(env, "NEEDS_REVIEW", "MEDIUM"));
consumer.on<Record<string, unknown>>("reconciliation.exception", async (env) => svc.ingest(env, "RECON_UNMATCHED", "MEDIUM"));
await consumer.start();
log.info("exception-workflow consumer started");

const shutdown = async () => {
  await consumer.stop();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
