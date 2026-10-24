export type CameraScanCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Maps the centered guide rectangle to camera pixels. The preview uses
 * object-fit: cover, so its visible image can be cropped on either axis.
 * Only this region is sent to the barcode decoder.
 */
export function getBarcodeScanCrop(
  videoWidth: number,
  videoHeight: number,
  previewWidth: number,
  previewHeight: number,
  guideWidth: number,
  guideHeight: number
): CameraScanCrop | null {
  const dimensions = [videoWidth, videoHeight, previewWidth, previewHeight, guideWidth, guideHeight];
  if (dimensions.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)) {
    return null;
  }

  const scale = Math.max(previewWidth / videoWidth, previewHeight / videoHeight);
  const width = Math.min(videoWidth, Math.max(1, Math.round(guideWidth / scale)));
  const height = Math.min(videoHeight, Math.max(1, Math.round(guideHeight / scale)));

  return {
    x: Math.floor((videoWidth - width) / 2),
    y: Math.floor((videoHeight - height) / 2),
    width,
    height
  };
}
