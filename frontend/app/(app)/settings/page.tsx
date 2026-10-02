import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountSection } from "@/components/settings/AccountSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";
import { GoalsSection } from "@/components/settings/GoalsSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { TrackersSection } from "@/components/settings/TrackersSection";
import { getCurrentUser } from "@/lib/data";
import styles from "./settings.module.css";

export const metadata: Metadata = { title: "Settings" };

/** Every section is its own form with its own server action, and has an
 *  `id`, so `/settings#goals` etc. land on it. */
export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <PageHeader kicker="Settings" title="Settings" />
      <div className={styles.layout}>
        <SettingsNav />
        <div className={styles.content}>
          <ProfileSection user={user} />
          <AccountSection email={user.email} />
          <GoalsSection stepGoal={user.stepGoal} workoutDaysPerWeek={user.workoutDaysPerWeek} />
          <NotificationsSection prefs={user.notificationPrefs} />
          <AppearanceSection />
          <TrackersSection />
          <PrivacySection privacy={user.privacy} />
          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
}
