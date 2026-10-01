import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./AuthCard.module.css";

/** A centered panel for the small auth pages (forgot and reset password),
 *  over the same gradient mesh as the sign-in page. */
export function AuthCard({ title, lede, children }: { title: string; lede?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.mesh} aria-hidden="true" />
      <main className={styles.card}>
        <Link href="/" className={styles.brand} aria-label="TUFF home">
          <Image src="/logo/logo_2.png" alt="" width={340} height={113} priority className={styles.logo} />
        </Link>
        <h1 className={styles.title}>{title}</h1>
        {lede && <p className={styles.lede}>{lede}</p>}
        {children}
        <Link href="/?mode=signin" className={styles.back}>
          <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" />
          Back to sign in
        </Link>
      </main>
    </div>
  );
}
