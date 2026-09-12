import { describe, expect, it } from "vitest";
import { normalizeNdc9Code, resolveNdc9Label, type Ndc9Catalog } from "./ndc9.js";

describe("NDC9 catalog", () => {
  it("resolves an official NDC9 code to its contextual label", () => {
    expect(resolveNdc9Label("007.6")).toBe("情報科学--データ処理．情報処理");
  });

  it("normalizes full-width code characters without losing leading zeros", () => {
    expect(normalizeNdc9Code("０07.６")).toBe("007.6");
  });

  it("falls back through the supplied official hierarchy when the exact label is absent", () => {
    const catalog: Ndc9Catalog = {
      "007.6": { label: "", broader: ["007"] },
      "007": { label: "情報科学", broader: [] }
    };

    expect(resolveNdc9Label("007.6", catalog)).toBe("情報科学");
  });

  it("does not expose invalid or missing codes as labels", () => {
    expect(resolveNdc9Label("007/009")).toBeUndefined();
    expect(resolveNdc9Label("999.99")).toBeUndefined();
  });
});
