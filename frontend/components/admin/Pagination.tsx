import Link from "next/link";
import styles from "./admin.module.css";

interface PaginationProps {
  basePath: string;
  /** The filters in force, kept on every link. */
  params?: Record<string, string | undefined>;
  page: number;
  pages: number;
  total: number;
  noun: string;
}

function hrefFor(basePath: string, params: PaginationProps["params"], page: number) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) if (value) qs.set(key, value);
  if (page > 1) qs.set("page", String(page));
  const text = qs.toString();
  return text ? `${basePath}?${text}` : basePath;
}

/** "Page 2 of 5 · 94 members" with Previous/Next links. Renders nothing when there's one page and no total worth showing. */
export function Pagination({ basePath, params, page, pages, total, noun }: PaginationProps) {
  return (
    <nav aria-label={`${noun} pages`} className={styles.pagination}>
      <p className={styles.pageInfo}>
        {total.toLocaleString("en-US")} {noun}
        {pages > 1 && ` · page ${page} of ${pages}`}
      </p>
      {pages > 1 && (
        <div className={styles.pageLinks}>
          {page > 1 ? (
            <Link href={hrefFor(basePath, params, page - 1)} className={styles.pageLink} rel="prev">
              Previous
            </Link>
          ) : (
            <span className={styles.pageLink} aria-disabled="true">
              Previous
            </span>
          )}
          {page < pages ? (
            <Link href={hrefFor(basePath, params, page + 1)} className={styles.pageLink} rel="next">
              Next
            </Link>
          ) : (
            <span className={styles.pageLink} aria-disabled="true">
              Next
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
