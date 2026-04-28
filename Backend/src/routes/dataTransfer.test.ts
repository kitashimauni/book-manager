import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import type { AppConfig } from "../config/env.js";
import { createDatabaseClient, type DatabaseClient } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";

describe("data transfer API", () => {
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

  it("exports books, locations, tags, and relations as JSON", async () => {
    const location = await createLocation("Office shelf");
    const tag = await createClassificationTag("Programming");

    await createBook({
      title: "Clean Code",
      managementBarcode: "BM-0001",
      locationId: location.id,
      classificationTagIds: [tag.id]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/export"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      version: 1,
      books: [expect.objectContaining({ title: "Clean Code" })],
      locations: [expect.objectContaining({ name: "Office shelf" })],
      classificationTags: [expect.objectContaining({ name: "Programming" })],
      bookClassificationTags: [expect.objectContaining({ classificationTagId: tag.id })]
    });
  });

  it("imports exported JSON into an empty database", async () => {
    const location = await createLocation("Lab shelf");
    const tag = await createClassificationTag("Mathematics");
    await createBook({
      title: "Linear Algebra",
      managementBarcode: "BM-MATH",
      locationId: location.id,
      classificationTagIds: [tag.id]
    });

    const exported = await app.inject({
      method: "GET",
      url: "/api/export"
    });
    const payload = exported.json();

    await app.close();
    database.sqlite.close();
    rmSync(tempDir, { recursive: true, force: true });

    tempDir = mkdtempSync(join(tmpdir(), "book-manager-"));
    config = {
      ...config,
      databasePath: join(tempDir, "test.sqlite")
    };
    database = createDatabaseClient(config);
    runMigrations(database);
    app = await createApp({ config, database, logger: false });

    const preview = await app.inject({
      method: "POST",
      url: "/api/import/preview",
      payload
    });

    expect(preview.statusCode).toBe(200);
    expect(preview.json()).toMatchObject({
      summary: {
        create: 3,
        conflict: 0,
        error: 0
      }
    });

    const imported = await app.inject({
      method: "POST",
      url: "/api/import",
      payload
    });

    expect(imported.statusCode).toBe(200);
    expect(imported.json()).toMatchObject({
      imported: {
        books: 1,
        locations: 1,
        classificationTags: 1
      }
    });

    const books = await app.inject({
      method: "GET",
      url: "/api/books?q=Linear"
    });

    expect(books.json()).toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          title: "Linear Algebra",
          location: expect.objectContaining({ name: "Lab shelf" }),
          classificationTags: [expect.objectContaining({ name: "Mathematics" })]
        })
      ]
    });
  });

  it("previews conflicts and supports skip or overwrite resolutions", async () => {
    const location = await createLocation("Shared shelf");
    const tag = await createClassificationTag("Programming");
    await createBook({
      title: "Existing title",
      managementBarcode: "BM-CONFLICT",
      locationId: location.id,
      classificationTagIds: [tag.id]
    });

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      locations: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Shared shelf",
          description: "Imported description",
          sortOrder: 10,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      classificationTags: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          name: "Programming",
          description: "Imported tag",
          source: "manual",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      books: [
        {
          id: "00000000-0000-4000-8000-000000000003",
          title: "Imported title",
          author: null,
          publisher: null,
          publishedDate: null,
          isbn: null,
          bookBarcode: null,
          managementBarcode: "BM-CONFLICT",
          externalSource: null,
          externalId: null,
          locationId: "00000000-0000-4000-8000-000000000001",
          managementMemo: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      bookClassificationTags: [
        {
          bookId: "00000000-0000-4000-8000-000000000003",
          classificationTagId: "00000000-0000-4000-8000-000000000002",
          createdAt: new Date().toISOString()
        }
      ]
    };

    const preview = await app.inject({
      method: "POST",
      url: "/api/import/preview",
      payload
    });

    expect(preview.statusCode).toBe(200);
    expect(preview.json()).toMatchObject({
      summary: {
        create: 0,
        conflict: 3,
        error: 0
      },
      conflicts: [
        expect.objectContaining({ entity: "location", matchBy: "name" }),
        expect.objectContaining({ entity: "classificationTag", matchBy: "name" }),
        expect.objectContaining({ entity: "book", matchBy: "managementBarcode" })
      ]
    });

    const skipped = await app.inject({
      method: "POST",
      url: "/api/import",
      payload
    });

    expect(skipped.statusCode).toBe(200);
    expect(skipped.json()).toMatchObject({
      skipped: {
        books: 1,
        locations: 1,
        classificationTags: 1
      }
    });

    const overwritten = await app.inject({
      method: "POST",
      url: "/api/import",
      payload: {
        ...payload,
        conflictResolution: {
          defaultAction: "overwrite",
          items: []
        }
      }
    });

    expect(overwritten.statusCode).toBe(200);

    const books = await app.inject({
      method: "GET",
      url: "/api/books?q=Imported"
    });

    expect(books.json()).toMatchObject({
      total: 1,
      items: [expect.objectContaining({ title: "Imported title" })]
    });
  });

  it("rejects import payloads with broken references", async () => {
    const payload = {
      version: 1,
      books: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          title: "Broken reference",
          author: null,
          publisher: null,
          publishedDate: null,
          isbn: null,
          bookBarcode: null,
          managementBarcode: null,
          externalSource: null,
          externalId: null,
          locationId: "00000000-0000-4000-8000-000000000099",
          managementMemo: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      locations: [],
      classificationTags: [],
      bookClassificationTags: []
    };

    const preview = await app.inject({
      method: "POST",
      url: "/api/import/preview",
      payload
    });

    expect(preview.statusCode).toBe(200);
    expect(preview.json()).toMatchObject({
      summary: {
        error: 1
      },
      errors: [expect.objectContaining({ field: "books.0.locationId" })]
    });

    const imported = await app.inject({
      method: "POST",
      url: "/api/import",
      payload
    });

    expect(imported.statusCode).toBe(400);
    expect(imported.json()).toMatchObject({
      message: "Validation failed",
      errors: [expect.objectContaining({ field: "books.0.locationId" })]
    });
  });

  async function createLocation(name: string) {
    const response = await app.inject({
      method: "POST",
      url: "/api/locations",
      payload: { name }
    });

    return response.json();
  }

  async function createClassificationTag(name: string) {
    const response = await app.inject({
      method: "POST",
      url: "/api/classification-tags",
      payload: { name }
    });

    return response.json();
  }

  async function createBook(payload: Record<string, unknown>) {
    const response = await app.inject({
      method: "POST",
      url: "/api/books",
      payload
    });

    return response.json();
  }
});
