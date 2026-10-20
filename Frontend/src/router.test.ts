import { afterEach, describe, expect, it, vi } from "vitest";
import { navigateTo, resolveRoute } from "./router.js";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("navigateTo", () => {
  it("scrolls to the top before notifying the app about a new route", () => {
    const calls: string[] = [];
    const pushState = vi.fn(() => calls.push("history"));
    const scrollTo = vi.fn(() => calls.push("scroll"));
    const dispatchEvent = vi.fn(() => {
      calls.push("navigate");
      return true;
    });

    vi.stubGlobal("window", {
      history: { pushState },
      scrollTo,
      dispatchEvent
    });
    vi.stubGlobal(
      "PopStateEvent",
      class {
        readonly type: string;
        constructor(type: string) {
          this.type = type;
        }
      }
    );

    navigateTo("/books/test-book");

    expect(pushState).toHaveBeenCalledWith({}, "", "/books/test-book");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "popstate" }));
    expect(calls).toEqual(["history", "scroll", "navigate"]);
  });
});
