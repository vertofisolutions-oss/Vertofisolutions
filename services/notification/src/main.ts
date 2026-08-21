import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";
import { startEventsConsumer } from "./events.consumer.js";

await bootstrap(AppModule, {
  service: "notification",
  port: Number(process.env.NOTIFICATION_PORT ?? 4009),
  trustProxy: true,
});

// Kafka → IN_APP/email fan-out. Non-fatal: the HTTP API stays up even if the
// broker is briefly unavailable (consumer retries internally).
startEventsConsumer().catch((err) => {
  console.error("notification events consumer failed to start:", err);
});
