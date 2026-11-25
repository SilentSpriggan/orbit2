import { useRoutes } from "react-router-dom";
import { appRoutes } from "./app/routes";
import { CrewProvider } from "./shared/context/CrewContext";
import { SystemStatusProvider } from "./shared/context/SystemStatusContext";
import { ToastProvider } from "./shared/ui/Toast";

// Module 4: offline packaging update notification, inside the existing toast provider.
import { OfflineUpdateNotice } from "./modules/evidence/components/OfflineUpdateNotice";

function AppRoutes() {
  return useRoutes(appRoutes);
}

export default function App() {
  return (
    <ToastProvider>
      <OfflineUpdateNotice />
      <SystemStatusProvider>
        <CrewProvider>
          <AppRoutes />
        </CrewProvider>
      </SystemStatusProvider>
    </ToastProvider>
  );
}
