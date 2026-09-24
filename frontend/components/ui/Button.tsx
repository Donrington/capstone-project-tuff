import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { SmoothAnchor } from "./SmoothAnchor";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "metal";
type ButtonSize = "md" | "lg";

interface SharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonProps = SharedProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;
type ButtonLinkProps = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & { href: string };

function classesFor(variant: ButtonVariant, size: ButtonSize, fullWidth?: boolean, extra?: string) {
  const variantClass = {
    primary: styles.primary,
    secondary: styles.secondary,
    ghost: styles.ghost,
    metal: styles.metal,
  }[variant];

  return [
    styles.btn,
    variantClass,
    size === "lg" ? styles.lg : "",
    fullWidth ? styles.fullWidth : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The metal variant's animated gradient border and sweeping sheen. */
function MetalShell({
  fullWidth,
  children,
}: {
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={[styles.metalWrap, fullWidth ? styles.fullWidth : ""].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}

function MetalInner({ children }: { children: ReactNode }) {
  return (
    <>
      <span className={styles.shine} aria-hidden="true" />
      <span className={styles.spark} aria-hidden="true">
        ★
      </span>
      <span className={styles.label}>{children}</span>
    </>
  );
}

/**
 * TUFF's pill button. Disabled is the native `disabled` attribute (styled
 * via :disabled) — same shape, never a different one. `aria-busy` keeps a
 * submitting primary button on-brand instead of greying it out.
 *
 * `variant="metal"` is reserved for upgrade/paywall CTAs — deliberately the
 * one button that isn't accent-volt.
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = classesFor(variant, size, fullWidth, className);

  if (variant === "metal") {
    return (
      <MetalShell fullWidth={fullWidth}>
        <button className={classes} {...rest}>
          <MetalInner>{children}</MetalInner>
        </button>
      </MetalShell>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

/**
 * A Button that navigates. Same variants and sizes, rendered as a link. A
 * same-page `#section` href glides there (SmoothAnchor) — next/link has
 * nothing to add for an in-page anchor.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  href,
  children,
  ...rest
}: ButtonLinkProps) {
  const classes = classesFor(variant, size, fullWidth, className);

  if (href.startsWith("#")) {
    return (
      <SmoothAnchor href={href} className={classes} {...rest}>
        {children}
      </SmoothAnchor>
    );
  }

  if (variant === "metal") {
    return (
      <MetalShell fullWidth={fullWidth}>
        <Link href={href} className={classes} {...rest}>
          <MetalInner>{children}</MetalInner>
        </Link>
      </MetalShell>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}
