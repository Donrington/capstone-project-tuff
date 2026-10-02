"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trophy, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Popover } from "@/components/ui/Popover";
import { searchIndex, splitMatch } from "@/lib/search";
import type { SearchItem, SearchKind } from "@/lib/types";
import styles from "./SearchBox.module.css";

const KIND_ICON: Record<SearchKind, LucideIcon> = {
  challenge: Trophy,
  team: UsersRound,
  person: UserRound,
};

const PER_GROUP = 5;

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

/**
 * Search, in the header of every app page. A field from 720px up; below
 * that an icon button that opens the same search in a sheet. `/` or
 * Ctrl/⌘+K focuses it from anywhere.
 */
export function SearchBox({ index }: { index: SearchItem[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const shortcut =
        (event.key === "/" && !isTyping(event.target)) ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k");
      if (!shortcut) return;
      event.preventDefault();
      if (window.matchMedia("(max-width: 719px)").matches) setSheetOpen(true);
      else inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className={styles.desktop}>
        <Combobox index={index} inputRef={inputRef} />
      </div>

      <button
        type="button"
        className={styles.phoneTrigger}
        onClick={() => setSheetOpen(true)}
        aria-label="Search"
      >
        <Search size={18} aria-hidden="true" />
      </button>
      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} title="Search" size="lg">
        {sheetOpen && <Combobox index={index} inline autoFocus onNavigate={() => setSheetOpen(false)} />}
      </Dialog>
    </>
  );
}

interface ComboboxProps {
  index: SearchItem[];
  /** Results render under the field (in the phone sheet), not in a popover. */
  inline?: boolean;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onNavigate?: () => void;
}

/** The ARIA combobox: the input owns the listbox and the active option. */
function Combobox({ index, inline, autoFocus, inputRef, onNavigate }: ComboboxProps) {
  const router = useRouter();
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const fieldRef = useRef<HTMLLabelElement>(null);
  const ownInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const groups = useMemo(() => searchIndex(index, query, PER_GROUP), [index, query]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const showResults = (inline || open) && query.trim().length > 0;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setActive(-1);
    onNavigate?.();
    router.push(href);
  }

  function seeAll() {
    const q = query.trim();
    if (q) go(`/search?q=${encodeURIComponent(q)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        if (flat.length) setActive((i) => (i + 1) % flat.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setOpen(true);
        if (flat.length) setActive((i) => (i <= 0 ? flat.length - 1 : i - 1));
        break;
      case "Enter":
        event.preventDefault();
        if (active >= 0 && flat[active]) go(flat[active].href);
        else seeAll();
        break;
      case "Escape":
        if (open && !inline) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (query) {
          event.preventDefault();
          setQuery("");
        }
        break;
    }
  }

  // In the phone sheet, focus the field once the dialog has opened. React's
  // autoFocus runs first and showModal() then moves focus to the Close
  // button, so wait a frame.
  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => ownInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus]);

  // Keep the active option in view as arrows move through a long list.
  useEffect(() => {
    if (active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId is stable for a given baseId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const results = (
    <div
      ref={panelRef}
      id={listboxId}
      role="listbox"
      aria-label="Search results"
      className={inline ? styles.inlineResults : styles.results}
      data-lenis-prevent
    >
      {groups.length === 0 ? (
        <p className={styles.none}>
          No matches for &lsquo;{query.trim()}&rsquo;. Try a challenge or a teammate&apos;s name.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.kind} role="group" aria-labelledby={`${baseId}-${group.kind}`} className={styles.group}>
            <p id={`${baseId}-${group.kind}`} className={styles.groupLabel}>
              {group.label}
            </p>
            {group.items.map((item) => {
              const i = flat.indexOf(item);
              const Icon = KIND_ICON[item.kind];
              const [before, match, after] = splitMatch(item.label, query);
              return (
                <div
                  key={item.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  className={styles.option}
                  // Keep focus in the field; the click still lands.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.href)}
                >
                  <span className={styles.optionIcon} aria-hidden="true">
                    <Icon size={15} strokeWidth={2.25} />
                  </span>
                  <span className={styles.optionText}>
                    <span className={styles.optionLabel}>
                      {before}
                      {match && <b>{match}</b>}
                      {after}
                    </span>
                    <span className={styles.optionSub}>{item.sublabel}</span>
                  </span>
                </div>
              );
            })}
          </div>
        ))
      )}
      <button
        type="button"
        className={styles.seeAll}
        onMouseDown={(event) => event.preventDefault()}
        onClick={seeAll}
        tabIndex={-1}
      >
        See all results for &lsquo;{query.trim()}&rsquo;
      </button>
    </div>
  );

  return (
    <div className={inline ? styles.inlineWrap : undefined}>
      <label ref={fieldRef} className={styles.field}>
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search challenges, teams and people</span>
        <input
          ref={(el) => {
            ownInputRef.current = el;
            if (inputRef) inputRef.current = el;
          }}
          type="text"
          role="combobox"
          aria-expanded={showResults}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={showResults && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search challenges, teams…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onClick={() => query && setOpen(true)}
          onFocus={() => query && setOpen(true)}
          onBlur={(event) => {
            if (!panelRef.current?.contains(event.relatedTarget as Node)) setOpen(false);
          }}
          onKeyDown={onKeyDown}
        />
        <kbd className={styles.hint} aria-hidden="true">
          /
        </kbd>
      </label>

      {inline ? (
        showResults && results
      ) : (
        <Popover
          open={showResults}
          onClose={() => setOpen(false)}
          anchorRef={fieldRef}
          matchWidth
          className={styles.popover}
        >
          {results}
        </Popover>
      )}
    </div>
  );
}
