// frontend/src/components/Admin/DailyReport/PausedSessionsReport.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Pause,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../../../api.js";

function formatMinutes(mins) {
  if (mins === undefined || mins === null || mins < 0) return "0m";
  const roundM = Math.round(mins);
  const h = Math.floor(roundM / 60);
  const m = roundM % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatTimeOnly(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

export default function PausedSessionsReport({ auth, from, to, onCountChange }) {
  // Strictly filter for pauses >= 10 minutes
  const minMinutes = 10;
  // View mode: "all" (chronological pause logs >= 10m) | "summary" (by employee)
  const [viewMode, setViewMode] = useState("all");

  const [logs, setLogs] = useState([]);
  const [userSummaries, setUserSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedUsers, setExpandedUsers] = useState({});

  const toggleUserExpanded = (userId) => {
    setExpandedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const fetchPauseLogs = useCallback(async () => {
    if (!auth?.token) return;
    setLoading(true);
    setError("");

    try {
      const qs = new URLSearchParams({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        minMinutes: "10", // strictly 10 minutes or more
      }).toString();

      const res = await api(`/api/work-sessions/admin/pause-logs?${qs}`, {
        token: auth.token,
      });

      if (res && res.success) {
        // Enforce strictly pauseMinutes >= 10 on frontend as well
        const validLogs = (res.logs || []).filter((l) => (l.pauseMinutes || 0) >= 10);
        setLogs(validLogs);
        setUserSummaries(res.userSummaries || []);
        setLastUpdated(new Date());

        if (typeof onCountChange === "function") {
          onCountChange(validLogs.length);
        }
      } else {
        setLogs([]);
        setUserSummaries([]);
        if (typeof onCountChange === "function") {
          onCountChange(0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch pause logs:", err);
      setError(err?.message || "Failed to load pause history logs.");
    } finally {
      setLoading(false);
    }
  }, [auth?.token, from, to, onCountChange]);

  useEffect(() => {
    fetchPauseLogs();
    const interval = setInterval(fetchPauseLogs, 25000);
    return () => clearInterval(interval);
  }, [fetchPauseLogs]);

  // Filtered logs based on search
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase().trim();
    return logs.filter(
      (l) =>
        l.employeeName?.toLowerCase().includes(q) ||
        l.employeeEmail?.toLowerCase().includes(q) ||
        l.employeeId?.toLowerCase().includes(q) ||
        l.projectName?.toLowerCase().includes(q) ||
        l.taskTitle?.toLowerCase().includes(q) ||
        l.designation?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  // Filtered user summaries based on search
  const filteredSummaries = useMemo(() => {
    if (!search.trim()) return userSummaries;
    const q = search.toLowerCase().trim();
    return userSummaries.filter(
      (u) =>
        u.employeeName?.toLowerCase().includes(q) ||
        u.employeeEmail?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q)
    );
  }, [userSummaries, search]);

  // Metrics
  const stats = useMemo(() => {
    const totalEvents = logs.length;
    let totalMins = 0;
    let maxM = 0;
    let maxPerson = "—";
    let ongoingCount = 0;

    for (const l of logs) {
      totalMins += l.pauseMinutes || 0;
      if (l.pauseMinutes > maxM) {
        maxM = l.pauseMinutes;
        maxPerson = l.employeeName;
      }
      if (l.isOngoing) {
        ongoingCount += 1;
      }
    }

    return {
      totalEvents,
      totalMins: Math.round(totalMins),
      maxM: Math.round(maxM),
      maxPerson,
      ongoingCount,
      uniqueEmployees: userSummaries.length,
    };
  }, [logs, userSummaries]);

  // CSV Export
  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    const headers = [
      "Date",
      "Employee Name",
      "Employee ID",
      "Email",
      "Designation",
      "Project",
      "Task",
      "Pause Instance",
      "Paused At (Start)",
      "Resumed At (End)",
      "Effective Pause Duration (Mins)",
      "Lunch Deducted (Mins)",
      "Raw Duration (Mins)",
      "Status",
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.date || ""}"`,
      `"${l.employeeName || ""}"`,
      `"${l.employeeId || ""}"`,
      `"${l.employeeEmail || ""}"`,
      `"${l.designation || ""}"`,
      `"${l.projectName || ""}"`,
      `"${l.taskTitle || ""}"`,
      `"Pause #${l.pauseNumber || 1}"`,
      `"${l.pauseStart ? new Date(l.pauseStart).toLocaleString() : ""}"`,
      `"${l.pauseEnd ? new Date(l.pauseEnd).toLocaleString() : "Currently Paused"}"`,
      Math.round(l.pauseMinutes || 0),
      Math.round(l.lunchDeductedMinutes || 0),
      Math.round(l.rawTotalMinutes || l.pauseMinutes || 0),
      `"${l.isOngoing ? "Ongoing (Active Pause)" : "Completed Pause"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `paused_sessions_ge_10m_${from || "today"}_to_${to || "today"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Minimalist Header Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Pause size={15} />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Paused Sessions Log (≥ 10 mins)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {logs.length} Pauses
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-10">
              Only sessions paused for 10 minutes or longer are tracked here (lunch break 2:00 PM – 3:00 PM is automatically excluded).
            </p>
          </div>

          {/* Minimal Action Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto pl-10 sm:pl-0">
            <button
              type="button"
              onClick={fetchPauseLogs}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer shadow-2xs disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-slate-500" : "text-slate-500"} />
              <span>Refresh</span>
            </button>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
                title="Export CSV"
              >
                <Download size={13} className="text-slate-500" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimalist 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-100 text-xs">
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-500 block">Total Pauses (≥10m)</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{stats.totalEvents} Times</span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-500 block">Total Paused Time</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{formatMinutes(stats.totalMins)}</span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-500 block">Longest Pause</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block truncate" title={stats.maxPerson}>
              {formatMinutes(stats.maxM)} {stats.maxPerson !== "—" ? `(${stats.maxPerson})` : ""}
            </span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-500 block">Currently Paused</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
              {stats.ongoingCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {stats.ongoingCount} Active Now
                </span>
              ) : (
                <span className="text-slate-400 font-normal text-xs">None</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                viewMode === "all"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Pause Logs ({filteredLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("summary")}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                viewMode === "summary"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              By Employee ({filteredSummaries.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, project..."
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* VIEW 1: ALL PAUSE LOGS (>= 10 MINS) */}
        {viewMode === "all" && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Emp ID</th>
                  <th className="px-4 py-2.5">Project &amp; Task</th>
                  <th className="px-4 py-2.5">Pause</th>
                  <th className="px-4 py-2.5">Paused At</th>
                  <th className="px-4 py-2.5">Resumed At</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <h5 className="mt-2 text-xs font-bold text-slate-900">
                        No Pauses ≥ 10 Minutes Found
                      </h5>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        All work sessions in this period were active or had pauses under 10 minutes.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item, idx) => (
                    <tr
                      key={item.pauseId || idx}
                      className={`transition hover:bg-slate-50/60 ${
                        item.isOngoing ? "bg-amber-50/30" : ""
                      }`}
                    >
                      {/* Index */}
                      <td className="px-4 py-2.5 text-xs text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* Employee */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                            {getInitials(item.employeeName)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 text-xs block truncate">
                              {item.employeeName || "Unknown"}
                            </span>
                            {item.employeeEmail && (
                              <span className="text-[11px] text-slate-400 truncate block font-mono">
                                {item.employeeEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Emp ID */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-700">
                          {item.employeeId || "—"}
                        </span>
                      </td>

                      {/* Project & Task */}
                      <td className="px-4 py-2.5">
                        <div className="min-w-0 max-w-[200px]">
                          <span className="font-medium text-slate-800 text-xs block truncate" title={item.projectName}>
                            {item.projectName || "General"}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate" title={item.taskTitle}>
                            {item.taskTitle || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Pause Instance */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                          Pause #{item.pauseNumber || 1}
                        </span>
                      </td>

                      {/* Pause Start */}
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                        {formatTimeOnly(item.pauseStart)}
                      </td>

                      {/* Resumed / End */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {item.isOngoing ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Ongoing
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">
                            {formatTimeOnly(item.pauseEnd)}
                          </span>
                        )}
                      </td>

                      {/* Pause Duration */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200">
                            <Clock size={11} className="text-slate-400" />
                            <span>{formatMinutes(item.pauseMinutes)}</span>
                          </span>
                          {item.lunchDeductedMinutes > 0 && (
                            <span
                              className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                              title={`${Math.round(item.lunchDeductedMinutes)}m lunch break (2 PM - 3 PM) excluded`}
                            >
                              excl. lunch
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {item.isOngoing ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Active Pause
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Resolved
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: BY EMPLOYEE SUMMARY */}
        {viewMode === "summary" && (
          <div className="divide-y divide-slate-100">
            {filteredSummaries.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <h5 className="mt-2 text-xs font-bold text-slate-900">
                  No Employees with Pauses ≥ 10 Minutes
                </h5>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  All employees had zero extended pauses in this period.
                </p>
              </div>
            ) : (
              filteredSummaries.map((user) => {
                const isExpanded = Boolean(expandedUsers[user.userId]);

                return (
                  <div key={user.userId} className="p-3.5 transition hover:bg-slate-50/50">
                    <div
                      onClick={() => toggleUserExpanded(user.userId)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                          {getInitials(user.employeeName)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {user.employeeName}
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {user.employeeId}
                            </span>
                            {user.isCurrentlyPaused && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Paused Now
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            {user.designation} • {user.employeeEmail}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">Pauses (≥10m)</span>
                          <span className="font-bold text-slate-800">{user.totalPauseCount} times</span>
                        </div>

                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">Total Paused Time</span>
                          <span className="font-bold text-slate-900">{formatMinutes(user.totalPauseMinutes)}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">Longest</span>
                          <span className="font-bold text-slate-900">{formatMinutes(user.maxPauseMinutes)}</span>
                        </div>

                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition shrink-0"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Pause Timeline */}
                    {isExpanded && (
                      <div className="mt-2.5 pl-4 sm:pl-10 pt-2.5 border-t border-slate-100">
                        <div className="space-y-1.5">
                          {user.logs.map((log, lIdx) => (
                            <div
                              key={log.pauseId || lIdx}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-slate-400">#{log.pauseNumber || lIdx + 1}</span>
                                <span className="font-medium text-slate-800">{log.projectName}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500 text-[11px]">
                                  {formatTimeOnly(log.pauseStart)} → {log.isOngoing ? "Ongoing" : formatTimeOnly(log.pauseEnd)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-800">
                                  {formatMinutes(log.pauseMinutes)}
                                </span>
                                {log.lunchDeductedMinutes > 0 && (
                                  <span
                                    className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200"
                                    title={`${Math.round(log.lunchDeductedMinutes)}m lunch break (2 PM - 3 PM) excluded`}
                                  >
                                    excl. lunch
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
