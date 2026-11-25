import { Search, X } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn, ICON_STROKE } from "../../../shared/ui/cn";
import { CONTROL } from "../../../shared/ui/Field";
import { searchRegions } from "../lib/regionIndex";
import type { AnatomyRegion } from "../types";
import { SystemBadge } from "./SystemBadge";

export interface StructureSearchProps {
  regions: AnatomyRegion[];
  onSelect: (region: AnatomyRegion) => void;
  /** Highlight a region in the viewer while its result is hovered or active. */
  onHover?: (regionId: string | null) => void;
  label?: string;
  hideLabel?: boolean;
  placeholder?: string;
  className?: string;
}

/** Combobox typeahead over region names and synonyms. */
export function StructureSearch({
  regions,
  onSelect,
  onHover,
  label = "Search structures",
  hideLabel = true,
  placeholder = "Search structures — e.g. 'tibia', 'left kidney'",
  className,
}: StructureSearchProps) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const hits = useMemo(() => searchRegions(regions, query), [regions, query]);
  const showList = open && query.trim().length > 0;

  const highlight = (i: number) => {
    setActive(i);
    onHover?.(hits[i]?.region.id ?? null);
  };

  const choose = (region: AnatomyRegion) => {
    onSelect(region);
    onHover?.(null);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      if (hits.length) highlight((active + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hits.length) highlight((active - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      const hit = hits[active];
      if (showList && hit) {
        e.preventDefault();
        choose(hit.region);
      }
    } else if (e.key === "Escape") {
      if (showList || query) {
        e.preventDefault();
        e.stopPropagation();
        setQuery("");
        setOpen(false);
        onHover?.(null);
      }
    }
  };

  return (
    <div className={cn("relative flex flex-col", className)}>
      <label htmlFor={id} className={cn("text-xs font-medium text-ink-2 mb-1.5", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        <Search size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && hits[active] ? `${id}-opt-${hits[active].region.id}` : undefined}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            onHover?.(null);
          }}
          onKeyDown={onKeyDown}
          className={cn(CONTROL, "pl-9 pr-10 text-sm")}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-0 top-0 grid size-11 place-items-center rounded-md text-ink-3 hover:text-ink"
          >
            <X size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        )}
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Matching structures"
        hidden={!showList}
        className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[320px] overflow-y-auto bg-overlay border border-line-strong rounded-xl shadow-overlay p-2"
      >
        {hits.length === 0 ? (
          <li className="px-3 py-2 text-sm text-ink-2">No structure matches “{query.trim()}”.</li>
        ) : (
          hits.map((h, i) => (
            <li
              key={h.region.id}
              id={`${id}-opt-${h.region.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => highlight(i)}
              onClick={() => choose(h.region)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5",
                i === active ? "bg-raised text-ink" : "text-ink-2",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink">{h.region.name}</span>
                {h.matched && <span className="block truncate text-xs text-ink-3">matches “{h.matched}”</span>}
              </span>
              <SystemBadge system={h.region.system} size="sm" />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
