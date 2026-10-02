"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { leaveTeamAction } from "@/app/(app)/actions";
import { DialogActions } from "./CreateTeamButton";
import styles from "./teams.module.css";

export function LeaveTeamButton({ teamName }: { teamName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <LogOut size={16} strokeWidth={2.25} aria-hidden="true" />
        Leave team
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={`Leave ${teamName}?`}
        description="Your past activity stays on the team's totals. You can rejoin with the invite code."
      >
        <form action={leaveTeamAction} className={styles.dialogForm}>
          <DialogActions onCancel={() => setOpen(false)} submitLabel="Leave team" pendingLabel="Leaving…" danger />
        </form>
      </Dialog>
    </>
  );
}
