/**
 * Mock-mode audio graph. Produces two MediaStreamTracks for the visualizers:
 * - "user": the real microphone (if allowed) mixed with a synthetic voice that
 *   plays during scripted voice turns;
 * - "bot": an OscillatorNode with a syllable-like gain envelope while speaking.
 * Nothing is routed to the speakers.
 */
export class MockAudio {
  readonly ctx: AudioContext;
  private userDest: MediaStreamAudioDestinationNode;
  private botDest: MediaStreamAudioDestinationNode;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private micEnabled = true;
  private micRequest = 0;
  private closed = false;
  private userVoice: Voice;
  private botVoice: Voice;

  constructor() {
    this.ctx = new AudioContext();
    this.userDest = this.ctx.createMediaStreamDestination();
    this.botDest = this.ctx.createMediaStreamDestination();
    this.userVoice = new Voice(this.ctx, this.userDest, 132, "sawtooth");
    this.botVoice = new Voice(this.ctx, this.botDest, 196, "triangle");
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  /** Try to open the microphone. Resolves false if permission is denied or no device. */
  async attachMic(deviceId: string | null): Promise<boolean> {
    if (this.closed || !navigator.mediaDevices?.getUserMedia) return false;
    const request = ++this.micRequest;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (this.closed || request !== this.micRequest) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      this.detachMic();
      this.micStream = stream;
      stream.getAudioTracks().forEach((t) => {
        t.enabled = this.micEnabled;
      });
      this.micSource = this.ctx.createMediaStreamSource(stream);
      this.micSource.connect(this.userDest);
      return true;
    } catch {
      return false;
    }
  }

  private detachMic(): void {
    this.micSource?.disconnect();
    this.micSource = null;
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
  }

  setMicEnabled(on: boolean): void {
    this.micEnabled = on;
    this.micStream?.getAudioTracks().forEach((t) => {
      t.enabled = on;
    });
  }

  get hasMic(): boolean {
    return this.micStream !== null;
  }

  get userTrack(): MediaStreamTrack | null {
    return this.userDest.stream.getAudioTracks()[0] ?? null;
  }

  get botTrack(): MediaStreamTrack | null {
    return this.botDest.stream.getAudioTracks()[0] ?? null;
  }

  speakUser(on: boolean): void {
    this.userVoice.set(on);
  }

  speakBot(on: boolean): void {
    this.botVoice.set(on);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.micRequest += 1;
    this.userVoice.set(false);
    this.botVoice.set(false);
    this.detachMic();
    try {
      await this.ctx.close();
    } catch {
      /* already closed */
    }
  }
}

/** A buzzy oscillator pair with a randomised syllable envelope. */
class Voice {
  private gain: GainNode;
  private osc: OscillatorNode;
  private osc2: OscillatorNode;
  private timer: number | undefined;
  private readonly ctx: AudioContext;
  private readonly base: number;

  constructor(ctx: AudioContext, dest: AudioNode, base: number, type: OscillatorType) {
    this.ctx = ctx;
    this.base = base;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    this.osc = ctx.createOscillator();
    this.osc.type = type;
    this.osc.frequency.value = base;
    this.osc2 = ctx.createOscillator();
    this.osc2.type = "sine";
    this.osc2.frequency.value = base * 2.02;
    this.osc.connect(filter);
    this.osc2.connect(filter);
    filter.connect(this.gain);
    this.gain.connect(dest);
    this.osc.start();
    this.osc2.start();
  }

  set(on: boolean): void {
    window.clearInterval(this.timer);
    const now = this.ctx.currentTime;
    if (!on) {
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setTargetAtTime(0, now, 0.04);
      return;
    }
    const step = () => {
      const t = this.ctx.currentTime;
      const syllable = Math.random() < 0.18 ? 0.02 : 0.25 + Math.random() * 0.55;
      this.gain.gain.setTargetAtTime(syllable, t, 0.03);
      const pitch = this.base * (0.88 + Math.random() * 0.28);
      this.osc.frequency.setTargetAtTime(pitch, t, 0.05);
      this.osc2.frequency.setTargetAtTime(pitch * 2.02, t, 0.05);
    };
    step();
    this.timer = window.setInterval(step, 110);
  }
}
