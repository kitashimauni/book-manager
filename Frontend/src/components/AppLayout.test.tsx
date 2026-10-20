import { describe, expect, it } from "vitest";
import { getActiveNavigationHref, getContentHeaderClassName } from "./AppLayout.js";

describe("getContentHeaderClassName", () => {
  it("marks the header when a backend warning is present", () => {
    expect(getContentHeaderClassName("warning")).toBe("content-header has-backend-status");
  });

  it("leaves the header unmarked when the backend is healthy", () => {
    expect(getContentHeaderClassName(null)).toBe("content-header");
  });
});

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
