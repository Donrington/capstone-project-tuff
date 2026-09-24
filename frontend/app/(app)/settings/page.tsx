import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { getCurrentUser } from "@/lib/data";
import styles from "./settings.module.css";

export const metadata: Metadata = { title: "Settings" };

/**
 * Only Profile is built. The rest of the roadmap's sections (Account, Goals,
 * Notifications, Appearance, Connected trackers, Privacy) land later —
 * each gets its own `id` and its own server action when it does, same as
 * this one, so `/settings#goals` etc. will just work.
 */
export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <PageHeader kicker="Settings" title="Settings" />
      <div className={styles.content}>
        <ProfileSection user={user} />
      </div>
    </div>
  );
}
