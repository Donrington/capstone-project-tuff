import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getCurrentUser, getSuggestedChallenges } from "@/lib/data";
import { noIndex } from "@/lib/seo";
import styles from "./onboarding.module.css";

export const metadata: Metadata = { title: "Get set up", ...noIndex };

/** Outside the app shell on purpose: no nav, one question at a time. */
export default async function OnboardingPage() {
  const [user, suggestions] = await Promise.all([getCurrentUser(), getSuggestedChallenges()]);

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/dashboard" aria-label="TUFF dashboard" className={styles.brand}>
          <Image src="/logo/logo_2.png" alt="" width={340} height={113} priority className={styles.logo} />
        </Link>
      </header>
      <main className={styles.main}>
        <OnboardingFlow firstName={user.firstName} suggestions={suggestions} />
      </main>
    </div>
  );
}
