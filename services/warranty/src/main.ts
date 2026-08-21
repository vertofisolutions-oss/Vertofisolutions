import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "warranty",
  port: Number(process.env.WARRANTY_PORT ?? 4028),
  trustProxy: true,
});
