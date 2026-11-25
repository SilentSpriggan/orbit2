import "../anatomy.css";
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AllPinsPage } from "./AllPinsPage";
import { AnatomyWorkspacePage } from "./AnatomyWorkspacePage";

/** Module 2 root: Anatomy lab. */
export default function AnatomyModule() {
  useEffect(() => {
    document.title = "Anatomy lab · ORBIT";
  }, []);
  return (
    <Routes>
      <Route index element={<AnatomyWorkspacePage />} />
      <Route path="pins" element={<AllPinsPage />} />
      <Route path="*" element={<Navigate to="/anatomy" replace />} />
    </Routes>
  );
}
