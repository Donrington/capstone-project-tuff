"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/components/ui/FormField";
import { TextArea } from "@/components/ui/TextArea";
import { RadioChips } from "@/components/ui/RadioChips";
import { Checkbox } from "@/components/ui/Checkbox";
import { StandardCard } from "@/components/ui/Card";
import { formatCount } from "@/lib/challenge-card";
import type { User } from "@/lib/types";
import { createChallengeAction, type CreateChallengeState } from "@/app/(app)/actions";
import styles from "./NewChallengeWizard.module.css";

const INITIAL: CreateChallengeState = {};
const STEPS = ["Type", "Activity", "Goal", "Details", "Review"];

interface ActivityOption {
  slug: string;
  label: string;
  unit: string;
  pro?: boolean;
}

const ACTIVITIES: ActivityOption[] = [
  { slug: "steps", label: "Steps", unit: "steps" },
  { slug: "pushups", label: "Push-ups", unit: "reps" },
  { slug: "squats", label: "Squats", unit: "reps" },
  { slug: "plank", label: "Plank", unit: "seconds" },
  { slug: "burpees", label: "Burpees", unit: "reps" },
  { slug: "custom", label: "Custom", unit: "reps", pro: true },
];

/** A 7-day challenge is a "Power Week" — anything else says its length. */
function suggestName(activityLabel: string, days: number) {
  if (days === 7) return `${activityLabel} Power Week`;
  return `${activityLabel} ${days}-Day Challenge`;
}

export function NewChallengeWizard({
  user,
  teammates,
  initialActivity,
}: {
  user: User;
  teammates: Pick<User, "id" | "name" | "initials">[];
  initialActivity: string | null;
}) {
  const [state, formAction] = useActionState(createChallengeAction, INITIAL);
  const [step, setStep] = useState(0);

  const [type, setType] = useState<string>("solo");
  const [activitySlug, setActivitySlug] = useState(initialActivity ?? "pushups");
  const [customName, setCustomName] = useState("");
  const [target, setTarget] = useState("400");
  const [days, setDays] = useState("7");
  const [customDays, setCustomDays] = useState("");
  const [start, setStart] = useState("today");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [invited, setInvited] = useState<string[]>(teammates.map((t) => t.id));
  const [stepError, setStepError] = useState<string | null>(null);

  const activity = ACTIVITIES.find((a) => a.slug === activitySlug) ?? ACTIVITIES[1];
  const isCustomLength = days === "custom";
  const totalDays = Number(isCustomLength ? customDays : days);
  const targetNumber = Number(target);
  const activityLabel = activitySlug === "custom" ? customName || "Custom" : activity.label;

  // The name follows the earlier choices until you type your own.
  const suggested = suggestName(activityLabel, Number.isFinite(totalDays) && totalDays > 0 ? totalDays : 7);
  const finalName = name.trim() || suggested;

  // Mirror the step in the URL so a refresh doesn't lose your place.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (step === 0) url.searchParams.delete("step");
    else url.searchParams.set("step", String(step + 1));
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [step]);

  function validate(current: number): string | null {
    if (current === 1 && activitySlug === "custom" && customName.trim().length < 2) {
      return "Name the activity you're tracking.";
    }
    if (current === 2) {
      if (!Number.isInteger(targetNumber) || targetNumber <= 0) {
        return "Use a whole number above zero for the target.";
      }
      if (!Number.isInteger(totalDays) || totalDays < 3 || totalDays > 90) {
        return "Pick a length between 3 and 90 days.";
      }
    }
    if (current === 3 && finalName.length < 3) {
      return "Give the challenge a name people will recognise.";
    }
    return null;
  }

  function next() {
    const problem = validate(step);
    if (problem) {
      setStepError(problem);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function back() {
    setStepError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  const perDay =
    Number.isFinite(targetNumber) && totalDays > 0 ? Math.round(targetNumber / totalDays) : 0;

  return (
    <div className={styles.wizard}>
      <ol className={styles.progress} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={styles.segment}
            data-state={i < step ? "done" : i === step ? "current" : undefined}
          >
            <span className="sr-only">
              {label}
              {i === step ? " (current step)" : ""}
            </span>
          </li>
        ))}
      </ol>

      <form action={formAction} className={styles.form}>
        {/* Everything collected across the steps travels with the submit. */}
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="activity" value={activitySlug} />
        <input type="hidden" name="unit" value={activity.unit} />
        <input type="hidden" name="target" value={target} />
        <input type="hidden" name="days" value={String(totalDays || "")} />
        <input type="hidden" name="start" value={start} />
        <input type="hidden" name="name" value={finalName} />
        <input type="hidden" name="description" value={description} />

        {step === 0 && (
          <Step title="Who's this for?">
            <RadioChips
              legend="Challenge type"
              hideLegend
              name="type-choice"
              value={type}
              onChange={(v) => setType(v as string)}
              options={[
                { value: "solo", label: "Solo", hint: "Just you against the target." },
                { value: "team", label: "Team", hint: `Everyone in ${user.teamName} adds to one total.` },
              ]}
            />
          </Step>
        )}

        {step === 1 && (
          <Step title="What are you tracking?">
            <RadioChips
              legend="Activity"
              hideLegend
              name="activity-choice"
              value={activitySlug}
              onChange={(v) => setActivitySlug(v as string)}
              options={ACTIVITIES.map((a) => ({
                value: a.slug,
                label: a.label,
                hint: a.pro ? "Track anything you like." : `Measured in ${a.unit}.`,
                disabled: a.pro && user.plan !== "pro",
                badge: a.pro ? <Badge variant="surge">Pro</Badge> : undefined,
              }))}
            />
            {activitySlug === "custom" && (
              <FormField
                label="What do you call it?"
                name="custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Kettlebell swings"
              />
            )}
            {user.plan !== "pro" && (
              // Pro isn't launching yet — see the Sidebar promo, which
              // already just toasts "coming soon" rather than linking out.
              <p className={styles.note}>Custom activities are part of Pro — coming soon.</p>
            )}
          </Step>
        )}

        {step === 2 && (
          <Step title="What's the goal?">
            <FormField
              label={`Target (${activity.unit})`}
              name="target-input"
              type="number"
              min={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              error={Boolean(state.errors?.target)}
              helperText={state.errors?.target}
            />
            <RadioChips
              legend="How long?"
              name="days-choice"
              value={days}
              onChange={(v) => setDays(v as string)}
              options={[
                { value: "7", label: "7 days" },
                { value: "14", label: "14 days" },
                { value: "30", label: "30 days" },
                { value: "custom", label: "Custom" },
              ]}
            />
            {isCustomLength && (
              <FormField
                label="How many days? (3–90)"
                name="custom-days"
                type="number"
                min={3}
                max={90}
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
              />
            )}
            <RadioChips
              legend="Starts"
              name="start-choice"
              value={start}
              onChange={(v) => setStart(v as string)}
              options={[
                { value: "today", label: "Today" },
                { value: "tomorrow", label: "Tomorrow" },
              ]}
            />
            {perDay > 0 && (
              <p className={styles.maths} aria-live="polite">
                {formatCount(targetNumber)} {activity.unit} over {totalDays} days. About{" "}
                {formatCount(perDay)} a day.
              </p>
            )}
          </Step>
        )}

        {step === 3 && (
          <Step title="Name it.">
            <FormField
              label="Challenge name"
              name="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={suggested}
              helperText={name.trim() ? undefined : `Leave it blank to use ${suggested}.`}
              error={Boolean(state.errors?.name)}
            />
            <TextArea
              label="Description"
              name="description-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — what's the point of this one?"
            />
            {type === "team" && teammates.length > 0 && (
              <fieldset className={styles.people}>
                <legend className={styles.peopleLegend}>Who&apos;s in?</legend>
                {teammates.map((mate) => (
                  <Checkbox
                    key={mate.id}
                    id={`mate-${mate.id}`}
                    name="invited"
                    value={mate.id}
                    label={mate.name}
                    checked={invited.includes(mate.id)}
                    onChange={(e) =>
                      setInvited((current) =>
                        e.target.checked
                          ? [...current, mate.id]
                          : current.filter((id) => id !== mate.id),
                      )
                    }
                  />
                ))}
              </fieldset>
            )}
          </Step>
        )}

        {step === 4 && (
          <Step title="Look right?">
            <div className={styles.preview}>
              <StandardCard
                eyebrow="Challenge"
                title={finalName}
                description={description || `${formatCount(targetNumber)} ${activity.unit} in ${totalDays} days.`}
                progressPercent={0}
                statLeft={
                  <>
                    <b>0</b> / {formatCount(targetNumber)} {activity.unit}
                  </>
                }
                statRight={`Day ${start === "today" ? 1 : 0} of ${totalDays}`}
                stretch
              />
            </div>
            <dl className={styles.summary}>
              <div>
                <dt>Type</dt>
                <dd>{type === "team" ? `Team · ${user.teamName}` : "Solo"}</dd>
              </div>
              <div>
                <dt>Activity</dt>
                <dd>{activityLabel}</dd>
              </div>
              <div>
                <dt>Pace</dt>
                <dd>About {formatCount(perDay)} {activity.unit} a day</dd>
              </div>
              <div>
                <dt>Starts</dt>
                <dd>{start === "today" ? "Today" : "Tomorrow"}</dd>
              </div>
            </dl>
          </Step>
        )}

        {(stepError || state.errors?.days || state.errors?.name || state.errors?.target) && (
          <p className={styles.error} role="alert">
            {stepError ?? state.errors?.days ?? state.errors?.name ?? state.errors?.target}
          </p>
        )}

        <div className={styles.actions}>
          {step === 0 ? (
            <ButtonLink href="/challenges" variant="ghost">
              Cancel
            </ButtonLink>
          ) : (
            <Button type="button" variant="ghost" onClick={back}>
              <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
              Back
            </Button>
          )}

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Continue
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
            </Button>
          ) : (
            <CreateButton />
          )}
        </div>
      </form>

      <p className={styles.bail}>
        <Link href="/challenges">Back to all challenges</Link>
      </p>
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.step}>
      <h2 className={styles.stepTitle}>{title}</h2>
      <div className={styles.stepBody}>{children}</div>
    </section>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <Loader2 size={18} className={styles.spin} aria-hidden="true" />
          Creating…
        </>
      ) : (
        "Create challenge"
      )}
    </Button>
  );
}
