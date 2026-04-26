import { and, asc, eq, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type { DatabaseClient } from "../db/client.js";
import { classificationTags } from "../db/schema.js";
import { validationError } from "../errors.js";
import {
  classificationTagIdParamsSchema,
  createClassificationTagRequestSchema,
  updateClassificationTagRequestSchema
} from "../schemas/classificationTags.js";

export type ClassificationTagRouteOptions = {
  database: DatabaseClient;
};

export async function registerClassificationTagRoutes(
  app: FastifyInstance,
  options: ClassificationTagRouteOptions
) {
  const { db } = options.database;

  app.get("/api/classification-tags", async () => {
    const items = db.select().from(classificationTags).orderBy(asc(classificationTags.name)).all();

    return { items };
  });

  app.post("/api/classification-tags", async (request, reply) => {
    const parsed = createClassificationTagRequestSchema.safeParse(request.body);

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

    const existing = db
      .select({ id: classificationTags.id })
      .from(classificationTags)
      .where(eq(classificationTags.name, parsed.data.name))
      .get();

    if (existing) {
      return reply.status(409).send({
        message: "Classification tag name already exists."
      });
    }

    const now = new Date().toISOString();
    const created = db
      .insert(classificationTags)
      .values({
        id: randomUUID(),
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        source: parsed.data.source ?? "manual",
        isActive: true,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();

    return reply.status(201).send(created);
  });

  app.put("/api/classification-tags/:id", async (request, reply) => {
    const params = classificationTagIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send(
        validationError(
          params.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        )
      );
    }

    const parsed = updateClassificationTagRequestSchema.safeParse(request.body);

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

    const current = db
      .select()
      .from(classificationTags)
      .where(eq(classificationTags.id, params.data.id))
      .get();

    if (!current) {
      return reply.status(404).send({
        message: "Classification tag was not found."
      });
    }

    if (parsed.data.name) {
      const duplicate = db
        .select({ id: classificationTags.id })
        .from(classificationTags)
        .where(
          and(eq(classificationTags.name, parsed.data.name), ne(classificationTags.id, params.data.id))
        )
        .get();

      if (duplicate) {
        return reply.status(409).send({
          message: "Classification tag name already exists."
        });
      }
    }

    const updated = db
      .update(classificationTags)
      .set({
        name: parsed.data.name ?? current.name,
        description:
          parsed.data.description === undefined ? current.description : parsed.data.description,
        source: parsed.data.source ?? current.source,
        isActive: parsed.data.isActive ?? current.isActive,
        updatedAt: new Date().toISOString()
      })
      .where(eq(classificationTags.id, params.data.id))
      .returning()
      .get();

    return updated;
  });

  app.delete("/api/classification-tags/:id", async (request, reply) => {
    const params = classificationTagIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send(
        validationError(
          params.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        )
      );
    }

    const updated = db
      .update(classificationTags)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString()
      })
      .where(eq(classificationTags.id, params.data.id))
      .returning({ id: classificationTags.id })
      .get();

    if (!updated) {
      return reply.status(404).send({
        message: "Classification tag was not found."
      });
    }

    return reply.status(204).send();
  });
}
