import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Target, UsersRound } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { JoinForm } from "@/components/invite/JoinForm";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getInvitePreview } from "@/lib/data";
import { inviteDetail, inviteKicker, inviteTitle, safeJoinPath } from "@/lib/invite";
import styles from "./join.module.css";

type Params = Promise<{ code: string }>;

/** Reads the public preview once per render; a dead backend shows the same
 *  generic card as an unknown code rather than taking the invite link down. */
async function loadInvite(codeParam: string) {
  const path = safeJoinPath(codeParam);
  const code = path?.slice("/join/".length) ?? null;
  const preview = code ? await getInvitePreview(code).catch(() => null) : null;
  return { code, path, preview };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code: codeParam } = await params;
  const { preview } = await loadInvite(codeParam);
  const title = preview ? `Join ${inviteTitle(preview)}` : "Invite not found";
  const description = preview
    ? `${preview.inviterFirstName} invited you to ${inviteTitle(preview)} on TUFF.`
    : "Open this TUFF invite link to see what's waiting for you.";
  // Link previews (WhatsApp, LinkedIn, X) read og:/twitter: titles, not
  // <title> — without these they fall back to the root layout's generic site
  // title above the invite image. The images come from the sibling
  // opengraph-image / twitter-image files, which Next merges in.
  return {
    title,
    description,
    openGraph: { title: `${title} · TUFF`, description, type: "website" },
    twitter: { card: "summary_large_image", title: `${title} · TUFF`, description },
  };
}

export default async function JoinPage({ params }: { params: Params }) {
  const { code: codeParam } = await params;
  const [{ code, path, preview }, user] = await Promise.all([loadInvite(codeParam), getCurrentUser()]);

  const signUpHref = path ? `/?${new URLSearchParams({ mode: "signup", next: path })}` : "/";
  const signInHref = path ? `/?${new URLSearchParams({ mode: "signin", next: path })}` : "/?mode=signin";

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.brand} aria-label="TUFF home">
          <Logo alt="" width={300} height={100} priority className={styles.logo} />
        </Link>
        <span className={styles.topTag}>You&apos;re invited</span>
      </header>

      <main className={styles.shell}>
        <div className={styles.glow} aria-hidden="true" />
        <section className={styles.card} aria-labelledby="invite-title">
          {preview ? (
            <>
              <p className={styles.kicker}>{inviteKicker(preview)}</p>
              <div className={styles.iconWrap} aria-hidden="true">
                {preview.kind === "team" ? <UsersRound size={28} strokeWidth={2} /> : <Target size={28} strokeWidth={2} />}
              </div>
              <h1 id="invite-title" className={styles.title}>
                Join {inviteTitle(preview)}
              </h1>
              <p className={styles.inviter}>{preview.inviterFirstName} invited you.</p>
              <p className={styles.detail}>{inviteDetail(preview)}</p>
              {code && <p className={styles.code}>{code}</p>}

              {user ? (
                <>
                  {code && <JoinForm code={code} />}
                  <p className={styles.bail}>
                    <Link href="/dashboard">Not now</Link>
                  </p>
                </>
              ) : (
                <div className={styles.auth}>
                  <p className={styles.hint}>Make an account or sign in to accept this invite.</p>
                  <div className={styles.authActions}>
                    <ButtonLink href={signUpHref} size="lg" fullWidth>
                      Create account
                    </ButtonLink>
                    <ButtonLink href={signInHref} variant="secondary" size="lg" fullWidth>
                      Sign in
                    </ButtonLink>
                  </div>
                  <p className={styles.footnote}>Already training with us? Sign in and we&apos;ll bring you straight back here.</p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className={styles.kicker}>Invite</p>
              <div className={styles.iconWrap} aria-hidden="true">
                <KeyRound size={28} strokeWidth={2} />
              </div>
              <h1 id="invite-title" className={styles.title}>
                That invite isn&apos;t available
              </h1>
              <p className={styles.inviter}>The code doesn&apos;t match a team or challenge right now.</p>
              <p className={styles.detail}>Check it with whoever sent it — a character might have been left out.</p>
              <div className={styles.authActions}>
                <ButtonLink href={user ? "/dashboard" : "/"} size="lg" fullWidth>
                  {user ? "Go to your dashboard" : "Back to TUFF"}
                </ButtonLink>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
