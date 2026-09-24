"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FormField, type FormFieldProps } from "./FormField";
import styles from "./PasswordField.module.css";

/** A FormField with a show/hide toggle. Shared by auth, settings and reset. */
export function PasswordField(props: Omit<FormFieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          className={styles.eye}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      }
    />
  );
}
