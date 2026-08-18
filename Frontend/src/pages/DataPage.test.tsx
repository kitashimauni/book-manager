import { describe, expect, it } from "vitest";
import {
  createFileReadError,
  getBulkOverwriteConfirmationMessage,
  getImportConfirmationMessage
} from "./DataPage.js";

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

  it("makes bulk overwrite confirmation explicit", () => {
    expect(getBulkOverwriteConfirmationMessage(3)).toContain("競合している3件");
    expect(getBulkOverwriteConfirmationMessage(3)).toContain("既存データ");
  });

  it("warns before importing conflicts selected for overwrite", () => {
    const conflicts = [
      {
        entity: "book" as const,
        matchBy: "id" as const,
        incomingId: "book-incoming",
        existingId: "book-existing",
        defaultAction: "skip" as const,
        availableActions: ["skip" as const, "overwrite" as const]
      }
    ];

    expect(getImportConfirmationMessage(conflicts, { "book:book-incoming:book-existing": "overwrite" }, "skip"))
      .toContain("既存データ1件を上書き");
    expect(getImportConfirmationMessage(conflicts, {}, "skip")).toContain("既存データは無視");
  });
});
