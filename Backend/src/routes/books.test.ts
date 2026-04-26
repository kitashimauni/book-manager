import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import type { AppConfig } from "../config/env.js";
import { createDatabaseClient, type DatabaseClient } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";

describe("books API", () => {
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

  async function createLocation(name = "Main shelf") {
    const response = await app.inject({
      method: "POST",
      url: "/api/locations",
      payload: { name }
    });

    return response.json();
  }

  async function createClassificationTag(name = "Programming") {
    const response = await app.inject({
      method: "POST",
      url: "/api/classification-tags",
      payload: { name }
    });

    return response.json();
  }

  it("creates and retrieves a book with location and classification tags", async () => {
    const location = await createLocation();
    const tag = await createClassificationTag();

    const created = await app.inject({
      method: "POST",
      url: "/api/books",
      payload: {
        title: "Clean Code",
        author: "Robert C. Martin",
        publisher: "Prentice Hall",
        publishedDate: "2008-08-01",
        isbn: "9780132350884",
        bookBarcode: "9780132350884",
        managementBarcode: "BM-000001",
        locationId: location.id,
        classificationTagIds: [tag.id],
        managementMemo: "付箋あり"
      }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      title: "Clean Code",
      author: "Robert C. Martin",
      location: {
        id: location.id,
        name: "Main shelf"
      },
      classificationTags: [
        {
          id: tag.id,
          name: "Programming"
        }
      ],
      managementBarcode: "BM-000001"
    });

    const detail = await app.inject({
      method: "GET",
      url: `/api/books/${created.json().id}`
    });

    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({
      id: created.json().id,
      title: "Clean Code",
      managementMemo: "付箋あり"
    });
  });

  it("lists books with keyword and tag filters", async () => {
    const location = await createLocation("Office shelf");
    const programming = await createClassificationTag("Programming");
    const math = await createClassificationTag("Mathematics");

    await app.inject({
      method: "POST",
      url: "/api/books",
      payload: {
        title: "Algorithms",
        author: "CLRS",
        managementBarcode: "BM-ALGO",
        locationId: location.id,
        classificationTagIds: [programming.id]
      }
    });

    await app.inject({
      method: "POST",
      url: "/api/books",
      payload: {
        title: "Linear Algebra",
        author: "Gilbert Strang",
        managementBarcode: "BM-MATH",
        classificationTagIds: [math.id]
      }
    });

    const keyword = await app.inject({
      method: "GET",
      url: "/api/books?q=CLRS"
    });

    expect(keyword.statusCode).toBe(200);
    expect(keyword.json()).toMatchObject({
      total: 1,
      items: [expect.objectContaining({ title: "Algorithms" })]
    });

    const filtered = await app.inject({
      method: "GET",
      url: `/api/books?locationId=${location.id}&classificationTagId=${programming.id}`
    });

    expect(filtered.statusCode).toBe(200);
    expect(filtered.json()).toMatchObject({
      total: 1,
      items: [expect.objectContaining({ title: "Algorithms" })]
    });
  });

  it("updates a book and replaces classification tags", async () => {
    const firstTag = await createClassificationTag("Old tag");
    const secondTag = await createClassificationTag("New tag");

    const created = await app.inject({
      method: "POST",
      url: "/api/books",
      payload: {
        title: "Draft title",
        classificationTagIds: [firstTag.id]
      }
    });

    const id = created.json().id;
    const updated = await app.inject({
      method: "PUT",
      url: `/api/books/${id}`,
      payload: {
        title: "Final title",
        author: "Updated Author",
        classificationTagIds: [secondTag.id]
      }
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      id,
      title: "Final title",
      author: "Updated Author",
      classificationTags: [
        {
          id: secondTag.id,
          name: "New tag"
        }
      ]
    });
  });

  it("deletes a book physically", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/books",
      payload: {
        title: "Temporary book"
      }
    });

    const id = created.json().id;
    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/books/${id}`
    });

    expect(deleted.statusCode).toBe(204);

    const missing = await app.inject({
      method: "GET",
      url: `/api/books/${id}`
    });

    expect(missing.statusCode).toBe(404);
  });

  it("rejects duplicate management barcode", async () => {
    await app.inject({
      method: "POST",
      url: "/api/books",
      payload: {
        title: "First",
        managementBarcode: "BM-DUP"
      }
    });

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/books",
      payload: {
        title: "Second",
        managementBarcode: "BM-DUP"
      }
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({
      message: "Management barcode already exists."
    });
  });

  it("rejects missing related records and invalid input", async () => {
    const invalid = await app.inject({
      method: "POST",
      url: "/api/books",
      payload: {
        title: ""
      }
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      message: "Validation failed",
      errors: [expect.objectContaining({ field: "title" })]
    });

    const missingLocation = await app.inject({
      method: "POST",
      url: "/api/books",
      payload: {
        title: "Missing location",
        locationId: "00000000-0000-4000-8000-000000000000"
      }
    });

    expect(missingLocation.statusCode).toBe(400);
    expect(missingLocation.json()).toMatchObject({
      errors: [
        {
          field: "locationId",
          message: "Location was not found."
        }
      ]
    });
  });
});
