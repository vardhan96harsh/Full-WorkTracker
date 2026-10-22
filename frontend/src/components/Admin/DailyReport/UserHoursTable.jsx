// frontend/src/components/Admin/DailyReport/UserHoursTable.jsx
import React from "react";
import {
  Users,
  Download,
  ChevronUp,
  ChevronDown,
  Clock,
  FolderKanban,
  CheckCircle2,
  CalendarCheck,
} from "lucide-react";
import { formatHHMMSS } from "./reportHelpers.js";

export default function UserHoursTable({
  byUserWithProjects,
  loading,
  unit,
  expandedUser,
  setExpandedUser,
  exportByUserCSV,
}) {
  const totalMinutesAll = (byUserWithProjects || []).reduce(
    (acc, u) => acc + (u.totalMinutes || 0),
    0
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-white via-slate-50/50 to-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Employee Working Hours
              </h3>
              <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">
                {byUserWithProjects.length} {byUserWithProjects.length === 1 ? "Employee" : "Employees"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Individual staff productivity, tracked shift hours, and project assignments
            </p>
          </div>
        </div>

        <button
          onClick={exportByUserCSV}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 hover:shadow-sm cursor-pointer shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>Export By User (CSV)</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Employee Name</th>
              <th className="px-5 py-3.5">Projects Contributed</th>
              <th className="px-5 py-3.5">
                Total ({unit === "hours" ? "Hours" : "Minutes"})
              </th>
              <th className="px-5 py-3.5">Shift Target (8h)</th>
              <th className="px-5 py-3.5">Elapsed Time</th>
              <th className="px-5 py-3.5 text-right">Project Details</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {byUserWithProjects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {loading ? "Loading employee hours…" : "No employee records found"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {loading ? "Querying database..." : "Try selecting a broader date range or adjusting filters."}
                  </p>
                </td>
              </tr>
            )}

            {byUserWithProjects.map((u) => {
              const isOpen = expandedUser[u.userId];
              const hoursVal = unit === "hours"
                ? Math.round((u.totalMinutes / 60) * 100) / 100
                : Math.round(u.totalMinutes);

              const initials = (u.userName || "U")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0].toUpperCase())
                .join("");

              // Percent of standard 8 hour shift (480 mins)
              const shiftPercent = Math.min(100, Math.round(((u.totalMinutes || 0) / 480) * 100));

              return (
                <React.Fragment key={u.userId}>
                  <tr className={`transition-colors duration-150 ${isOpen ? "bg-slate-50/90" : "hover:bg-slate-50/70"}`}>
                    {/* Employee Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 font-bold text-white text-xs shadow-2xs">
                          {initials}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block tracking-tight">
                            {u.userName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {u.projects.length} {u.projects.length === 1 ? "project" : "projects"} assigned
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Projects Count */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                        <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                        <span>{u.projects.length} {u.projects.length === 1 ? "Project" : "Projects"}</span>
                      </span>
                    </td>

                    {/* Total Hours / Mins */}
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-1 rounded-xl bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-black text-blue-800">
                        <span>{hoursVal}</span>
                        <span className="text-[10px] font-bold text-blue-600">{unit === "hours" ? "hrs" : "min"}</span>
                      </div>
                    </td>

                    {/* Shift Progress Bar */}
                    <td className="px-5 py-4">
                      <div className="w-28 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>{shiftPercent}%</span>
                          <span className="text-slate-400 font-normal">of 8h</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              shiftPercent >= 100
                                ? "bg-emerald-500"
                                : shiftPercent >= 60
                                ? "bg-blue-500"
                                : "bg-amber-400"
                            }`}
                            style={{ width: `${shiftPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Elapsed Time */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{formatHHMMSS(u.totalMinutes)}</span>
                      </span>
                    </td>

                    {/* Details Action Button */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() =>
                          setExpandedUser((prev) => ({
                            ...prev,
                            [u.userId]: !prev[u.userId],
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                          isOpen
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <span>{isOpen ? "Hide Projects" : "View Projects"}</span>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Projects Breakdown */}
                  {isOpen && (
                    <tr className="bg-slate-50/70 border-b border-slate-200/60">
                      <td colSpan={6} className="px-8 py-4">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                          <div className="bg-slate-100/70 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                              <FolderKanban className="h-3.5 w-3.5 text-blue-600" />
                              Projects Contributed By {u.userName}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {u.projects.length} projects
                            </span>
                          </div>

                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                              <tr>
                                <th className="px-4 py-2.5 text-left">Project Name</th>
                                <th className="px-4 py-2.5 text-left">
                                  Tracked Hours ({unit === "hours" ? "Hours" : "Minutes"})
                                </th>
                                <th className="px-4 py-2.5 text-left">Elapsed Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {u.projects.map((p) => (
                                <tr key={p.projectId} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-4 py-3 font-semibold text-blue-700">
                                    <div className="flex items-center gap-1.5">
                                      <FolderKanban className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                      <span>{p.projectName}</span>
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

          {/* Table Footer */}
          {byUserWithProjects.length > 0 && (
            <tfoot>
              <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-200 text-xs">
                <td className="px-5 py-4" colSpan={2}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Grand Total Summary ({byUserWithProjects.length} Employees)</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-slate-900 text-white px-3 py-1 font-black">
                    {unit === "hours"
                      ? Math.round((totalMinutesAll / 60) * 100) / 100
                      : Math.round(totalMinutesAll)}{" "}
                    {unit === "hours" ? "h" : "min"}
                  </span>
                </td>
                <td />
                <td className="px-5 py-4 font-mono font-black text-slate-800">
                  {formatHHMMSS(totalMinutesAll)}
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
