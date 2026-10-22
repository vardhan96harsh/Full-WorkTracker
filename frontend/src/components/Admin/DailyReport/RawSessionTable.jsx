// frontend/src/components/Admin/DailyReport/RawSessionTable.jsx
import React from "react";
import {
  Clock,
  Building2,
  FolderKanban,
  Laptop,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  Pause,
  Play,
  Square,
  MessageSquare,
  Layers,
  Calendar,
} from "lucide-react";
import { convertValue, hhmmssccFromMinutes, time12 } from "./reportHelpers.js";

export default function RawSessionTable({
  grouped,
  loading,
  unit,
  expanded,
  setExpanded,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-white via-slate-50/50 to-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Detailed Session Logs
              </h3>
              <span className="rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-xs font-extrabold text-blue-700">
                {grouped.length} {grouped.length === 1 ? "Record" : "Records"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Granular daily timeline of individual work sessions, tasks, and machine logs
            </p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3.5">Date</th>
              <th className="px-4 py-3.5">Team Member</th>
              <th className="px-4 py-3.5">Company</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Project</th>
              <th className="px-4 py-3.5">Task Name</th>
              <th className="px-4 py-3.5">Workstation PC</th>
              <th className="px-4 py-3.5">
                Total ({unit === "hours" ? "Hours" : "Min"})
              </th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Elapsed</th>
              <th className="px-4 py-3.5 text-right">Details</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {grouped.length === 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                    <Clock className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {loading ? "Loading session logs…" : "No session records found"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {loading ? "Querying database..." : "Try adjusting your date range or filter selection."}
                  </p>
                </td>
              </tr>
            )}

            {grouped.map((g) => {
              const statuses = Object.values(g.projects || {})
                .flatMap((p) => p.sessions || [])
                .map((s) => s.status)
                .filter(Boolean);

              let latestProject = "—";
              let latestTaskTitle = "—";
              let latestTime = 0;

              Object.values(g.projects || {}).forEach((p) => {
                if (latestProject === "—" && p.projectName) {
                  latestProject = p.projectName;
                  latestTaskTitle = p.taskTitle || "—";
                }
                p.sessions?.forEach((s) => {
                  if (s.status === "active") {
                    latestProject = p.projectName;
                    latestTaskTitle = p.taskTitle || "—";
                  }
                  s.segments?.forEach((seg) => {
                    const t = new Date(seg.end || seg.start || 0).getTime();
                    if (t > latestTime) {
                      latestTime = t;
                      latestProject = p.projectName;
                      latestTaskTitle = p.taskTitle || "—";
                    }
                  });
                });
              });

              let latestStatus = "—";
              if (statuses.includes("active")) latestStatus = "active";
              else if (statuses.includes("paused")) latestStatus = "paused";
              else if (statuses.includes("stopped")) latestStatus = "stopped";

              const isOpen = !!expanded[g.key];
              const sessionCount = Object.values(g.projects || {}).reduce(
                (acc, p) => acc + (p.sessions?.length || 0),
                0
              );

              // Extract initials for modern avatar
              const initials = (g.userName || "U")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0].toUpperCase())
                .join("");

              return (
                <React.Fragment key={g.key}>
                  <tr className={`transition-colors duration-150 ${isOpen ? "bg-slate-50/90" : "hover:bg-slate-50/70"}`}>
                    {/* Date */}
                    <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">{g.date}</span>
                      </div>
                    </td>

                    {/* Team Member */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5 min-w-[140px]">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 font-bold text-white text-[11px] shadow-2xs">
                          {initials}
                        </div>
                        <span className="font-bold text-slate-900 tracking-tight">
                          {g.userName}
                        </span>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3.5 text-slate-600 text-xs font-medium">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100/90 px-2.5 py-1 text-slate-700 font-semibold">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        <span>{g.companyName}</span>
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 text-slate-600 text-xs font-medium">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100/90 px-2 py-1 text-slate-600">
                        <Tag className="h-3 w-3 text-slate-400" />
                        <span>{g.categoryName}</span>
                      </span>
                    </td>

                    {/* Project */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-bold text-blue-700 max-w-[200px] truncate" title={latestProject}>
                        <FolderKanban className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                        <span className="truncate">{latestProject}</span>
                      </div>
                    </td>

                    {/* Task Name */}
                    <td className="px-4 py-3.5">
                      {latestTaskTitle && latestTaskTitle !== "—" ? (
                        <span className="inline-flex items-center rounded-lg border border-blue-200/80 bg-blue-50/80 px-2.5 py-1 text-xs font-semibold text-blue-700 max-w-[180px] truncate" title={latestTaskTitle}>
                          {latestTaskTitle}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">—</span>
                      )}
                    </td>

                    {/* Workstation PC */}
                    <td className="px-4 py-3.5 text-xs">
                      {g.hostnameStr && g.hostnameStr !== "—" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-1 font-mono text-[11px] font-semibold text-slate-700">
                          <Laptop className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[120px]" title={g.hostnameStr}>{g.hostnameStr}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Total Time */}
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/80 px-2.5 py-1 text-xs font-extrabold text-slate-900">
                        <span>{convertValue(g.totalMinutes || 0, unit)}</span>
                        <span className="text-[10px] font-semibold text-slate-500">{unit === "hours" ? "h" : "min"}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      {latestStatus === "active" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Active</span>
                        </span>
                      ) : latestStatus === "paused" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          <Pause className="h-3 w-3" />
                          <span>Paused</span>
                        </span>
                      ) : latestStatus === "stopped" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          <Square className="h-2.5 w-2.5 fill-slate-400 text-slate-400" />
                          <span>Stopped</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">—</span>
                      )}
                    </td>

                    {/* Elapsed Time */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-lg">
                        {hhmmssccFromMinutes(g.totalMinutes || 0)}
                      </span>
                    </td>

                    {/* Details Action Button */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [g.key]: !prev[g.key],
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          isOpen
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <span>{isOpen ? "Hide" : "View"}</span>
                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${isOpen ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-700"}`}>
                          {sessionCount}
                        </span>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Interval Breakdown Card */}
                  {isOpen && (
                    <tr className="bg-slate-50/70 border-b border-slate-200/60">
                      <td colSpan={11} className="px-6 py-4">
                        <div className="space-y-3">
                          {Object.values(g.projects || {}).map((p, idx) => {
                            const allSegments = (p.sessions || [])
                              .flatMap((s) => s.segments || [])
                              .filter((seg) => seg && seg.start);

                            const uniqueSegments = Array.from(
                              new Map(
                                allSegments.map((seg) => [
                                  `${seg.start}-${seg.end || "running"}`,
                                  seg,
                                ])
                              ).values()
                            );

                            uniqueSegments.sort(
                              (a, b) => new Date(a.start) - new Date(b.start)
                            );

                            return (
                              <div
                                key={idx}
                                className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs transition"
                              >
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                  <div className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                                    <div className="flex items-center gap-1.5 text-sm text-blue-700">
                                      <FolderKanban className="h-4 w-4 text-blue-600" />
                                      <span>{p.projectName}</span>
                                    </div>
                                    {p.taskTitle && (
                                      <span className="rounded-lg border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                        Task: {p.taskTitle}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
                                    Project Total: {convertValue(p.totalMinutes || 0, unit)} {unit === "hours" ? "h" : "min"}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Tracked Time Intervals ({uniqueSegments.length})
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {uniqueSegments.map((seg, i) => (
                                      <div
                                        key={i}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-mono font-semibold text-slate-700 shadow-2xs"
                                      >
                                        <Clock className="h-3.5 w-3.5 text-slate-400 font-sans" />
                                        <span>{time12(seg.start)}</span>
                                        <span className="text-slate-400 font-sans">→</span>
                                        {seg.end ? (
                                          <span>{time12(seg.end)}</span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 animate-pulse font-sans">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                            Running now
                                          </span>
                                        )}

                                        {seg.manual && (
                                          <span className="rounded-full bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 font-sans ml-1">
                                            Manual
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Remarks / Notes callout if present */}
                                {p.sessions.some(
                                  (s) =>
                                    s.remarks ||
                                    (s.manualRemarks && s.manualRemarks.length > 0)
                                ) && (
                                  <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 text-xs text-amber-950 flex items-start gap-2">
                                    <MessageSquare className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                      <span className="font-bold text-amber-900 block">Session Notes:</span>
                                      {p.sessions.map((s, si) => (
                                        <React.Fragment key={si}>
                                          {s.remarks && (
                                            <p className="text-amber-800">
                                              • {s.remarks}
                                            </p>
                                          )}
                                          {s.manualRemarks && s.manualRemarks.map((mr, mri) => (
                                            <p key={mri} className="text-amber-800 italic">
                                              • (Manual) {typeof mr === "string" ? mr : mr.text || mr.remarks || JSON.stringify(mr)}
                                            </p>
                                          ))}
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          {/* Grand Totals Footer */}
          {grouped.length > 0 && (
            <tfoot>
              <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-200 text-xs">
                <td className="px-4 py-4" colSpan={7}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Grand Total Summary ({grouped.length} Grouped Records)</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-slate-900 text-white px-3 py-1 font-black">
                    {convertValue(
                      grouped.reduce((acc, g) => acc + (g.totalMinutes || 0), 0),
                      unit
                    )}{" "}
                    {unit === "hours" ? "h" : "min"}
                  </span>
                </td>
                <td />
                <td className="px-4 py-4 font-mono font-black text-slate-800">
                  {hhmmssccFromMinutes(
                    grouped.reduce((acc, g) => acc + (g.totalMinutes || 0), 0)
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
