import { formatUtcDate, formatUtcTime } from "../../../shared/format";
import { canSeeWellbeing, type CrewMember } from "../../../shared/types";
import { VITAL_META, type CrewSummary, type VitalDraft, type VitalKind } from "../services/toolServices";

export const WELLBEING_NEUTRAL = "Support check-in suggested";

export type ShareSection = "latest_vitals" | "wellbeing";
export const SHARE_SECTIONS: Record<ShareSection, string> = { latest_vitals: "Latest vitals", wellbeing: "Wellbeing check-in" };

export interface VitalConfirmation {
  kind: "vital";
  callId: string;
  crew: CrewMember;
  draft: VitalDraft;
  /** "Save heart rate 72 bpm for VEGA?" */
  question: string;
}

export interface ShareConfirmation {
  kind: "share";
  callId: string;
  crew: CrewMember;
  sections: ShareSection[];
  /** Exactly what will be shared. */
  content: Record<string, unknown>;
  rows: Array<{ section: string; label: string; value: string }>;
  withheld: string[];
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

const VITAL_ALIASES: Record<string, VitalKind> = {
  hr: "heart_rate",
  pulse: "heart_rate",
  heart_rate: "heart_rate",
  spo2: "spo2",
  oxygen_saturation: "spo2",
  systolic: "systolic_bp",
  systolic_bp: "systolic_bp",
  diastolic: "diastolic_bp",
  diastolic_bp: "diastolic_bp",
  temp: "temperature",
  temperature: "temperature",
  rr: "respiratory_rate",
  respiratory_rate: "respiratory_rate",
};

export function summarizeCrew(crew: CrewMember, summary: CrewSummary, viewer: CrewMember) {
  const readings = summary.readings.map((r) => ({ ...r }));
  const visible = canSeeWellbeing(viewer, crew.id);
  const wellbeing = summary.wellbeing ? (visible ? { ...summary.wellbeing } : { note: WELLBEING_NEUTRAL }) : null;
  // Older readings, such as historical mission records, carry their date so they are not mistaken for today's.
  const today = new Date().toISOString().slice(0, 10);
  const when = (iso: string) => (iso.slice(0, 10) === today ? formatUtcTime(iso) : `${formatUtcDate(iso)} ${formatUtcTime(iso)}`);
  const parts = readings.map((r) => `${r.label} ${r.value} ${r.unit} at ${when(r.recordedAt)}`);
  let text = `${crew.callsign}: ${parts.length ? parts.join(", ") : "no readings yet"}`;
  if (summary.wellbeing) {
    text += visible
      ? `; wellbeing check-in ${formatUtcDate(summary.wellbeing.checkInAt)}: mood ${summary.wellbeing.mood.toLowerCase()}, stress ${summary.wellbeing.stress.toLowerCase()}`
      : `; ${WELLBEING_NEUTRAL}`;
  }
  return { readings, wellbeing, text, visible };
}

export function parseVitalDraft(args: Record<string, unknown>, crewId: string):
  | { draft: VitalDraft; error: null }
  | { draft: null; error: string } {
  const invalid = (error: string) => ({ draft: null, error });
  const rawKind = (readString(args.kind) ?? readString(args.vital) ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  const kind = VITAL_ALIASES[rawKind];
  if (!Object.hasOwn(VITAL_ALIASES, rawKind)) return invalid(`Unknown reading type: ${rawKind || "none"}.`);
  const meta = VITAL_META[kind];
  const value = readNumber(args.value);
  if (value === null) return invalid("The reading needs a number.");
  const unit = readString(args.unit);
  if (unit && unit.toLowerCase() !== meta.unit.toLowerCase()) return invalid(`Expected ${meta.unit}, got ${unit}.`);
  if (value < meta.min || value > meta.max) {
    return invalid(`${value} ${meta.unit} is outside what this form accepts (${meta.min}–${meta.max} ${meta.unit}).`);
  }
  return { draft: { crewId, kind, value, unit: meta.unit, recordedAt: new Date().toISOString() }, error: null };
}

export function buildSharePreview(requestedSections: unknown, subject: CrewMember, viewer: CrewMember, summary: CrewSummary) {
  const requested = Array.isArray(requestedSections) ? requestedSections.filter((s): s is string => typeof s === "string") : ["latest_vitals"];
  const sections = requested.filter((s): s is ShareSection => Object.hasOwn(SHARE_SECTIONS, s));
  const withheld = requested.filter((s) => !Object.hasOwn(SHARE_SECTIONS, s)).map((s) => `${s} (not available on this device)`);
  const visible = canSeeWellbeing(viewer, subject.id);
  const rows: ShareConfirmation["rows"] = [];
  const content: Record<string, unknown> = { crewId: subject.id, callsign: subject.callsign };
  if (sections.includes("latest_vitals")) {
    content.latestVitals = summary.readings.map((r) => ({ kind: r.kind, value: r.value, unit: r.unit, recordedAt: r.recordedAt }));
    for (const r of summary.readings) {
      rows.push({ section: SHARE_SECTIONS.latest_vitals, label: r.label, value: `${r.value} ${r.unit} · ${formatUtcTime(r.recordedAt)}` });
    }
  }
  const finalSections = sections.filter((sec) => sec !== "wellbeing" || (visible && summary.wellbeing));
  if (sections.includes("wellbeing")) {
    if (!visible) withheld.push(`${SHARE_SECTIONS.wellbeing} (visible only to ${subject.callsign}, the crew leader and the medical officer)`);
    else if (!summary.wellbeing) withheld.push(`${SHARE_SECTIONS.wellbeing} (no check-in recorded)`);
    else {
      content.wellbeing = { ...summary.wellbeing };
      rows.push({ section: SHARE_SECTIONS.wellbeing, label: "Mood", value: summary.wellbeing.mood });
      rows.push({ section: SHARE_SECTIONS.wellbeing, label: "Stress", value: summary.wellbeing.stress });
      if (summary.wellbeing.note) rows.push({ section: SHARE_SECTIONS.wellbeing, label: "Note", value: summary.wellbeing.note });
    }
  }
  return { sections: finalSections, content, rows, withheld };
}
