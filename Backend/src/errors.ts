import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

export type ApiFieldError = {
  field: string;
  message: string;
};

export function validationError(errors: ApiFieldError[]) {
  return {
    message: "Validation failed",
    errors
  };
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send(
        validationError(
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        )
      );
    }

    app.log.error(error);

    return reply.status(500).send({
      message: "Internal server error"
    });
  });
}
