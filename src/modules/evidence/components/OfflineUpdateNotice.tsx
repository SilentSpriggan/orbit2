import { useEffect } from "react";
import { useToast } from "../../../shared/ui/Toast";
import {
  hasOfflineUpdate,
  reloadOfflineUpdate,
  UPDATE_EVENT,
} from "../services/offline";
export function OfflineUpdateNotice() {
  const { toast } = useToast();
  useEffect(() => {
    const show = () =>
      toast({
        title: "A new version is ready",
        action: { label: "Reload", onClick: () => void reloadOfflineUpdate() },
      });
    if (hasOfflineUpdate()) show();
    window.addEventListener(UPDATE_EVENT, show);
    return () => window.removeEventListener(UPDATE_EVENT, show);
  }, [toast]);
  return null;
}
