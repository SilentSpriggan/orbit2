import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { StatusLevel } from "../../../shared/types";
import { cn, ICON_STROKE, TYPE } from "../../../shared/ui/cn";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { systemRoots, type RegionIndex } from "../lib/regionIndex";
import { layerVar } from "../lib/cssColor";
import { BODY_SYSTEMS, SYSTEM_LABEL, type AnatomyPin, type BodySystem, type PinSeverity } from "../types";

export interface RegionTreeProps {
  index: RegionIndex;
  selectedId: string | null;
  onSelect: (regionId: string) => void;
  onHover?: (regionId: string | null) => void;
  /** Unresolved pins for the crew member on screen. */
  pins: AnatomyPin[];
}

interface Node {
  key: string;
  label: string;
  level: number;
  regionId: string | null;
  system: BodySystem;
  parentKey: string | null;
  hasChildren: boolean;
  setSize: number;
  posInSet: number;
}

const RANK: Record<PinSeverity, number> = { nominal: 1, caution: 2, critical: 3 };

/** System → Region → Structure tree with full keyboard navigation (role="tree"). */
export function RegionTree({ index, selectedId, onSelect, onHover, pins }: RegionTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [focusKey, setFocusKey] = useState<string>(`sys:${BODY_SYSTEMS[0]}`);
  const listRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef<{ text: string; at: number }>({ text: "", at: 0 });

  // Expand the path to the selected region so it is visible.
  useEffect(() => {
    if (!selectedId) return;
    const region = index.byId.get(selectedId);
    if (!region) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(`sys:${region.system}`);
      let p = region.parentId;
      while (p) {
        next.add(`r:${p}`);
        p = index.byId.get(p)?.parentId ?? null;
      }
      return next;
    });
    setFocusKey(`r:${selectedId}`);
  }, [selectedId, index]);

  /** Pin count and worst severity per region, rolled up to parents and systems. */
  const rollup = useMemo(() => {
    const m = new Map<string, { n: number; level: PinSeverity }>();
    const bump = (key: string, sev: PinSeverity) => {
      const cur = m.get(key);
      m.set(key, { n: (cur?.n ?? 0) + 1, level: cur && RANK[cur.level] >= RANK[sev] ? cur.level : sev });
    };
    for (const pin of pins) {
      let id: string | null = pin.regionId;
      const region = index.byId.get(id);
      if (!region) continue;
      bump(`sys:${region.system}`, pin.severity);
      while (id) {
        bump(`r:${id}`, pin.severity);
        id = index.byId.get(id)?.parentId ?? null;
      }
    }
    return m;
  }, [pins, index]);

  const nodes = useMemo(() => {
    const out: Node[] = [];
    const walk = (regionIds: string[], level: number, parentKey: string, system: BodySystem) => {
      regionIds.forEach((rid, i) => {
        const region = index.byId.get(rid);
        if (!region) return;
        const kids = (index.children.get(rid) ?? []).map((c) => c.id);
        const key = `r:${rid}`;
        out.push({ key, label: region.name, level, regionId: rid, system, parentKey, hasChildren: kids.length > 0, setSize: regionIds.length, posInSet: i + 1 });
        if (kids.length && expanded.has(key)) walk(kids, level + 1, key, system);
      });
    };
    BODY_SYSTEMS.forEach((system, i) => {
      const key = `sys:${system}`;
      const roots = systemRoots(index, system).map((r) => r.id);
      out.push({ key, label: SYSTEM_LABEL[system], level: 1, regionId: null, system, parentKey: null, hasChildren: roots.length > 0, setSize: BODY_SYSTEMS.length, posInSet: i + 1 });
      if (expanded.has(key)) walk(roots, 2, key, system);
    });
    return out;
  }, [index, expanded]);

  const focusNode = (key: string) => {
    setFocusKey(key);
    const find = () => listRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
    const el = find();
    // Rows that are already on screen take focus at once; newly expanded ones next frame.
    if (el) el.focus();
    else requestAnimationFrame(() => find()?.focus());
  };

  const toggle = (key: string, open?: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      const shouldOpen = open ?? !next.has(key);
      if (shouldOpen) next.add(key);
      else next.delete(key);
      return next;
    });

  const activate = (n: Node) => {
    if (n.regionId) onSelect(n.regionId);
    else toggle(n.key);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
    const n = nodes[i];
    const isOpen = expanded.has(n.key);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (i < nodes.length - 1) focusNode(nodes[i + 1].key);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (i > 0) focusNode(nodes[i - 1].key);
        break;
      case "ArrowRight":
        e.preventDefault();
        if (n.hasChildren && !isOpen) toggle(n.key, true);
        else if (n.hasChildren && nodes[i + 1]) focusNode(nodes[i + 1].key);
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (n.hasChildren && isOpen) toggle(n.key, false);
        else if (n.parentKey) focusNode(n.parentKey);
        break;
      case "Home":
        e.preventDefault();
        focusNode(nodes[0].key);
        break;
      case "End":
        e.preventDefault();
        focusNode(nodes[nodes.length - 1].key);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        activate(n);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const now = Date.now();
          const t = typeahead.current;
          t.text = now - t.at > 600 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
          t.at = now;
          const order = [...nodes.slice(i + 1), ...nodes.slice(0, i + 1)];
          const hit = order.find((x) => x.label.toLowerCase().startsWith(t.text));
          if (hit) focusNode(hit.key);
        }
    }
  };

  const focusable = nodes.some((n) => n.key === focusKey) ? focusKey : nodes[0]?.key;

  return (
    <section aria-labelledby="anatomy-tree-title" className="flex flex-col gap-1">
      <h3 id="anatomy-tree-title" className={TYPE.overline}>Regions</h3>
      <div ref={listRef} role="tree" aria-labelledby="anatomy-tree-title" className="flex flex-col">
        {nodes.map((n, i) => {
          const selected = n.regionId !== null && n.regionId === selectedId;
          const count = rollup.get(n.key);
          return (
            <div
              key={n.key}
              data-key={n.key}
              role="treeitem"
              aria-level={n.level}
              aria-setsize={n.setSize}
              aria-posinset={n.posInSet}
              aria-expanded={n.hasChildren ? expanded.has(n.key) : undefined}
              aria-selected={n.regionId ? selected : undefined}
              tabIndex={n.key === focusable ? 0 : -1}
              onClick={() => {
                setFocusKey(n.key);
                activate(n);
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
              onPointerEnter={() => n.regionId && onHover?.(n.regionId)}
              onPointerLeave={() => onHover?.(null)}
              style={{ paddingLeft: `${(n.level - 1) * 16 + 4}px` }}
              className={cn(
                "flex min-h-11 cursor-pointer select-none items-center gap-1.5 rounded-md pr-2 text-sm",
                selected ? "bg-accent-tint text-ink" : "text-ink-2 hover:bg-raised hover:text-ink",
              )}
            >
              <span
                aria-hidden="true"
                onClick={(e) => {
                  if (!n.hasChildren || !n.regionId) return;
                  e.stopPropagation();
                  toggle(n.key);
                }}
                className="grid size-6 shrink-0 place-items-center"
              >
                {n.hasChildren && (
                  <ChevronRight
                    size={16}
                    strokeWidth={ICON_STROKE}
                    className={cn("transition-transform duration-150", expanded.has(n.key) && "rotate-90")}
                  />
                )}
              </span>
              {n.level === 1 && (
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: layerVar(n.system) }} />
              )}
              <span className={cn("min-w-0 flex-1 truncate", n.level === 1 && "font-medium text-ink")}>{n.label}</span>
              {count && (
                <StatusBadge level={count.level as StatusLevel} size="sm">
                  <span className="font-mono">{count.n}</span>
                  <span className="sr-only">{count.n === 1 ? " pin" : " pins"}</span>
                </StatusBadge>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
