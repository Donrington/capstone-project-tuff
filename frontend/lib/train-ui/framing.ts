import { isVisible, type Landmark2D } from "@/lib/rep-counter/geometry";

/**
 * Framing check for the silhouette guide. A side-on phone camera often can't
 * see both arms or legs, so this asks only for a head, a shoulder, a hip and an
 * ankle — and requires them to sit inside the frame with a small margin.
 */
export function bodyFitsFrame(landmarks: readonly Landmark2D[] | null | undefined): boolean {
  if (!landmarks || landmarks.length < 29) return false;
  const margin = 0.015;
  const visibleInFrame = (index: number) => {
    const point = landmarks[index];
    return (
      isVisible(point) &&
      point.x >= margin &&
      point.x <= 1 - margin &&
      point.y >= margin &&
      point.y <= 1 - margin
    );
  };
  const anyVisible = (indices: readonly number[]) => indices.some(visibleInFrame);

  return (
    visibleInFrame(0) &&
    anyVisible([11, 12]) &&
    anyVisible([23, 24]) &&
    anyVisible([27, 28])
  );
}
