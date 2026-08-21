import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "gst-connector",
  port: Number(process.env.GST_CONNECTOR_PORT ?? 4016),
  trustProxy: true,
});
