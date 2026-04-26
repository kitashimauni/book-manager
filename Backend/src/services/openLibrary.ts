import type { AppConfig } from "../config/env.js";
import type { BookLookupResult } from "../schemas/books.js";

type OpenLibraryBook = {
  title?: string;
  by_statement?: string;
  publishers?: string[];
  publish_date?: string;
  isbn_10?: string[];
  isbn_13?: string[];
  key?: string;
  subjects?: string[];
};

export function normalizeIsbn(value: string): string {
  return value.replace(/[-\s]/g, "").toUpperCase();
}

export async function lookupBookByIsbn(
  rawIsbn: string,
  config: AppConfig
): Promise<BookLookupResult | null> {
  const isbn = normalizeIsbn(rawIsbn);
  const response = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`, {
    headers: buildOpenLibraryHeaders(config)
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Open Library lookup failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OpenLibraryBook;

  if (!payload.title) {
    return null;
  }

  return {
    title: payload.title,
    author: payload.by_statement,
    publisher: payload.publishers?.[0],
    publishedDate: payload.publish_date,
    isbn: payload.isbn_13?.[0] ?? payload.isbn_10?.[0] ?? isbn,
    externalSource: "open_library",
    externalId: payload.key,
    classificationTagCandidates: payload.subjects ?? []
  };
}

function buildOpenLibraryHeaders(config: AppConfig): HeadersInit {
  const appName = config.openLibraryAppName ?? "book-manager";
  const contact = config.openLibraryContact ? ` (${config.openLibraryContact})` : "";

  return {
    "User-Agent": `${appName}${contact}`
  };
}
