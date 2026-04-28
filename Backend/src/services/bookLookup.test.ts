import { describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../config/env.js";
import type { BookLookupCache } from "./bookLookupCache.js";
import { createBookLookupService, type IsbnLookupService } from "./bookLookup.js";

const baseConfig: AppConfig = {
  port: 0,
  corsOrigin: "http://localhost:3000",
  databasePath: ":memory:"
};

function lookupService(result: Awaited<ReturnType<IsbnLookupService["lookupBookByIsbn"]>>) {
  return {
    lookupBookByIsbn: vi.fn<IsbnLookupService["lookupBookByIsbn"]>().mockResolvedValue(result)
  };
}

function cacheDouble(value: ReturnType<BookLookupCache["get"]> = { found: false }) {
  return {
    get: vi.fn<BookLookupCache["get"]>().mockReturnValue(value),
    set: vi.fn<BookLookupCache["set"]>()
  };
}

describe("book lookup service", () => {
  it("prefers NDL Search and skips Open Library when NDL has a result", async () => {
    const ndlSearch = lookupService({
      title: "日本語の本",
      externalSource: "ndl_search",
      classificationTagCandidates: []
    });
    const openLibrary = lookupService({
      title: "Fallback",
      externalSource: "open_library",
      classificationTagCandidates: []
    });
    const service = createBookLookupService({ ndlSearch, openLibrary });

    const result = await service.lookupBookByIsbn("978-4-8144-0024-9", baseConfig);

    expect(result?.externalSource).toBe("ndl_search");
    expect(ndlSearch.lookupBookByIsbn).toHaveBeenCalledWith("9784814400249", baseConfig);
    expect(openLibrary.lookupBookByIsbn).not.toHaveBeenCalled();
  });

  it("falls back to Open Library when NDL Search has no result", async () => {
    const ndlSearch = lookupService(null);
    const openLibrary = lookupService({
      title: "Clean Code",
      externalSource: "open_library",
      classificationTagCandidates: []
    });
    const service = createBookLookupService({ ndlSearch, openLibrary });

    const result = await service.lookupBookByIsbn("9780132350884", baseConfig);

    expect(result?.externalSource).toBe("open_library");
    expect(openLibrary.lookupBookByIsbn).toHaveBeenCalledWith("9780132350884", baseConfig);
  });

  it("falls back to Open Library when NDL Search fails", async () => {
    const ndlSearch = {
      lookupBookByIsbn: vi.fn<IsbnLookupService["lookupBookByIsbn"]>().mockRejectedValue(new Error("NDL down"))
    };
    const openLibrary = lookupService({
      title: "Clean Code",
      externalSource: "open_library",
      classificationTagCandidates: []
    });
    const service = createBookLookupService({ ndlSearch, openLibrary });

    await expect(service.lookupBookByIsbn("9780132350884", baseConfig)).resolves.toEqual(
      expect.objectContaining({ externalSource: "open_library" })
    );
  });

  it("throws when NDL Search fails and Open Library has no fallback result", async () => {
    const ndlSearch = {
      lookupBookByIsbn: vi.fn<IsbnLookupService["lookupBookByIsbn"]>().mockRejectedValue(new Error("NDL down"))
    };
    const openLibrary = lookupService(null);
    const service = createBookLookupService({ ndlSearch, openLibrary });

    await expect(service.lookupBookByIsbn("9784814400249", baseConfig)).rejects.toThrow(
      "Book metadata lookup failed in NDL Search and no Open Library fallback was found"
    );
  });

  it("does not call providers for non-ISBN input", async () => {
    const ndlSearch = lookupService(null);
    const openLibrary = lookupService(null);
    const service = createBookLookupService({ ndlSearch, openLibrary });

    const result = await service.lookupBookByIsbn("BM-000001", baseConfig);

    expect(result).toBeNull();
    expect(ndlSearch.lookupBookByIsbn).not.toHaveBeenCalled();
    expect(openLibrary.lookupBookByIsbn).not.toHaveBeenCalled();
  });

  it("uses cached NDL Search results before calling providers", async () => {
    const cache = cacheDouble({
      found: true,
      value: {
        title: "Cached book",
        externalSource: "ndl_search",
        classificationTagCandidates: []
      }
    });
    const ndlSearch = lookupService(null);
    const openLibrary = lookupService(null);
    const service = createBookLookupService({ cache, ndlSearch, openLibrary });

    const result = await service.lookupBookByIsbn("9784814400249", baseConfig);

    expect(result?.title).toBe("Cached book");
    expect(cache.get).toHaveBeenCalledWith("ndl_search", "9784814400249");
    expect(ndlSearch.lookupBookByIsbn).not.toHaveBeenCalled();
    expect(openLibrary.lookupBookByIsbn).not.toHaveBeenCalled();
  });

  it("stores provider misses and fallback hits in the lookup cache", async () => {
    const cache = cacheDouble();
    const ndlSearch = lookupService(null);
    const openLibraryResult = {
      title: "Clean Code",
      externalSource: "open_library" as const,
      classificationTagCandidates: []
    };
    const openLibrary = lookupService(openLibraryResult);
    const service = createBookLookupService({ cache, ndlSearch, openLibrary });

    await expect(service.lookupBookByIsbn("9780132350884", baseConfig)).resolves.toEqual(
      openLibraryResult
    );

    expect(cache.set).toHaveBeenCalledWith("ndl_search", "9780132350884", null);
    expect(cache.set).toHaveBeenCalledWith("open_library", "9780132350884", openLibraryResult);
  });
});
