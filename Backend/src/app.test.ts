import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { AppConfig } from "./config/env.js";
import { createDatabaseClient, type DatabaseClient } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

describe("backend application foundation", () => {
  let database: DatabaseClient;
  let config: AppConfig;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "book-manager-"));

    config = {
      port: 0,
      corsOrigin: "http://localhost:3000",
      databasePath: join(tempDir, "test.sqlite")
    };

    database = createDatabaseClient(config);
    runMigrations(database);
  });

  afterEach(() => {
    database?.sqlite.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("applies migrations to a fresh SQLite database", () => {
    const tables = database.sqlite
      .prepare(
        "select name from sqlite_master where type = 'table' and name in (?, ?, ?, ?, ?) order by name"
      )
      .all(
        "books",
        "locations",
        "classification_tags",
        "book_classification_tags",
        "external_lookup_cache"
      );

    expect(tables).toEqual([
      { name: "book_classification_tags" },
      { name: "books" },
      { name: "classification_tags" },
      { name: "external_lookup_cache" },
      { name: "locations" }
    ]);
  });

  it("reports application and database health", async () => {
    const app = await createApp({ config, database, logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/api/health"
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      service: "book-manager-backend",
      database: "ok"
    });
  });

  it("returns the shared validation error response shape", async () => {
    const app = await createApp({ config, database, logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/books/lookup",
      payload: {}
    });

    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "Validation failed",
      errors: [
        {
          field: "bookBarcode"
        }
      ]
    });
  });
});
