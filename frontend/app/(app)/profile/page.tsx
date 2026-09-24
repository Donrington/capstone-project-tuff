import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { StatTiles } from "@/components/profile/StatTiles";
import { AchievementsGrid } from "@/components/profile/AchievementsGrid";
import { PersonalBestsList } from "@/components/profile/PersonalBestsList";
import { ActiveChallengeTiles } from "@/components/profile/ActiveChallengeTiles";
import { RecentActivityList } from "@/components/profile/RecentActivityList";
import { getProfile } from "@/lib/data";
import styles from "./profile.module.css";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await getProfile();
  const now = new Date().toISOString();

  return (
    <div>
      <PageHeader kicker="Profile" title="Your profile" />

      <ProfileHero user={profile.user} />
      <StatTiles stats={profile.stats} />
      <AchievementsGrid achievements={profile.achievements} />

      <div className={styles.row}>
        <PersonalBestsList bests={profile.personalBests} />
        <ActiveChallengeTiles challenges={profile.activeChallenges} />
      </div>

      <RecentActivityList entries={profile.recentActivity} now={now} />
    </div>
  );
}
