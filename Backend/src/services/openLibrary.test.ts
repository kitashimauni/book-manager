import { describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../config/env.js";
import {
  createOpenLibraryLookupService,
  isLikelyIsbn,
  normalizeIsbn
} from "./openLibrary.js";

const baseConfig: AppConfig = {
  port: 0,
  corsOrigin: "http://localhost:3000",
  databasePath: ":memory:"
};

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

describe("Open Library lookup service", () => {
  it("normalizes ISBN-like input without falling back to search", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        title: "Clean Code",
        by_statement: "Robert C. Martin",
        publishers: ["Prentice Hall"],
        publish_date: "2008",
        isbn_13: ["9780132350884"],
        key: "/books/OL123M",
        subjects: ["Software Engineering"]
      })
    );
    const service = createOpenLibraryLookupService({
      fetchImpl,
      minRequestIntervalMs: 0
    });

    const result = await service.lookupBookByIsbn("ISBN 978-0-13-235088-4", baseConfig);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://openlibrary.org/isbn/9780132350884.json",
      expect.objectContaining({
        headers: {
          "User-Agent": "book-manager"
        }
      })
    );
    expect(result).toEqual({
      title: "Clean Code",
      author: "Robert C. Martin",
      publisher: "Prentice Hall",
      publishedDate: "2008",
      isbn: "9780132350884",
      externalSource: "open_library",
      externalId: "/books/OL123M",
      classificationTagCandidates: ["Software Engineering"]
    });
  });

  it("does not call Open Library for non-ISBN input", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const service = createOpenLibraryLookupService({
      fetchImpl,
      minRequestIntervalMs: 0
    });

    const result = await service.lookupBookByIsbn("not a barcode", baseConfig);

    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns null for 404 responses", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }));
    const service = createOpenLibraryLookupService({
      fetchImpl,
      minRequestIntervalMs: 0
    });

    await expect(service.lookupBookByIsbn("9780132350884", baseConfig)).resolves.toBeNull();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throws for non-404 Open Library failures", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));
    const service = createOpenLibraryLookupService({
      fetchImpl,
      minRequestIntervalMs: 0
    });

    await expect(service.lookupBookByIsbn("9780132350884", baseConfig)).rejects.toThrow(
      "Open Library lookup failed with status 503"
    );
  });

  it("sends optional app and contact information in User-Agent", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        title: "Domain-Driven Design"
      })
    );
    const service = createOpenLibraryLookupService({
      fetchImpl,
      minRequestIntervalMs: 0
    });

    await service.lookupBookByIsbn("9780321125217", {
      ...baseConfig,
      openLibraryAppName: "lab-library",
      openLibraryContact: "admin@example.test"
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://openlibrary.org/isbn/9780321125217.json",
      expect.objectContaining({
        headers: {
          "User-Agent": "lab-library (admin@example.test)"
        }
      })
    );
  });

  it("paces uncached requests", async () => {
    let currentTime = 0;
    const sleep = vi.fn(async (milliseconds: number) => {
      currentTime += milliseconds;
    });
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () =>
      jsonResponse({
        title: "A book"
      })
    );
    const service = createOpenLibraryLookupService({
      fetchImpl,
      sleep,
      now: () => currentTime,
      minRequestIntervalMs: 1000
    });

    await service.lookupBookByIsbn("9780132350884", baseConfig);
    await service.lookupBookByIsbn("9780321125217", baseConfig);

    expect(sleep).toHaveBeenCalledWith(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("exposes ISBN normalization helpers", () => {
    expect(normalizeIsbn("ISBN 0-321-12521-5")).toBe("0321125215");
    expect(isLikelyIsbn("0-321-12521-5")).toBe(true);
    expect(isLikelyIsbn("9780321125217")).toBe(true);
    expect(isLikelyIsbn("BM-000001")).toBe(false);
  });
});
