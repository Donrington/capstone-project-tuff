"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "./RadioChips.module.css";

export interface ChipOption {
  value: string;
  label: string;
  /** A second line inside the chip — one short sentence. */
  hint?: string;
  disabled?: boolean;
  /** e.g. a Pro badge on a gated choice. */
  badge?: ReactNode;
}

interface RadioChipsProps {
  legend: string;
  name: string;
  options: ChipOption[];
  /** Checkboxes instead of radios, and an array value. */
  multiple?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
  error?: string;
  /** Keeps the legend for screen readers only. */
  hideLegend?: boolean;
}

/**
 * A radio (or checkbox) group drawn as pill chips. The inputs are real, so
 * the group posts with its form and arrow keys work the way they should.
 */
export function RadioChips({
  legend,
  name,
  options,
  multiple,
  value,
  defaultValue,
  onChange,
  error,
  hideLegend,
}: RadioChipsProps) {
  const groupId = useId();
  const errorId = error ? `${groupId}-error` : undefined;
  const [internal, setInternal] = useState<string | string[]>(
    defaultValue ?? (multiple ? [] : ""),
  );
  const current = value ?? internal;

  const isSelected = (option: string) =>
    Array.isArray(current) ? current.includes(option) : current === option;

  function select(option: string) {
    let next: string | string[];
    if (multiple) {
      const list = Array.isArray(current) ? current : [];
      next = list.includes(option) ? list.filter((item) => item !== option) : [...list, option];
    } else {
      next = option;
    }
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }

  return (
    <fieldset className={styles.group} aria-describedby={errorId} aria-invalid={error ? true : undefined}>
      <legend className={hideLegend ? "sr-only" : styles.legend}>{legend}</legend>
      <div className={styles.chips}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`${styles.chip} ${option.hint ? styles.stacked : ""}`}
            data-selected={isSelected(option.value) ? "" : undefined}
            data-disabled={option.disabled ? "" : undefined}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={option.value}
              checked={isSelected(option.value)}
              disabled={option.disabled}
              onChange={() => select(option.value)}
              className={styles.input}
            />
            <span className={styles.labelRow}>
              <span className={styles.label}>{option.label}</span>
              {option.badge}
            </span>
            {option.hint && <span className={styles.hint}>{option.hint}</span>}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
