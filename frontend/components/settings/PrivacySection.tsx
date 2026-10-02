"use client";

import { useActionState } from "react";
import Link from "next/link";
import { RadioChips } from "@/components/ui/RadioChips";
import { Switch } from "@/components/ui/Switch";
import { updatePrivacyAction, type ActionState } from "@/app/(app)/actions";
import type { PrivacySettings } from "@/lib/types";
import { SaveButton, SettingsSection, useSavedToast } from "./SettingsSection";
import styles from "./settings.module.css";

const INITIAL: ActionState<"profileVisibility"> = {};

export function PrivacySection({ privacy }: { privacy: PrivacySettings }) {
  const [state, formAction] = useActionState(updatePrivacyAction, INITIAL);
  useSavedToast(state);

  return (
    <SettingsSection id="privacy" title="Privacy" sub="Who sees you, and where.">
      <form action={formAction} className={styles.form}>
        <Switch
          id="pref-showOnLeaderboards"
          name="showOnLeaderboards"
          label="Show me on public leaderboards"
          hint="Off means your points still count for your team, but your name isn't listed."
          defaultChecked={privacy.showOnLeaderboards}
        />
        <RadioChips
          legend="Who can see my profile"
          name="profileVisibility"
          defaultValue={privacy.profileVisibility}
          options={[
            { value: "everyone", label: "Everyone" },
            { value: "teammates", label: "Teammates" },
            { value: "only_me", label: "Only me" },
          ]}
          error={state.errors?.profileVisibility}
        />
        <p className={styles.note}>
          How we handle your data is in the <Link href="/privacy">privacy policy</Link>.
        </p>
        <div className={styles.actions}>
          <SaveButton />
        </div>
      </form>
    </SettingsSection>
  );
}
