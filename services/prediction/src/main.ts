import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "prediction",
  port: Number(process.env.PREDICTION_PORT ?? 4021),
  trustProxy: true,
});
