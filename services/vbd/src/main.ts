import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "vbd",
  port: Number(process.env.VBD_PORT ?? 4024),
  trustProxy: true,
});
