import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "auth",
  port: Number(process.env.AUTH_PORT ?? 4001),
  trustProxy: true,
});
