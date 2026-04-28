import { afterEach, describe, expect, it, vi } from "vitest";
import { createBook, deleteBook } from "./client.js";

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not send a JSON content type for requests without a body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteBook("00000000-0000-4000-8000-000000000000");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Headers;

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/books/00000000-0000-4000-8000-000000000000",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("sends a JSON content type for requests with a body", async () => {
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
});
