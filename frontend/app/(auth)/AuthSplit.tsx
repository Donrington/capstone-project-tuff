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

      <aside className={`${styles.media} theme-dark-island`} aria-label="TUFF">
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
        <div className={styles.nameRow}>
          <FormField
            id="signup-firstName"
            label="First name"
            name="firstName"
            autoComplete="given-name"
            placeholder="First name"
            defaultValue={state.values?.firstName}
            error={Boolean(errors.firstName)}
            helperText={errors.firstName}
          />
          <FormField
            id="signup-lastName"
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            placeholder="Last name"
            defaultValue={state.values?.lastName}
            error={Boolean(errors.lastName)}
            helperText={errors.lastName}
          />
        </div>
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
        {state.message && (
          <p className={styles.formError} role="alert">
            {state.message}
          </p>
        )}
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
            <Link href="/forgot-password" className={styles.forgot}>
              Forgot password?
            </Link>
          }
          error={Boolean(errors.password)}
          helperText={errors.password}
        />
        <Checkbox id="signin-remember" name="remember" label="Keep me signed in" defaultChecked />
        {state.message && (
          <p className={styles.formError} role="alert">
            {state.message}
          </p>
        )}
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
  // A plain <a>: next/link would prefetch the route that starts the OAuth dance.
  return (
    <div className={styles.social}>
      <a href="/auth/google" className={styles.socialButton}>
        <GoogleMark />
        Continue with Google
      </a>
    </div>
  );
}

/** Google's "G", in its own colours (their sign-in branding asks for it unaltered). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
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
