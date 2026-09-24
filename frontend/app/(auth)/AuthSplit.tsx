"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Info, Loader2 } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import authMedia from "@/data/auth-media.json";
import { signIn, signUp, type AuthState } from "./actions";
import styles from "./AuthSplit.module.css";

export type AuthMode = "signup" | "signin";

const INITIAL_STATE: AuthState = {};
const MODES: AuthMode[] = ["signup", "signin"];

// Placeholder marketing copy for the video panel — swap the numbers for
// live stats once the backend exists.
const STORY: Record<
  AuthMode,
  { lines: string[]; sub: string; chips: string[]; switchHint: string; switchAction: string }
> = {
  signup: {
    lines: ["Every rep counts.", "Together."],
    sub: "Join team challenges, climb the leaderboard, and keep your streak alive.",
    chips: ["12,408 training this week", "340 team challenges live"],
    switchHint: "Have an account?",
    switchAction: "Sign in",
  },
  signin: {
    lines: ["Welcome back.", "Pick up the pace."],
    sub: "Your team is 340 steps back — today's set closes the gap.",
    chips: ["9-day streak waiting", "Team Ironclad · #2"],
    switchHint: "New here?",
    switchAction: "Join TUFF",
  },
};

/**
 * TUFF's landing page: a split screen where one full-height video panel
 * slides between halves. Sign up = video left, form right. Sign in = form
 * left, video right. The panel's leading edge bulges into a curve mid-slide
 * and it dips in scale for depth; the two clips crossfade underneath. Below
 * 1024px it stacks: video as a hero banner, the active form beneath it.
 */
export function AuthSplit({ initialMode }: { initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [switched, setSwitched] = useState(false);
  const signupVideo = useRef<HTMLVideoElement>(null);
  const signinVideo = useRef<HTMLVideoElement>(null);
  const signupHeading = useRef<HTMLHeadingElement>(null);
  const signinHeading = useRef<HTMLHeadingElement>(null);

  function switchMode(next: AuthMode) {
    if (next === mode) return;
    setSwitched(true);
    setMode(next);
    window.history.replaceState(null, "", next === "signin" ? "/?mode=signin" : "/");
  }

  // Play the visible clip, pause the hidden one once it has faded out. Under
  // reduced motion nothing autoplays — the poster frame stays up.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const active = (mode === "signup" ? signupVideo : signinVideo).current;
    const idle = (mode === "signup" ? signinVideo : signupVideo).current;
    if (active && !reduceMotion) {
      active.play().catch(() => {
        /* autoplay can be refused (data saver, low power) — the poster stays up */
      });
    }
    const timer = window.setTimeout(() => idle?.pause(), 900);
    return () => window.clearTimeout(timer);
  }, [mode]);

  // After a switch, move focus to the revealed form's heading once the
  // panel has cleared it — keyboard and screen-reader users land in context.
  useEffect(() => {
    if (!switched) return;
    const heading = (mode === "signup" ? signupHeading : signinHeading).current;
    const timer = window.setTimeout(() => heading?.focus({ preventScroll: true }), 450);
    return () => window.clearTimeout(timer);
  }, [mode, switched]);

  const other: AuthMode = mode === "signup" ? "signin" : "signup";

  return (
    <div className={styles.auth} data-mode={mode} data-switched={switched ? "" : undefined}>
      <section
        className={`${styles.pane} ${styles.paneSignin}`}
        data-active={mode === "signin" ? "" : undefined}
        inert={mode !== "signin"}
        aria-label="Sign in"
      >
        <SignInForm headingRef={signinHeading} onSwitch={() => switchMode("signup")} />
      </section>

      <section
        className={`${styles.pane} ${styles.paneSignup}`}
        data-active={mode === "signup" ? "" : undefined}
        inert={mode !== "signup"}
        aria-label="Create an account"
      >
        <SignUpForm headingRef={signupHeading} onSwitch={() => switchMode("signin")} />
      </section>

      <aside className={styles.media} aria-label="TUFF">
        <div className={styles.fallback} aria-hidden="true" />
        {MODES.map((key) => {
          const clip = authMedia.clips[key];
          return (
            <video
              key={key}
              ref={key === "signup" ? signupVideo : signinVideo}
              className={`${styles.video} ${mode === key ? styles.videoActive : ""}`}
              src={clip.src}
              poster={clip.poster}
              muted
              loop
              playsInline
              disablePictureInPicture
              preload={key === initialMode ? "auto" : "metadata"}
              aria-hidden="true"
            />
          );
        })}
        <div className={styles.scrim} aria-hidden="true" />

        <div className={styles.mediaTop}>
          <span className={styles.wordmark}>
            <Image src="/logo/logo_2.png" alt="TUFF" width={340} height={113} loading="eager" className={styles.wordmarkLogo} />
          </span>
          <div className={styles.mediaActions}>
            <Link href="/about" className={styles.aboutPill} aria-label="About TUFF">
              <Info size={15} strokeWidth={2.25} aria-hidden="true" />
              <span className={styles.aboutLabel}>About</span>
            </Link>
            <button type="button" className={styles.switchPill} onClick={() => switchMode(other)}>
              <span className={styles.switchHint}>{STORY[mode].switchHint}</span>
              {STORY[mode].switchAction}
              <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.story}>
          {MODES.map((key) => (
            <div
              key={key}
              className={`${styles.storyBlock} ${mode === key ? styles.storyActive : ""}`}
              aria-hidden={mode !== key}
            >
              <p className={styles.headline}>
                {STORY[key].lines.map((line, i) => (
                  <span key={line} className={styles.line}>
                    <span className={styles.lineInner} style={{ "--line": i } as CSSProperties}>
                      {line}
                    </span>
                  </span>
                ))}
              </p>
              <p className={styles.storySub}>{STORY[key].sub}</p>
              <ul className={styles.chips}>
                {STORY[key].chips.map((chip) => (
                  <li key={chip} className={styles.chip}>
                    <span className={styles.liveDot} aria-hidden="true" />
                    {chip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

interface FormProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSwitch: () => void;
}

function SignUpForm({ headingRef, onSwitch }: FormProps) {
  const [state, formAction] = useActionState(signUp, INITIAL_STATE);
  const errors = state.errors ?? {};

  return (
    <div className={styles.formWrap}>
      <header>
        <h1 ref={headingRef} tabIndex={-1} className={styles.formTitle}>
          Create your account
        </h1>
        <p className={styles.formSub}>Start your first challenge in under a minute.</p>
      </header>
      <SocialRow />
      <div className={styles.divider}>
        <span>or with email</span>
      </div>
      <form action={formAction} className={styles.form} noValidate>
        <FormField
          id="signup-name"
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Your full name"
          defaultValue={state.values?.name}
          error={Boolean(errors.name)}
          helperText={errors.name}
        />
        <FormField
          id="signup-email"
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          error={Boolean(errors.email)}
          helperText={errors.email}
        />
        <PasswordField
          id="signup-password"
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={Boolean(errors.password)}
          helperText={errors.password}
        />
        <Checkbox
          id="signup-terms"
          name="terms"
          label={
            <>
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noopener">
                Privacy Policy
              </a>
              .
            </>
          }
          error={errors.terms}
        />
        <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
      </form>
      <p className={styles.switchText}>
        Already training with us?{" "}
        <button type="button" className={styles.switchLink} onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </div>
  );
}

function SignInForm({ headingRef, onSwitch }: FormProps) {
  const [state, formAction] = useActionState(signIn, INITIAL_STATE);
  const errors = state.errors ?? {};

  return (
    <div className={styles.formWrap}>
      <header>
        <h1 ref={headingRef} tabIndex={-1} className={styles.formTitle}>
          Welcome back
        </h1>
        <p className={styles.formSub}>Sign in to log today&apos;s activity.</p>
      </header>
      <SocialRow />
      <div className={styles.divider}>
        <span>or with email</span>
      </div>
      <form action={formAction} className={styles.form} noValidate>
        <FormField
          id="signin-email"
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          error={Boolean(errors.email)}
          helperText={errors.email}
        />
        <PasswordField
          id="signin-password"
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          labelAction={
            <a href="#" className={styles.forgot}>
              Forgot password?
            </a>
          }
          error={Boolean(errors.password)}
          helperText={errors.password}
        />
        <Checkbox id="signin-remember" name="remember" label="Keep me signed in" defaultChecked />
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
      <p className={styles.switchText}>
        New to TUFF?{" "}
        <button type="button" className={styles.switchLink} onClick={onSwitch}>
          Create an account
        </button>
      </p>
    </div>
  );
}

function SocialRow() {
  // Placeholders until the OAuth providers are wired up (see README).
  return (
    <div className={styles.social}>
      <button type="button" className={styles.socialButton} aria-label="Continue with Google">
        Google
      </button>
      <button type="button" className={styles.socialButton} aria-label="Continue with Apple">
        Apple
      </button>
    </div>
  );
}

function SubmitButton({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <Loader2 size={18} className={styles.spin} aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <ArrowRight size={18} strokeWidth={2.25} className={styles.arrow} aria-hidden="true" />
        </>
      )}
    </Button>
  );
}
