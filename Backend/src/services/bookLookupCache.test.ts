import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../config/env.js";
import { createDatabaseClient, type DatabaseClient } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { createSqliteBookLookupCache } from "./bookLookupCache.js";

describe("SQLite book lookup cache", () => {
  let config: AppConfig;
  let database: DatabaseClient;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "book-manager-"));
    config = {
      port: 0,
      corsOrigin: "http://localhost:3000",
      databasePath: join(tempDir, "test.sqlite"),
      lookupCacheTtlDays: 1
    };

    database = createDatabaseClient(config);
    runMigrations(database);
  });

  afterEach(() => {
    database.sqlite.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("persists lookup hits in SQLite", () => {
    const cache = createSqliteBookLookupCache(database, config, {
      now: () => new Date("2026-04-28T00:00:00.000Z")
    });

    cache.set("ndl_search", "9784814400249", {
      title: "Cached book",
      author: "Author",
      externalSource: "ndl_search",
      classificationTagCandidates: ["Programming"]
    });

    database.sqlite.close();
    database = createDatabaseClient(config);
    runMigrations(database);

    const reopenedCache = createSqliteBookLookupCache(database, config, {
      now: () => new Date("2026-04-28T12:00:00.000Z")
    });

    expect(reopenedCache.get("ndl_search", "9784814400249")).toEqual({
      found: true,
      value: {
        title: "Cached book",
        author: "Author",
        externalSource: "ndl_search",
        classificationTagCandidates: ["Programming"]
      }
    });
  });

  it("caches misses and treats expired rows as absent", () => {
    let currentDate = new Date("2026-04-28T00:00:00.000Z");
    const cache = createSqliteBookLookupCache(database, config, {
      now: () => currentDate
    });

    cache.set("open_library", "9780132350884", null);

    expect(cache.get("open_library", "9780132350884")).toEqual({
      found: true,
      value: null
    });

    currentDate = new Date("2026-04-30T00:00:00.000Z");

    expect(cache.get("open_library", "9780132350884")).toEqual({
      found: false
    });
  });
});
