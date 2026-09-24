import Link from "next/link";
import type { IconType } from "react-icons";
import { FaInstagram, FaTiktok, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { FOOTER_ITEMS } from "@/lib/nav/items";
import { siteConfig, type SocialId } from "@/lib/site-config";
import { FooterWordmark } from "./footer-wordmark";
import styles from "./site-footer.module.css";

const SOCIAL_ICONS: Record<SocialId, IconType> = {
  whatsapp: FaWhatsapp,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  x: FaXTwitter,
};

/**
 * The About page footer: one quiet row of links and socials, then the brand
 * name in the volt-to-surge gradient. A server component with no client JS;
 * the hovers and the scroll reveal are CSS.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.card}>
        <div className={styles.top}>
          <nav aria-label="Footer">
            <ul className={styles.links}>
              {FOOTER_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.link}>
                    <span className={styles.linkText}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <ul className={styles.socials} aria-label="TUFF on social media">
            {siteConfig.socials.map(({ id, label, href }) => {
              const Icon = SOCIAL_ICONS[id];
              return (
                <li key={id}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (opens in a new tab)`}
                    className={styles.social}
                  >
                    <Icon aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <FooterWordmark />
      </div>

      <div className={styles.legal}>
        <p>
          © {year} {siteConfig.name}
        </p>
        <address className={styles.address}>
          <a href={`mailto:${siteConfig.email}`} className={styles.legalLink}>
            {siteConfig.email}
          </a>
        </address>
        <nav aria-label="Legal">
          <ul className={styles.legalLinks}>
            <li>
              <Link href="/privacy" className={styles.legalLink}>
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className={styles.legalLink}>
                Terms
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
