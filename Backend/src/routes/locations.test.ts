import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import type { AppConfig } from "../config/env.js";
import { createDatabaseClient, type DatabaseClient } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";

describe("locations API", () => {
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

  it("creates and lists locations in sort order", async () => {
    const second = await app.inject({
      method: "POST",
      url: "/api/locations",
      payload: {
        name: "Second shelf",
        description: "Shown second",
        sortOrder: 20
      }
    });

    const first = await app.inject({
      method: "POST",
      url: "/api/locations",
      payload: {
        name: "First shelf",
        sortOrder: 10
      }
    });

    expect(second.statusCode).toBe(201);
    expect(first.statusCode).toBe(201);

    const response = await app.inject({
      method: "GET",
      url: "/api/locations"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      items: [
        {
          name: "First shelf",
          description: null,
          sortOrder: 10,
          isActive: true
        },
        {
          name: "Second shelf",
          description: "Shown second",
          sortOrder: 20,
          isActive: true
        }
      ]
    });
  });

  it("updates a location", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/locations",
      payload: {
        name: "Old shelf",
        sortOrder: 1
      }
    });

    const id = created.json().id;
    const response = await app.inject({
      method: "PUT",
      url: `/api/locations/${id}`,
      payload: {
        name: "New shelf",
        description: "Updated",
        sortOrder: 2,
        isActive: false
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id,
      name: "New shelf",
      description: "Updated",
      sortOrder: 2,
      isActive: false
    });
  });

  it("disables a location instead of deleting it", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/locations",
      payload: {
        name: "Archive shelf"
      }
    });

    const id = created.json().id;
    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/locations/${id}`
    });

    expect(deleted.statusCode).toBe(204);

    const listed = await app.inject({
      method: "GET",
      url: "/api/locations"
    });

    expect(listed.json().items).toEqual([
      expect.objectContaining({
        id,
        name: "Archive shelf",
        isActive: false
      })
    ]);
  });

  it("rejects duplicate location names", async () => {
    await app.inject({
      method: "POST",
      url: "/api/locations",
      payload: {
        name: "Desk shelf"
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/locations",
      payload: {
        name: "Desk shelf"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "Location name already exists."
    });
  });

  it("returns validation and not found errors", async () => {
    const invalid = await app.inject({
      method: "POST",
      url: "/api/locations",
      payload: {
        name: ""
      }
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      message: "Validation failed",
      errors: [
        {
          field: "name"
        }
      ]
    });

    const missing = await app.inject({
      method: "PUT",
      url: "/api/locations/00000000-0000-4000-8000-000000000000",
      payload: {
        name: "Missing"
      }
    });

    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({
      message: "Location was not found."
    });
  });
});
