import { afterEach, describe, expect, it, vi } from "vitest";

async function loadClient(baseUrl: string) {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", baseUrl);
  return import("./client.js");
}

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the same-origin API root by default", async () => {
    const { deleteBook, getApiBaseUrl } = await loadClient("");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteBook("00000000-0000-4000-8000-000000000000");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Headers;

    expect(getApiBaseUrl()).toBe("/api");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/books/00000000-0000-4000-8000-000000000000",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("uses the configured backend API root", async () => {
    const { deleteBook, getApiBaseUrl } = await loadClient("http://localhost:3001/");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteBook("00000000-0000-4000-8000-000000000000");

    expect(getApiBaseUrl()).toBe("http://localhost:3001/api");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/books/00000000-0000-4000-8000-000000000000",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("sends a JSON content type for requests with a body", async () => {
    const { createBook } = await loadClient("");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: "00000000-0000-4000-8000-000000000000",
        title: "Test book"
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await createBook({ title: "Test book" });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Headers;

    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("includes list sorting parameters", async () => {
    const { getBooks } = await loadClient("");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ items: [], page: 1, limit: 20, total: 0 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await getBooks({ direction: "asc", limit: 20, page: 2, sort: "title" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/books?direction=asc&limit=20&page=2&sort=title",
      expect.anything()
    );
  });

  it("requests exact identifier matches and excludes the current book when provided", async () => {
    const { getBookIdentifierMatches } = await loadClient("");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ matches: [{ id: "book-1", title: "Existing book" }] })
    );
    vi.stubGlobal("fetch", fetchMock);

    await getBookIdentifierMatches("9780132350884", "bookIdentifier", "book-2");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/books/identifier-matches?field=bookIdentifier&value=9780132350884&excludeBookId=book-2",
      expect.anything()
    );
  });
});
