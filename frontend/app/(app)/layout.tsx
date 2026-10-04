import type { Metadata } from "next";
import { AppNav } from "@/components/nav/app-nav";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { getActiveChallenges } from "@/lib/data";
import { noIndex } from "@/lib/seo";
import { AppProviders } from "./providers";
import styles from "./layout.module.css";

// Everything in the app sits behind a sign-in.
export const metadata: Metadata = noIndex;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const challenges = await getActiveChallenges();

  return (
    <AppProviders challenges={challenges}>
      <div className={styles.shell}>
        <SmoothScroll />
        <AppNav />
        <div className={styles.content}>
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </AppProviders>
  );
}
