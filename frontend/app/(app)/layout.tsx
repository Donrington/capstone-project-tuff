import { AppNav } from "@/components/nav/app-nav";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { BackToTop } from "@/components/ui/BackToTop";
import { getActiveChallenges } from "@/lib/data";
import { AppProviders } from "./providers";
import styles from "./layout.module.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const challenges = await getActiveChallenges();

  return (
    <AppProviders challenges={challenges}>
      <div id="top" className={styles.shell}>
        <SmoothScroll />
        <AppNav />
        <div className={styles.content}>
          <main className={styles.main}>{children}</main>
        </div>
        <BackToTop />
      </div>
    </AppProviders>
  );
}
