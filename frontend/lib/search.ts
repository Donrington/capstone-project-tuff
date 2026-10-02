import type { SearchItem, SearchKind } from "./types";

/** Display order and headings for result groups. */
export const SEARCH_GROUPS: { kind: SearchKind; label: string }[] = [
  { kind: "challenge", label: "Challenges" },
  { kind: "team", label: "Teams" },
  { kind: "person", label: "People" },
];

function score(item: SearchItem, q: string): number {
  const label = item.label.toLowerCase();
  if (label.startsWith(q)) return 3;
  if (label.split(/\s+/).some((word) => word.startsWith(q))) return 2;
  if (label.includes(q)) return 1;
  if (item.keywords.some((k) => k.toLowerCase().includes(q))) return 0.5;
  return 0;
}

/**
 * Filters and ranks the index for a query, grouped by kind. Pure, so the
 * search box (client) and /search (server) share it. `perGroup` caps each
 * group — 5 in the dropdown, unlimited on the results page.
 */
export function searchIndex(
  index: SearchItem[],
  query: string,
  perGroup = Infinity,
): { kind: SearchKind; label: string; items: SearchItem[] }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SEARCH_GROUPS.map(({ kind, label }) => ({
    kind,
    label,
    items: index
      .filter((item) => item.kind === kind)
      .map((item) => ({ item, s: score(item, q) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s || a.item.label.localeCompare(b.item.label))
      .slice(0, perGroup)
      .map(({ item }) => item),
  })).filter((group) => group.items.length > 0);
}

/** Splits a label around the first match, so the match can be bolded. */
export function splitMatch(label: string, query: string): [string, string, string] {
  const q = query.trim().toLowerCase();
  const at = q ? label.toLowerCase().indexOf(q) : -1;
  if (at < 0) return [label, "", ""];
  return [label.slice(0, at), label.slice(at, at + q.length), label.slice(at + q.length)];
}
