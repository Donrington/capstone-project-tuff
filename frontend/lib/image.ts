/**
 * Client-only. Center-crops `file` to a square and downscales it to
 * `size`×`size`, so an avatar photo never balloons past what a circle
 * actually needs — a phone photo comes in at several MB; this comes back out
 * at tens of KB. Uses the browser's canvas, so it only runs from a
 * `"use client"` component.
 */
export function resizeToSquareDataUrl(file: File, size: number, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("This browser can't process images here."));
        return;
      }

      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't read that image."));
    };

    img.src = objectUrl;
  });
}
