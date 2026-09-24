import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./FormField.module.css";

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: boolean;
  /** Rendered inside the field, right-aligned — e.g. a show/hide password toggle. */
  trailing?: ReactNode;
  /** Rendered on the label row, right-aligned — e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
}

/**
 * One pill text field, driven by native states — focus and disabled are
 * styled via :focus-visible / :disabled, not manually applied classes. An
 * error always pairs the red border with plain-language helper text, never
 * color alone.
 */
export function FormField({
  label,
  helperText,
  error,
  trailing,
  labelAction,
  id,
  className,
  ...rest
}: FormFieldProps) {
  const inputId = id ?? `field-${(rest.name ?? label).toString().toLowerCase().replace(/\s+/g, "-")}`;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  return (
    <div className={styles.group}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {labelAction}
      </div>
      <div className={styles.control}>
        <input
          id={inputId}
          className={[
            styles.input,
            error ? styles.error : "",
            trailing ? styles.withTrailing : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={error || undefined}
          aria-describedby={helperId}
          {...rest}
        />
        {trailing && <div className={styles.trailing}>{trailing}</div>}
      </div>
      {helperText && (
        <div id={helperId} className={`${styles.helper} ${error ? styles.helperError : ""}`}>
          {helperText}
        </div>
      )}
    </div>
  );
}
