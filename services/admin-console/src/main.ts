import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "admin-console",
  port: Number(process.env.ADMIN_CONSOLE_PORT ?? 4030),
  trustProxy: true,
});
