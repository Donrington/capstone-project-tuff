import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  helperText?: string;
  error?: boolean;
  placeholder?: string;
}

/** A native `<select>` wearing FormField's 52px pill. */
export function Select({
  label,
  options,
  helperText,
  error,
  placeholder,
  id,
  className,
  ...rest
}: SelectProps) {
  const selectId = id ?? `select-${(rest.name ?? label).toString().toLowerCase().replace(/\s+/g, "-")}`;
  const helperId = helperText ? `${selectId}-helper` : undefined;

  return (
    <div className={styles.group}>
      <label htmlFor={selectId} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <select
          id={selectId}
          className={[styles.select, error ? styles.error : "", className].filter(Boolean).join(" ")}
          aria-invalid={error || undefined}
          aria-describedby={helperId}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
      </div>
      {helperText && (
        <div id={helperId} className={`${styles.helper} ${error ? styles.helperError : ""}`}>
          {helperText}
        </div>
      )}
    </div>
  );
}
