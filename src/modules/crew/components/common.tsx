import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCrew } from "../../../shared/context/CrewContext";
import {
  canSeeWellbeing,
  type ApiError,
  type StatusLevel,
} from "../../../shared/types";
import { Button, Card, Skeleton, StatusBadge } from "../../../shared/ui";
export const LABEL: Record<StatusLevel, string> = {
  critical: "Urgent review",
  caution: "Review",
  nodata: "No recent data",
  nominal: "Within bands",
  standby: "Standby",
};
export const linkStyle =
  "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-accent hover:bg-accent-tint";
export function WellbeingGate({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { activeCrew } = useCrew();
  return activeCrew && canSeeWellbeing(activeCrew, id) ? (
    <>{children}</>
  ) : (
    <span className="text-sm text-ink-2">Support check-in suggested</span>
  );
}
export function PageState({
  loading,
  error,
  empty,
  retry,
}: {
  loading: boolean;
  error: ApiError | null;
  empty: boolean;
  retry: () => void;
}) {
  const [params] = useSearchParams();
  const state = import.meta.env.DEV ? params.get("state") : null;
  if (loading || state === "loading")
    return (
      <div
        role="status"
        aria-label="Loading crew records"
        className="grid gap-4"
      >
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-32" />
        ))}
      </div>
    );
  if (error || state === "error")
    return (
      <Card className="p-8">
        <StatusBadge level="critical">Records unavailable</StatusBadge>
        <p className="my-4 text-ink-2">
          {error?.message ??
            "The local server could not be reached. Your records have not been changed."}
        </p>
        <Button onClick={retry}>Try again</Button>
        <Link className={linkStyle} to="/crew">
          Crew overview
        </Link>
      </Card>
    );
  if (empty || state === "empty")
    return (
      <Card className="p-10 text-center">
        <h2 className="text-lg font-semibold">No readings yet</h2>
        <p className="text-ink-2 mt-2">
          Log a first reading to start tracking changes.
        </p>
      </Card>
    );
  return null;
}
export function useForcedState() {
  const [p] = useSearchParams();
  return (
    import.meta.env.DEV &&
    ["loading", "empty", "error"].includes(p.get("state") ?? "")
  );
}
