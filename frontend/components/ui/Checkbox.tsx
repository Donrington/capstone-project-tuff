import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Checkbox.module.css";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  error?: string;
}

/** Native checkbox, restyled — the one control that uses radius-xs. */
export function Checkbox({ label, error, id, ...rest }: CheckboxProps) {
  const inputId = id ?? `check-${rest.name ?? "box"}`;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className={styles.wrap}>
      <label htmlFor={inputId} className={styles.row}>
        <input
          id={inputId}
          type="checkbox"
          className={`${styles.box} ${error ? styles.boxError : ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          {...rest}
        />
        <span className={styles.label}>{label}</span>
      </label>
      {error && (
        <div id={errorId} className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}
