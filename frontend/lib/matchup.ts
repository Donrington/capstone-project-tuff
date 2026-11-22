/** The four reactions the backend model accepts, shared by the route handler,
 *  the mock data source and the buttons so the enum can't drift in the UI. */
export const MATCHUP_REACTIONS = ["fire", "muscle", "clap", "grit"] as const;

export type MatchupReactionKey = (typeof MATCHUP_REACTIONS)[number];

export const REACTION_LABEL: Record<MatchupReactionKey, string> = {
  fire: "Fire",
  muscle: "Muscle",
  clap: "Clap",
  grit: "Grit",
};

/** Glyphs are decorative; the accessible name comes from REACTION_LABEL. */
export const REACTION_GLYPH: Record<MatchupReactionKey, string> = {
  fire: "🔥",
  muscle: "💪",
  clap: "👏",
  grit: "🪨",
};

export function isMatchupReaction(value: unknown): value is MatchupReactionKey {
  return typeof value === "string" && (MATCHUP_REACTIONS as readonly string[]).includes(value);
}
