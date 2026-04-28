import { describe, expect, it } from "vitest";
import { resolveRoute } from "./router.js";

describe("resolveRoute", () => {
  it("maps MVP paths to route names", () => {
    expect(resolveRoute("/")).toEqual({ name: "books" });
    expect(resolveRoute("/books")).toEqual({ name: "books" });
    expect(resolveRoute("/books/new")).toEqual({ name: "bookNew" });
    expect(resolveRoute("/books/book-1")).toEqual({ name: "bookDetail", id: "book-1" });
    expect(resolveRoute("/books/book-1/edit")).toEqual({ name: "bookEdit", id: "book-1" });
    expect(resolveRoute("/locations")).toEqual({ name: "locations" });
    expect(resolveRoute("/classification-tags")).toEqual({ name: "classificationTags" });
    expect(resolveRoute("/data")).toEqual({ name: "data" });
  });

  it("returns notFound for unknown paths", () => {
    expect(resolveRoute("/unknown")).toEqual({ name: "notFound" });
  });
});
