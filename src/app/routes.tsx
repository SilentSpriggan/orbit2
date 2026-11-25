import { lazy, Suspense } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { ModuleSkeleton, NotFound } from "./shell/ModulePlaceholder";
const CrewModule = lazy(() => import("../modules/crew/components/CrewModule"));

const EvidenceModule = lazy(() => import("../modules/evidence/components/EvidenceModule"));
const AnatomyModule = lazy(() => import("../modules/anatomy/components/AnatomyModule"));
const AssistantModule = lazy(() => import("../modules/assistant/components/AssistantModule"));

export const moduleRoutes: RouteObject[] = [
  {
    path: "crew/*",
    element: <Suspense fallback={<ModuleSkeleton />}><CrewModule /></Suspense>,
  },
  {
    path: "anatomy/*",
    element: (
      <Suspense fallback={<ModuleSkeleton />}>
        <AnatomyModule />
      </Suspense>
    ),
  },
  {
    path: "assistant/*",
    element: (
      <Suspense fallback={<ModuleSkeleton />}>
        <AssistantModule />
      </Suspense>
    ),
  },
  {
    path: "evidence/*",
    element: <Suspense fallback={<ModuleSkeleton />}><EvidenceModule /></Suspense>,
  },
];
// App.tsx renders these. The merge of 'dhruv' (1868aa9) dropped this block; keep it.
export const appRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="/assistant" replace /> },
  {
    element: <AppShell />,
    children: [...moduleRoutes, { path: "*", element: <NotFound /> }],
  },
];
