import { describe, expect, it } from "vitest";
import { getIsbnEquivalentValues, isValidIsbn } from "./isbn.js";

describe("isValidIsbn", () => {
  it("accepts a valid ISBN-13", () => {
    expect(isValidIsbn("9780132350884")).toBe(true);
  });

  it("rejects a valid JAN that does not use an ISBN prefix", () => {
    expect(isValidIsbn("4901234567894")).toBe(false);
  });

  it("returns the ISBN-10 and ISBN-13 equivalents for 978 ISBNs", () => {
    expect(getIsbnEquivalentValues("978-0-306-40615-7")).toEqual([
      "9780306406157",
      "0306406152"
    ]);
  });

  it("does not invent an ISBN-10 equivalent for 979 ISBNs", () => {
    expect(getIsbnEquivalentValues("979-10-90636-07-1")).toEqual(["9791090636071"]);
  });
});
