import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import styles from "../legal.module.css";

export const metadata: Metadata = { title: "Privacy" };

const SECTIONS = [
  { id: "collect", title: "What we collect" },
  { id: "why", title: "Why we collect it" },
  { id: "sharing", title: "Who sees it" },
  { id: "retention", title: "How long we keep it" },
  { id: "rights", title: "Your rights" },
  { id: "contact", title: "Contact" },
];

// TODO(legal): placeholder text. Before launch it needs legal review,
// including a check against Nigeria's Data Protection Act 2023.
export default function PrivacyPage() {
  return (
    <article>
      <p className={styles.kicker}>Legal</p>
      <h1 className={styles.title}>Privacy policy</h1>
      <p className={styles.updated}>Last updated: 24 September 2026</p>

      <p className={styles.draft}>
        <strong>Draft. Not final legal text.</strong> This describes how TUFF is meant to handle your
        data. It will change after legal review, including a check against Nigeria&apos;s Data
        Protection Act 2023, before TUFF launches.
      </p>

      <nav aria-label="Contents" className={styles.contents}>
        <p className={styles.contentsTitle}>Contents</p>
        <ol>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="collect" className={styles.section} aria-labelledby="collect-title">
        <h2 id="collect-title">What we collect</h2>
        <ul>
          <li>Your name, email and profile photo, if you add one.</li>
          <li>The activity you log: steps, reps, seconds, and when.</li>
          <li>The challenges and teams you join.</li>
        </ul>
      </section>

      <section id="why" className={styles.section} aria-labelledby="why-title">
        <h2 id="why-title">Why we collect it</h2>
        <p>
          To run your challenges, keep your streak, rank the leaderboards, and show your team
          what&apos;s happening. We don&apos;t sell your data.
        </p>
      </section>

      <section id="sharing" className={styles.section} aria-labelledby="sharing-title">
        <h2 id="sharing-title">Who sees it</h2>
        <p>
          Your teammates see your name, photo and what you log to shared challenges. Leaderboards show
          your name and points. Nothing else is shared without asking you first.
        </p>
      </section>

      <section id="retention" className={styles.section} aria-labelledby="retention-title">
        <h2 id="retention-title">How long we keep it</h2>
        <p>
          For as long as you have an account. When you delete it, we remove your data, apart from
          anything the law requires us to keep.
        </p>
      </section>

      <section id="rights" className={styles.section} aria-labelledby="rights-title">
        <h2 id="rights-title">Your rights</h2>
        <p>
          You can ask to see, correct, download or delete the data we hold about you. Email us and
          we&apos;ll respond as the law requires.
        </p>
      </section>

      <section id="contact" className={styles.section} aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <p>
          Questions about your data? Email{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </section>
    </article>
  );
}
