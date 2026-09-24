"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { InviteDialog, type InviteSubject } from "./InviteDialog";

type InviteButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  subject: InviteSubject;
  children: ReactNode;
};

/** The client boundary server pages use to open the invite dialog. */
export function InviteButton({ subject, children, ...rest }: InviteButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button {...rest} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <InviteDialog open={open} onClose={() => setOpen(false)} subject={subject} />
    </>
  );
}
