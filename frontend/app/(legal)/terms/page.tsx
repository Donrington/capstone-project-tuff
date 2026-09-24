import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import styles from "../legal.module.css";

export const metadata: Metadata = { title: "Terms" };

const SECTIONS = [
  { id: "accounts", title: "Accounts" },
  { id: "acceptable-use", title: "Acceptable use" },
  { id: "challenges", title: "Challenges and content" },
  { id: "fees", title: "Fees" },
  { id: "termination", title: "Ending your account" },
  { id: "liability", title: "Liability" },
  { id: "contact", title: "Contact" },
];

// TODO(legal): placeholder text. It needs review by a lawyer before launch.
export default function TermsPage() {
  return (
    <article>
      <p className={styles.kicker}>Legal</p>
      <h1 className={styles.title}>Terms of use</h1>
      <p className={styles.updated}>Last updated: 24 September 2026</p>

      <p className={styles.draft}>
        <strong>Draft. Not final legal text.</strong> These terms describe how TUFF is meant to work
        and will change after legal review, before TUFF launches.
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

      <section id="accounts" className={styles.section} aria-labelledby="accounts-title">
        <h2 id="accounts-title">Accounts</h2>
        <p>
          You need an account to join challenges and teams. Keep your sign-in details to yourself,
          and tell us straight away if you think someone else has used your account.
        </p>
      </section>

      <section id="acceptable-use" className={styles.section} aria-labelledby="use-title">
        <h2 id="use-title">Acceptable use</h2>
        <p>Use TUFF to train and to cheer each other on. Don&apos;t:</p>
        <ul>
          <li>log activity you didn&apos;t do to climb a leaderboard,</li>
          <li>harass, threaten or impersonate other people,</li>
          <li>try to break, overload or get around how TUFF works.</li>
        </ul>
      </section>

      <section id="challenges" className={styles.section} aria-labelledby="challenges-title">
        <h2 id="challenges-title">Challenges and content</h2>
        <p>
          You own what you post, like challenge names and notes. By posting it you let us show it to
          the people you share it with, such as your team.
        </p>
        <p>
          TUFF isn&apos;t medical advice. Train within your limits, and talk to a doctor before
          starting anything new if you have a health condition.
        </p>
      </section>

      <section id="fees" className={styles.section} aria-labelledby="fees-title">
        <h2 id="fees-title">Fees</h2>
        <p>
          TUFF is free to use today. If we ever add paid features, we&apos;ll update these terms and
          tell you before anything changes for you.
        </p>
      </section>

      <section id="termination" className={styles.section} aria-labelledby="termination-title">
        <h2 id="termination-title">Ending your account</h2>
        <p>
          You can stop using TUFF at any time. We may suspend accounts that break these terms, and
          we&apos;ll explain why when we can.
        </p>
      </section>

      <section id="liability" className={styles.section} aria-labelledby="liability-title">
        <h2 id="liability-title">Liability</h2>
        <p>
          We work to keep TUFF running and your data safe, but we provide it as it is, without
          guarantees it will always be available or error-free.
        </p>
      </section>

      <section id="contact" className={styles.section} aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <p>
          Questions about these terms? Email{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </section>
    </article>
  );
}
