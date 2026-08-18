import type { AppConfig } from "../config/env.js";
import type { BookLookupResult } from "../schemas/books.js";
import type { LookupResponse } from "./bookLookupCache.js";
import { appendVolumeMetadata } from "./lookupTitle.js";
import { isValidIsbn, normalizeIsbn } from "../utils/isbn.js";
import { createSerializedRequestQueue } from "./requestQueue.js";

type OpenLibraryBook = {
  title?: string;
  by_statement?: string;
  publishers?: string[];
  publish_date?: string;
  isbn_10?: string[];
  isbn_13?: string[];
  key?: string;
  subjects?: string[];
  volume?: string;
  volume_title?: string;
  volumeTitle?: string;
};

export type OpenLibraryLookupServiceOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  minRequestIntervalMs?: number;
};

export { normalizeIsbn };

export function isLikelyIsbn(value: string): boolean {
  return isValidIsbn(value);
}

export function createOpenLibraryLookupService(options: OpenLibraryLookupServiceOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now ?? Date.now;
  const requestQueue = createSerializedRequestQueue({ sleep, now });

  async function lookupBookByIsbnWithMetadata(
    rawIsbn: string,
    config: AppConfig
  ): Promise<LookupResponse> {
    const isbn = normalizeIsbn(rawIsbn);

    if (!isLikelyIsbn(isbn)) {
      return { value: null, metadata: {} };
    }

    return requestQueue.enqueue(
      options.minRequestIntervalMs ?? getOpenLibraryMinIntervalMs(config),
      async () => {
        const requestUrl = `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`;
        const response = await fetchImpl(requestUrl, {
          headers: buildOpenLibraryHeaders(config)
        });
        const responseBody = await response.text();
        const metadata = {
          requestUrl,
          responseStatus: response.status,
          responseContentType: response.headers.get("content-type") ?? undefined,
          responseBody
        };

        if (response.status === 404) {
          return { value: null, metadata };
        }

        if (!response.ok) {
          throw new Error(`Open Library lookup failed with status ${response.status}`);
        }

        const payload = JSON.parse(responseBody) as OpenLibraryBook;
        return {
          value: mapOpenLibraryBook(payload, isbn),
          metadata
        };
      }
    );
  }

  return {
    async lookupBookByIsbn(rawIsbn: string, config: AppConfig): Promise<BookLookupResult | null> {
      const response = await lookupBookByIsbnWithMetadata(rawIsbn, config);
      return response.value;
    },
    lookupBookByIsbnWithMetadata
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
    title: appendVolumeMetadata(payload.title, payload.volume, payload.volume_title, payload.volumeTitle),
    author: payload.by_statement,
    publisher: payload.publishers?.[0],
    publishedDate: payload.publish_date,
    isbn: payload.isbn_13?.[0] ?? payload.isbn_10?.[0] ?? fallbackIsbn,
    externalSource: "open_library",
    externalId: payload.key,
    classificationTagCandidates: payload.subjects ?? []
  };
}
