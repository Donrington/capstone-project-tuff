import { JOINTS, pickVisibleSide, type Landmark2D } from "@/lib/rep-counter/geometry";
import { mapCoverPoint, type CoverTransform } from "@/lib/train-ui/cover";

/** A cover transform expressed in device pixels for the overlay canvas. */
export interface OverlayTransform extends CoverTransform {
  pixelRatio: number;
}

/**
 * Draws the tracked side's skeleton over the video. Landmarks arrive in the
 * camera's raw normalised space; `mapCoverPoint` applies the same cover crop
 * and mirroring as the CSS-painted video, so the lines land on the body even
 * when a portrait stage crops a landscape frame (or vice versa). The canvas
 * itself is NOT CSS-mirrored — doing both would flip the mapping twice.
 */
export function drawPose(
  canvas: HTMLCanvasElement | null,
  landmarks: readonly Landmark2D[] | null,
  transform: OverlayTransform | null,
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const side = landmarks ? pickVisibleSide(landmarks) : null;
  if (!side || !landmarks || !transform) return;

  const joints = JOINTS[side];
  const accent = getComputedStyle(canvas).getPropertyValue("--accent-volt").trim() || "#d7ff3d";
  const at = (index: number) => {
    const point = landmarks[index];
    if (!point) return null;
    return mapCoverPoint(point, transform, { pixelRatio: transform.pixelRatio });
  };

  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, (transform.stageWidth / 260) * transform.pixelRatio);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const chain of [
    [joints.shoulder, joints.elbow, joints.wrist],
    [joints.shoulder, joints.hip, joints.ankle],
    [joints.hip, joints.knee, joints.ankle],
  ]) {
    const points = chain.map(at);
    if (points.some((point) => point === null)) continue;
    ctx.beginPath();
    points.forEach((point, position) => {
      if (!point) return;
      if (position === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  for (const index of Object.values(joints)) {
    const point = at(index);
    if (!point) continue;
    ctx.beginPath();
    ctx.arc(point.x, point.y, ctx.lineWidth * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
