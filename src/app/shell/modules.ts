import { Activity, AudioLines, BookOpenCheck, PersonStanding, type LucideIcon } from "lucide-react";

export type ModuleKey = "crew" | "anatomy" | "assistant" | "evidence";

export interface ModuleMeta {
  key: ModuleKey;
  label: string;
  route: string;
  icon: LucideIcon;
}

/** Sidebar order (section H). */
export const MODULES: ModuleMeta[] = [
  { key: "crew", label: "Crew status", route: "/crew", icon: Activity },
  { key: "anatomy", label: "Anatomy lab", route: "/anatomy", icon: PersonStanding },
  { key: "assistant", label: "Crew assistant", route: "/assistant", icon: AudioLines },
  { key: "evidence", label: "Evidence library", route: "/evidence", icon: BookOpenCheck },
];

export const MODULE_BY_KEY: Record<ModuleKey, ModuleMeta> = Object.fromEntries(
  MODULES.map((m) => [m.key, m]),
) as Record<ModuleKey, ModuleMeta>;
