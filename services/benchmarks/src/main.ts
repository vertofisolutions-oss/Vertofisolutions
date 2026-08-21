import "reflect-metadata";
import { bootstrap } from "@vertofi/nest-common";
import { AppModule } from "./app.module.js";

await bootstrap(AppModule, {
  service: "benchmarks",
  port: Number(process.env.BENCHMARKS_PORT ?? 4027),
  trustProxy: true,
});
