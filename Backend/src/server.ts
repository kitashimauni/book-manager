import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createDatabaseClient } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

const config = loadConfig();
const database = createDatabaseClient(config);

runMigrations(database);

const app = await createApp({ config, database });

try {
  await app.listen({
    host: "0.0.0.0",
    port: config.port
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
