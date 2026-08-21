import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "billing",
  port: Number(process.env.BILLING_PORT ?? 4007),
  trustProxy: true,
  // Razorpay webhook HMAC is verified over the exact request bytes.
  rawBody: true,
});
