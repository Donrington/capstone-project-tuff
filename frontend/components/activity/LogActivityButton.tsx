"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/Button";
import { useLogActivity } from "./LogActivityProvider";

type LogActivityButtonProps = ComponentProps<typeof Button> & {
  /** Pre-selects this challenge in the dialog. */
  challengeId?: string;
};

/** The client boundary server pages use to open the log dialog. */
export function LogActivityButton({ challengeId, ...rest }: LogActivityButtonProps) {
  const { open } = useLogActivity();
  return <Button {...rest} onClick={() => open(challengeId)} />;
}
