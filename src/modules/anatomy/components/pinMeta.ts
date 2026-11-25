import { Bandage, Crosshair, Stethoscope, type LucideIcon } from "lucide-react";
import type { PinType } from "../types";

export const PIN_TYPE_ICON: Record<PinType, LucideIcon> = {
  symptom: Crosshair,
  injury: Bandage,
  observation: Stethoscope,
};
