import { Hand, Mic, MicOff, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, IconButton } from "../../../shared/ui/Button";
import { cn } from "../../../shared/ui/cn";
import { Select } from "../../../shared/ui/Field";

function useInputDevices(refreshKey: unknown) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.enumerateDevices) return;
    let alive = true;
    const load = () =>
      md
        .enumerateDevices()
        .then((list) => alive && setDevices(list.filter((d) => d.kind === "audioinput")))
        .catch(() => {});
    void load();
    md.addEventListener("devicechange", load);
    return () => {
      alive = false;
      md.removeEventListener("devicechange", load);
    };
  }, [refreshKey]);
  return devices;
}

export interface VoiceControlsProps {
  connected: boolean;
  micEnabled: boolean;
  micBlocked: boolean;
  canInterrupt: boolean;
  /** True while push-to-talk is held. */
  holding: boolean;
  onToggleMic: () => void;
  onHold: (down: boolean) => void;
  onInterrupt: () => void;
  onSelectDevice: (deviceId: string) => void;
  /** Changes when the local track changes, to refresh device labels. */
  deviceKey: unknown;
}

export function VoiceControls({
  connected,
  micEnabled,
  micBlocked,
  canInterrupt,
  holding,
  onToggleMic,
  onHold,
  onInterrupt,
  onSelectDevice,
  deviceKey,
}: VoiceControlsProps) {
  const devices = useInputDevices(deviceKey);
  const [selected, setSelected] = useState("");
  const micDisabled = !connected || micBlocked;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton
        icon={micEnabled ? Mic : MicOff}
        label={micEnabled ? "Turn microphone off (M)" : "Turn microphone on (M)"}
        variant="secondary"
        aria-pressed={micEnabled}
        disabled={micDisabled}
        onClick={onToggleMic}
        className={cn(!micEnabled && connected && "text-standby")}
      />
      <Button
        variant="secondary"
        icon={Hand}
        disabled={micDisabled}
        aria-pressed={holding}
        aria-keyshortcuts="Space"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onHold(true);
        }}
        onPointerUp={() => onHold(false)}
        onPointerCancel={() => onHold(false)}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          // Space is handled by the voice card; avoid the native click.
          if (e.key === " ") e.preventDefault();
        }}
        className={cn("touch-none", holding && "border-nominal-line bg-nominal-tint text-nominal")}
      >
        {holding ? "Talking…" : "Hold to talk"}
      </Button>
      <Button
        variant="secondary"
        icon={Square}
        disabled={!canInterrupt}
        aria-keyshortcuts="Escape"
        onClick={onInterrupt}
      >
        Stop speaking
      </Button>
      <div className="ml-auto w-full min-w-0 sm:w-64">
        <label htmlFor="assistant-input-device" className="sr-only">
          Input device
        </label>
        <Select
          id="assistant-input-device"
          value={selected}
          disabled={micDisabled || devices.length === 0}
          onChange={(e) => {
            setSelected(e.target.value);
            onSelectDevice(e.target.value);
          }}
        >
          <option value="">{devices.length ? "Default microphone" : "No microphone found"}</option>
          {devices
            .filter((d) => d.deviceId && d.deviceId !== "default")
            .map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${i + 1}`}
              </option>
            ))}
        </Select>
      </div>
    </div>
  );
}
