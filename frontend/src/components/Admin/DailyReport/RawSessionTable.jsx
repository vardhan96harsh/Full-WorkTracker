// frontend/src/components/Admin/DailyReport/RawSessionTable.jsx
import React from "react";
import { convertValue, hhmmssccFromMinutes, time12 } from "./reportHelpers.js";

export default function RawSessionTable({
  grouped,
  loading,
  unit,
  expanded,
  setExpanded,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="text-base font-bold text-slate-900">Session Logs</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {grouped.length} Grouped Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3.5">Date</th>
              <th className="px-4 py-3.5">User</th>
              <th className="px-4 py-3.5">Company</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Project</th>
              <th className="px-4 py-3.5">Task Name</th>
              <th className="px-4 py-3.5">PC</th>
              <th className="px-4 py-3.5">
                Total ({unit === "hours" ? "h" : "min"})
              </th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Elapsed</th>
              <th className="px-4 py-3.5 text-right">Details</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {grouped.length === 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-16 text-center text-slate-400">
                  {loading ? "Loading sessions…" : "No session records found matching your filters."}
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

              return (
                <React.Fragment key={g.key}>
                  <tr className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                      {g.date}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {g.userName}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{g.companyName}</td>
                    <td className="px-4 py-3.5 text-slate-600">{g.categoryName}</td>
                    <td className="px-4 py-3.5 font-semibold text-blue-700">
                      {latestProject}
                    </td>
                    <td className="px-4 py-3.5">
                      {latestTaskTitle && latestTaskTitle !== "—" ? (
                        <span className="inline-flex items-center rounded-lg border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          {latestTaskTitle}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">
                      {g.hostnameStr}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {convertValue(g.totalMinutes || 0, unit)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          latestStatus === "active"
                            ? "border border-emerald-200/80 bg-emerald-50 text-emerald-700"
                            : latestStatus === "paused"
                            ? "border border-amber-200/80 bg-amber-50 text-amber-700"
                            : latestStatus === "stopped"
                            ? "border border-rose-200/80 bg-rose-50 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {latestStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">
                      {hhmmssccFromMinutes(g.totalMinutes || 0)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [g.key]: !prev[g.key],
                          }))
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        {isOpen ? "Hide times" : `View times (${sessionCount})`}
                      </button>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={11} className="px-6 py-4">
                        <div className="space-y-3">
                          {Object.values(g.projects || {}).map((p, idx) => {
                            const allSegments = p.sessions
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
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                              >
                                <div className="mb-2.5 flex flex-wrap items-center gap-2 font-bold text-slate-900">
                                  <span>Project: {p.projectName}</span>
                                  {p.taskTitle && (
                                    <span className="rounded-lg border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                      Task: {p.taskTitle}
                                    </span>
                                  )}
                                </div>

                                <ol className="list-decimal space-y-1.5 pl-5 text-xs text-slate-700 font-mono">
                                  {uniqueSegments.map((seg, i) => (
                                    <li key={i}>
                                      {time12(seg.start)} →{" "}
                                      {seg.end ? (
                                        time12(seg.end)
                                      ) : (
                                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 animate-pulse font-sans">
                                          Running now...
                                        </span>
                                      )}

                                      {seg.manual && (
                                        <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 font-sans">
                                          Manual Entry
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ol>

                                {p.sessions.some(
                                  (s) =>
                                    s.remarks ||
                                    (s.manualRemarks && s.manualRemarks.length > 0)
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

          {grouped.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <td className="px-4 py-3.5" colSpan={7}>
                  Total Summary ({grouped.length} Records)
                </td>
                <td className="px-4 py-3.5">
                  {convertValue(
                    grouped.reduce((acc, g) => acc + (g.totalMinutes || 0), 0),
                    unit
                  )}
                </td>
                <td />
                <td className="px-4 py-3.5 font-mono">
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
