import styles from "./site-footer.module.css";

/**
 * The TUFF logo as wide as the card: a gradient masked by the one-colour logo
 * (/logo/logo-mono.svg), so it stays sharp at any size. Already mono-based —
 * unlike the <Image> call sites, there is no colour PNG to swap here. The mask
 * is filled with volt/surge in dark mode and ink tones in light mode (see the
 * stylesheet). Decorative, so it's hidden from assistive tech; the legal row
 * names the brand in text.
 */
export function FooterWordmark() {
  return <div className={styles.wordmark} aria-hidden="true" />;
}
