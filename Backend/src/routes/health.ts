import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => {
    return {
      ok: true,
      service: "book-manager-backend"
    };
  });
}
