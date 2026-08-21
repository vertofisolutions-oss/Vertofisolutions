import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "onboarding",
  port: Number(process.env.ONBOARDING_PORT ?? 4005),
  trustProxy: true,
});
