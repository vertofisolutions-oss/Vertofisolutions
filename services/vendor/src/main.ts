import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "vendor",
  port: Number(process.env.VENDOR_PORT ?? 4023),
  trustProxy: true,
});
