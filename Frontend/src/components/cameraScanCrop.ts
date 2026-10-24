export type CameraScanCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ElementBounds = Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">;

/**
 * Maps the on-screen guide to pixels in the video frame. The video's actual
 * bounding rectangle and centered object-fit: cover rendering determine the
 * visible source region; the preview container may not match that rectangle.
 */
export function getBarcodeScanCrop(
  videoWidth: number,
  videoHeight: number,
  videoBounds: ElementBounds,
  guideBounds: ElementBounds
): CameraScanCrop | null {
  const dimensions = [
    videoWidth, videoHeight,
    videoBounds.left, videoBounds.top, videoBounds.width, videoBounds.height,
    guideBounds.left, guideBounds.top, guideBounds.width, guideBounds.height
  ];
  if (dimensions.some((dimension) => !Number.isFinite(dimension)) ||
    videoWidth <= 0 || videoHeight <= 0 ||
    videoBounds.width <= 0 || videoBounds.height <= 0 ||
    guideBounds.width <= 0 || guideBounds.height <= 0) {
    return null;
  }

  const scale = Math.max(videoBounds.width / videoWidth, videoBounds.height / videoHeight);
  const imageLeft = videoBounds.left + (videoBounds.width - videoWidth * scale) / 2;
  const imageTop = videoBounds.top + (videoBounds.height - videoHeight * scale) / 2;

  const left = Math.max(0, Math.min(videoWidth, Math.floor((guideBounds.left - imageLeft) / scale)));
  const top = Math.max(0, Math.min(videoHeight, Math.floor((guideBounds.top - imageTop) / scale)));
  const right = Math.max(0, Math.min(videoWidth, Math.ceil((guideBounds.left + guideBounds.width - imageLeft) / scale)));
  const bottom = Math.max(0, Math.min(videoHeight, Math.ceil((guideBounds.top + guideBounds.height - imageTop) / scale)));

  if (right <= left || bottom <= top) {
    return null;
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}
