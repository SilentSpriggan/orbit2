export type StatusLevel = "nominal" | "caution" | "critical" | "standby" | "nodata";

export type CrewRole = "commander" | "medical_officer" | "flight_engineer" | "mission_specialist" | "pilot";

export interface CrewMember {
  id: string;              // "c01"
  callsign: string;        // "VEGA"
  fullName: string;
  role: CrewRole;
  initials: string;        // "AO"
  isCrewLeader: boolean;
  isMedicalOfficer: boolean;
}

export type NetworkMode = "https_lan" | "offline_local" | "cert_untrusted" | "unreachable";

export interface SystemStatus {
  network: { mode: NetworkMode; host: string; lanIp: string | null; ssid: string | null; certExpiresAt: string | null };
  ollama:  { state: "ready" | "loading" | "unavailable"; model: string; loadProgress: number | null };
  faiss:   { state: "ready" | "building" | "missing"; documentCount: number; chunkCount: number; buildProgress: number | null; updatedAt: string | null };
  serverTime: string;      // ISO 8601 UTC
}

export interface ApiError { status: number; code: string; message: string }

export const ROLE_LABEL: Record<CrewRole, string> = {
  commander: "Commander",
  medical_officer: "Medical officer",
  flight_engineer: "Flight engineer",
  mission_specialist: "Mission specialist",
  pilot: "Pilot",
};

/** Wellbeing visibility rule (Section A.4). */
export function canSeeWellbeing(viewer: CrewMember, subjectId: string): boolean {
  return viewer.id === subjectId || viewer.isCrewLeader || viewer.isMedicalOfficer;
}
