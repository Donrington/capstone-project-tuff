"use client";

import { RadioChips } from "@/components/ui/RadioChips";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { Theme } from "@/lib/types";
import { SettingsSection } from "./SettingsSection";

/** Applies straight away and is remembered on this device — no save step. */
export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsSection id="appearance" title="Appearance" sub="Changes apply straight away and stick on this device.">
      <RadioChips
        legend="Theme"
        name="theme"
        value={theme}
        onChange={(value) => setTheme(value as Theme)}
        options={[
          { value: "dark", label: "Dark", hint: "TUFF's home turf." },
          { value: "light", label: "Light", hint: "For bright rooms and daylight." },
        ]}
      />
    </SettingsSection>
  );
}
