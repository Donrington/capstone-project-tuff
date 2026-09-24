import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { AboutNavMenu } from "./about-nav-menu";
import { AboutSectionLinks } from "./about-section-links";
import styles from "./AboutNav.module.css";

/** "app" when the visitor came from inside the app, "public" from the auth page. */
export type AboutContext = "app" | "public";

/**
 * The About page's bar, in the same language as the app's nav: a frosted
 * pill, icon links with a volt notch on the section you're reading, a
 * liquid-glass call to action, a reading-progress line, and on small screens
 * a menu button that opens a drawer.
 */
export function AboutNav({ context }: { context: AboutContext }) {
  const inApp = context === "app";
  const homeHref = inApp ? "/dashboard" : "/";
  const homeLabel = inApp ? "TUFF dashboard" : "TUFF home";

  const drawerActions = inApp ? (
    <ButtonLink href="/dashboard" size="lg" fullWidth>
      <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
      Back to dashboard
    </ButtonLink>
  ) : (
    <>
      <ButtonLink href="/" size="lg" fullWidth>
        Join TUFF
        <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
      </ButtonLink>
      <ButtonLink href="/?mode=signin" variant="ghost" size="lg" fullWidth>
        Sign in
      </ButtonLink>
    </>
  );

  return (
    <header className={styles.bar}>
      <AboutNavMenu homeHref={homeHref} homeLabel={homeLabel} actions={drawerActions} />

      <Link href={homeHref} className={styles.brand} aria-label={homeLabel}>
        <Image
          src="/logo/logo_2.png"
          alt=""
          width={340}
          height={113}
          loading="eager"
          className={styles.logo}
        />
      </Link>

      <AboutSectionLinks variant="bar" />

      <div className={styles.actions}>
        {inApp ? (
          <ButtonLink href="/dashboard">
            <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
            Dashboard
          </ButtonLink>
        ) : (
          <>
            <ButtonLink href="/?mode=signin" variant="ghost" className={styles.signIn}>
              Sign in
            </ButtonLink>
            <ButtonLink href="/">Join TUFF</ButtonLink>
          </>
        )}
      </div>
    </header>
  );
}
