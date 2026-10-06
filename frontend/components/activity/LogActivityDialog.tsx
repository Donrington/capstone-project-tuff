"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { RadioChips } from "@/components/ui/RadioChips";
import { useToast } from "@/components/ui/Toast";
import { formatCount } from "@/lib/challenge-card";
import { DAILY_STEPS_ID } from "@/lib/daily-steps";
import type { Challenge } from "@/lib/types";
import type { LoggedActivity } from "@/lib/data";
import { logActivity, parseActivityTextAction, type LogActivityState } from "@/app/(app)/actions";
import styles from "./LogActivityDialog.module.css";

const INITIAL: LogActivityState = {};
const NOTE_LIMIT = 140;

/** Quick-add amounts per unit, so the common entries are one tap. */
const QUICK_ADD: Record<string, number[]> = {
  reps: [10, 25, 50],
  steps: [1000, 2500, 5000],
  seconds: [30, 60, 90],
};

/** Units the "describe it" field can parse — matches the backend's own
 *  PARSEABLE_UNITS (userController.js). Never a distance or a conversion
 *  between units, so it's deliberately the same set as QUICK_ADD. */
const DESCRIBABLE = new Set(["reps", "steps", "seconds"]);

interface LogActivityDialogProps {
  open: boolean;
  onClose: () => void;
  challenges: Challenge[];
  preselectId: string | null;
  onCompleted: (logged: LoggedActivity) => void;
}

export function LogActivityDialog({
  open,
  onClose,
  challenges,
  preselectId,
  onCompleted,
}: LogActivityDialogProps) {
  const toast = useToast();
  const [state, formAction] = useActionState(logActivity, INITIAL);
  const [challengeId, setChallengeId] = useState("");
  const [amount, setAmount] = useState("");
  const handled = useRef<LogActivityState | null>(null);

  const [describeOpen, setDescribeOpen] = useState(false);
  const [describeText, setDescribeText] = useState("");
  const [describeError, setDescribeError] = useState<string | null>(null);
  const [describing, startDescribing] = useTransition();

  // Each open starts clean, on the challenge the caller asked for — otherwise
  // the featured one, otherwise the first that's still going.
  useEffect(() => {
    if (!open) return;
    const fallback = challenges.find((c) => c.featured) ?? challenges[0];
    setChallengeId(preselectId ?? fallback?.id ?? DAILY_STEPS_ID);
    setAmount("");
    setDescribeOpen(false);
    setDescribeText("");
    setDescribeError(null);
  }, [open, preselectId, challenges]);

  // A successful log either celebrates or toasts, then closes.
  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    const { logged, daily } = state;
    if (!logged && !daily) return;
    handled.current = state;
    onClose();

    if (daily) {
      toast({
        title: "Steps logged.",
        description: `${formatCount(daily.todaySteps)} steps today.`,
        tone: "success",
      });
      return;
    }
    if (!logged) return;

    if (logged.completed) {
      onCompleted(logged);
      return;
    }

    const left = logged.target - logged.current;
    toast({
      title: `Logged ${formatCount(logged.current - logged.previous)} ${logged.unit}.`,
      description: `${formatCount(left)} to go.`,
      tone: "success",
    });
  }, [state, onClose, onCompleted, toast]);

  const daily = challengeId === DAILY_STEPS_ID;
  const selected = challenges.find((c) => c.id === challengeId);
  const unit = daily ? "steps" : (selected?.unit ?? "reps");
  const parsed = Number(amount);
  const validAmount = amount !== "" && Number.isInteger(parsed) && parsed > 0;
  const projected = selected && validAmount ? selected.current + parsed : null;
  const clears = selected && projected !== null && projected >= selected.goal;

  function addQuick(step: number) {
    const base = Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
    setAmount(String(base + step));
  }

  function fillFromText() {
    setDescribeError(null);
    startDescribing(async () => {
      const result = await parseActivityTextAction(describeText, unit);
      if ("error" in result) {
        setDescribeError(result.error);
        return;
      }
      setAmount(String(result.value));
      setDescribeText("");
      setDescribeOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Log activity"
      description={
        daily
          ? "Counts toward today's goal and your streak. Leaderboard points come from challenges."
          : "It lands on the challenge straight away."
      }
    >
      <form action={formAction} className={styles.form}>
        <input type="hidden" name="unit" value={unit} />

        <Select
          label="Challenge"
          name="challengeId"
          value={challengeId}
          onChange={(event) => setChallengeId(event.target.value)}
          error={Boolean(state.errors?.challengeId)}
          helperText={state.errors?.challengeId}
          options={[
            ...challenges.map((c) => ({ value: c.id, label: c.title })),
            { value: DAILY_STEPS_ID, label: "Daily steps (no challenge)" },
          ]}
        />

        <div>
          <FormField
            label={`How many ${unit}?`}
            name="value"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={Boolean(state.errors?.value)}
            helperText={state.errors?.value}
            trailing={<span className={styles.unit}>{unit}</span>}
          />
          <div className={styles.quick}>
            {(QUICK_ADD[unit] ?? QUICK_ADD.reps).map((step) => (
              <button
                key={step}
                type="button"
                className={styles.quickChip}
                onClick={() => addQuick(step)}
              >
                +{formatCount(step)}
              </button>
            ))}
          </div>

          {DESCRIBABLE.has(unit) &&
            (describeOpen ? (
              <div className={styles.describe}>
                <FormField
                  label="Describe it"
                  placeholder={unit === "reps" ? "3 sets of 12 push-ups" : `What did you do, in ${unit}?`}
                  value={describeText}
                  onChange={(event) => setDescribeText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      fillFromText();
                    }
                  }}
                  error={Boolean(describeError)}
                  helperText={describeError ?? undefined}
                  trailing={
                    <button
                      type="button"
                      className={styles.describeFill}
                      onClick={fillFromText}
                      disabled={describing || !describeText.trim()}
                    >
                      {describing ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : "Fill it in"}
                    </button>
                  }
                />
              </div>
            ) : (
              <button type="button" className={styles.describeToggle} onClick={() => setDescribeOpen(true)}>
                <Sparkles size={14} aria-hidden="true" />
                Describe it instead
              </button>
            ))}
        </div>

        <RadioChips
          legend="When"
          name="when"
          defaultValue="today"
          options={[
            { value: "today", label: "Today" },
            { value: "yesterday", label: "Yesterday" },
          ]}
        />

        <TextArea
          label="Note"
          name="note"
          rows={2}
          maxLength={NOTE_LIMIT}
          placeholder="Optional — how did it feel?"
        />

        {selected && projected !== null && (
          <p className={styles.preview} aria-live="polite">
            <span className={styles.previewFrom}>{formatCount(selected.current)}</span>
            <span aria-hidden="true"> → </span>
            <span className={styles.previewTo}>{formatCount(projected)}</span>
            {` of ${formatCount(selected.goal)} ${unit}`}
            {clears && <span className={styles.clears}>This clears the challenge.</span>}
          </p>
        )}

        <SubmitRow amount={validAmount ? parsed : null} unit={unit} onCancel={onClose} />
      </form>
    </Dialog>
  );
}

function SubmitRow({
  amount,
  unit,
  onCancel,
}: {
  amount: number | null;
  unit: string;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <div className={styles.actions}>
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? (
          <>
            <Loader2 size={18} className={styles.spin} aria-hidden="true" />
            Logging…
          </>
        ) : (
          `Log ${amount === null ? "activity" : `${formatCount(amount)} ${unit}`}`
        )}
      </Button>
    </div>
  );
}
