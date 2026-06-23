import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar.js";
import type { ReactElement } from "react";

export function AppLayout(): ReactElement {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
