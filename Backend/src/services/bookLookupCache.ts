import { and, eq } from "drizzle-orm";
import type { AppConfig } from "../config/env.js";
import type { DatabaseClient } from "../db/client.js";
import { externalLookupCache } from "../db/schema.js";
import type { BookLookupResult } from "../schemas/books.js";

export type LookupCacheProvider = BookLookupResult["externalSource"];

export type LookupCacheRead =
  | {
      found: true;
      value: BookLookupResult | null;
    }
  | {
      found: false;
    };

export type BookLookupCache = {
  get(provider: LookupCacheProvider, isbn: string): LookupCacheRead;
  set(provider: LookupCacheProvider, isbn: string, value: BookLookupResult | null): void;
};

export type SqliteBookLookupCacheOptions = {
  now?: () => Date;
};

const defaultTtlDays = 30;

export function createSqliteBookLookupCache(
  database: DatabaseClient,
  config: Pick<AppConfig, "lookupCacheTtlDays">,
  options: SqliteBookLookupCacheOptions = {}
): BookLookupCache {
  const now = options.now ?? (() => new Date());
  const ttlDays = config.lookupCacheTtlDays ?? defaultTtlDays;

  function expiryDate(currentDate: Date) {
    return new Date(currentDate.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  }

  return {
    get(provider, isbn) {
      const row = database.db
        .select()
        .from(externalLookupCache)
        .where(and(eq(externalLookupCache.provider, provider), eq(externalLookupCache.isbn, isbn)))
        .get();

      if (!row || Date.parse(row.expiresAt) <= now().getTime()) {
        return { found: false };
      }

      if (row.status === "miss") {
        return { found: true, value: null };
      }

      if (!row.payload) {
        return { found: false };
      }

      try {
        return { found: true, value: JSON.parse(row.payload) as BookLookupResult };
      } catch {
        return { found: false };
      }
    },
    set(provider, isbn, value) {
      const currentDate = now();
      const timestamp = currentDate.toISOString();
      const id = `${provider}:${isbn}`;

      database.db
        .insert(externalLookupCache)
        .values({
          id,
          isbn,
          provider,
          status: value ? "hit" : "miss",
          payload: value ? JSON.stringify(value) : null,
          createdAt: timestamp,
          updatedAt: timestamp,
          expiresAt: expiryDate(currentDate).toISOString()
        })
        .onConflictDoUpdate({
          target: externalLookupCache.id,
          set: {
            status: value ? "hit" : "miss",
            payload: value ? JSON.stringify(value) : null,
            updatedAt: timestamp,
            expiresAt: expiryDate(currentDate).toISOString()
          }
        })
        .run();
    }
  };
}
