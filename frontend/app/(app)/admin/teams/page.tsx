import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { Pagination } from "@/components/admin/Pagination";
import { getAdminTeams } from "@/lib/data";
import { capitalise, shortDate } from "@/lib/admin-format";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Teams · Admin" };

type SearchParams = Promise<{ page?: string }>;

export default async function AdminTeamsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const result = await getAdminTeams({ page: Math.max(1, Math.floor(Number(sp.page)) || 1) });

  return (
    <div>
      <PageHeader kicker="Admin" title="Teams" subtitle="Every team, newest first." />
      <AdminNav />

      {result.rows.length === 0 ? (
        <EmptyState icon={UsersRound} title="No teams yet." text="Teams show up here once someone starts one." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Teams</caption>
            <thead>
              <tr>
                <th scope="col">Team</th>
                <th scope="col">Status</th>
                <th scope="col" className={styles.num}>
                  Members
                </th>
                <th scope="col">Started by</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((t) => (
                <tr key={t.id}>
                  <th scope="row" className={styles.who}>
                    <span className={styles.whoName}>{t.name}</span>
                  </th>
                  <td>
                    <Badge variant={t.status === "active" ? "success" : "neutral"}>{capitalise(t.status)}</Badge>
                  </td>
                  <td className={styles.num}>
                    {t.members} / {t.maxMembers}
                  </td>
                  <td>{t.createdBy}</td>
                  <td>{shortDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/admin/teams"
        page={result.page}
        pages={result.pages}
        total={result.total}
        noun={result.total === 1 ? "team" : "teams"}
      />
    </div>
  );
}
