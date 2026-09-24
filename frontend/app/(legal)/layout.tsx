import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./legal.module.css";

/** A calm reading layout for the legal pages: the logo home, one column. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.brand} aria-label="TUFF home">
          <Image src="/logo/logo_2.png" alt="TUFF" width={340} height={113} loading="eager" className={styles.logo} />
        </Link>
        <Link href="/" className={styles.back}>
          <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" />
          Back to TUFF
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
