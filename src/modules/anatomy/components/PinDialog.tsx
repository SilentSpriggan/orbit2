import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ApiError, CrewMember } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";
import { cn, ICON_STROKE } from "../../../shared/ui/cn";
import { Dialog } from "../../../shared/ui/Dialog";
import { Field, Input, SegmentedControl, Select, Textarea } from "../../../shared/ui/Field";
import { STATUS_ICON, STATUS_TEXT } from "../../../shared/ui/StatusBadge";
import { isoToUtcInput, utcInputToIso } from "../lib/format";
import type { RegionIndex } from "../lib/regionIndex";
import {
  PIN_STATUS_LABEL, PIN_TYPE_LABEL, SEVERITY_LABEL, VITAL_KINDS,
  type AnatomyPin, type PinInput, type PinPlacement, type PinSeverity, type PinStatus, type PinType,
} from "../types";
import { PIN_TYPE_ICON } from "./pinMeta";
import { StructureSearch } from "./StructureSearch";
import { SystemBadge } from "./SystemBadge";

const TITLE_MAX = 80;
const NOTE_MAX = 2000;

export interface PinDialogProps {
  open: boolean;
  onClose: () => void;
  /** Editing an existing pin, or creating one from a placement. */
  pin: AnatomyPin | null;
  placement: PinPlacement | null;
  index: RegionIndex;
  crew: CrewMember[];
  activeCrewId: string | null;
  authorId: string | null;
  onSubmit: (input: PinInput) => Promise<void>;
  isPending: boolean;
  error: ApiError | null;
  /** The local server is unreachable: saving is disabled. */
  offline: boolean;
}

interface FormState {
  crewId: string;
  regionId: string;
  type: PinType;
  title: string;
  severity: PinSeverity;
  onset: string;
  status: PinStatus;
  note: string;
  linkedVitalKinds: string[];
}

function initialForm(pin: AnatomyPin | null, placement: PinPlacement | null, activeCrewId: string | null): FormState {
  if (pin) {
    return {
      crewId: pin.crewId, regionId: pin.regionId, type: pin.type, title: pin.title, severity: pin.severity,
      onset: isoToUtcInput(pin.onsetAt), status: pin.status, note: pin.note, linkedVitalKinds: pin.linkedVitalKinds,
    };
  }
  return {
    crewId: activeCrewId ?? "", regionId: placement?.regionId ?? "", type: "symptom", title: "", severity: "caution",
    onset: isoToUtcInput(new Date().toISOString()), status: "open", note: "", linkedVitalKinds: [],
  };
}

/** Add / edit pin. */
export function PinDialog({
  open, onClose, pin, placement, index, crew, activeCrewId, authorId, onSubmit, isPending, error, offline,
}: PinDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialForm(pin, placement, activeCrewId));
  const [touched, setTouched] = useState(false);
  const [changingRegion, setChangingRegion] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initialForm(pin, placement, activeCrewId));
      setTouched(false);
      setChangingRegion(false);
    }
  }, [open, pin, placement, activeCrewId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const region = index.byId.get(form.regionId) ?? null;
  const onsetIso = utcInputToIso(form.onset);
  const errors = {
    title: !form.title.trim() ? "Enter a short title." : form.title.length > TITLE_MAX ? `Use ${TITLE_MAX} characters or fewer.` : null,
    region: !region ? "Choose a region." : null,
    onset: !onsetIso ? "Enter the onset date and time in UTC." : null,
    crew: !form.crewId ? "Choose a crew member." : null,
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid || !onsetIso || !authorId) {
      if (errors.title) titleRef.current?.focus();
      return;
    }
    // A pin moved to another region loses its old surface point.
    const samePlace = pin && pin.regionId === form.regionId;
    const input: PinInput = {
      crewId: form.crewId,
      regionId: form.regionId,
      type: form.type,
      title: form.title.trim(),
      severity: form.severity,
      status: form.status,
      onsetAt: onsetIso,
      authorId: pin?.authorId ?? authorId,
      note: form.note.trim(),
      linkedVitalKinds: form.linkedVitalKinds,
      position3d: samePlace ? pin.position3d : placement?.regionId === form.regionId ? placement.position3d : undefined,
      position2d: samePlace ? pin.position2d : placement?.regionId === form.regionId ? placement.position2d : undefined,
    };
    try {
      await onSubmit(input);
    } catch {
      /* error is shown from props */
    }
  };

  const formId = "anatomy-pin-form";
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={pin ? `Edit pin “${pin.title}”` : "Add pin"}
      initialFocusRef={titleRef}
      className="max-w-[600px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-3">Severity is the crew's own label. It is not a diagnosis.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" form={formId} loading={isPending} disabled={offline}>
              {pin ? "Save changes" : "Save pin"}
            </Button>
          </div>
        </div>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        {offline && (
          <p role="alert" className="rounded-md border border-caution-line bg-caution-tint px-3 py-2 text-sm text-ink">
            The local server is unreachable. Pins can't be saved until it is back.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md border border-critical-line bg-critical-tint px-3 py-2 text-sm text-ink">
            Not saved: {error.message} Nothing has been sent.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Crew member" error={touched ? errors.crew : null}>
            {(p) => (
              <Select {...p} value={form.crewId} onChange={(e) => set("crewId", e.target.value)}>
                {crew.map((c) => (
                  <option key={c.id} value={c.id}>{c.callsign} · {c.fullName}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Status">
            {(p) => (
              <Select {...p} value={form.status} onChange={(e) => set("status", e.target.value as PinStatus)}>
                {(Object.keys(PIN_STATUS_LABEL) as PinStatus[]).map((s) => (
                  <option key={s} value={s}>{PIN_STATUS_LABEL[s]}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="flex flex-col">
          <span className="mb-1.5 text-xs font-medium text-ink-2">Region</span>
          {region && !changingRegion ? (
            <div className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-line bg-sunken px-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-base text-ink">{region.name}</span>
                <SystemBadge system={region.system} size="sm" />
              </span>
              <Button variant="ghost" size="sm" className="h-11" onClick={() => setChangingRegion(true)}>Change</Button>
            </div>
          ) : (
            <StructureSearch
              regions={index.list}
              label="Region"
              placeholder="Search for a region"
              onSelect={(r) => {
                set("regionId", r.id);
                setChangingRegion(false);
              }}
            />
          )}
          {touched && errors.region && <p className="mt-1.5 text-xs text-critical">{errors.region}</p>}
          {!pin && placement && placement.regionId === form.regionId && (
            <p className="mt-1.5 font-mono text-2xs text-ink-3">
              {placement.position3d
                ? `Surface point ${placement.position3d.x}, ${placement.position3d.y}, ${placement.position3d.z}`
                : placement.position2d
                  ? `${placement.position2d.view} map ${placement.position2d.x}, ${placement.position2d.y}`
                  : null}
            </p>
          )}
        </div>

        <div className="flex flex-col">
          <span id="pin-type-label" className="mb-1.5 text-xs font-medium text-ink-2">Type</span>
          <SegmentedControl<PinType>
            label="Type"
            value={form.type}
            onChange={(v) => set("type", v)}
            options={(Object.keys(PIN_TYPE_LABEL) as PinType[]).map((t) => {
              const Icon = PIN_TYPE_ICON[t];
              return {
                value: t,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
                    {PIN_TYPE_LABEL[t]}
                  </span>
                ),
              };
            })}
            className="self-start"
          />
        </div>

        <Field
          label="Title"
          helper={`${form.title.length} / ${TITLE_MAX}`}
          error={touched ? errors.title : null}
        >
          {(p) => (
            <Input
              {...p}
              ref={titleRef}
              value={form.title}
              maxLength={TITLE_MAX}
              required
              placeholder="e.g. Left knee pain on load"
              onChange={(e) => set("title", e.target.value)}
            />
          )}
        </Field>

        <div className="flex flex-col">
          <span className="mb-1.5 text-xs font-medium text-ink-2">Severity</span>
          <SegmentedControl<PinSeverity>
            label="Severity"
            value={form.severity}
            onChange={(v) => set("severity", v)}
            options={(Object.keys(SEVERITY_LABEL) as PinSeverity[]).map((s) => {
              const Icon = STATUS_ICON[s];
              return {
                value: s,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className={STATUS_TEXT[s]} />
                    {SEVERITY_LABEL[s]}
                  </span>
                ),
              };
            })}
            className="self-start"
          />
        </div>

        <Field label="Onset (UTC)" error={touched ? errors.onset : null}>
          {(p) => (
            <Input {...p} type="datetime-local" step={60} value={form.onset} onChange={(e) => set("onset", e.target.value)} className="font-mono" />
          )}
        </Field>

        <Field label="Note" helper={`${form.note.length} / ${NOTE_MAX}`}>
          {(p) => (
            <Textarea {...p} rows={4} maxLength={NOTE_MAX} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="What happened, what was done, what to watch." />
          )}
        </Field>

        <fieldset className="flex flex-col">
          <legend className="mb-1.5 text-xs font-medium text-ink-2">Linked vital kinds (optional)</legend>
          <div className="flex flex-wrap gap-1.5">
            {VITAL_KINDS.map((k) => {
              const on = form.linkedVitalKinds.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("linkedVitalKinds", on ? form.linkedVitalKinds.filter((x) => x !== k) : [...form.linkedVitalKinds, k])}
                  className={cn(
                    "h-11 rounded-md border px-3 font-mono text-xs",
                    on ? "border-accent bg-accent-tint text-ink" : "border-line-strong bg-raised text-ink-2 hover:border-control hover:text-ink",
                  )}
                >
                  {k}
                </button>
              );
            })}
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}

export interface DeletePinDialogProps {
  pin: AnatomyPin | null;
  onClose: () => void;
  onConfirm: (pin: AnatomyPin) => void;
  isPending: boolean;
}

/** Destructive confirm naming the exact pin. */
export function DeletePinDialog({ pin, onClose, onConfirm, isPending }: DeletePinDialogProps) {
  return (
    <Dialog
      open={pin !== null}
      onClose={onClose}
      role="alertdialog"
      title={pin ? `Delete pin “${pin.title}”?` : "Delete pin"}
      description="The pin and its note are removed for the whole crew. This can't be undone."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={isPending} onClick={() => pin && onConfirm(pin)}>
            Delete pin
          </Button>
        </>
      }
    />
  );
}
