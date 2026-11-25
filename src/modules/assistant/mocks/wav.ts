/**
 * A short, locally generated "voice preview" WAV for mock mode: a pitched
 * tone with syllable-like envelopes. No network, no model.
 */
export function synthPreviewWav(voiceId: string, speed: number): Blob {
  const sampleRate = 22050;
  const seconds = 1.6 / Math.max(0.5, speed);
  const n = Math.floor(sampleRate * seconds);
  const data = new Int16Array(n);
  // Different voices get a different base pitch so previews are distinguishable.
  let hash = 0;
  for (const ch of voiceId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const male = voiceId[1] === "m";
  const base = (male ? 110 : 190) + (hash % 40);
  const syllables = 6;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const phase = (t / seconds) * syllables;
    const env = Math.pow(Math.sin(Math.PI * (phase % 1)), 2) * (1 - t / seconds) * 0.35;
    const vibrato = 1 + 0.03 * Math.sin(2 * Math.PI * 5 * t);
    const f = base * vibrato * (1 + 0.15 * Math.sin(phase));
    const s = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) + 0.15 * Math.sin(6 * Math.PI * f * t);
    data[i] = Math.max(-1, Math.min(1, s * env)) * 0x7fff;
  }
  const buffer = new ArrayBuffer(44 + data.byteLength);
  const v = new DataView(buffer);
  const write = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  write(0, "RIFF");
  v.setUint32(4, 36 + data.byteLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  write(36, "data");
  v.setUint32(40, data.byteLength, true);
  new Int16Array(buffer, 44).set(data);
  return new Blob([buffer], { type: "audio/wav" });
}
