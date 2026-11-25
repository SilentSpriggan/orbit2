import type { AnatomyPin, PinFilter, PinInput, PinPatch } from "../types";
import { MOCK_PINS } from "./pins";

/**
 * In-memory pin store used in mock mode. It lives for the page session only,
 * so a reload restores the seed data.
 */
let pins: AnatomyPin[] = MOCK_PINS.map((p) => ({ ...p }));
let nextId = 20;

export function mockListPins(filter: PinFilter = {}): AnatomyPin[] {
  return pins
    .filter((p) => (!filter.crewId || p.crewId === filter.crewId)
      && (!filter.regionId || p.regionId === filter.regionId)
      && (!filter.status || p.status === filter.status))
    .map((p) => ({ ...p }));
}

export function mockCreatePin(input: PinInput): AnatomyPin {
  const now = new Date().toISOString();
  const pin: AnatomyPin = { ...input, id: `p${nextId++}`, createdAt: now, updatedAt: now };
  pins = [...pins, pin];
  return { ...pin };
}

export function mockUpdatePin(id: string, patch: PinPatch): AnatomyPin {
  const current = pins.find((p) => p.id === id);
  if (!current) throw { status: 404, code: "pin_not_found", message: `Pin ${id} does not exist.` };
  const next: AnatomyPin = { ...current, ...patch, updatedAt: new Date().toISOString() };
  pins = pins.map((p) => (p.id === id ? next : p));
  return { ...next };
}

export function mockDeletePin(id: string): void {
  if (!pins.some((p) => p.id === id)) throw { status: 404, code: "pin_not_found", message: `Pin ${id} does not exist.` };
  pins = pins.filter((p) => p.id !== id);
}
