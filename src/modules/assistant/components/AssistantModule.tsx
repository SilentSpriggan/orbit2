import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { AssistantPage } from "./AssistantPage";

/** Module 3 root: Crew assistant. */
export default function AssistantModule() {
  useEffect(() => {
    document.title = "Crew assistant · ORBIT";
  }, []);
  return (
    <Routes>
      <Route index element={<AssistantPage />} />
      <Route path="*" element={<AssistantPage />} />
    </Routes>
  );
}
