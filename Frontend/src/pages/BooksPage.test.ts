import { describe, expect, it } from "vitest";
import { resolveBookViewMode } from "./BooksPage.js";

describe("resolveBookViewMode", () => {
  it("keeps cards as the effective mode on compact viewports", () => {
    expect(resolveBookViewMode("dense", true)).toBe("cards");
  });

  it("keeps the selected mode on desktop viewports", () => {
    expect(resolveBookViewMode("dense", false)).toBe("dense");
  });
});
