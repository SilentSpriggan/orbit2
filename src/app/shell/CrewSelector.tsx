import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useCrew } from "../../shared/context/CrewContext";
import { ROLE_LABEL, type CrewMember } from "../../shared/types";
import { cn, ICON_STROKE } from "../../shared/ui/cn";
import { Popover } from "../../shared/ui/Popover";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { useToast } from "../../shared/ui/Toast";
import { useMediaQuery, WIDE } from "../../shared/hooks/useMediaQuery";

function Avatar({ member }: { member: CrewMember }) {
  return (
    <span
      aria-hidden="true"
      className="size-7 shrink-0 rounded-sm bg-accent-tint text-accent font-mono text-xs font-semibold grid place-items-center"
    >
      {member.initials}
    </span>
  );
}

const NOTE = "No sign-in on this device. This controls what the screen shows, not security.";

export function CrewSelector() {
  const { crew, activeCrew, setActiveCrewId } = useCrew();
  const { toast } = useToast();
  const wide = useMediaQuery(WIDE);
  const labelId = useId();

  if (!activeCrew) {
    return <div className="h-9 w-40 rounded-md bg-raised animate-pulse" aria-label="Loading crew" role="status" />;
  }

  const select = (m: CrewMember) => {
    if (m.id !== activeCrew.id) {
      setActiveCrewId(m.id);
      toast({ level: "standby", title: `Now viewing as ${m.callsign}` });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className={cn("text-2xs text-ink-3 whitespace-nowrap", !wide && "sr-only")}>
        Viewing as
      </span>
      <Popover
        label="Choose who is using this device"
        role="listbox"
        align="end"
        padding="menu"
        className="w-[340px]"
        trigger={(p) => (
          <button
            ref={p.ref}
            type="button"
            onClick={p.onClick}
            aria-expanded={p["aria-expanded"]}
            aria-controls={p["aria-controls"]}
            aria-haspopup="listbox"
            aria-labelledby={`${labelId} ${labelId}-value`}
            className="h-9 pl-1 pr-2 rounded-md bg-raised border border-line-strong hover:border-control flex items-center gap-2"
          >
            <Avatar member={activeCrew} />
            <span id={`${labelId}-value`} className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-medium text-ink">{activeCrew.callsign}</span>
              {wide && <span className="text-xs text-ink-2">{ROLE_LABEL[activeCrew.role]}</span>}
            </span>
            <ChevronDown size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-ink-2" />
          </button>
        )}
      >
        {(close) => (
          <CrewListbox
            crew={crew}
            activeId={activeCrew.id}
            onSelect={(m) => {
              select(m);
              close();
            }}
          />
        )}
      </Popover>
    </div>
  );
}

function CrewListbox({
  crew,
  activeId,
  onSelect,
}: {
  crew: CrewMember[];
  activeId: string;
  onSelect: (m: CrewMember) => void;
}) {
  const id = useId();
  const [index, setIndex] = useState(() => Math.max(0, crew.findIndex((c) => c.id === activeId)));
  const typeahead = useRef({ text: "", at: 0 });
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => (i + 1) % crew.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => (i - 1 + crew.length) % crew.length); }
    else if (e.key === "Home") { e.preventDefault(); setIndex(0); }
    else if (e.key === "End") { e.preventDefault(); setIndex(crew.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(crew[index]); }
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at > 700 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
      t.at = now;
      const match = crew.findIndex(
        (c) => c.callsign.toLowerCase().startsWith(t.text) || c.fullName.toLowerCase().startsWith(t.text),
      );
      if (match >= 0) setIndex(match);
    }
  };

  return (
    <div className="flex flex-col">
      <p className="px-2 pt-1 pb-2 font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3" id={`${id}-label`}>
        Viewing as
      </p>
      <ul
        ref={listRef}
        role="listbox"
        tabIndex={0}
        aria-labelledby={`${id}-label`}
        aria-activedescendant={`${id}-opt-${index}`}
        onKeyDown={onKeyDown}
        className="flex flex-col gap-0.5 rounded-md focus-visible:outline-2 focus-visible:outline-focus"
      >
        {crew.map((m, i) => {
          const selected = m.id === activeId;
          return (
            <li
              key={m.id}
              id={`${id}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(m)}
              onPointerMove={() => setIndex(i)}
              className={cn(
                "flex min-h-13 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5",
                i === index ? "bg-raised" : "",
                selected && "bg-accent-tint",
              )}
            >
              <Avatar member={m} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-ink">{m.callsign}</span>
                  <span className="truncate text-sm text-ink">{m.fullName}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-ink-2">
                  {ROLE_LABEL[m.role]}
                  {m.isCrewLeader && <StatusBadge level="standby" size="sm">Crew leader</StatusBadge>}
                  {m.isMedicalOfficer && <StatusBadge level="standby" size="sm">Medical officer</StatusBadge>}
                </span>
              </span>
              {selected && <Check size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-accent" />}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 border-t border-line px-2 pt-2 pb-1 text-xs text-ink-3">{NOTE}</p>
    </div>
  );
}
