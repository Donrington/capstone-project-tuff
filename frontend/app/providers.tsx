"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { FlashToast } from "@/components/ui/FlashToast";

/**
 * Client providers wrapped around every page, so auth, onboarding and the app
 * shell can all raise toasts and read the theme.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
        <FlashToast />
      </ToastProvider>
    </ThemeProvider>
  );
}
