import type { TextareaHTMLAttributes } from "react";
import styles from "./TextArea.module.css";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
  error?: boolean;
}

/** FormField's pattern for multi-line input — radius-lg instead of a pill. */
export function TextArea({
  label,
  helperText,
  error,
  id,
  className,
  rows = 3,
  ...rest
}: TextAreaProps) {
  const fieldId = id ?? `textarea-${(rest.name ?? label).toString().toLowerCase().replace(/\s+/g, "-")}`;
  const helperId = helperText ? `${fieldId}-helper` : undefined;

  return (
    <div className={styles.group}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        className={[styles.input, error ? styles.error : "", className].filter(Boolean).join(" ")}
        aria-invalid={error || undefined}
        aria-describedby={helperId}
        {...rest}
      />
      {helperText && (
        <div id={helperId} className={`${styles.helper} ${error ? styles.helperError : ""}`}>
          {helperText}
        </div>
      )}
    </div>
  );
}
