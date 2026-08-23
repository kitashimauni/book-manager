import { describe, expect, it } from "vitest";
import { appendVolumeMetadata } from "./lookupTitle.js";

describe("appendVolumeMetadata", () => {
  it.each([
    ["シリーズ第1巻", "1"],
    ["シリーズ上巻", "上巻"],
    ["Ｖｏｌｕｍｅ Ⅰ", "Ⅰ"]
  ])("does not duplicate metadata already present in %s", (title, volumeMetadata) => {
    expect(appendVolumeMetadata(title, volumeMetadata)).toBe(title);
  });

  it("keeps the original title while normalizing only comparison values", () => {
    expect(appendVolumeMetadata("Ｖｏｌｕｍｅ", "2")).toBe("Ｖｏｌｕｍｅ 2");
  });
});
