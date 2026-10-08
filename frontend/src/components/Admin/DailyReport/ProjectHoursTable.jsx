// frontend/src/components/Admin/DailyReport/ProjectHoursTable.jsx
import React from "react";
import { FolderKanban, ChevronUp, ChevronDown } from "lucide-react";
import { formatHHMMSS } from "./reportHelpers.js";
import ExportProjectExcel from "../../ExportProjectExcel";

export default function ProjectHoursTable({
  projectsTree,
  loading,
  unit,
  from,
  to,
  expandedProject,
  setExpandedProject,
  expandedProjectUser,
  setExpandedProjectUser,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-slate-900">
            Project Working Hours
          </h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {projectsTree.length} Projects
          </span>
        </div>

        <ExportProjectExcel
          projectsTree={projectsTree}
          from={from}
          to={to}
          unit={unit}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Project Name</th>
              <th className="px-5 py-3.5">Company</th>
              <th className="px-5 py-3.5">
                Total ({unit === "hours" ? "Hours" : "Minutes"})
              </th>
              <th className="px-5 py-3.5">Elapsed Time</th>
              <th className="px-5 py-3.5 text-right">Team Breakdown</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {projectsTree.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                  {loading ? "Loading project hours…" : "No project records found."}
                </td>
              </tr>
            )}

            {projectsTree.map((p) => {
              const openProject = expandedProject[p.projectId];

              return (
                <React.Fragment key={p.projectId}>
                  <tr className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-blue-600" />
                        <span>{p.projectName}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-600">
                      {p.companyName}
                    </td>

                    <td className="px-5 py-4 font-extrabold text-blue-700">
                      {unit === "hours"
                        ? Math.round((p.totalMinutes / 60) * 100) / 100
                        : Math.round(p.totalMinutes)}
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-slate-800">
                      {formatHHMMSS(p.totalMinutes)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() =>
                          setExpandedProject((prev) => ({
                            ...prev,
                            [p.projectId]: !prev[p.projectId],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                      >
                        <span>{openProject ? "Hide Users" : "View Users"}</span>
                        {openProject ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>

                  {openProject && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={5} className="px-8 py-4">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-4 py-3 text-left">Team Member</th>
                                <th className="px-4 py-3 text-left">
                                  Total ({unit === "hours" ? "h" : "m"})
                                </th>
                                <th className="px-4 py-3 text-left">Elapsed Time</th>
                                <th className="px-4 py-3 text-right">Dates</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {p.users.map((u) => {
                                const key = `${p.projectId}_${u.userId}`;
                                const openUser = expandedProjectUser[key];

                                return (
                                  <React.Fragment key={key}>
                                    <tr className="hover:bg-slate-50">
                                      <td className="px-4 py-3 font-semibold text-slate-900">
                                        {u.userName}
                                      </td>
                                      <td className="px-4 py-3 font-bold text-slate-800">
                                        {unit === "hours"
                                          ? Math.round((u.totalMinutes / 60) * 100) / 100
                                          : Math.round(u.totalMinutes)}
                                      </td>
                                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                        {formatHHMMSS(u.totalMinutes)}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() =>
                                            setExpandedProjectUser((prev) => ({
                                              ...prev,
                                              [key]: !prev[key],
                                            }))
                                          }
                                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                        >
                                          {openUser ? "Hide Dates" : "View Dates"}
                                        </button>
                                      </td>
                                    </tr>

                                    {openUser && (
                                      <tr className="bg-slate-50">
                                        <td colSpan={4} className="px-6 py-3">
                                          <div className="flex flex-wrap gap-2">
                                            {u.dates.map((d, i) => (
                                              <span
                                                key={i}
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs"
                                              >
                                                <span className="font-semibold text-slate-700">{d.date}</span>
                                                <span className="font-mono font-bold text-blue-700">{formatHHMMSS(d.minutes)}</span>
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          {projectsTree.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <td className="px-5 py-4" colSpan={2}>
                  Grand Total ({projectsTree.length} Projects)
                </td>
                <td className="px-5 py-4 text-blue-700">
                  {unit === "hours"
                    ? Math.round((projectsTree.reduce((acc, p) => acc + (p.totalMinutes || 0), 0) / 60) * 100) / 100
                    : Math.round(projectsTree.reduce((acc, p) => acc + (p.totalMinutes || 0), 0))}
                </td>
                <td className="px-5 py-4 font-mono">
                  {formatHHMMSS(
                    projectsTree.reduce((acc, p) => acc + (p.totalMinutes || 0), 0)
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
