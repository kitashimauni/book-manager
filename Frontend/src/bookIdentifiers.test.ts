import { describe, expect, it } from "vitest";
import {
  getBookIdentifierInputValue,
  getBookLookupValue,
  interpretBookIdentifier,
  mergeLookupIdentifiers
} from "./bookIdentifiers.js";

describe("interpretBookIdentifier", () => {
  it("stores ISBN-10 as ISBN without treating it as a physical barcode", () => {
    expect(interpretBookIdentifier("ISBN 0-306-40615-2")).toEqual({
      bookBarcode: "",
      isbn: "0306406152"
    });
  });

  it("stores an ISBN-13 as both the book barcode and ISBN", () => {
    expect(interpretBookIdentifier("978-0-13-235088-4")).toEqual({
      bookBarcode: "9780132350884",
      isbn: "9780132350884"
    });
  });

  it("keeps a valid non-ISBN JAN out of the ISBN field", () => {
    expect(interpretBookIdentifier("4901234567894")).toEqual({
      bookBarcode: "4901234567894",
      isbn: ""
    });
  });

  it("keeps an arbitrary barcode prefix out of the ISBN field", () => {
    expect(interpretBookIdentifier("BOOK-9780132350884")).toEqual({
      bookBarcode: "BOOK-9780132350884",
      isbn: ""
    });
  });
});

describe("book identifier lookup helpers", () => {
  it("uses a valid legacy ISBN when a distinct physical barcode is present", () => {
    expect(
      getBookLookupValue({
        bookBarcode: "4901234567890",
        isbn: "0306406152"
      })
    ).toBe("0306406152");
  });

  it("does not copy an ISBN-10 lookup value into bookBarcode", () => {
    expect(
      mergeLookupIdentifiers(
        { bookBarcode: "", isbn: "" },
        "0306406152",
        "0306406152"
      )
    ).toEqual({
      bookBarcode: "",
      isbn: "0306406152"
    });
  });

  it("preserves distinct existing values while applying lookup metadata", () => {
    const identifiers = {
      bookBarcode: "4901234567890",
      isbn: "0306406152"
    };

    expect(getBookIdentifierInputValue(identifiers)).toBe("4901234567890");
    expect(mergeLookupIdentifiers(identifiers, "0306406152", "9780132350884")).toEqual({
      bookBarcode: "4901234567890",
      isbn: "9780132350884"
    });
  });
});
