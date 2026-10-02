"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { RadioChips } from "@/components/ui/RadioChips";
import { completeOnboardingAction, type OnboardingState } from "@/app/(app)/actions";
import type { SuggestedChallenge } from "@/lib/types";
import styles from "./OnboardingFlow.module.css";

const INITIAL: OnboardingState = {};

const STEPS = [
  { key: "why", title: "What brings you to TUFF?" },
  { key: "about", title: "A little about you" },
  { key: "goal", title: "Pick a daily step goal" },
  { key: "challenge", title: "Start with a challenge" },
  { key: "team", title: "Train with a team?" },
  { key: "done", title: "You're in." },
] as const;

/** Which step to send someone back to when the server rejects a field. */
const FIELD_STEP: Record<string, number> = { dateOfBirth: 1, height: 1, weight: 1, stepGoal: 2, teamCode: 4, teamName: 4 };

const MOTIVATIONS = [
  { value: "move_more", label: "Move more every day" },
  { value: "get_stronger", label: "Get stronger" },
  { value: "build_streak", label: "Build a streak" },
  { value: "compete", label: "Compete with friends" },
  { value: "team", label: "Train with my team" },
];

const GOALS = ["6000", "8000", "10000", "12000"];

export function OnboardingFlow({ firstName, suggestions }: { firstName: string; suggestions: SuggestedChallenge[] }) {
  const [state, formAction] = useActionState(completeOnboardingAction, INITIAL);
  const [step, setStep] = useState(0);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const firstRender = useRef(true);

  const [motivations, setMotivations] = useState<string[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [stepGoal, setStepGoal] = useState("10000");
  const [challengeIds, setChallengeIds] = useState<string[]>([]);
  const [teamChoice, setTeamChoice] = useState("skip");
  const [teamCode, setTeamCode] = useState("");
  const [teamName, setTeamName] = useState("");

  // Move focus to each new question, so keyboard and screen reader users
  // land on it (the live region below announces "Step n of 6").
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRefs.current[step]?.focus();
  }, [step]);

  // A server-side error sends you back to the step that owns the field.
  useEffect(() => {
    const field = Object.keys(state.errors ?? {})[0];
    if (field && FIELD_STEP[field] !== undefined) setStep(FIELD_STEP[field]);
  }, [state]);

  const last = STEPS.length - 1;
  const next = () => setStep((s) => Math.min(last, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  /** "Skip for now" clears that step's answers, then moves on. */
  function skip() {
    if (step === 0) setMotivations([]);
    if (step === 1) {
      setDateOfBirth("");
      setGender("");
      setHeight("");
      setWeight("");
      setFitnessLevel("");
    }
    if (step === 2) setStepGoal("later");
    if (step === 3) setChallengeIds([]);
    if (step === 4) setTeamChoice("skip");
    next();
  }

  const chosen = suggestions.filter((s) => challengeIds.includes(s.id));
  const summary = [
    motivations.length > 0 && `Here to ${MOTIVATIONS.filter((m) => motivations.includes(m.value)).map((m) => m.label.toLowerCase()).join(", ")}.`,
    stepGoal !== "later" ? `Daily goal: ${Number(stepGoal).toLocaleString("en-US")} steps.` : "Step goal: set it later.",
    chosen.length > 0 ? `Starting ${chosen.map((c) => c.title).join(" and ")}.` : "No challenge yet.",
    teamChoice === "join" && teamCode
      ? `Joining the team with code ${teamCode}.`
      : teamChoice === "create" && teamName
        ? `Starting ${teamName}.`
        : "Solo for now.",
  ].filter(Boolean) as string[];

  return (
    <div className={styles.flow}>
      <ol className={styles.progress} aria-hidden="true">
        {STEPS.map((s, i) => (
          <li key={s.key} className={styles.segment} data-state={i < step ? "done" : i === step ? "current" : undefined} />
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">
        Step {step + 1} of {STEPS.length}
      </p>

      <form
        action={formAction}
        className={styles.form}
        // Enter in a field moves on a step rather than submitting early.
        onKeyDown={(event) => {
          if (event.key === "Enter" && step < last && (event.target as HTMLElement).tagName === "INPUT") {
            event.preventDefault();
            next();
          }
        }}
      >
        {/* Everything travels with the one submit at the end. */}
        <input type="hidden" name="stepGoal" value={stepGoal} />
        <input type="hidden" name="teamChoice" value={teamChoice} />
        {challengeIds.map((id) => (
          <input key={id} type="hidden" name="challengeIds" value={id} />
        ))}

        {STEPS.map((s, i) => (
          <section key={s.key} hidden={i !== step} className={styles.step} aria-labelledby={`onboarding-${s.key}`}>
            <p className={styles.count}>
              {i + 1} / {STEPS.length}
            </p>
            <h1
              id={`onboarding-${s.key}`}
              ref={(el) => {
                headingRefs.current[i] = el;
              }}
              tabIndex={-1}
              className={styles.title}
            >
              {s.key === "why" ? `${s.title.replace("TUFF?", "")}TUFF, ${firstName}?` : s.title}
            </h1>

            {s.key === "why" && (
              <RadioChips
                legend="Pick as many as you like"
                name="motivations"
                multiple
                value={motivations}
                onChange={(v) => setMotivations(v as string[])}
                options={MOTIVATIONS}
              />
            )}

            {s.key === "about" && (
              <>
                <p className={styles.lede}>Optional. It helps us suggest sensible goals, and only you can see it.</p>
                <FormField
                  label="Date of birth"
                  name="dateOfBirth"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  error={Boolean(state.errors?.dateOfBirth)}
                  helperText={state.errors?.dateOfBirth}
                />
                <RadioChips
                  legend="Gender"
                  name="gender"
                  value={gender}
                  onChange={(v) => setGender(v as string)}
                  options={[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                    { value: "other", label: "Other" },
                  ]}
                />
                <div className={styles.pair}>
                  <FormField
                    label="Height (cm)"
                    name="height"
                    type="number"
                    inputMode="decimal"
                    min={50}
                    max={300}
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    error={Boolean(state.errors?.height)}
                    helperText={state.errors?.height}
                  />
                  <FormField
                    label="Weight (kg)"
                    name="weight"
                    type="number"
                    inputMode="decimal"
                    min={20}
                    max={400}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    error={Boolean(state.errors?.weight)}
                    helperText={state.errors?.weight}
                  />
                </div>
                <RadioChips
                  legend="Fitness level"
                  name="fitnessLevel"
                  value={fitnessLevel}
                  onChange={(v) => setFitnessLevel(v as string)}
                  options={[
                    { value: "beginner", label: "Beginner", hint: "New to training, or coming back." },
                    { value: "intermediate", label: "Intermediate", hint: "Training a few times a week." },
                    { value: "advanced", label: "Advanced", hint: "Training is part of the routine." },
                  ]}
                />
              </>
            )}

            {s.key === "goal" && (
              <RadioChips
                legend="Daily step goal"
                hideLegend
                name="stepGoalChoice"
                value={stepGoal}
                onChange={(v) => setStepGoal(v as string)}
                options={[
                  ...GOALS.map((g) => ({ value: g, label: Number(g).toLocaleString("en-US") })),
                  { value: "later", label: "I'll set it later" },
                ]}
                error={state.errors?.stepGoal}
              />
            )}

            {s.key === "challenge" && (
              <fieldset className={styles.cards}>
                <legend className="sr-only">Pick any to start today</legend>
                {suggestions.map((c) => {
                  const on = challengeIds.includes(c.id);
                  return (
                    <label key={c.id} className={styles.card} data-selected={on ? "" : undefined}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() =>
                          setChallengeIds((ids) => (on ? ids.filter((x) => x !== c.id) : [...ids, c.id]))
                        }
                      />
                      <span className={styles.cardCheck} aria-hidden="true">
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className={styles.cardText}>
                        <strong>{c.title}</strong>
                        <span>{c.description}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            {s.key === "team" && (
              <>
                <RadioChips
                  legend="Team"
                  hideLegend
                  name="teamChoiceChips"
                  value={teamChoice}
                  onChange={(v) => setTeamChoice(v as string)}
                  options={[
                    { value: "join", label: "I have a code", hint: "Someone sent you an invite." },
                    { value: "create", label: "Start a team", hint: "You'll get a code to share." },
                    { value: "skip", label: "Not now", hint: "Go solo. You can join later." },
                  ]}
                />
                {teamChoice === "join" && (
                  <FormField
                    label="Invite code"
                    name="teamCode"
                    placeholder="IRON-7Q4K"
                    autoComplete="off"
                    spellCheck={false}
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                    error={Boolean(state.errors?.teamCode)}
                    helperText={state.errors?.teamCode}
                  />
                )}
                {teamChoice === "create" && (
                  <FormField
                    label="Team name"
                    name="teamName"
                    placeholder="Team Owambe Movers"
                    maxLength={40}
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    error={Boolean(state.errors?.teamName)}
                    helperText={state.errors?.teamName}
                  />
                )}
              </>
            )}

            {s.key === "done" && (
              <ul className={styles.summary}>
                {summary.map((line) => (
                  <li key={line}>
                    <Check size={16} strokeWidth={2.75} aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <div className={styles.nav}>
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={back}>
              <ArrowLeft size={18} aria-hidden="true" />
              Back
            </Button>
          ) : (
            <span />
          )}
          <div className={styles.navRight}>
            {step < last ? (
              <>
                <button type="button" className={styles.skip} onClick={skip}>
                  Skip for now
                </button>
                <Button type="button" onClick={next}>
                  Continue
                  <ArrowRight size={18} aria-hidden="true" />
                </Button>
              </>
            ) : (
              <FinishButton />
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function FinishButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <Loader2 size={18} className={styles.spin} aria-hidden="true" />
          Setting you up…
        </>
      ) : (
        <>
          Go to your dashboard
          <ArrowRight size={18} aria-hidden="true" />
        </>
      )}
    </Button>
  );
}
