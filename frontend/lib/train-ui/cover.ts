/**
 * Pure geometry for the camera stage overlay.
 *
 * The <video> uses `object-fit: cover` and is mirrored with CSS. MediaPipe's
 * landmarks are normalised against the *unmirrored, uncropped* video frame, so
 * drawing them straight onto a canvas that spans the stage puts them in the
 * wrong place. This module computes the same transform the browser applies:
 *
 *   drawn = point * videoSize * scale + offset   (object-fit: cover)
 *   x     = stageWidth - drawn.x                 (CSS scaleX(-1))
 *
 * No DOM types or browser globals here, so it can be unit-tested under node.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CoverTransform {
  videoWidth: number;
  videoHeight: number;
  stageWidth: number;
  stageHeight: number;
  /** Uniform scale applied to the video to cover the stage. */
  scale: number;
  /** Centring offset in CSS pixels; negative when the video is cropped. */
  offsetX: number;
  offsetY: number;
}

const positive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

/** The cover scale and centring offsets for a video painted into a stage. */
export function coverTransform(video: Size, stage: Size): CoverTransform {
  const videoWidth = positive(video.width, 1);
  const videoHeight = positive(video.height, 1);
  const stageWidth = positive(stage.width, 1);
  const stageHeight = positive(stage.height, 1);
  const scale = Math.max(stageWidth / videoWidth, stageHeight / videoHeight);
  return {
    videoWidth,
    videoHeight,
    stageWidth,
    stageHeight,
    scale,
    offsetX: (stageWidth - videoWidth * scale) / 2,
    offsetY: (stageHeight - videoHeight * scale) / 2,
  };
}

/**
 * Maps a normalised landmark into canvas pixels. Mirroring defaults to true to
 * match the mirrored preview; pass `mirror: false` to draw raw frame coords.
 * `pixelRatio` scales the result for a devicePixelRatio-sized canvas.
 */
export function mapCoverPoint(
  point: Point,
  transform: CoverTransform,
  options: { mirror?: boolean; pixelRatio?: number } = {},
): Point {
  const { mirror = true, pixelRatio = 1 } = options;
  const ratio = positive(pixelRatio, 1);
  const drawnX = point.x * transform.videoWidth * transform.scale + transform.offsetX;
  const drawnY = point.y * transform.videoHeight * transform.scale + transform.offsetY;
  return {
    x: (mirror ? transform.stageWidth - drawnX : drawnX) * ratio,
    y: drawnY * ratio,
  };
}
