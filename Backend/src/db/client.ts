import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadConfig } from "../config/env.js";

const config = loadConfig();

mkdirSync(dirname(config.databasePath), { recursive: true });

export const sqlite = new Database(config.databasePath);
export const db = drizzle(sqlite);
