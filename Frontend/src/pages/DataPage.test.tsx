import { describe, expect, it } from "vitest";
import { createFileReadError } from "./DataPage.js";

describe("DataPage file import errors", () => {
  it("converts file read failures into an API-shaped error", () => {
    expect(createFileReadError(new Error("permission denied"))).toEqual({
      message:
        "JSONファイルを読み込めませんでした。ファイルを確認して再度お試しください。 (permission denied)",
      status: 400
    });
  });

  it("uses a generic message for unknown file read failures", () => {
    expect(createFileReadError(null)).toEqual({
      message: "JSONファイルを読み込めませんでした。ファイルを確認して再度お試しください。",
      status: 400
    });
  });
});
