import {
  NavLink,
  Route,
  Routes,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { SectionHeader } from "../../../shared/ui";
import { useSystemStatus } from "../../../shared/context/SystemStatusContext";
import { LibraryPage } from "./LibraryPage";
import { DocumentViewerPage } from "./DocumentViewerPage";
import { OfflineCenterPage } from "./OfflineCenterPage";
import { ImportPage } from "./ImportPage";
import { utc } from "./common";
function LibraryRoute() {
  const [params] = useSearchParams();
  return params.get("doc") ? (
    <DocumentViewerPage documentId={params.get("doc")!} />
  ) : (
    <LibraryPage />
  );
}
export default function EvidenceModule() {
  const { status } = useSystemStatus();
  const { pathname } = useLocation();
  const isOffline = pathname.endsWith("/offline");
  const isImport = pathname.endsWith("/import");
  return (
    <div className="px-6 py-5 max-w-[1600px] mx-auto">
      <SectionHeader
        title={
          isOffline
            ? "Offline center"
            : isImport
              ? "Import & indexing"
              : "Evidence library"
        }
        subtitle={
          isOffline
            ? "Local connection, readiness and storage"
            : isImport
              ? "Bring research onto your local network"
              : status
                ? `${status.faiss.documentCount} documents · ${status.faiss.chunkCount.toLocaleString()} passages · indexed ${utc(status.faiss.updatedAt)} · local server collection`
                : "Local research, verifiable passages and cited answers"
        }
      />
      <nav
        aria-label="Evidence sections"
        className="flex gap-1 border-b border-line mb-5"
      >
        {[
          ["/evidence", "Library"],
          ["/evidence/offline", "Offline center"],
          ["/evidence/import", "Import & indexing"],
        ].map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/evidence"}
            className={({ isActive }) =>
              `inline-flex h-11 items-center px-3 text-sm font-medium border-b-2 ${isActive ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink"}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<LibraryRoute />} />
        <Route path="doc/:documentId" element={<DocumentViewerPage />} />
        <Route path="offline" element={<OfflineCenterPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route
          path="*"
          element={<p>Page not found. Choose a library tab above.</p>}
        />
      </Routes>
    </div>
  );
}
