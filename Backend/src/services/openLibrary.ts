import type { AppConfig } from "../config/env.js";
import type { BookLookupResult } from "../schemas/books.js";
import { isValidIsbn, normalizeIsbn } from "../utils/isbn.js";

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

export type OpenLibraryLookupServiceOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  minRequestIntervalMs?: number;
};

const defaultLookupService = createOpenLibraryLookupService();

export { normalizeIsbn };

export function isLikelyIsbn(value: string): boolean {
  return isValidIsbn(value);
}

export async function lookupBookByIsbn(
  rawIsbn: string,
  config: AppConfig
): Promise<BookLookupResult | null> {
  return defaultLookupService.lookupBookByIsbn(rawIsbn, config);
}

export function createOpenLibraryLookupService(options: OpenLibraryLookupServiceOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now ?? Date.now;
  let lastRequestAt: number | null = null;

  async function waitForRequestSlot(config: AppConfig) {
    const minIntervalMs = options.minRequestIntervalMs ?? getOpenLibraryMinIntervalMs(config);
    const currentTime = now();
    const elapsed = lastRequestAt === null ? minIntervalMs : currentTime - lastRequestAt;

    if (elapsed < minIntervalMs) {
      await sleep(minIntervalMs - elapsed);
    }

    lastRequestAt = now();
  }

  return {
    async lookupBookByIsbn(rawIsbn: string, config: AppConfig): Promise<BookLookupResult | null> {
      const isbn = normalizeIsbn(rawIsbn);

      if (!isLikelyIsbn(isbn)) {
        return null;
      }

      await waitForRequestSlot(config);

      const response = await fetchImpl(
        `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`,
        {
          headers: buildOpenLibraryHeaders(config)
        }
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Open Library lookup failed with status ${response.status}`);
      }

      const payload = (await response.json()) as OpenLibraryBook;
      return mapOpenLibraryBook(payload, isbn);
    }
  };
}

function buildOpenLibraryHeaders(config: AppConfig): HeadersInit {
  const appName = config.openLibraryAppName ?? "book-manager";
  const contact = config.openLibraryContact ? ` (${config.openLibraryContact})` : "";

  return {
    "User-Agent": `${appName}${contact}`
  };
}

function getOpenLibraryMinIntervalMs(config: AppConfig): number {
  return config.openLibraryContact ? 334 : 1000;
}

function mapOpenLibraryBook(
  payload: OpenLibraryBook,
  fallbackIsbn: string
): BookLookupResult | null {
  if (!payload.title) {
    return null;
  }

  return {
    title: payload.title,
    author: payload.by_statement,
    publisher: payload.publishers?.[0],
    publishedDate: payload.publish_date,
    isbn: payload.isbn_13?.[0] ?? payload.isbn_10?.[0] ?? fallbackIsbn,
    externalSource: "open_library",
    externalId: payload.key,
    classificationTagCandidates: payload.subjects ?? []
  };
}
