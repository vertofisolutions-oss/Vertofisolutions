import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "bhs-intelligence",
  port: Number(process.env.BHS_INTEL_PORT ?? 4026),
  trustProxy: true,
});
