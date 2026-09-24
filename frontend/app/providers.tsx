"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { FlashToast } from "@/components/ui/FlashToast";

/**
 * Client providers wrapped around every page, so auth, onboarding and the app
 * shell can all raise toasts. The theme provider joins this file with #19.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <FlashToast />
    </ToastProvider>
  );
}
