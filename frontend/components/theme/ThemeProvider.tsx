"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Theme } from "@/lib/types";

export const THEME_STORAGE_KEY = "tuff-theme";

/** Browser chrome color per theme — matches --canvas in globals.css. */
const THEME_COLOR: Record<Theme, string> = { dark: "#0b0b0d", light: "#fafaf9" };

/**
 * Runs in <head> before first paint (see app/layout.tsx), so a saved light
 * theme never flashes dark. Dark is the default; the OS setting is ignored
 * on purpose — the theme is the user's explicit choice.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"${THEME_COLOR.light}":"${THEME_COLOR.dark}")}}catch(e){}`;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return value;
}

// The source of truth is <html data-theme>, which the head script may have
// set before React loaded. Reading it through useSyncExternalStore means the
// server and the hydrating client both start from "dark" and then switch,
// with no hydration mismatch.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getSnapshot = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const getServerSnapshot = (): Theme => "dark";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // The head script can run before Next has written <meta name="theme-color">,
  // so sync the browser chrome once React is up too.
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[next]);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice just won't survive a reload.
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
