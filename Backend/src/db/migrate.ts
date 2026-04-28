import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { DatabaseClient } from "./client.js";

export function getMigrationsFolder() {
  return resolve(process.cwd(), "drizzle");
}

export function runMigrations(client: DatabaseClient, migrationsFolder = getMigrationsFolder()) {
  if (!existsSync(migrationsFolder)) {
    throw new Error(`Migrations folder was not found: ${migrationsFolder}`);
  }

  migrate(client.db, { migrationsFolder });
}
