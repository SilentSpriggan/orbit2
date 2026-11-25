import { Activity, AudioLines, BookOpen, ClipboardList, HeartPulse, Layers, Shield, Users } from "lucide-react";
import { useLocation } from "react-router-dom";
import { currentSection } from "./section";

const HEALTH_LINKS = [
  ["log", "Health log & trends", ClipboardList, "Readings and how they change"],
  ["care", "Health assessment", Shield, "Checks, wellbeing, exercise and skin"],
  ["routine", "Daily routine", ClipboardList, "Today’s health tasks"],
  ["risks", "Health risk readings", HeartPulse, "Radiation, bone and muscle"],
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const section = currentSection(useLocation().pathname);
  const current = (name: string) => (section === name ? ("page" as const) : undefined);
  return (
    <aside id="orbit-navigation" className={"orbit-sidebar" + (open ? " is-open" : "")} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <a href="/#status" className="orbit-brand" aria-label="ORBIT Crew Health home">
        <svg viewBox="0 0 46 40" aria-hidden="true"><circle cx="23" cy="20" r="13" /><ellipse cx="23" cy="20" rx="24" ry="7" transform="rotate(-35 23 20)" /><path d="m39 6 3 1-1 3" /></svg>
        <span>ORBIT<small>Crew health system</small></span>
      </a>
      <nav aria-label="Main navigation" className="orbit-navigation">
        <a href="/#status" onClick={onClose}><Activity /><span><strong>Crew status</strong><small>Crew health at a glance</small></span></a>
        <a href="/#crew" onClick={onClose}><Users /><span><strong>Crew profiles</strong><small>Vitals and condition notes</small></span></a>
        {HEALTH_LINKS.map(([page, label, Icon, hint]) => <a key={page} href={"/#" + page} onClick={onClose}><Icon /><span><strong>{label}</strong><small>{hint}</small></span></a>)}
        <a href="/#anatomy" aria-current={current("anatomy")} onClick={onClose}><Layers /><span><strong>Anatomy lab</strong><small>Interactive reference anatomy</small></span></a>
        <a href={import.meta.env.BASE_URL + "assistant"} aria-current={current("assistant")} onClick={onClose}><AudioLines /><span><strong>Crew voice AI assistant</strong><small>Local voice workspace</small></span></a>
        <a href="/#research" onClick={onClose}><BookOpen /><span><strong>Offline evidence library</strong><small>Research and cited sources</small></span></a>
      </nav>
      <div className="orbit-sidebar-foot"><span className="orbit-storage-dot" /> Browser storage <small>Local records</small></div>
    </aside>
  );
}
