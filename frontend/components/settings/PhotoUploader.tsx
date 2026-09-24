"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { resizeToSquareDataUrl } from "@/lib/image";
import { updateProfilePhotoAction } from "@/app/(app)/actions";
import type { User } from "@/lib/types";
import styles from "./PhotoUploader.module.css";

const MAX_SOURCE_BYTES = 8_000_000; // 8MB — generous; the client downscales anyway
const OUTPUT_SIZE = 320;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function PhotoUploader({ user }: { user: User }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Use a JPEG, PNG, WebP or GIF.");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError("That file's too big. Try something under 8MB.");
      return;
    }

    let resized: string;
    try {
      resized = await resizeToSquareDataUrl(file, OUTPUT_SIZE);
    } catch {
      setError("Couldn't read that image.");
      return;
    }

    startTransition(async () => {
      const result = await updateProfilePhotoAction(resized);
      if (!result.ok) {
        setError(result.error ?? "Couldn't save that photo.");
        return;
      }
      setPhotoUrl(resized);
      toast({ title: "Photo updated.", tone: "success" });
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await updateProfilePhotoAction(null);
      if (!result.ok) {
        setError(result.error ?? "Couldn't remove that photo.");
        return;
      }
      setPhotoUrl(null);
      toast({ title: "Photo removed." });
    });
  }

  return (
    <div className={styles.section}>
      <p className={styles.label}>Profile photo</p>
      <div className={styles.row}>
        <div className={styles.avatarWrap}>
          <Avatar initials={user.initials} size="xl" photoUrl={photoUrl ?? undefined} />
          {pending && (
            <span className={styles.overlay} aria-hidden="true">
              <Loader2 size={20} className={styles.spin} />
            </span>
          )}
        </div>

        <div className={styles.controls}>
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.change}
              onClick={() => inputRef.current?.click()}
              disabled={pending}
            >
              <Camera size={16} strokeWidth={2.25} aria-hidden="true" />
              {photoUrl ? "Change photo" : "Add photo"}
            </button>
            {photoUrl && (
              <button type="button" className={styles.remove} onClick={handleRemove} disabled={pending}>
                <X size={16} strokeWidth={2.25} aria-hidden="true" />
                Remove
              </button>
            )}
          </div>
          <p className={error ? styles.error : styles.hint}>
            {error ?? "JPEG, PNG, WebP or GIF. Up to 8MB."}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          aria-label="Upload profile photo"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = ""; // lets picking the same file twice still fire onChange
            if (file) void handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
