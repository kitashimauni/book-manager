import type { FastifyInstance } from "fastify";
import { loadConfig } from "../config/env.js";
import { bookLookupRequestSchema } from "../schemas/books.js";
import { lookupBookByIsbn } from "../services/openLibrary.js";

export async function registerBookRoutes(app: FastifyInstance) {
  const config = loadConfig();

  app.post("/api/books/lookup", async (request, reply) => {
    const parsed = bookLookupRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const result = await lookupBookByIsbn(parsed.data.bookBarcode, config);

    if (!result) {
      return reply.status(404).send({
        message: "Book metadata was not found. Please enter it manually."
      });
    }

    return result;
  });
}
