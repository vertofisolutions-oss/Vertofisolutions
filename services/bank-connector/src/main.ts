import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "bank-connector",
  port: Number(process.env.BANK_CONNECTOR_PORT ?? 4015),
  trustProxy: true,
});
