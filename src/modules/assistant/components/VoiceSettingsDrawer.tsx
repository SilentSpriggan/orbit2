import { OctagonAlert, RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../../shared/ui/Button";
import { ICON_STROKE } from "../../../shared/ui/cn";
import { Dialog } from "../../../shared/ui/Dialog";
import { Field, SegmentedControl, Select, Slider, Switch } from "../../../shared/ui/Field";
import { Skeleton, SkeletonGroup } from "../../../shared/ui/Skeleton";
import { useSaveVoiceSettings } from "../hooks/useVoiceConfig";
import type { VoiceConfig, VoiceSettings } from "../types";
import { VoicePicker } from "./VoicePicker";

export interface VoiceSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  config: VoiceConfig | null;
  configError: string | null;
  onRetryConfig: () => void;
  settings: VoiceSettings | null;
  liveSession: boolean;
  onApplied: (s: VoiceSettings) => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line pb-5 last:border-0">
      <h3 className="font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">{title}</h3>
      {children}
    </section>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function VoiceSettingsDrawer({ open, onClose, config, configError, onRetryConfig, settings, liveSession, onApplied }: VoiceSettingsDrawerProps) {
  const [draft, setDraft] = useState<VoiceSettings | null>(settings);
  const save = useSaveVoiceSettings();

  useEffect(() => {
    if (open) setDraft(settings ?? config?.defaults ?? null);
  }, [open, settings, config]);

  const set = <K extends keyof VoiceSettings>(k: K, v: VoiceSettings[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const apply = async () => {
    if (!draft) return;
    const saved = await save.mutate(draft);
    if (saved) {
      onApplied(saved);
      onClose();
    }
  };

  const caps = config?.capabilities;
  const [minSpeed, maxSpeed] = caps?.speedRange ?? [0.7, 1.4];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      placement="right"
      title="Voice settings"
      description={`Kokoro voice and turn-taking on the local server. Changes apply when you press Apply${liveSession ? ", including in the current session" : ""}.`}
      footer={
        <>
          <Button
            variant="ghost"
            icon={RotateCcw}
            disabled={!config}
            onClick={() => config && setDraft({ ...config.defaults })}
            className="mr-auto"
          >
            Defaults
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={save.isPending} disabled={!draft} onClick={() => void apply()}>
            Apply
          </Button>
        </>
      }
    >
      {configError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-critical-line bg-critical-tint p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <OctagonAlert size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-critical" />
            Voice settings could not be loaded
          </p>
          <p className="text-sm text-ink-2">{configError}</p>
          <Button size="sm" variant="secondary" onClick={onRetryConfig}>
            Try again
          </Button>
        </div>
      ) : !config || !draft ? (
        <SkeletonGroup label="Loading voice settings" className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </SkeletonGroup>
      ) : (
        <div className="flex flex-col gap-5">
          <Section title="Voice">
            <VoicePicker voices={config.voices} value={draft.voiceId} onChange={(id) => set("voiceId", id)} speed={draft.speed} volume={draft.volume} />
          </Section>

          <Section title="Delivery">
            <Slider
              label="Speed"
              value={draft.speed}
              min={minSpeed}
              max={maxSpeed}
              step={0.05}
              format={(v) => `${v.toFixed(2)}×`}
              onChange={(v) => set("speed", v)}
            />
            {caps?.supportsBlend && (
              <div className="flex flex-col gap-3">
                <Switch
                  checked={draft.blend !== null}
                  showLabel
                  label="Blend a second voice"
                  onChange={(on) => {
                    const other = config.voices.find((v) => v.id !== draft.voiceId);
                    set("blend", on && other ? { voiceId: other.id, ratio: 0.3 } : null);
                  }}
                />
                {draft.blend && (
                  <>
                    <Field label="Second voice">
                      {(p) => (
                        <Select
                          {...p}
                          value={draft.blend?.voiceId}
                          onChange={(e) => set("blend", { voiceId: e.target.value, ratio: draft.blend?.ratio ?? 0.3 })}
                        >
                          {config.voices
                            .filter((v) => v.id !== draft.voiceId)
                            .map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.id} · {v.label}
                              </option>
                            ))}
                        </Select>
                      )}
                    </Field>
                    <Slider
                      label={`Mix of ${draft.blend.voiceId}`}
                      value={draft.blend.ratio}
                      min={0}
                      max={1}
                      step={0.05}
                      format={pct}
                      onChange={(v) => set("blend", draft.blend ? { ...draft.blend, ratio: v } : null)}
                    />
                  </>
                )}
              </div>
            )}
            <Slider label="Output volume" value={draft.volume} min={0} max={1} step={0.05} format={pct} onChange={(v) => set("volume", v)} describedBy="volume-help" />
            <p id="volume-help" className="-mt-2 text-xs text-ink-3">
              Applied on this device only.
            </p>
          </Section>

          <Section title="Turn-taking">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-2" id="vad-label">
                Voice detection sensitivity
              </span>
              <SegmentedControl
                label="Voice detection sensitivity"
                value={draft.vadSensitivity}
                onChange={(v) => set("vadSensitivity", v)}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
              <p className="text-xs text-ink-3">Higher hears quieter speech but reacts to more background noise.</p>
            </div>
            <Slider
              label="End-of-turn patience"
              value={draft.endOfTurnThreshold}
              min={0.3}
              max={0.9}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={(v) => set("endOfTurnThreshold", v)}
              describedBy="eot-help"
            />
            <p id="eot-help" className="-mt-2 text-xs text-ink-3">
              Smart Turn threshold. Higher waits for more certainty that you have finished.
            </p>
            <Switch checked={draft.allowInterruptions} showLabel label="Allow interruptions" onChange={(on) => set("allowInterruptions", on)} />
          </Section>

          <Section title="Response length">
            <SegmentedControl
              label="Response length"
              value={draft.responseLength}
              onChange={(v) => set("responseLength", v)}
              options={[
                { value: "concise", label: "Concise" },
                { value: "standard", label: "Standard" },
              ]}
            />
          </Section>

          {save.error && (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-critical">
              <OctagonAlert size={12} strokeWidth={ICON_STROKE} aria-hidden="true" />
              Not saved: {save.error.message}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
