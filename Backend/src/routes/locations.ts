import { and, asc, eq, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type { DatabaseClient } from "../db/client.js";
import { locations } from "../db/schema.js";
import { validationError } from "../errors.js";
import {
  createLocationRequestSchema,
  locationIdParamsSchema,
  updateLocationRequestSchema
} from "../schemas/locations.js";

export type LocationRouteOptions = {
  database: DatabaseClient;
};

export async function registerLocationRoutes(app: FastifyInstance, options: LocationRouteOptions) {
  const { db } = options.database;

  app.get("/api/locations", async () => {
    const items = db
      .select()
      .from(locations)
      .orderBy(asc(locations.sortOrder), asc(locations.name))
      .all();

    return { items };
  });

  app.post("/api/locations", async (request, reply) => {
    const parsed = createLocationRequestSchema.safeParse(request.body);

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
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.name, parsed.data.name))
      .get();

    if (existing) {
      return reply.status(409).send({
        message: "Location name already exists."
      });
    }

    const now = new Date().toISOString();
    const created = db
      .insert(locations)
      .values({
        id: randomUUID(),
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        isActive: true,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();

    return reply.status(201).send(created);
  });

  app.put("/api/locations/:id", async (request, reply) => {
    const params = locationIdParamsSchema.safeParse(request.params);

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

    const parsed = updateLocationRequestSchema.safeParse(request.body);

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

    const current = db.select().from(locations).where(eq(locations.id, params.data.id)).get();

    if (!current) {
      return reply.status(404).send({
        message: "Location was not found."
      });
    }

    if (parsed.data.name) {
      const duplicate = db
        .select({ id: locations.id })
        .from(locations)
        .where(and(eq(locations.name, parsed.data.name), ne(locations.id, params.data.id)))
        .get();

      if (duplicate) {
        return reply.status(409).send({
          message: "Location name already exists."
        });
      }
    }

    const updated = db
      .update(locations)
      .set({
        name: parsed.data.name ?? current.name,
        description:
          parsed.data.description === undefined ? current.description : parsed.data.description,
        sortOrder: parsed.data.sortOrder ?? current.sortOrder,
        isActive: parsed.data.isActive ?? current.isActive,
        updatedAt: new Date().toISOString()
      })
      .where(eq(locations.id, params.data.id))
      .returning()
      .get();

    return updated;
  });

  app.delete("/api/locations/:id", async (request, reply) => {
    const params = locationIdParamsSchema.safeParse(request.params);

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
      .update(locations)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString()
      })
      .where(eq(locations.id, params.data.id))
      .returning({ id: locations.id })
      .get();

    if (!updated) {
      return reply.status(404).send({
        message: "Location was not found."
      });
    }

    return reply.status(204).send();
  });
}
