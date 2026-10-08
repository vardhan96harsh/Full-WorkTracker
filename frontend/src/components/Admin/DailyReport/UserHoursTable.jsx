// frontend/src/components/Admin/DailyReport/UserHoursTable.jsx
import React from "react";
import { Download, ChevronUp, ChevronDown } from "lucide-react";
import { formatHHMMSS } from "./reportHelpers.js";

export default function UserHoursTable({
  byUserWithProjects,
  loading,
  unit,
  expandedUser,
  setExpandedUser,
  exportByUserCSV,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-slate-900">
            Employee Working Hours
          </h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {byUserWithProjects.length} Employees
          </span>
        </div>

        <button
          onClick={exportByUserCSV}
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-slate-900 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export By User (CSV)</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Employee Name</th>
              <th className="px-5 py-3.5">Projects Worked</th>
              <th className="px-5 py-3.5">
                Total ({unit === "hours" ? "Hours" : "Minutes"})
              </th>
              <th className="px-5 py-3.5">Elapsed Time</th>
              <th className="px-5 py-3.5 text-right">Details</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {byUserWithProjects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                  {loading ? "Loading employee hours…" : "No user work records found."}
                </td>
              </tr>
            )}

            {byUserWithProjects.map((u) => {
              const isOpen = expandedUser[u.userId];

              return (
                <React.Fragment key={u.userId}>
                  <tr className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {u.userName}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bold">
                        {u.projects.length} {u.projects.length === 1 ? "project" : "projects"}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-extrabold text-blue-700">
                      {unit === "hours"
                        ? Math.round((u.totalMinutes / 60) * 100) / 100
                        : Math.round(u.totalMinutes)}
                    </td>

                    <td className="px-5 py-4 font-mono font-semibold text-slate-700">
                      {formatHHMMSS(u.totalMinutes)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() =>
                          setExpandedUser((prev) => ({
                            ...prev,
                            [u.userId]: !prev[u.userId],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                      >
                        <span>{isOpen ? "Hide Projects" : "View Projects"}</span>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={5} className="px-8 py-4">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-4 py-3 text-left">Project</th>
                                <th className="px-4 py-3 text-left">
                                  Total ({unit === "hours" ? "Hours" : "Minutes"})
                                </th>
                                <th className="px-4 py-3 text-left">Elapsed Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {u.projects.map((p) => (
                                <tr key={p.projectId} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 font-semibold text-blue-700">
                                    {p.projectName}
                                  </td>
                                  <td className="px-4 py-3 font-bold text-slate-800">
                                    {unit === "hours"
                                      ? Math.round((p.totalMinutes / 60) * 100) / 100
                                      : Math.round(p.totalMinutes)}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                    {formatHHMMSS(p.totalMinutes)}
                                  </td>
                                </tr>
                              ))}
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

          {byUserWithProjects.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <td className="px-5 py-4" colSpan={2}>
                  Grand Total ({byUserWithProjects.length} Employees)
                </td>
                <td className="px-5 py-4 text-blue-700">
                  {unit === "hours"
                    ? Math.round((byUserWithProjects.reduce((acc, u) => acc + (u.totalMinutes || 0), 0) / 60) * 100) / 100
                    : Math.round(byUserWithProjects.reduce((acc, u) => acc + (u.totalMinutes || 0), 0))}
                </td>
                <td className="px-5 py-4 font-mono">
                  {formatHHMMSS(
                    byUserWithProjects.reduce((acc, u) => acc + (u.totalMinutes || 0), 0)
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
