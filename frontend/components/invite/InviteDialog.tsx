"use client";

import { useEffect, useState } from "react";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import styles from "./InviteDialog.module.css";

export interface InviteSubject {
  kind: "team" | "challenge";
  name: string;
  /** Null for a solo challenge, which has nothing to join. */
  code: string | null;
}

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
  subject: InviteSubject;
  /** "share" swaps the invite copy for achievement copy (#9's celebration). */
  mode?: "invite" | "share";
}

export function InviteDialog({ open, onClose, subject, mode = "invite" }: InviteDialogProps) {
  const toast = useToast();
  const [origin, setOrigin] = useState("");
  const [canShare, setCanShare] = useState(false);

  // Both depend on the browser, so they're read after mount rather than
  // guessed during render.
  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  const link = subject.code ? `${origin}/join/${subject.code}` : origin;
  const message =
    mode === "share"
      ? `I just cleared ${subject.name} on TUFF.`
      : `Join ${subject.name} on TUFF.`;
  const shareText = `${message} ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link copied.", tone: "success" });
    } catch {
      toast({ title: "Couldn't copy that.", description: "Select the link and copy it.", tone: "danger" });
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ text: shareText });
    } catch {
      // The person dismissed the share sheet.
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={mode === "share" ? "Share it" : `Invite to ${subject.name}`}
      description={
        mode === "share"
          ? "Let your team know it's done."
          : "Send the code or the link — either works."
      }
    >
      <div className={styles.body}>
        {mode === "invite" && subject.code && (
          <div className={styles.codeBlock}>
            <span className={styles.codeLabel}>Invite code</span>
            <strong className={styles.code}>{subject.code}</strong>
          </div>
        )}

        {mode === "share" && <p className={styles.message}>{message}</p>}

        <div className={styles.linkRow}>
          <input
            className={styles.link}
            value={link}
            readOnly
            aria-label="Invite link"
            onFocus={(event) => event.currentTarget.select()}
          />
          <button type="button" className={styles.copy} onClick={copy} aria-label="Copy link">
            <Copy size={17} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.actions}>
          <a
            className={styles.whatsapp}
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} strokeWidth={2.25} aria-hidden="true" />
            WhatsApp
          </a>
          {canShare && (
            <Button type="button" variant="ghost" onClick={nativeShare}>
              <Share2 size={18} strokeWidth={2.25} aria-hidden="true" />
              Share…
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
