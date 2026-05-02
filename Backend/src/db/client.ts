import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { AppConfig } from "../config/env.js";
import * as schema from "./schema.js";

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export function createDatabaseClient(config: Pick<AppConfig, "databasePath">) {
  mkdirSync(dirname(config.databasePath), { recursive: true });

  const sqlite = new Database(config.databasePath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");

  return {
    sqlite,
    db: drizzle(sqlite, { schema })
  };
}
