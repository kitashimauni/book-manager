import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config/env.js";
import { validationError } from "../errors.js";
import { bookLookupRequestSchema } from "../schemas/books.js";
import { lookupBookByIsbn } from "../services/openLibrary.js";

export type BookRouteOptions = {
  config: AppConfig;
};

export async function registerBookRoutes(app: FastifyInstance, options: BookRouteOptions) {
  app.post("/api/books/lookup", async (request, reply) => {
    const parsed = bookLookupRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send(
        validationError(
          parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        )
      );
    }

    const result = await lookupBookByIsbn(parsed.data.bookBarcode, options.config);

    if (!result) {
      return reply.status(404).send({
        message: "Book metadata was not found. Please enter it manually."
      });
    }

    return result;
  });
}
