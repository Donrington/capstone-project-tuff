import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignupsChart } from "@/components/admin/SignupsChart";
import { getAdminOverview } from "@/lib/data";
import styles from "@/components/admin/admin.module.css";

const n = (value: number) => value.toLocaleString("en-US");

export default async function AdminOverviewPage() {
  const o = await getAdminOverview();

  const tiles: { label: string; value: number; note: string; href?: string }[] = [
    { label: "Members", value: o.users.total, note: `${n(o.users.newLast7Days)} joined this week`, href: "/admin/users" },
    {
      label: "Active this week",
      value: o.users.activeLast7Days,
      note: `of ${n(o.users.total)} members logged something`,
    },
    {
      label: "Suspended",
      value: o.users.suspended,
      note: o.users.suspended === 1 ? "account" : "accounts",
      href: "/admin/users?status=suspended",
    },
    { label: "Admins", value: o.users.admins, note: o.users.admins === 1 ? "person" : "people", href: "/admin/users?role=admin" },
    { label: "Teams", value: o.teams, note: "active", href: "/admin/teams" },
    {
      label: "Live challenges",
      value: o.challenges.byStatus.active ?? 0,
      note: `${n(o.challenges.total)} in all`,
      href: "/admin/challenges",
    },
    {
      label: "Entries this week",
      value: o.activities.last7Days,
      note: `${n(o.activities.total)} all time`,
    },
  ];

  return (
    <div>
      <PageHeader kicker="Admin" title="Overview" subtitle="How TUFF is doing, and where to look." />
      <AdminNav />

      <ul className={styles.tiles}>
        {tiles.map((t) => (
          <li key={t.label} className={styles.tile}>
            {t.href ? (
              <Link href={t.href} className={styles.tileLink}>
                <TileBody {...t} />
              </Link>
            ) : (
              <div className={styles.tileLink}>
                <TileBody {...t} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <section className={styles.panel} aria-labelledby="signups-heading">
        <h2 id="signups-heading" className={styles.panelTitle}>
          New members
        </h2>
        <SignupsChart data={o.signups} />
      </section>
    </div>
  );
}

function TileBody({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{n(value)}</span>
      <span className={styles.tileNote}>{note}</span>
    </>
  );
}
