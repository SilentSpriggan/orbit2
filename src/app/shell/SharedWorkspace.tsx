import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ModuleSkeleton } from "./ModulePlaceholder";

export function SharedWorkspace({ page }: { page: string }) {
  const { search } = useLocation();
  useEffect(() => { window.location.replace(`/#${page}${search}`); }, [page, search]);
  return <ModuleSkeleton />;
}
