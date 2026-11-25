import {
  BookOpen,
  Eye,
  Landmark,
  Layers,
  MessageSquareQuote,
  Mountain,
  Rocket,
  Settings2,
  Shuffle,
} from "lucide-react";
import { Fragment, type ReactNode } from "react";
import {
  Button,
  Card,
  Skeleton,
  StatusBadge,
  useToast,
} from "../../../shared/ui";
import type { EvidenceLabel, SearchHit } from "../types";
import { LABELS } from "../mocks/data";
export const utc = (value: string | null) =>
  value
    ? new Date(value).toISOString().slice(0, 16).replace("T", " ") + "Z"
    : "Not checked";
export const passageUrl = (hit: SearchHit) =>
  `/evidence?doc=${encodeURIComponent(hit.document.id)}&chunk=${encodeURIComponent(hit.chunk.id)}`;
export const citationText = (hit: SearchHit) =>
  `${hit.document.authors.join(", ")}. ${hit.document.title}. ${hit.document.venue ?? "Venue unknown"}, ${hit.document.year ?? "Year unknown"}. p. ${hit.chunk.page ?? "—"}, ${hit.chunk.id}. ${passageUrl(hit)}`;
export function useCopy() {
  const { toast } = useToast();
  return async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({
        level: "caution",
        title: "Clipboard unavailable",
        description: "Select and copy the text manually.",
      });
    }
  };
}
export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const icons = {
  systematic_review: Layers,
  randomized_trial: Shuffle,
  observational: Eye,
  spaceflight_study: Rocket,
  analog_study: Mountain,
  agency_guidance: Landmark,
  expert_opinion: MessageSquareQuote,
  product_rule: Settings2,
};
export function EvidenceLabelBadge({ label }: { label: EvidenceLabel }) {
  const Icon = icons[label];
  return (
    <span className="inline-flex items-center gap-1.5 min-h-5 px-1.5 rounded-sm border border-line-strong bg-raised text-2xs font-medium text-ink-2">
      <Icon size={12} strokeWidth={1.75} aria-hidden="true" />
      {LABELS[label]}
    </span>
  );
}
export function HighlightedText({
  text,
  ranges,
}: {
  text: string;
  ranges: [number, number][];
}) {
  const sorted = ranges
    .filter(([a, b]) => a >= 0 && b > a && b <= text.length)
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of sorted) {
    const last = merged.at(-1);
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  let end = 0;
  const parts: ReactNode[] = [];
  merged.forEach(([a, b]) => {
    parts.push(
      <Fragment key={a}>
        {text.slice(end, a)}
        <mark className="bg-accent-tint text-ink rounded-sm px-0.5">
          {text.slice(a, b)}
        </mark>
      </Fragment>,
    );
    end = b;
  });
  return (
    <>
      {parts}
      {text.slice(end)}
    </>
  );
}
export function ReadState({
  loading,
  error,
  empty,
  retry,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  retry?: () => void;
}) {
  if (loading)
    return (
      <div aria-label="Loading" role="status" className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  if (error)
    return (
      <Card className="p-5 space-y-3">
        <StatusBadge level="critical">Unable to load</StatusBadge>
        <p>{error}</p>
        {retry && <Button onClick={retry}>Try again</Button>}
      </Card>
    );
  if (empty)
    return (
      <Card className="p-10 text-center space-y-3">
        <BookOpen size={24} className="mx-auto text-ink-3" aria-hidden="true" />
        <h2 className="text-md font-semibold">Nothing here yet</h2>
        <p className="text-sm text-ink-2">
          Change your filters or import documents to this local library.
        </p>
      </Card>
    );
  return null;
}
