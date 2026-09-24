import styles from "./site-footer.module.css";

/**
 * The TUFF logo as wide as the card, filled with the volt-to-surge gradient:
 * a CSS gradient masked by the one-colour logo (/logo/logo-mono.svg), so it
 * stays sharp at any size. Decorative, so it's hidden from assistive tech;
 * the legal row names the brand in text.
 */
export function FooterWordmark() {
  return <div className={styles.wordmark} aria-hidden="true" />;
}
