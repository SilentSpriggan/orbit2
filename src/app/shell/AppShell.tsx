import { useState } from "react";
import { Outlet } from "react-router-dom";
import { MOCK_MODE } from "../../shared/api/mockMode";
import { EMBEDDED } from "../../shared/embed";
import { SyntheticDataBanner } from "../../shared/ui/SyntheticDataBanner";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

export function AppShell() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  if (EMBEDDED) {
    // Inside the website's "Crew voice AI assistant" tab: the website draws the
    // sidebar, top bar and footer, so render only the page content.
    return (
      <div className="orbit-embedded">
        {MOCK_MODE && <SyntheticDataBanner />}
        <main id="main" tabIndex={-1} className="orbit-main orbit-main--embedded"><Outlet /></main>
      </div>
    );
  }
  return (
    <div className="orbit-shell">
      <a href="#main" className="orbit-skip">Skip to content</a>
      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      {navigationOpen && <button className="orbit-scrim" aria-label="Close navigation" onClick={() => setNavigationOpen(false)} />}
      <div className="orbit-workspace">
        <StatusBar navigationOpen={navigationOpen} onToggleNav={() => setNavigationOpen((open) => !open)} />
        {MOCK_MODE && <SyntheticDataBanner />}
        <main id="main" tabIndex={-1} className="orbit-main"><Outlet /></main>
        <footer className="orbit-footer">
          <span>ORBIT <span aria-hidden="true">/</span> Human exploration, human health.</span>
          <a href="/#research">Research prototype · Evidence & sources</a>
        </footer>
      </div>
    </div>
  );
}
