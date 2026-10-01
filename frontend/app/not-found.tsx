import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import styles from "./system.module.css";

export const metadata: Metadata = { title: "Not found" };

/** Outside the app shell: any URL that matches nothing. */
export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.mesh} aria-hidden="true" />
      <div className={styles.content}>
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <h1 className={styles.title}>Nothing here.</h1>
        <p className={styles.text}>The page moved or never existed.</p>
        <div className={styles.actions}>
          <ButtonLink href="/dashboard" size="lg">
            Go to your dashboard
          </ButtonLink>
          <ButtonLink href="/?mode=signin" variant="ghost" size="lg">
            Back to sign in
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
