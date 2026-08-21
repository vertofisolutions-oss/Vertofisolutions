import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "access",
  port: Number(process.env.ACCESS_PORT ?? 4003),
  trustProxy: true,
});
