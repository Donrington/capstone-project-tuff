"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import styles from "./Toast.module.css";

export type ToastTone = "neutral" | "success" | "danger";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastRecord extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

/** `toast({ title, description?, tone?, action? })` from any client component. */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>.");
  return toast;
}

const MAX_VISIBLE = 3;
const DURATION = 5000;
const EXIT = 180;

const TONE_ICON = {
  neutral: Info,
  success: CircleCheck,
  danger: TriangleAlert,
} as const;

/**
 * One polite live region for the whole app, stacking at most three toasts.
 * They auto-dismiss after 5s, paused while the stack is hovered or focused.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [paused, setPaused] = useState(false);
  const nextId = useRef(0);

  const toast = useCallback((options: ToastOptions) => {
    setToasts((current) => [...current, { ...options, id: nextId.current++ }].slice(-MAX_VISIBLE));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className={styles.region}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <ol className={styles.stack} aria-live="polite" aria-label="Notifications">
          {toasts.map((item) => (
            <ToastItem key={item.id} toast={item} paused={paused} onDismiss={dismiss} />
          ))}
        </ol>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  paused,
  onDismiss,
}: {
  toast: ToastRecord;
  paused: boolean;
  onDismiss: (id: number) => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const remaining = useRef(DURATION);
  const startedAt = useRef(0);

  const close = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => onDismiss(toast.id), EXIT);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (paused || leaving) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(close, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [paused, leaving, close]);

  const Icon = TONE_ICON[toast.tone ?? "neutral"];

  return (
    <li
      className={`${styles.toast} ${styles[toast.tone ?? "neutral"]}`}
      data-leaving={leaving ? "" : undefined}
    >
      <Icon size={18} className={styles.icon} aria-hidden="true" />
      <div className={styles.text}>
        <p className={styles.title}>{toast.title}</p>
        {toast.description && <p className={styles.desc}>{toast.description}</p>}
      </div>
      {toast.action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            toast.action?.onClick();
            close();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className={styles.close} onClick={close} aria-label="Dismiss">
        <X size={16} aria-hidden="true" />
      </button>
    </li>
  );
}
