"use client";

import { useState } from "react";

/**
 * The photo layer of an Avatar. If the image fails to load it removes itself,
 * so the initials rendered underneath show through instead of a broken image.
 */
export function AvatarPhoto({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // Plain <img>, deliberately: photos are data URLs already resized to the
    // exact pixels an avatar needs (see lib/image.ts), so next/image's
    // optimizer has nothing to add.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={className} onError={() => setFailed(true)} />
  );
}
