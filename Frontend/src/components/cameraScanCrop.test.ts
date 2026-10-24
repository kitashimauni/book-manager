import { describe, expect, it } from "vitest";
import { getBarcodeScanCrop } from "./cameraScanCrop.js";

describe("getBarcodeScanCrop", () => {
  it("crops a landscape video to the centered guide, excluding adjacent barcodes", () => {
    expect(getBarcodeScanCrop(1920, 1080, 360, 240, 300, 60)).toEqual({
      x: 285,
      y: 405,
      width: 1350,
      height: 270
    });
  });

  it("accounts for object-fit cover when a portrait camera feed is displayed in a wide preview", () => {
    expect(getBarcodeScanCrop(1080, 1920, 360, 240, 300, 60)).toEqual({
      x: 90,
      y: 870,
      width: 900,
      height: 180
    });
  });

  it("rejects frames without usable dimensions", () => {
    expect(getBarcodeScanCrop(0, 1080, 360, 240, 300, 60)).toBeNull();
    expect(getBarcodeScanCrop(1920, 1080, 0, 240, 300, 60)).toBeNull();
    expect(getBarcodeScanCrop(1920, 1080, 360, 240, Number.NaN, 60)).toBeNull();
  });

  it("never requests pixels outside the original video", () => {
    expect(getBarcodeScanCrop(640, 480, 320, 240, 500, 500)).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 480
    });
  });
});
