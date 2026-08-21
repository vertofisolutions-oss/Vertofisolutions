import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "@vertofi/nest-common";

const here = dirname(fileURLToPath(import.meta.url));
await runMigrations("legal", join(here, "..", "migrations"));
