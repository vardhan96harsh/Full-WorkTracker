// frontend/src/components/Admin/DailyReport/ProjectHoursTable.jsx
import React from "react";
import {
  FolderKanban,
  Building2,
  ChevronUp,
  ChevronDown,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
} from "lucide-react";
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
  const totalMinutesAll = (projectsTree || []).reduce(
    (acc, p) => acc + (p.totalMinutes || 0),
    0
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-white via-slate-50/50 to-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Project Working Hours
              </h3>
              <span className="rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-xs font-extrabold text-blue-700">
                {projectsTree.length} {projectsTree.length === 1 ? "Project" : "Projects"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Time distribution across client deliverables, custom tasks, and team contributors
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <ExportProjectExcel
            projectsTree={projectsTree}
            from={from}
            to={to}
            unit={unit}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Project Name</th>
              <th className="px-5 py-3.5">Client / Company</th>
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
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                    <FolderKanban className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {loading ? "Loading project hours…" : "No project records found"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {loading ? "Calculating rollups..." : "Try selecting a broader date range or adjusting filters."}
                  </p>
                </td>
              </tr>
            )}

            {projectsTree.map((p) => {
              const openProject = expandedProject[p.projectId];
              const hoursVal = unit === "hours"
                ? Math.round((p.totalMinutes / 60) * 100) / 100
                : Math.round(p.totalMinutes);

              return (
                <React.Fragment key={p.projectId}>
                  <tr className={`transition-colors duration-150 ${openProject ? "bg-slate-50/90" : "hover:bg-slate-50/70"}`}>
                    {/* Project Name */}
                    <td className="px-5 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 border border-blue-100/80 shadow-2xs font-bold text-xs">
                          <FolderKanban className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block tracking-tight">
                            {p.projectName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {p.users.length} {p.users.length === 1 ? "contributor" : "contributors"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        <span>{p.companyName}</span>
                      </span>
                    </td>

                    {/* Total Hours */}
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-1 rounded-xl bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-black text-blue-800">
                        <span>{hoursVal}</span>
                        <span className="text-[10px] font-bold text-blue-600">{unit === "hours" ? "hrs" : "min"}</span>
                      </div>
                    </td>

                    {/* Elapsed Time */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{formatHHMMSS(p.totalMinutes)}</span>
                      </span>
                    </td>

                    {/* Team Breakdown Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() =>
                          setExpandedProject((prev) => ({
                            ...prev,
                            [p.projectId]: !prev[p.projectId],
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                          openProject
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <span>{openProject ? "Hide Team" : "View Team"}</span>
                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${openProject ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-700"}`}>
                          {p.users.length}
                        </span>
                        {openProject ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Project Team Breakdown */}
                  {openProject && (
                    <tr className="bg-slate-50/70 border-b border-slate-200/60">
                      <td colSpan={5} className="px-8 py-4">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                          <div className="bg-slate-100/70 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-blue-600" />
                              Team Members on {p.projectName}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {p.users.length} members
                            </span>
                          </div>

                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                              <tr>
                                <th className="px-4 py-2.5 text-left">Team Member</th>
                                <th className="px-4 py-2.5 text-left">
                                  Total ({unit === "hours" ? "Hours" : "Minutes"})
                                </th>
                                <th className="px-4 py-2.5 text-left">Elapsed Time</th>
                                <th className="px-4 py-2.5 text-right">Work Dates</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {p.users.map((u) => {
                                const key = `${p.projectId}_${u.userId}`;
                                const openUser = expandedProjectUser[key];

                                const initials = (u.userName || "U")
                                  .split(" ")
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((n) => n[0].toUpperCase())
                                  .join("");

                                return (
                                  <React.Fragment key={key}>
                                    <tr className="hover:bg-slate-50/80 transition-colors">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-bold text-white shadow-2xs">
                                            {initials}
                                          </div>
                                          <span className="font-bold text-slate-900">
                                            {u.userName}
                                          </span>
                                        </div>
                                      </td>

                                      <td className="px-4 py-3 font-extrabold text-slate-900">
                                        {unit === "hours"
                                          ? Math.round((u.totalMinutes / 60) * 100) / 100
                                          : Math.round(u.totalMinutes)}
                                      </td>

                                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600">
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
                                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                        >
                                          <Calendar className="h-3 w-3 text-slate-400" />
                                          <span>{openUser ? "Hide Dates" : `Dates (${u.dates.length})`}</span>
                                        </button>
                                      </td>
                                    </tr>

                                    {/* Sub-dates expansion */}
                                    {openUser && (
                                      <tr className="bg-slate-50/90">
                                        <td colSpan={4} className="px-6 py-3">
                                          <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                              Dates Worked:
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                              {u.dates.map((d, i) => {
                                                const dateStr = typeof d === "object" && d !== null ? d.date : String(d || "");
                                                const minsVal = typeof d === "object" && d !== null ? Number(d.minutes || 0) : 0;
                                                return (
                                                  <span
                                                    key={i}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 shadow-2xs"
                                                  >
                                                    <Calendar className="h-3 w-3 text-slate-400 font-sans" />
                                                    <span>{dateStr}</span>
                                                    {minsVal > 0 && (
                                                      <span className="text-slate-500 font-medium font-sans text-[11px]">
                                                        ({formatHHMMSS(minsVal)})
                                                      </span>
                                                    )}
                                                  </span>
                                                );
                                              })}
                                            </div>
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

          {/* Table Footer */}
          {projectsTree.length > 0 && (
            <tfoot>
              <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-200 text-xs">
                <td className="px-5 py-4" colSpan={2}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Grand Total ({projectsTree.length} Projects)</span>
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
