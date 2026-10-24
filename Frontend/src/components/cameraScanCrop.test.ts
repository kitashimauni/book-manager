import { describe, expect, it } from "vitest";
import { getBarcodeScanCrop } from "./cameraScanCrop.js";

describe("getBarcodeScanCrop", () => {
  it("maps a centered guide to source pixels with object-fit: cover", () => {
    expect(
      getBarcodeScanCrop(
        1600, 800,
        { left: 100, top: 80, width: 400, height: 300 },
        { left: 180, top: 200, width: 240, height: 60 }
      )
    ).toEqual({ x: 480, y: 320, width: 640, height: 160 });
  });

  it("uses the actual on-screen guide position rather than assuming it is centered", () => {
    expect(
      getBarcodeScanCrop(
        1600, 800,
        { left: 100, top: 80, width: 400, height: 300 },
        { left: 150, top: 155, width: 240, height: 60 }
      )
    ).toEqual({ x: 400, y: 200, width: 640, height: 160 });
  });

  it("handles portrait video cropped vertically by object-fit: cover", () => {
    expect(
      getBarcodeScanCrop(
        800, 1600,
        { left: 50, top: 100, width: 300, height: 200 },
        { left: 110, top: 170, width: 180, height: 60 }
      )
    ).toEqual({ x: 160, y: 720, width: 480, height: 160 });
  });

  it("rejects invalid dimensions and guide regions outside the video", () => {
    expect(
      getBarcodeScanCrop(
        0, 800,
        { left: 0, top: 0, width: 400, height: 300 },
        { left: 50, top: 50, width: 100, height: 40 }
      )
    ).toBeNull();
    expect(
      getBarcodeScanCrop(
        1600, 800,
        { left: 0, top: 0, width: 400, height: 300 },
        { left: 600, top: 600, width: 100, height: 40 }
      )
    ).toBeNull();
  });

  it("clips a guide overlapping the video edge to valid source pixels", () => {
    expect(
      getBarcodeScanCrop(
        640, 480,
        { left: 0, top: 0, width: 320, height: 240 },
        { left: -90, top: -30, width: 500, height: 300 }
      )
    ).toEqual({ x: 0, y: 0, width: 640, height: 480 });
  });
});
