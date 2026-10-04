import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { CancelChallengeButton } from "@/components/admin/CancelChallengeButton";
import { Pagination } from "@/components/admin/Pagination";
import { getAdminChallenges } from "@/lib/data";
import { CHALLENGE_STATUS_BADGE, capitalise, shortDate } from "@/lib/admin-format";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Challenges · Admin" };

const STATUSES = ["active", "upcoming", "draft", "completed", "cancelled"];

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function AdminChallengesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const requested = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const result = await getAdminChallenges({ status, page: requested });

  return (
    <div>
      <PageHeader kicker="Admin" title="Challenges" subtitle="Every challenge, solo and team. Cancel one that shouldn't be running." />
      <AdminNav />

      <nav aria-label="Filter by status" className={styles.chips}>
        <Link href="/admin/challenges" className={styles.chip} aria-current={status ? undefined : "true"}>
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/challenges?status=${s}`}
            className={styles.chip}
            aria-current={status === s ? "true" : undefined}
          >
            {capitalise(s)}
          </Link>
        ))}
      </nav>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No challenges here."
          text={status ? `Nothing is ${status} right now.` : "Challenges show up here once someone starts one."}
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Challenges</caption>
            <thead>
              <tr>
                <th scope="col">Challenge</th>
                <th scope="col">Status</th>
                <th scope="col">Who</th>
                <th scope="col" className={styles.num}>
                  Goal
                </th>
                <th scope="col" className={styles.num}>
                  People
                </th>
                <th scope="col">Runs</th>
                <th scope="col">Started by</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((c) => (
                <tr key={c.id}>
                  <th scope="row" className={styles.who}>
                    <span className={styles.whoText}>
                      <span className={styles.whoName}>{c.title}</span>
                      <span className={styles.whoMeta}>{capitalise(c.type)}</span>
                    </span>
                  </th>
                  <td>
                    <Badge variant={CHALLENGE_STATUS_BADGE[c.status] ?? "neutral"}>{capitalise(c.status)}</Badge>
                  </td>
                  <td>{c.teamName ?? "Solo"}</td>
                  <td className={styles.num}>
                    {c.goal.toLocaleString("en-US")} {c.unit}
                  </td>
                  <td className={styles.num}>{c.participants.toLocaleString("en-US")}</td>
                  <td className={styles.nowrap}>
                    {shortDate(c.startDate)} – {shortDate(c.endDate)}
                  </td>
                  <td>{c.createdBy}</td>
                  <td>
                    {["active", "upcoming", "draft"].includes(c.status) && <CancelChallengeButton id={c.id} title={c.title} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/admin/challenges"
        params={{ status }}
        page={result.page}
        pages={result.pages}
        total={result.total}
        noun={result.total === 1 ? "challenge" : "challenges"}
      />
    </div>
  );
}
