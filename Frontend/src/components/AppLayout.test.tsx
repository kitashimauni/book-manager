import { describe, expect, it } from "vitest";
import { getActiveNavigationHref } from "./AppLayout.js";

describe("getActiveNavigationHref", () => {
  it.each([
    ["/", "/books"],
    ["/books", "/books"],
    ["/books/new", "/books/new"],
    ["/books/book-1", "/books"],
    ["/books/book-1/edit", "/books"],
    ["/locations", "/locations"],
    ["/classification-tags", "/classification-tags"],
    ["/data", "/data"]
  ])("maps %s to %s", (currentPath, expectedHref) => {
    expect(getActiveNavigationHref(currentPath)).toBe(expectedHref);
  });

  it("does not activate a navigation item for unknown routes", () => {
    expect(getActiveNavigationHref("/unknown")).toBeNull();
  });
});
