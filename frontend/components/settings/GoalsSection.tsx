"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { RadioChips } from "@/components/ui/RadioChips";
import { updateGoalsAction, type UpdateGoalsState } from "@/app/(app)/actions";
import { SaveButton, SettingsSection, useSavedToast } from "./SettingsSection";
import styles from "./settings.module.css";

const INITIAL: UpdateGoalsState = {};
const PRESETS = [6000, 8000, 10000, 12000];

export function GoalsSection({ stepGoal, workoutDaysPerWeek }: { stepGoal: number; workoutDaysPerWeek: number }) {
  const [state, formAction] = useActionState(updateGoalsAction, INITIAL);
  const [choice, setChoice] = useState(PRESETS.includes(stepGoal) ? String(stepGoal) : "custom");
  useSavedToast(state);

  return (
    <SettingsSection id="goals" title="Goals" sub="Your daily step goal sets the target on the dashboard ring.">
      <form action={formAction} className={styles.form}>
        <RadioChips
          legend="Daily step goal"
          name="stepGoal"
          value={choice}
          onChange={(value) => setChoice(value as string)}
          options={[
            ...PRESETS.map((n) => ({ value: String(n), label: n.toLocaleString("en-US") })),
            { value: "custom", label: "Custom" },
          ]}
          error={choice !== "custom" ? state.errors?.stepGoal : undefined}
        />
        {choice === "custom" && (
          <FormField
            label="Custom step goal"
            name="customStepGoal"
            type="number"
            inputMode="numeric"
            min={1000}
            max={100000}
            step={500}
            defaultValue={state.values?.stepGoal ?? (PRESETS.includes(stepGoal) ? "" : String(stepGoal))}
            error={Boolean(state.errors?.stepGoal)}
            helperText={state.errors?.stepGoal ?? "Between 1,000 and 100,000."}
          />
        )}
        <RadioChips
          legend="Workout days per week"
          name="workoutDaysPerWeek"
          defaultValue={String(workoutDaysPerWeek)}
          options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) }))}
          error={state.errors?.workoutDaysPerWeek}
        />
        <div className={styles.actions}>
          <SaveButton />
        </div>
      </form>
    </SettingsSection>
  );
}
