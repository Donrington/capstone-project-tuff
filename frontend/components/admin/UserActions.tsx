"use client";

import { setUserRoleAction, setUserStatusAction } from "@/app/(app)/admin/actions";
import type { AdminUser } from "@/lib/types";
import { ConfirmAction } from "./ConfirmAction";
import styles from "./admin.module.css";

/** Suspend/reactivate and promote/demote for one member's row. Your own row has neither. */
export function UserActions({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  if (isSelf) return <span className={styles.muted}>You</span>;

  const suspended = user.status === "suspended";
  const admin = user.role === "admin";

  // Each action has its own key: they sit in the same place, and without it React would
  // reuse the open dialog for the opposite action as the row changes under it.
  return (
    <div className={styles.rowActions}>
      {suspended ? (
        <ConfirmAction
          key="reactivate"
          label="Reactivate"
          title={`Reactivate ${user.name}?`}
          description="They'll be able to sign in again, and they'll show on the leaderboard if they had opted in."
          confirmLabel="Reactivate"
          success={`${user.name} is active again.`}
          run={() => setUserStatusAction(user.id, "active")}
        />
      ) : (
        <ConfirmAction
          key="suspend"
          label="Suspend"
          title={`Suspend ${user.name}?`}
          description="They're signed out and can't sign back in, and they come off the leaderboard. Nothing is deleted, and you can reactivate them any time."
          confirmLabel="Suspend"
          success={`${user.name} is suspended.`}
          run={() => setUserStatusAction(user.id, "suspended")}
          danger
        />
      )}
      {admin ? (
        <ConfirmAction
          key="remove-admin"
          label="Remove admin"
          title={`Remove ${user.name} as an admin?`}
          description="They keep their account and go back to being a regular member."
          confirmLabel="Remove admin"
          success={`${user.name} is a member again.`}
          run={() => setUserRoleAction(user.id, "member")}
          danger
        />
      ) : (
        <ConfirmAction
          key="make-admin"
          label="Make admin"
          title={`Make ${user.name} an admin?`}
          description="Admins can see every member's email, suspend accounts, cancel challenges and make other admins. Only do this for someone you trust."
          confirmLabel="Make admin"
          success={`${user.name} is now an admin.`}
          run={() => setUserRoleAction(user.id, "admin")}
        />
      )}
    </div>
  );
}
