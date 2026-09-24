"use client";

import { useEffect, useRef } from "react";

interface LoopingVideoProps {
  src: string;
  poster: string;
  className?: string;
}

/**
 * A decorative background loop. It plays only while it's on screen, and never
 * under reduced motion, where the poster stays up. There's no `autoPlay` in
 * the markup, so nothing moves before hydration decides.
 */
export function LoopingVideo({ src, poster, className }: LoopingVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // React doesn't always reflect `muted` onto the element, and browsers
    // only allow unattended playback when it's set.
    video.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            /* autoplay can be refused (data saver, low power) — the poster stays up */
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      disablePictureInPicture
      preload="metadata"
      aria-hidden="true"
    />
  );
}
