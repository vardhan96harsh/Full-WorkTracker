// frontend/src/components/Admin/DailyReport/CompanyHoursTable.jsx
import React from "react";
import { Building2, FolderKanban, FileSpreadsheet, ChevronUp, ChevronDown } from "lucide-react";
import { formatHHMMSS } from "./reportHelpers.js";

export default function CompanyHoursTable({
  companiesTree,
  loading,
  unit,
  expandedCompany,
  setExpandedCompany,
  exportCompanyExcel,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-slate-900">
            Company Working Hours
          </h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {companiesTree.length} Companies
          </span>
        </div>

        <button
          onClick={exportCompanyExcel}
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export Company Report (Excel)</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Company Name</th>
              <th className="px-5 py-3.5">Projects Count</th>
              <th className="px-5 py-3.5">
                Total ({unit === "hours" ? "Hours" : "Minutes"})
              </th>
              <th className="px-5 py-3.5">Elapsed Time</th>
              <th className="px-5 py-3.5 text-right">Project Details</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {companiesTree.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                  {loading ? "Loading company hours…" : "No company work records found."}
                </td>
              </tr>
            )}

            {companiesTree.map((c) => {
              const isOpen = expandedCompany[c.companyName];

              return (
                <React.Fragment key={c.companyName}>
                  <tr className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span>{c.companyName}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                        {c.projects.length} {c.projects.length === 1 ? "project" : "projects"}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-extrabold text-blue-700">
                      {unit === "hours"
                        ? Math.round((c.totalMinutes / 60) * 100) / 100
                        : Math.round(c.totalMinutes)}
                    </td>

                    <td className="px-5 py-4 font-mono font-semibold text-slate-700">
                      {formatHHMMSS(c.totalMinutes)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() =>
                          setExpandedCompany((prev) => ({
                            ...prev,
                            [c.companyName]: !prev[c.companyName],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                      >
                        <span>{isOpen ? "Hide Projects" : "View Projects"}</span>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Projects under this company */}
                  {isOpen && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={5} className="px-8 py-4">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-4 py-3 text-left">Project Name</th>
                                <th className="px-4 py-3 text-left">Team Contributors</th>
                                <th className="px-4 py-3 text-left">
                                  Project Hours ({unit === "hours" ? "h" : "m"})
                                </th>
                                <th className="px-4 py-3 text-left">Elapsed Time</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {c.projects.map((p) => (
                                <tr key={p.projectId} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 font-bold text-blue-700">
                                    <div className="flex items-center gap-1.5">
                                      <FolderKanban className="h-3.5 w-3.5 text-blue-500" />
                                      <span>{p.projectName}</span>
                                    </div>
                                  </td>

                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1.5">
                                      {p.users.map((u) => (
                                        <span
                                          key={u.userId}
                                          className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
                                        >
                                          {u.userName} ({formatHHMMSS(u.totalMinutes)})
                                        </span>
                                      ))}
                                    </div>
                                  </td>

                                  <td className="px-4 py-3 font-extrabold text-slate-900">
                                    {unit === "hours"
                                      ? Math.round((p.totalMinutes / 60) * 100) / 100
                                      : Math.round(p.totalMinutes)}
                                  </td>

                                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600">
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

          {companiesTree.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <td className="px-5 py-4" colSpan={2}>
                  Grand Total ({companiesTree.length} Companies)
                </td>
                <td className="px-5 py-4 text-blue-700">
                  {unit === "hours"
                    ? Math.round((companiesTree.reduce((acc, c) => acc + (c.totalMinutes || 0), 0) / 60) * 100) / 100
                    : Math.round(companiesTree.reduce((acc, c) => acc + (c.totalMinutes || 0), 0))}
                </td>
                <td className="px-5 py-4 font-mono">
                  {formatHHMMSS(
                    companiesTree.reduce((acc, c) => acc + (c.totalMinutes || 0), 0)
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
