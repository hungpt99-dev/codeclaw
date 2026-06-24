import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout.js";
import { Dashboard } from "./pages/Dashboard.js";
import { NewRequirement } from "./pages/NewRequirement.js";
import { Runs } from "./pages/Runs.js";
import { RunDetail } from "./pages/RunDetail.js";
import { Settings } from "./pages/Settings.js";
import { Integrations } from "./pages/Integrations.js";
import { PromptTemplates } from "./pages/PromptTemplates.js";
import type { ReactElement } from "react";

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="new" element={<NewRequirement />} />
          <Route path="runs" element={<Runs />} />
          <Route path="runs/:id" element={<RunDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="templates" element={<PromptTemplates />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
