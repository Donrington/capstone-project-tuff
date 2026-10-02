"use client";

import { useActionState } from "react";
import { FormField } from "@/components/ui/FormField";
import { Switch } from "@/components/ui/Switch";
import { updateNotificationPrefsAction, type ActionState } from "@/app/(app)/actions";
import type { NotificationPrefs } from "@/lib/types";
import { SaveButton, SettingsSection, useSavedToast } from "./SettingsSection";
import styles from "./settings.module.css";

const INITIAL: ActionState<"reminderTime"> = {};

const SWITCHES: { key: Exclude<keyof NotificationPrefs, "reminderTime">; label: string; hint: string }[] = [
  { key: "streakReminders", label: "Streak reminders", hint: "A nudge at your reminder time if you haven't logged today." },
  { key: "teamActivity", label: "Team activity", hint: "When someone joins your team." },
  { key: "leaderboardChanges", label: "Leaderboard changes", hint: "When someone passes you, or you pass them." },
  { key: "challengeInvites", label: "Challenge invites", hint: "When a teammate starts a team challenge." },
  { key: "weeklySummary", label: "Weekly summary email", hint: "Your week in numbers, every Monday morning." },
];

export function NotificationsSection({ prefs }: { prefs: NotificationPrefs }) {
  const [state, formAction] = useActionState(updateNotificationPrefsAction, INITIAL);
  useSavedToast(state);

  return (
    <SettingsSection id="notifications" title="Notifications" sub="Choose what's worth interrupting you for.">
      <form action={formAction} className={styles.form}>
        <div className={styles.switches}>
          {SWITCHES.map((s) => (
            <Switch
              key={s.key}
              id={`pref-${s.key}`}
              name={s.key}
              label={s.label}
              hint={s.hint}
              defaultChecked={prefs[s.key]}
            />
          ))}
        </div>
        <FormField
          label="Reminder time"
          name="reminderTime"
          type="time"
          defaultValue={prefs.reminderTime}
          error={Boolean(state.errors?.reminderTime)}
          helperText={state.errors?.reminderTime ?? "When streak reminders arrive, in your local time."}
        />
        <div className={styles.actions}>
          <SaveButton />
        </div>
      </form>
    </SettingsSection>
  );
}
