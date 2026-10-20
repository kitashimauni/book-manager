import { describe, expect, it } from "vitest";
import { getHealthError } from "./App.js";

describe("getHealthError", () => {
  it("does not report an error for a healthy API and database", () => {
    expect(
      getHealthError({
        ok: true,
        service: "book-manager-backend",
        database: "ok"
      })
    ).toBeNull();
  });

  it("reports a database error even when the API responds", () => {
    expect(
      getHealthError({
        ok: true,
        service: "book-manager-backend",
        database: "error"
      })
    ).toEqual({
      message: "データベースの状態が「error」です。",
      status: 503
    });
  });

  it("reports an unhealthy API response", () => {
    expect(
      getHealthError({
        ok: false,
        service: "book-manager-backend",
        database: "ok"
      })
    ).toEqual({
      message: "APIまたはデータベースのヘルスチェックが正常ではありません。",
      status: 503
    });
  });
});
