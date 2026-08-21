import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "tenant",
  port: Number(process.env.TENANT_PORT ?? 4002),
  trustProxy: true,
});
