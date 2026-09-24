import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Switch.module.css";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  /** Sits under the label — what turning it on actually does. */
  hint?: string;
}

/**
 * A native checkbox with `role="switch"`, so it still posts with the form
 * while announcing as on/off.
 */
export function Switch({ label, hint, id, name, className, ...rest }: SwitchProps) {
  const inputId = id ?? `switch-${name ?? "toggle"}`;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className={[styles.row, className].filter(Boolean).join(" ")}>
      <label htmlFor={inputId} className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )}
      </label>
      <input
        id={inputId}
        name={name}
        type="checkbox"
        role="switch"
        className={styles.track}
        aria-describedby={hintId}
        {...rest}
      />
    </div>
  );
}
