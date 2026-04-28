import type { AppConfig } from "../config/env.js";
import type { BookLookupResult } from "../schemas/books.js";
import { createNdlSearchLookupService } from "./ndlSearch.js";
import { createOpenLibraryLookupService, isLikelyIsbn, normalizeIsbn } from "./openLibrary.js";

export type IsbnLookupService = {
  lookupBookByIsbn(rawIsbn: string, config: AppConfig): Promise<BookLookupResult | null>;
};

export type BookLookupServiceOptions = {
  ndlSearch?: IsbnLookupService;
  openLibrary?: IsbnLookupService;
};

const defaultLookupService = createBookLookupService();

export async function lookupBookByIsbn(
  rawIsbn: string,
  config: AppConfig
): Promise<BookLookupResult | null> {
  return defaultLookupService.lookupBookByIsbn(rawIsbn, config);
}

export function createBookLookupService(options: BookLookupServiceOptions = {}) {
  const ndlSearch = options.ndlSearch ?? createNdlSearchLookupService();
  const openLibrary = options.openLibrary ?? createOpenLibraryLookupService();

  return {
    async lookupBookByIsbn(rawIsbn: string, config: AppConfig): Promise<BookLookupResult | null> {
      const isbn = normalizeIsbn(rawIsbn);

      if (!isLikelyIsbn(isbn)) {
        return null;
      }

      let ndlSearchError: unknown;

      try {
        const ndlResult = await ndlSearch.lookupBookByIsbn(isbn, config);

        if (ndlResult) {
          return ndlResult;
        }
      } catch (error) {
        ndlSearchError = error;
      }

      let openLibraryResult: BookLookupResult | null;

      try {
        openLibraryResult = await openLibrary.lookupBookByIsbn(isbn, config);
      } catch (openLibraryError) {
        if (ndlSearchError) {
          throw new Error("Book metadata lookup failed in both NDL Search and Open Library", {
            cause: openLibraryError
          });
        }

        throw openLibraryError;
      }

      if (!openLibraryResult && ndlSearchError) {
        throw new Error("Book metadata lookup failed in NDL Search and no Open Library fallback was found", {
          cause: ndlSearchError
        });
      }

      return openLibraryResult;
    }
  };
}
