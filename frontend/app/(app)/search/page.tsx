import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSearchIndex } from "@/lib/data";
import { searchIndex, splitMatch } from "@/lib/search";
import styles from "./search.module.css";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, index] = await Promise.all([searchParams, getSearchIndex()]);
  const query = q.trim();
  const groups = searchIndex(index, query);
  const total = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div>
      <PageHeader
        kicker="Search"
        title={query ? `Results for “${query}”` : "Search"}
        subtitle={query ? `${total} ${total === 1 ? "match" : "matches"}` : "Find any challenge, team or person."}
      />

      {query && total === 0 && (
        <EmptyState
          icon={SearchX}
          title="No matches"
          text={`No matches for ‘${query}’. Try a challenge or a teammate's name.`}
        />
      )}

      <div className={styles.groups}>
        {groups.map((group) => (
          <section key={group.kind} aria-labelledby={`group-${group.kind}`} className={styles.group}>
            <h2 id={`group-${group.kind}`} className={styles.heading}>
              {group.label} <span className={styles.count}>{group.items.length}</span>
            </h2>
            <ul className={styles.list}>
              {group.items.map((item) => {
                const [before, match, after] = splitMatch(item.label, query);
                return (
                  <li key={item.id}>
                    <Link href={item.href} className={styles.row}>
                      <span className={styles.label}>
                        {before}
                        {match && <b>{match}</b>}
                        {after}
                      </span>
                      <span className={styles.sub}>{item.sublabel}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
