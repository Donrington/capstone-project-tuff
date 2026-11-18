import { JOINTS, pickVisibleSide, type Landmark2D } from "@/lib/rep-counter/geometry";

/**
 * Draws the tracked side's skeleton on the overlay canvas. Both the video and
 * this canvas are mirrored with the same CSS transform, so landmarks can be
 * drawn in the camera's raw coordinate space and still line up on screen.
 */
export function drawPose(canvas: HTMLCanvasElement | null, landmarks: readonly Landmark2D[] | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const side = landmarks ? pickVisibleSide(landmarks) : null;
  if (!side || !landmarks) return;

  const joints = JOINTS[side];
  const accent = getComputedStyle(canvas).getPropertyValue("--accent-volt").trim() || "#d7ff3d";
  const at = (index: number) => ({
    x: landmarks[index].x * canvas.width,
    y: landmarks[index].y * canvas.height,
  });

  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, canvas.width / 260);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const chain of [
    [joints.shoulder, joints.elbow, joints.wrist],
    [joints.shoulder, joints.hip, joints.ankle],
    [joints.hip, joints.knee, joints.ankle],
  ]) {
    ctx.beginPath();
    chain.forEach((index, position) => {
      const point = at(index);
      if (position === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  for (const index of Object.values(joints)) {
    const point = at(index);
    ctx.beginPath();
    ctx.arc(point.x, point.y, ctx.lineWidth * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
