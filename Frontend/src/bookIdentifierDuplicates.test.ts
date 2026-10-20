import { describe, expect, it } from "vitest";
import {
  consumeIdentifierCheckSkipKey,
  getIdentifierCheckKey,
  getIdentifierCheckRequests,
  mergeIdentifierMatches
} from "./bookIdentifierDuplicates.js";

describe("book identifier duplicate helpers", () => {
  it("checks distinct book identifiers and the management barcode", () => {
    expect(
      getIdentifierCheckRequests({
        bookBarcode: "9780132350884",
        isbn: "9780132350884",
        managementBarcode: "BM-001"
      })
    ).toEqual([
      { field: "bookIdentifier", value: "9780132350884" },
      { field: "managementBarcode", value: "BM-001" }
    ]);
  });

  it("merges duplicate matches from separate ISBN and barcode checks", () => {
    expect(
      mergeIdentifierMatches([
        [{ id: "book-2", title: "Second" }, { id: "book-1", title: "First" }],
        [{ id: "book-1", title: "First" }, { id: "book-3", title: "Third" }]
      ])
    ).toEqual([
      { id: "book-1", title: "First" },
      { id: "book-2", title: "Second" },
      { id: "book-3", title: "Third" }
    ]);
  });

  it("creates a stable key from trimmed values for debounce cancellation", () => {
    expect(
      getIdentifierCheckKey({
        bookBarcode: "  9780132350884 ",
        isbn: "",
        managementBarcode: " BM-001 "
      })
    ).toBe("9780132350884\u0000\u0000BM-001");
  });

  it("consumes a camera-scan skip key even when the next value differs", () => {
    const firstScanKey = getIdentifierCheckKey({
      bookBarcode: "A",
      isbn: "",
      managementBarcode: ""
    });
    const secondValueKey = getIdentifierCheckKey({
      bookBarcode: "B",
      isbn: "",
      managementBarcode: ""
    });
    const originalValueKey = getIdentifierCheckKey({
      bookBarcode: "A",
      isbn: "",
      managementBarcode: ""
    });

    const afterSecondValue = consumeIdentifierCheckSkipKey(firstScanKey, secondValueKey);
    const afterReturningToOriginal = consumeIdentifierCheckSkipKey(
      afterSecondValue.nextSkipKey,
      originalValueKey
    );

    expect(afterSecondValue).toEqual({ shouldSkip: false, nextSkipKey: null });
    expect(afterReturningToOriginal).toEqual({ shouldSkip: false, nextSkipKey: null });
  });
});
