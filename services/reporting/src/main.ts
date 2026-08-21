import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "reporting",
  port: Number(process.env.REPORTING_PORT ?? 4020),
  trustProxy: true,
});
