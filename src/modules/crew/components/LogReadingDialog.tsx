import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Wind,
  Waves,
  Gauge,
  Thermometer,
  BedDouble,
  GlassWater,
  Brain,
} from "lucide-react";
import { useCrew } from "../../../shared/context/CrewContext";
import { canSeeWellbeing } from "../../../shared/types";
import {
  Button,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
  useToast,
} from "../../../shared/ui";
import { useCreateReading } from "../hooks/useCrewHealth";
import { METRICS } from "../logic/metrics";
import { buildCheckIn, type CheckInValues } from "../logic/checkIn";
import { levelFor } from "../logic/status";
import { WELLBEING_KINDS, type ReviewBand, type VitalKind } from "../types";
const fields = [
  { kind: "heart_rate", icon: HeartPulse },
  { kind: "spo2", icon: Wind },
  { kind: "resp_rate", icon: Waves },
  { kind: "bp_systolic", icon: Gauge },
  { kind: "skin_temp", icon: Thermometer },
  { kind: "sleep_hours", icon: BedDouble },
  { kind: "hydration_ml", icon: GlassWater },
  { kind: "stress_self", icon: Brain },
  { kind: "fatigue_self", icon: Brain },
] as const;
export function LogReadingDialog({
  id,
  bands,
}: {
  id: string;
  bands: ReviewBand[];
}) {
  const { activeCrew, crew, getCrew } = useCrew();
  const navigate = useNavigate();
  const { toast } = useToast();
  const save = useCreateReading();
  const [subject, setSubject] = useState(activeCrew?.id ?? id);
  const [confirmed, setConfirmed] = useState(id === activeCrew?.id);
  const [values, setValues] = useState<CheckInValues>({});
  const [time, setTime] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const saved = useRef(new Set<VitalKind>());
  const pair = useRef(crypto.randomUUID());
  const submitting = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const partial = saved.current.size > 0;
  const frozen = busy || partial;
  const wellbeing = !!activeCrew && canSeeWellbeing(activeCrew, subject);
  const filled = Object.entries(values).filter(
    ([k, v]) =>
      v?.trim() && (wellbeing || !WELLBEING_KINDS.includes(k as VitalKind)),
  ).length;
  const close = () => navigate(`/crew/${id}`);
  const requestClose = () => {
    if (submitting.current) return;
    if (filled || note) setDiscard(true);
    else close();
  };
  const input = (kind: VitalKind) => {
    const m = METRICS[kind];
    return (
      <Field label={m.label}>
        {(p) => (
          <Input
            {...p}
            ref={kind === "heart_rate" ? inputRef : undefined}
            type="number"
            inputMode="decimal"
            min={m.min}
            max={m.max}
            step={
              ["spo2", "skin_temp", "sleep_hours"].includes(kind) ? ".1" : "1"
            }
            placeholder="—"
            unit={m.unit}
            value={values[kind] ?? ""}
            disabled={frozen}
            onChange={(e) =>
              setValues((v) => ({ ...v, [kind]: e.target.value }))
            }
          />
        )}
      </Field>
    );
  };
  return (
    <>
      <Dialog
        open
        title="Log readings"
        className="max-w-[820px]"
        initialFocusRef={inputRef}
        onClose={requestClose}
        description="Enter your measurements together. Leave any you haven’t measured blank. Nothing is sent to the assistant."
        footer={
          <>
            <Button variant="ghost" onClick={requestClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="crew-check-in"
              loading={busy}
              disabled={!confirmed || !filled}
            >
              {partial
                ? "Retry unsaved readings"
                : `Save ${filled || ""} reading${filled === 1 ? "" : "s"}`}
            </Button>
          </>
        }
      >
        <form
          id="crew-check-in"
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!activeCrew || !confirmed || submitting.current) return;
            setMessage("");
            try {
              const entries = buildCheckIn(values, wellbeing, {
                recordedAt: time ? new Date(time + "Z").toISOString() : "",
                enteredBy: activeCrew.id,
                note: note.trim() || undefined,
                pairId: pair.current,
              });
              submitting.current = true;
              setBusy(true);
              for (const entry of entries) {
                if (saved.current.has(entry.kind)) continue;
                await save.mutate({ id: subject, input: entry });
                saved.current.add(entry.kind);
              }
              const outside =
                subject === id &&
                entries.some((r) =>
                  ["caution", "critical"].includes(
                    levelFor(
                      { ...r, id: "new", crewId: subject },
                      bands.find((b) => b.kind === r.kind),
                    ),
                  ),
                );
              toast({
                title: `${entries.length} readings saved for ${getCrew(subject)?.callsign ?? subject}`,
                level: outside ? "caution" : "nominal",
                description: outside
                  ? "One or more readings are outside the crew review bands."
                  : undefined,
              });
              navigate(`/crew/${subject}`);
            } catch (error) {
              const reason =
                error && typeof error === "object" && "message" in error
                  ? String(error.message)
                  : "Could not save readings.";
              setMessage(
                `${reason} ${saved.current.size ? `${saved.current.size} readings saved. Retry will save only the remaining readings.` : "No readings saved."}`,
              );
            } finally {
              submitting.current = false;
              setBusy(false);
            }
          }}
        >
          <Field
            label="Crew member"
            helper={
              !confirmed
                ? "Select the person you are recording these measurements for."
                : undefined
            }
          >
            {(p) => (
              <Select
                {...p}
                required
                value={confirmed ? subject : ""}
                disabled={frozen}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setConfirmed(true);
                  setValues({});
                  setMessage("");
                }}
              >
                {!confirmed && <option value="">Choose crew member</option>}
                {crew.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.callsign} · {c.fullName}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields
              .filter((f) => wellbeing || !WELLBEING_KINDS.includes(f.kind))
              .map(({ kind, icon: Icon }) => (
                <section
                  key={kind}
                  className={`rounded-lg border border-line bg-panel p-4 ${kind === "bp_systolic" ? "sm:col-span-2 lg:col-span-2" : ""}`}
                >
                  <div className="flex items-center gap-2 text-ink-2 mb-3">
                    <Icon size={16} strokeWidth={1.75} aria-hidden />
                    <span className="text-sm font-medium">
                      {kind === "bp_systolic"
                        ? "Blood pressure"
                        : METRICS[kind].label}
                    </span>
                    {saved.current.has(kind) && (
                      <span className="ml-auto text-xs">Saved</span>
                    )}
                  </div>
                  {kind === "bp_systolic" ? (
                    <div className="grid grid-cols-2 gap-3">
                      {input("bp_systolic")}
                      {input("bp_diastolic")}
                    </div>
                  ) : (
                    input(kind)
                  )}
                </section>
              ))}
          </div>
          {!wellbeing && (
            <p className="text-sm text-ink-2">
              Stress and fatigue can be entered by this crew member, the crew
              leader or the medical officer.
            </p>
          )}
          <p className="text-xs text-ink-3">
            Input limits check plausible values; they are not clinical
            thresholds. Blood pressure requires both values.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Recorded at (UTC)">
              {(p) => (
                <Input
                  {...p}
                  type="datetime-local"
                  required
                  max={new Date().toISOString().slice(0, 16)}
                  value={time}
                  disabled={frozen}
                  onChange={(e) => setTime(e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Note (optional)"
              helper={`${note.length}/500 characters`}
            >
              {(p) => (
                <Textarea
                  {...p}
                  rows={2}
                  maxLength={500}
                  value={note}
                  disabled={frozen}
                  onChange={(e) => setNote(e.target.value)}
                />
              )}
            </Field>
          </div>
          {message && (
            <p role="alert" className="text-critical text-sm">
              {message}
            </p>
          )}
        </form>
      </Dialog>
      <Dialog
        open={discard}
        title="Discard unsaved readings?"
        onClose={() => setDiscard(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={close}>
              Discard unsaved readings
            </Button>
          </>
        }
      >
        <p>
          Unsaved measurements will be lost.
          {partial
            ? " Readings already saved will remain in the health log."
            : ""}
        </p>
      </Dialog>
    </>
  );
}
