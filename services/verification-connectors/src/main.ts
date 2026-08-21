import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "verification-connectors",
  port: Number(process.env.VERIFICATION_PORT ?? 4029),
  trustProxy: true,
});
