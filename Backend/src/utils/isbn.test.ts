import { describe, expect, it } from "vitest";
import { isValidIsbn } from "./isbn.js";

describe("isValidIsbn", () => {
  it("accepts a valid ISBN-13", () => {
    expect(isValidIsbn("9780132350884")).toBe(true);
  });

  it("rejects a valid JAN that does not use an ISBN prefix", () => {
    expect(isValidIsbn("4901234567894")).toBe(false);
  });
});
