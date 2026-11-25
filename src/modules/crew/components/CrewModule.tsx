import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { CrewOverviewPage } from "./CrewOverviewPage";
import { CrewProfilePage } from "./CrewProfilePage";
import { NotFound } from "../../../app/shell/ModulePlaceholder";
export default function CrewModule() {
  useEffect(() => {
    document.title = "Crew status · ORBIT";
  }, []);
  return (
    <Routes>
      <Route index element={<CrewOverviewPage />} />
      <Route path=":crewId" element={<CrewProfilePage />} />
      <Route path=":crewId/log" element={<CrewProfilePage />} />
      <Route path=":crewId/bands" element={<CrewProfilePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
