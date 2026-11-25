import type { CrewMember } from "../types";

/** Shared synthetic crew. Synthetic demo data · not real crew records. */
export const MOCK_CREW: CrewMember[] = [
  { id: "c01", callsign: "VEGA",  fullName: "Amara Okafor", role: "commander",          initials: "AO", isCrewLeader: true,  isMedicalOfficer: false },
  { id: "c02", callsign: "HALO",  fullName: "Lena Park",    role: "medical_officer",    initials: "LP", isCrewLeader: false, isMedicalOfficer: true  },
  { id: "c03", callsign: "TALON", fullName: "Mateo Ruiz",   role: "flight_engineer",    initials: "MR", isCrewLeader: false, isMedicalOfficer: false },
  { id: "c04", callsign: "IRIS",  fullName: "Sana Qureshi", role: "mission_specialist", initials: "SQ", isCrewLeader: false, isMedicalOfficer: false },
];
