import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import type { ReactElement } from "react";
import { useProject } from "../lib/ProjectContext.js";

const navItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  { label: "New Requirement", path: "/new", icon: "M12 4v16m8-8H4" },
  {
    label: "Runs",
    path: "/runs",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    label: "Projects",
    path: "/projects",
    icon: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  },
  {
    label: "Workflows",
    path: "/workflows",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
  },
  {
    label: "Integrations",
    path: "/integrations",
    icon: "M5 12h14M12 5l7 7-7 7",
  },
  {
    label: "Doctor",
    path: "/doctor",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  { label: "Prompt Templates", path: "/templates", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
];

export function Sidebar(): ReactElement {
  const { activeProject, projectList, loading, switchProject } = useProject();
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/health")
      .then((r) =>
        r
          .json()
          .then(() => {
            setHealthOk(true);
          })
          .catch(() => {
            setHealthOk(false);
          }),
      )
      .catch(() => {
        setHealthOk(false);
      });
  }, []);

  const safeProjectName =
    activeProject?.name ?? (projectList.length === 0 ? "No project" : "Select project");

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-lg font-bold tracking-tight">CodeClaw</h1>
        <p className="text-xs text-gray-500 mt-0.5">Local Web</p>
      </div>

      {/* Project Selector with BroadcastChannel sync */}
      <div className="px-3 pt-3 pb-1 relative">
        <button
          type="button"
          onClick={() => {
            setShowProjectDropdown(!showProjectDropdown);
          }}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 transition-colors text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400">Project</p>
            <p className="text-sm font-medium text-white truncate">{safeProjectName}</p>
          </div>
          <svg
            className={"w-4 h-4 text-gray-400 shrink-0 " + (loading ? "animate-spin" : "")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {loading ? (
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            )}
          </svg>
        </button>

        {showProjectDropdown && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden">
            {projectList.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">
                No projects registered.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {projectList.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      void switchProject(p.id);
                      setShowProjectDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                      activeProject?.id === p.id ? "bg-gray-700 text-white" : "text-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 ${p.exists ? "bg-green-500" : "bg-red-500"}`}
                    />
                    {p.name}
                    {!p.exists && <span className="text-xs text-red-400 ml-1">(missing)</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowProjectDropdown(false);
                  void navigate("/projects");
                }}
                className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-gray-700 transition-colors"
              >
                Manage Projects...
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-5 border-t border-gray-800 space-y-2">
        {activeProject && (
          <p className="text-xs text-gray-500 truncate" title={activeProject.rootPath}>
            {activeProject.rootPath}
          </p>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${healthOk === true ? "bg-green-500" : healthOk === false ? "bg-red-500" : "bg-gray-500"}`}
          />
          <span className="text-xs text-gray-400">
            {healthOk === true
              ? "Local Mode Active"
              : healthOk === false
                ? "Server Offline"
                : "Connecting..."}
          </span>
        </div>
        <p className="text-xs text-gray-600">v0.0.1</p>
      </div>
    </aside>
  );
}
