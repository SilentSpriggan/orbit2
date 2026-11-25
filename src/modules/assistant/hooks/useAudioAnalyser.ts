import { useEffect, useRef, useState } from "react";

let sharedCtx: AudioContext | null = null;

/** One AudioContext for all analysers; created on first use (after a user gesture). */
function analysisContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new AudioContext();
  if (sharedCtx.state === "suspended") void sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

export interface AudioAnalyser {
  /** Fill `out` with the time-domain waveform (−1…1). Returns false when no track. */
  readWaveform(out: Float32Array<ArrayBuffer>): boolean;
  /** RMS level 0…1 of the current frame. */
  readLevel(): number;
  readonly active: boolean;
}

export const FFT_SIZE = 2048;

/** An AnalyserNode (fftSize 2048) on a MediaStreamTrack. Disconnects on change/unmount. */
export function useAudioAnalyser(track: MediaStreamTrack | null): AudioAnalyser {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scratch = useRef<Float32Array<ArrayBuffer>>(new Float32Array(FFT_SIZE));
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!track || track.readyState === "ended") {
      analyserRef.current = null;
      setActive(false);
      return;
    }
    let source: MediaStreamAudioSourceNode | null = null;
    try {
      const ctx = analysisContext();
      source = ctx.createMediaStreamSource(new MediaStream([track]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      analyserRef.current = analyser;
      setActive(true);
    } catch {
      analyserRef.current = null;
      setActive(false);
    }
    const onEnded = () => {
      analyserRef.current = null;
      setActive(false);
    };
    track.addEventListener("ended", onEnded);
    return () => {
      track.removeEventListener("ended", onEnded);
      source?.disconnect();
      analyserRef.current = null;
    };
  }, [track]);

  const api = useRef<{ -readonly [K in keyof AudioAnalyser]: AudioAnalyser[K] }>({
    readWaveform(out) {
      const a = analyserRef.current;
      if (!a) return false;
      a.getFloatTimeDomainData(out);
      return true;
    },
    readLevel() {
      const a = analyserRef.current;
      if (!a) return 0;
      const buf = scratch.current;
      a.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      return Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
    },
    active: false,
  });
  api.current.active = active;
  return api.current;
}
