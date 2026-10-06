import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { DismissFlagButton } from "@/components/admin/DismissFlagButton";
import { Pagination } from "@/components/admin/Pagination";
import { getAdminFlags } from "@/lib/data";
import { shortDate } from "@/lib/admin-format";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Flags · Admin" };

type SearchParams = Promise<{ page?: string }>;

/** Entries a deterministic rule marked as implausibly high for one entry —
 *  not rejected at the time, just surfaced here. aiNote (when Claude is
 *  configured) is a best guess at why; flagReason is always there either
 *  way, since the rule itself needs no AI to run. */
export default async function AdminFlagsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const result = await getAdminFlags({ page: Math.max(1, Math.floor(Number(sp.page)) || 1) });

  return (
    <div>
      <PageHeader
        kicker="Admin"
        title="Flags"
        subtitle="Logged entries well outside the usual range for one entry. Nothing here was rejected — just worth a glance."
      />
      <AdminNav />

      {result.rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing flagged."
          text="Entries land here only when a single one is well past the usual range — most logging never comes close."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Flagged activity</caption>
            <thead>
              <tr>
                <th scope="col">Who</th>
                <th scope="col">Entry</th>
                <th scope="col">Where</th>
                <th scope="col">Logged</th>
                <th scope="col">Why it&rsquo;s flagged</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((f) => (
                <tr key={f.id}>
                  <th scope="row" className={styles.who}>
                    <span className={styles.whoName}>{f.person}</span>
                  </th>
                  <td className={styles.num}>
                    {f.value.toLocaleString("en-US")} {f.unit}
                  </td>
                  <td>{f.context}</td>
                  <td>{shortDate(f.recordedAt)}</td>
                  <td className={styles.flagNote}>{f.aiNote ?? f.flagReason}</td>
                  <td>
                    <DismissFlagButton id={f.id} person={f.person} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/admin/flags"
        page={result.page}
        pages={result.pages}
        total={result.total}
        noun={result.total === 1 ? "flagged entry" : "flagged entries"}
      />
    </div>
  );
}
