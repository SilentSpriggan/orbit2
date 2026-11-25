import { Play } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { isAbortError } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/Button";
import { cn } from "../../../shared/ui/cn";
import { useToast } from "../../../shared/ui/Toast";
import { previewVoice } from "../services/voiceService";
import type { VoiceOption } from "../types";

export interface VoicePickerProps {
  voices: VoiceOption[];
  value: string;
  onChange: (id: string) => void;
  speed: number;
  volume: number;
}

/** Radio group of voice cards; each card has a locally generated preview. */
export function VoicePicker({ voices, value, onChange, speed, volume }: VoicePickerProps) {
  const { toast } = useToast();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const stop = () => {
    ctrlRef.current?.abort();
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };
  useEffect(() => stop, []);

  const preview = async (id: string) => {
    stop();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setPreviewing(id);
    try {
      const blob = await previewVoice(id, speed, ctrl.signal);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.volume = volume;
      audioRef.current = audio;
      audio.onended = () => setPreviewing((p) => (p === id ? null : p));
      await audio.play();
    } catch (e) {
      if (!isAbortError(e)) toast({ level: "caution", title: "Preview unavailable", description: "The local voice service did not return a sample." });
      setPreviewing((p) => (p === id ? null : p));
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = voices[(i + dir + voices.length) % voices.length];
    onChange(next.id);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-voice="${next.id}"]`)?.focus();
  };

  return (
    <div ref={groupRef} role="radiogroup" aria-label="Voice" className="grid grid-cols-2 gap-2">
      {voices.map((v, i) => {
        const selected = v.id === value;
        return (
          <div
            key={v.id}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-3",
              selected ? "border-accent bg-accent-tint" : "border-line bg-panel hover:border-line-strong",
            )}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-voice={v.id}
              onClick={() => onChange(v.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="flex min-h-11 flex-col items-start rounded-md text-left"
            >
              <span className="font-mono text-sm font-medium text-ink">{v.id}</span>
              <span className="text-xs text-ink-2">
                {v.label} · {v.language}
                {v.gender ? ` · ${v.gender}` : ""}
              </span>
            </button>
            <Button
              size="sm"
              variant="ghost"
              icon={Play}
              loading={previewing === v.id}
              aria-label={`Preview ${v.id}`}
              onClick={() => void preview(v.id)}
              className="self-start"
            >
              Preview
            </Button>
          </div>
        );
      })}
    </div>
  );
}
