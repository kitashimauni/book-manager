import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { loadConfig } from "./config/env.js";
import { registerBookRoutes } from "./routes/books.js";
import { registerHealthRoutes } from "./routes/health.js";

const config = loadConfig();

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: config.corsOrigin
});

await app.register(registerHealthRoutes);
await app.register(registerBookRoutes);

try {
  await app.listen({
    host: "0.0.0.0",
    port: config.port
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
