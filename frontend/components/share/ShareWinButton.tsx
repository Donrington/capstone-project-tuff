"use client";

import { useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import styles from "./ShareWinButton.module.css";

export interface ShareWinButtonProps {
  /** Same-origin image route, including its query string. */
  href: string;
  filename: string;
  title: string;
  text: string;
  /** The profile tile uses the compact size; the challenge page uses the default. */
  size?: "sm" | "md";
}

export function ShareWinButton({ href, filename, title, text, size = "md" }: ShareWinButtonProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function shareWin() {
    if (pending) return;
    setPending(true);
    let objectUrl: string | null = null;

    try {
      // Credentials matter: the card is private to the signed-in user.
      const response = await fetch(href, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(`Card request failed (${response.status})`);

      const blob = await response.blob();
      const file = new File([blob], filename, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text });
        } catch (error) {
          // Closing the native sheet is a choice, not a failure worth a toast.
          const name = error instanceof Error ? error.name : (error as { name?: string } | null)?.name;
          if (name === "AbortError") return;
          throw error;
        }
        return;
      }

      // Desktop (and browsers without file sharing) gets a plain download.
      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({ title: "Couldn't make your card — try again.", tone: "danger" });
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      className={size === "sm" ? styles.small : undefined}
      onClick={shareWin}
      disabled={pending}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <>
          <Loader2 size={size === "sm" ? 14 : 18} className={styles.spin} aria-hidden="true" />
          Making card…
        </>
      ) : (
        <>
          <Share2 size={size === "sm" ? 14 : 18} strokeWidth={2.25} aria-hidden="true" />
          Share your win
        </>
      )}
    </Button>
  );
}
