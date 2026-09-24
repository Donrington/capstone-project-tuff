"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Share2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { InviteDialog } from "@/components/invite/InviteDialog";
import { formatCount } from "@/lib/challenge-card";
import type { LoggedActivity } from "@/lib/data";
import styles from "./ChallengeComplete.module.css";

const SHAPES = 14;
const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

function spareLine(daysLeft: number) {
  if (daysLeft === 0) return "Right on the last day.";
  if (daysLeft === 1) return "One day to spare.";
  const word = WORDS[daysLeft] ?? formatCount(daysLeft);
  return `${word} days to spare.`;
}

export function ChallengeComplete({
  logged,
  onClose,
}: {
  logged: LoggedActivity | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={logged !== null}
      onClose={onClose}
      size="full"
      hideTitle
      title={logged ? `${logged.challengeName} cleared.` : "Challenge cleared."}
    >
      {logged && <Celebration logged={logged} onClose={onClose} />}
    </Dialog>
  );
}

function Celebration({ logged, onClose }: { logged: LoggedActivity; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const number = useRef<HTMLSpanElement>(null);
  const [sharing, setSharing] = useState(false);

  useGSAP(
    () => {
      const shapes = gsap.utils.toArray<HTMLElement>(`.${styles.shape}`);
      const reveal = [`.${styles.ringWrap}`, `.${styles.count}`, `.${styles.headline}`, `.${styles.sub}`, `.${styles.actions}`];

      const media = gsap.matchMedia();

      // Reduced motion gets the finished picture, with nothing moving.
      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(reveal, { opacity: 1, y: 0, scale: 1 });
        gsap.set(shapes, { opacity: 0 });
        if (number.current) number.current.textContent = formatCount(logged.target);
      });

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const counter = { value: 0 };

        gsap
          .timeline()
          .from(`.${styles.ringWrap}`, { scale: 0.7, opacity: 0, duration: 0.5, ease: "back.out(1.7)" })
          .to(
            counter,
            {
              value: logged.target,
              duration: 1.1,
              ease: "power2.out",
              onUpdate: () => {
                if (number.current) {
                  number.current.textContent = formatCount(Math.round(counter.value));
                }
              },
            },
            "-=0.2",
          )
          .from(`.${styles.count}`, { opacity: 0, y: 14, duration: 0.4 }, "<")
          .from(`.${styles.headline}`, { opacity: 0, y: 16, duration: 0.45 }, "-=0.7")
          .from(`.${styles.sub}`, { opacity: 0, y: 12, duration: 0.4 }, "-=0.3")
          .from(`.${styles.actions}`, { opacity: 0, y: 12, duration: 0.4 }, "-=0.2");

        // Volt and surge shapes burst out of the ring.
        shapes.forEach((shape, i) => {
          const angle = (i / SHAPES) * Math.PI * 2 + gsap.utils.random(-0.25, 0.25);
          const distance = gsap.utils.random(150, 320);
          gsap.fromTo(
            shape,
            { x: 0, y: 0, scale: 0, opacity: 1, rotation: 0 },
            {
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              scale: gsap.utils.random(0.6, 1.4),
              rotation: gsap.utils.random(-220, 220),
              opacity: 0,
              duration: gsap.utils.random(1, 1.6),
              delay: 0.25 + i * 0.015,
              ease: "power2.out",
            },
          );
        });
      });
    },
    { scope: root, dependencies: [logged.challengeId] },
  );

  return (
    <div className={styles.wrap} ref={root}>
      <div className={styles.ringWrap}>
        <div className={styles.burst} aria-hidden="true">
          {Array.from({ length: SHAPES }, (_, i) => (
            <span key={i} className={`${styles.shape} ${i % 2 ? styles.surge : styles.volt}`} />
          ))}
        </div>
        <ProgressRing percent={100} />
      </div>

      <p className={styles.count}>
        <span ref={number}>0</span>
        <span className={styles.countUnit}> {logged.unit}</span>
      </p>

      <h2 className={styles.headline}>{logged.challengeName} cleared.</h2>
      <p className={styles.sub}>{spareLine(logged.daysLeft)}</p>

      <div className={styles.actions}>
        <Button variant="secondary" size="lg" onClick={() => setSharing(true)}>
          <Share2 size={18} strokeWidth={2.25} aria-hidden="true" />
          Share
        </Button>
        <Button size="lg" onClick={onClose}>
          Done
        </Button>
      </div>

      <InviteDialog
        open={sharing}
        onClose={() => setSharing(false)}
        mode="share"
        subject={{ kind: "challenge", name: logged.challengeName, code: logged.code }}
      />
    </div>
  );
}
