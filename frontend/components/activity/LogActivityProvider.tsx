"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Challenge } from "@/lib/types";
import type { LoggedActivity } from "@/lib/data";
import { LogActivityDialog } from "./LogActivityDialog";
import { ChallengeComplete } from "./ChallengeComplete";

interface LogActivityContextValue {
  /** Opens the dialog, optionally pre-selecting a challenge. */
  open: (challengeId?: string) => void;
}

const LogActivityContext = createContext<LogActivityContextValue | null>(null);

export function useLogActivity() {
  const value = useContext(LogActivityContext);
  if (!value) throw new Error("useLogActivity must be used inside <LogActivityProvider>.");
  return value;
}

/**
 * Holds the one log-activity dialog for the whole app, so the sidebar, the
 * top bar, the dashboard card and a challenge hero all open the same thing.
 * The challenge list comes from the layout, which re-fetches after each log.
 */
export function LogActivityProvider({
  challenges,
  children,
}: {
  challenges: Challenge[];
  children: ReactNode;
}) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [celebrating, setCelebrating] = useState<LoggedActivity | null>(null);

  const open = useCallback((challengeId?: string) => {
    setOpenFor(challengeId ?? null);
    setDialogOpen(true);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <LogActivityContext.Provider value={value}>
      {children}
      <LogActivityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        challenges={challenges}
        preselectId={openFor}
        onCompleted={(logged) => setCelebrating(logged)}
      />
      <ChallengeComplete logged={celebrating} onClose={() => setCelebrating(null)} />
    </LogActivityContext.Provider>
  );
}
