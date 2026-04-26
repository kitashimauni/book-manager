export type AppConfig = {
  port: number;
  corsOrigin: string;
  databasePath: string;
  openLibraryAppName?: string;
  openLibraryContact?: string;
};

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.BACKEND_PORT ?? 3001),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    databasePath: process.env.DATABASE_PATH ?? "/data/book-manager.sqlite",
    openLibraryAppName: process.env.OPEN_LIBRARY_APP_NAME || undefined,
    openLibraryContact: process.env.OPEN_LIBRARY_CONTACT || undefined
  };
}
