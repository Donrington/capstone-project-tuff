import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { AdminNav } from "@/components/admin/AdminNav";
import { Pagination } from "@/components/admin/Pagination";
import { UserActions } from "@/components/admin/UserActions";
import { getCurrentUser as getSession } from "@/lib/auth/get-current-user";
import { getAdminUsers } from "@/lib/data";
import { USER_STATUS_BADGE, capitalise, initialsOf, shortDate } from "@/lib/admin-format";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Members · Admin" };

const STATUSES = ["active", "inactive", "suspended"];
const ROLES = ["member", "admin"];

type SearchParams = Promise<{ q?: string; status?: string; role?: string; page?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  // Only values the backend knows; anything else in the URL is ignored.
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const role = ROLES.includes(sp.role ?? "") ? sp.role : undefined;
  const requested = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const [session, result] = await Promise.all([
    getSession(),
    getAdminUsers({ q: q || undefined, status, role, page: requested }),
  ]);
  const filtered = Boolean(q || status || role);

  return (
    <div>
      <PageHeader kicker="Admin" title="Members" subtitle="Everyone with an account. Search, then suspend or promote." />
      <AdminNav />

      <form method="get" action="/admin/users" className={styles.filters} role="search" aria-label="Filter members">
        <FormField
          label="Search"
          name="q"
          type="search"
          placeholder="Name or email"
          defaultValue={q}
          maxLength={100}
          autoComplete="off"
          trailing={<Search size={16} aria-hidden="true" />}
        />
        <Select
          label="Status"
          name="status"
          defaultValue={status ?? "all"}
          options={[{ value: "all", label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: capitalise(s) }))]}
        />
        <Select
          label="Role"
          name="role"
          defaultValue={role ?? "all"}
          options={[{ value: "all", label: "Any role" }, ...ROLES.map((r) => ({ value: r, label: capitalise(r) }))]}
        />
        <div className={styles.filterButtons}>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          {filtered && (
            <Link href="/admin/users" className={styles.clear}>
              Clear
            </Link>
          )}
        </div>
      </form>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title={filtered ? "No one matches." : "No members yet."}
          text={filtered ? "Try a different name, or clear the filters." : "Accounts show up here as people sign up."}
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Members</caption>
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Team</th>
                <th scope="col">Joined</th>
                <th scope="col">Last active</th>
                <th scope="col" className={styles.num}>
                  Entries
                </th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((u) => (
                <tr key={u.id}>
                  <th scope="row" className={styles.who}>
                    <Avatar initials={initialsOf(u.name)} size="sm" photoUrl={u.profilePicture} />
                    <span className={styles.whoText}>
                      <span className={styles.whoName}>{u.name}</span>
                      <span className={styles.whoMeta}>{u.email}</span>
                    </span>
                  </th>
                  <td>
                    <Badge variant={u.role === "admin" ? "volt" : "neutral"}>{capitalise(u.role)}</Badge>
                  </td>
                  <td>
                    <Badge variant={USER_STATUS_BADGE[u.status] ?? "neutral"}>{capitalise(u.status)}</Badge>
                  </td>
                  <td>{u.teamName ?? <span className={styles.muted}>—</span>}</td>
                  <td>{shortDate(u.createdAt)}</td>
                  <td>{u.lastActiveAt ? shortDate(u.lastActiveAt) : <span className={styles.muted}>Never</span>}</td>
                  <td className={styles.num}>{u.activityCount.toLocaleString("en-US")}</td>
                  <td>
                    <UserActions user={u} isSelf={u.id === session?.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/admin/users"
        params={{ q: q || undefined, status, role }}
        page={result.page}
        pages={result.pages}
        total={result.total}
        noun={result.total === 1 ? "member" : "members"}
      />
    </div>
  );
}
