import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import type { AppConfig } from "../config/env.js";
import { createDatabaseClient, type DatabaseClient } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";

describe("classification tags API", () => {
  let database: DatabaseClient;
  let config: AppConfig;
  let tempDir: string;
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), "book-manager-"));

    config = {
      port: 0,
      corsOrigin: "http://localhost:3000",
      databasePath: join(tempDir, "test.sqlite")
    };

    database = createDatabaseClient(config);
    runMigrations(database);
    app = await createApp({ config, database, logger: false });
  });

  afterEach(async () => {
    await app.close();
    database.sqlite.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates and lists classification tags by name", async () => {
    const second = await app.inject({
      method: "POST",
      url: "/api/classification-tags",
      payload: {
        name: "Zoology",
        description: "Animal science",
        source: "manual"
      }
    });

    const first = await app.inject({
      method: "POST",
      url: "/api/classification-tags",
      payload: {
        name: "Algorithms",
        source: "open_library"
      }
    });

    expect(second.statusCode).toBe(201);
    expect(first.statusCode).toBe(201);

    const response = await app.inject({
      method: "GET",
      url: "/api/classification-tags"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      items: [
        {
          name: "Algorithms",
          description: null,
          source: "open_library",
          isActive: true
        },
        {
          name: "Zoology",
          description: "Animal science",
          source: "manual",
          isActive: true
        }
      ]
    });
  });

  it("uses manual source by default", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/classification-tags",
      payload: {
        name: "Databases"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      name: "Databases",
      source: "manual"
    });
  });

  it("updates a classification tag", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/classification-tags",
      payload: {
        name: "Old tag"
      }
    });

    const id = created.json().id;
    const response = await app.inject({
      method: "PUT",
      url: `/api/classification-tags/${id}`,
      payload: {
        name: "New tag",
        description: "Updated",
        source: "open_library",
        isActive: false
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id,
      name: "New tag",
      description: "Updated",
      source: "open_library",
      isActive: false
    });
  });

  it("disables a classification tag instead of deleting it", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/classification-tags",
      payload: {
        name: "Archive tag"
      }
    });

    const id = created.json().id;
    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/classification-tags/${id}`
    });

    expect(deleted.statusCode).toBe(204);

    const listed = await app.inject({
      method: "GET",
      url: "/api/classification-tags"
    });

    expect(listed.json().items).toEqual([
      expect.objectContaining({
        id,
        name: "Archive tag",
        isActive: false
      })
    ]);
  });

  it("rejects duplicate classification tag names", async () => {
    await app.inject({
      method: "POST",
      url: "/api/classification-tags",
      payload: {
        name: "Programming"
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/classification-tags",
      payload: {
        name: "Programming"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "Classification tag name already exists."
    });
  });

  it("returns validation and not found errors", async () => {
    const invalid = await app.inject({
      method: "POST",
      url: "/api/classification-tags",
      payload: {
        name: "",
        source: "invalid"
      }
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      message: "Validation failed",
      errors: [
        expect.objectContaining({ field: "name" }),
        expect.objectContaining({ field: "source" })
      ]
    });

    const missing = await app.inject({
      method: "PUT",
      url: "/api/classification-tags/00000000-0000-4000-8000-000000000000",
      payload: {
        name: "Missing"
      }
    });

    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({
      message: "Classification tag was not found."
    });
  });
});
