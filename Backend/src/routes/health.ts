import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import type { DatabaseClient } from "../db/client.js";

export type HealthRouteOptions = {
  database: DatabaseClient;
};

export async function registerHealthRoutes(app: FastifyInstance, options: HealthRouteOptions) {
  app.get("/api/health", async () => {
    options.database.db.run(sql`select 1`);

    return {
      ok: true,
      service: "book-manager-backend",
      database: "ok"
    };
  });
}
