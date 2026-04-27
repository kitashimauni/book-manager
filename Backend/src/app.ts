import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AppConfig } from "./config/env.js";
import type { DatabaseClient } from "./db/client.js";
import { registerErrorHandler } from "./errors.js";
import { registerBookRoutes } from "./routes/books.js";
import { registerClassificationTagRoutes } from "./routes/classificationTags.js";
import { registerDataTransferRoutes } from "./routes/dataTransfer.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerLocationRoutes } from "./routes/locations.js";

export type CreateAppOptions = {
  config: AppConfig;
  database: DatabaseClient;
  logger?: boolean;
};

export async function createApp({ config, database, logger = true }: CreateAppOptions) {
  const app = Fastify({
    logger
  });

  registerErrorHandler(app);

  await app.register(cors, {
    origin: config.corsOrigin
  });

  await app.register(registerHealthRoutes, { database });
  await app.register(registerLocationRoutes, { database });
  await app.register(registerClassificationTagRoutes, { database });
  await app.register(registerBookRoutes, { config, database });
  await app.register(registerDataTransferRoutes, { database });

  return app;
}
