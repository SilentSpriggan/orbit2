import type { CrewMember } from "../../../shared/types";

/** ISO UTC → value for <input type="datetime-local"> (shown and read as UTC). */
export function isoToUtcInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value, read as UTC → ISO. */
export function utcInputToIso(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function crewLabel(c: CrewMember | undefined, fallbackId: string): string {
  return c ? c.callsign : fallbackId;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
