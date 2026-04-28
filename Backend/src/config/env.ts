export type AppConfig = {
  port: number;
  corsOrigin: string;
  databasePath: string;
  lookupCacheTtlDays?: number;
  openLibraryAppName?: string;
  openLibraryContact?: string;
};

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.BACKEND_PORT ?? 3001),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    databasePath: process.env.DATABASE_PATH ?? "/data/book-manager.sqlite",
    lookupCacheTtlDays: positiveNumber(process.env.LOOKUP_CACHE_TTL_DAYS, 30),
    openLibraryAppName: process.env.OPEN_LIBRARY_APP_NAME || undefined,
    openLibraryContact: process.env.OPEN_LIBRARY_CONTACT || undefined
  };
}

function positiveNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
