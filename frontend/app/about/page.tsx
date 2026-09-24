import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { ArrowRight, Check, Flame, Footprints, MessageCircle, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { AboutNav, type AboutContext } from "@/components/about/AboutNav";
import { BackToTop } from "@/components/about/BackToTop";
import { CircleBadge } from "@/components/about/CircleBadge";
import { LoopingVideo } from "@/components/about/LoopingVideo";
import { Marquee } from "@/components/about/Marquee";
import { SiteFooter } from "@/components/footer/site-footer";
import { aboutMedia } from "@/data/about-media";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "TUFF turns training into a team sport. Log your reps, keep your streak alive, and climb the board together.",
};

const line = (n: number) => ({ "--line": n }) as CSSProperties;
const order = (n: number) => ({ "--i": n }) as CSSProperties;

const HERO_LINES = ["Built for", "the ones who", "show up."];

const STEPS = [
  {
    title: "Log it.",
    text: "Reps, steps or seconds. Tap a quick-add, hit log, and your progress moves on the spot.",
  },
  {
    title: "Bring your crew.",
    text: "Start a solo streak or a team challenge, then share the invite code on WhatsApp.",
  },
  {
    title: "Climb together.",
    text: "Every set moves you and your team up the board. Your streak keeps you coming back.",
  },
];

// Placeholder marketing numbers, the same ones the auth page shows — swap for
// live stats once the backend exists. The last two are product facts.
const STATS = [
  { value: "12,408", label: "people training this week" },
  { value: "340", label: "team challenges live" },
  { value: "3", label: "ways to log: reps, steps, seconds" },
  { value: "3–90", label: "days per challenge, your call" },
];

const VALUES = [
  {
    icon: Flame,
    title: "Consistency beats intensity.",
    text: "A ten-minute walk logged today beats the perfect workout you never start.",
  },
  {
    icon: UsersRound,
    title: "Teams make it stick.",
    text: "It's easy to skip a workout. It's harder to let your team down.",
  },
  {
    icon: Footprints,
    title: "Every body counts.",
    text: "Steps, reps or seconds — whatever moves you moves the board.",
  },
];

const FEATURES = [
  "One shared total for team challenges",
  "Join with a code in seconds",
  "Live activity from your teammates",
  "Head-to-head against a rival team",
];

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  // TODO(auth): read the session instead. Until real sign-in exists, the
  // in-app links pass ?from=app so the page offers the way back in.
  const context: AboutContext = from === "app" ? "app" : "public";
  const inApp = context === "app";

  const primaryCta = inApp ? (
    <ButtonLink href="/dashboard" size="lg">
      Back to dashboard
      <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
    </ButtonLink>
  ) : (
    <ButtonLink href="/" size="lg">
      Join TUFF
      <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
    </ButtonLink>
  );

  return (
    <div id="top" className={styles.page}>
      <AboutNav context={context} />

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="about-title">
          <div className={styles.heroText}>
            <p className={styles.kicker}>About TUFF</p>
            <h1 id="about-title" className={styles.heroTitle}>
              {HERO_LINES.map((text, i) => (
                <span key={text} className={styles.line}>
                  <span className={styles.lineInner} style={line(i)}>
                    {text}
                  </span>
                </span>
              ))}
            </h1>
            <p className={styles.heroSub}>
              TUFF turns training into a team sport. Log your reps, keep your streak alive, and
              climb the board with the people who keep you honest.
            </p>
            <div className={styles.heroCtas}>
              {primaryCta}
              <ButtonLink href="#how" variant="ghost" size="lg">
                How it works
              </ButtonLink>
            </div>
            <ul className={styles.heroChips}>
              <li className={styles.chip}>
                <span className={styles.liveDot} aria-hidden="true" />
                12,408 training this week
              </li>
              <li className={styles.chip}>
                <span className={styles.liveDot} aria-hidden="true" />
                340 team challenges live
              </li>
            </ul>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroMedia}>
              <div className={styles.mesh} aria-hidden="true" />
              <LoopingVideo
                className={`${styles.video} ${styles.heroVideo}`}
                src={aboutMedia.hero.src}
                poster={aboutMedia.hero.poster}
              />
              <div className={styles.scrim} aria-hidden="true" />
              <div className={styles.floatCard} aria-hidden="true">
                <span className={styles.floatAvatar}>AB</span>
                <span className={styles.floatBody}>
                  <span className={styles.floatTitle}>Aisha Bello logged 30 reps</span>
                  <span className={styles.floatMeta}>Push-Up Power Week · 296 / 400</span>
                  <span className={styles.floatBar}>
                    <span />
                  </span>
                </span>
              </div>
            </div>
            <CircleBadge className={styles.badge} />
          </div>
        </section>

        <div className={`${styles.container} ${styles.marqueeWrap}`}>
          <Marquee />
        </div>

        {/* ----------------------------------------------------------- story */}
        <section
          id="story"
          className={`${styles.container} ${styles.section}`}
          aria-labelledby="story-title"
        >
          <h2 id="story-title" className={`${styles.kicker} ${styles.reveal}`}>
            Our story
          </h2>
          <p className={`${styles.statement} ${styles.reveal}`}>
            Most fitness apps reward intensity. <span className={styles.volt}>TUFF rewards showing up</span>
            <span className={styles.ink}>
              {" "}
              — one rep, one walk, one day at a time, with a team that notices when you don&apos;t.
            </span>
          </p>
          <div className={styles.storyGrid}>
            <p className={styles.reveal}>
              People stick with training when someone&apos;s counting on them. That&apos;s the whole idea
              behind TUFF: every rep you log moves your team, not just you.
            </p>
            <p className={styles.reveal}>
              So we kept it simple. No complicated plans. Just a challenge, a streak, a leaderboard, and
              the people you&apos;re doing it with.
            </p>
          </div>
          <svg className={styles.arc} viewBox="0 0 1200 200" aria-hidden="true">
            <path d="M0 184 C 300 16, 900 16, 1200 184" pathLength={1} />
          </svg>
        </section>

        {/* ---------------------------------------------------- how it works */}
        <section
          id="how"
          className={`${styles.container} ${styles.section}`}
          aria-labelledby="how-title"
        >
          <div className={styles.sectionHead}>
            <p className={`${styles.kicker} ${styles.reveal}`}>How it works</p>
            <h2 id="how-title" className={`${styles.sectionTitle} ${styles.reveal}`}>
              Three moves. That&apos;s it.
            </h2>
          </div>

          <ol className={styles.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title} className={`${styles.step} ${styles.reveal}`} style={order(i)}>
                <div className={styles.preview} aria-hidden="true">
                  {i === 0 && <LogPreview />}
                  {i === 1 && <InvitePreview />}
                  {i === 2 && <BoardPreview />}
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
                <span className={styles.stepNum} aria-hidden="true">
                  0{i + 1}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------------------- community */}
        <section
          id="community"
          className={`${styles.container} ${styles.section} ${styles.community}`}
          aria-labelledby="community-title"
        >
          <div className={`${styles.communityMedia} ${styles.reveal}`}>
            <div className={styles.mesh} aria-hidden="true" />
            <LoopingVideo
              className={`${styles.video} ${styles.communityVideo}`}
              src={aboutMedia.community.src}
              poster={aboutMedia.community.poster}
            />
            <div className={styles.scrim} aria-hidden="true" />
            <span className={styles.teamPill} aria-hidden="true">
              <span className={styles.liveDot} />
              Team Ironclad · #2 of 14
            </span>
            <div className={styles.rivalCard} aria-hidden="true">
              <span className={styles.rivalLine}>
                <b>340 steps</b> behind Team Voltage
              </span>
              <span className={styles.split}>
                <span className={styles.splitUs} />
                <span className={styles.splitThem} />
              </span>
            </div>
          </div>

          <div className={styles.communityText}>
            <p className={`${styles.kicker} ${styles.reveal}`}>Community</p>
            <h2 id="community-title" className={`${styles.sectionTitle} ${styles.reveal}`}>
              Your team keeps you honest.
            </h2>
            <p className={`${styles.body} ${styles.reveal}`}>
              Invite your crew with a code and watch the whole team move. When someone logs a set,
              everyone sees it — and nobody wants to be the one who didn&apos;t show.
            </p>
            <ul className={styles.features}>
              {FEATURES.map((feature, i) => (
                <li key={feature} className={`${styles.feature} ${styles.reveal}`} style={order(i)}>
                  <span className={styles.featureIcon} aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------------------- stats */}
        <section className={`${styles.container} ${styles.section}`} aria-labelledby="stats-title">
          <div className={`${styles.statsPanel} ${styles.reveal}`}>
            <h2 id="stats-title" className={styles.kicker}>
              TUFF in numbers
            </h2>
            <dl className={styles.statsGrid}>
              {STATS.map((stat) => (
                <div key={stat.label} className={styles.stat}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------------------------------------------------- values */}
        <section className={`${styles.container} ${styles.section}`} aria-labelledby="values-title">
          <div className={styles.sectionHead}>
            <p className={`${styles.kicker} ${styles.reveal}`}>What we believe</p>
            <h2 id="values-title" className={`${styles.sectionTitle} ${styles.reveal}`}>
              Show up. Log it. Lift each other.
            </h2>
          </div>
          <ul className={styles.values}>
            {VALUES.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className={`${styles.value} ${styles.reveal}`} style={order(i)}>
                <span className={styles.valueIcon} aria-hidden="true">
                  <Icon size={24} strokeWidth={2.25} />
                </span>
                <h3 className={styles.valueTitle}>{title}</h3>
                <p className={styles.valueText}>{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------ final call */}
        <section className={`${styles.container} ${styles.section}`} aria-labelledby="cta-title">
          <div className={styles.ctaPanel}>
            <div className={styles.ctaMesh} aria-hidden="true" />
            <h2 id="cta-title" className={styles.ctaTitle}>
              <span>Your next rep</span>
              <span className={styles.volt}>{inApp ? "is waiting." : "starts here."}</span>
            </h2>
            <p className={styles.ctaText}>
              {inApp
                ? "Your team's on the board. Go log something."
                : "Join in a minute, start your first challenge, and bring your crew with you."}
            </p>
            <div className={styles.ctaActions}>
              {primaryCta}
              {!inApp && (
                <ButtonLink href="/?mode=signin" variant="ghost" size="lg">
                  Sign in
                </ButtonLink>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <BackToTop />
    </div>
  );
}

/* Step illustrations — small, static renderings of the real app UI, built
   from the same seed data the app shows. Decorative (aria-hidden above). */

function LogPreview() {
  return (
    <div className={styles.pvStack}>
      <div className={styles.pvRow}>
        <span className={styles.pvLabel}>Push-Up Power Week</span>
        <span className={styles.pvUnit}>reps</span>
      </div>
      <div className={styles.pvChips}>
        <span className={styles.pvChip}>+10</span>
        <span className={`${styles.pvChip} ${styles.pvChipOn}`}>+25</span>
        <span className={styles.pvChip}>+50</span>
      </div>
      <span className={styles.pvBar}>
        <span />
      </span>
      <span className={styles.pvMeta}>
        <b>296 → 321</b> of 400 reps
      </span>
    </div>
  );
}

function InvitePreview() {
  return (
    <div className={`${styles.pvStack} ${styles.pvCenter}`}>
      <span className={styles.pvLabel}>Invite code</span>
      <strong className={styles.pvCode}>IRON-7Q4K</strong>
      <span className={styles.pvAvatars}>
        <span>CO</span>
        <span>AB</span>
        <span>EN</span>
        <span className={styles.pvMore}>+8</span>
      </span>
      <span className={styles.pvShare}>
        <MessageCircle size={14} strokeWidth={2.25} />
        Share on WhatsApp
      </span>
    </div>
  );
}

function BoardPreview() {
  const rows = [
    { rank: 1, name: "Chiamaka Okafor", score: "14,204" },
    { rank: 2, name: "Tunde Bakare", score: "13,880" },
    { rank: 7, name: "You", score: "11,940", me: true },
  ];
  return (
    <ol className={styles.pvBoard}>
      {rows.map((row) => (
        <li key={row.rank} className={row.me ? styles.pvMe : undefined}>
          <span className={styles.pvRank}>{row.rank}</span>
          <span className={styles.pvName}>{row.name}</span>
          <span className={styles.pvScore}>
            {row.score}
            {row.me && <em> ▲4</em>}
          </span>
        </li>
      ))}
    </ol>
  );
}
