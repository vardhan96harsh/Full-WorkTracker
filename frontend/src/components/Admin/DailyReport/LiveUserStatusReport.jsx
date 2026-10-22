// frontend/src/components/Admin/DailyReport/LiveUserStatusReport.jsx
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Activity,
  Clock,
  Search,
  RefreshCw,
  Download,
  Pause,
  Play,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  Shield,
  Sparkles,
} from "lucide-react";
import { api } from "../../../api.js";

// Helper: Format milliseconds or minutes into clean string
function formatDuration(totalMins, unit = "hours") {
  const m = Number(totalMins) || 0;
  if (unit === "minutes") {
    return `${Math.round(m)}m`;
  }
  const h = (m / 60).toFixed(1);
  return `${h}h`;
}

// Live ticking duration for active session
function ActiveLiveDuration({ currentStart, baseMins = 0 }) {
  const [elapsedMs, setElapsedMs] = useState(() => {
    if (!currentStart) return 0;
    return Math.max(0, Date.now() - new Date(currentStart).getTime());
  });

  useEffect(() => {
    if (!currentStart) return;
    const interval = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - new Date(currentStart).getTime()));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStart]);

  const totalSeconds = Math.floor((baseMins * 60) + (elapsedMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return (
    <span className="font-mono font-bold text-emerald-700 tracking-tight">
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

// Helper: Relative time ago
function timeAgo(dateInput) {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function LiveUserStatusReport({
  auth,
  unit = "hours",
  onSelectUserForRaw,
  onOnlineCountChange,
}) {
  const [data, setData] = useState({
    summary: {
      totalEmployees: 0,
      onlineCount: 0,
      activeCount: 0,
      pausedCount: 0,
      offlineCount: 0,
      totalTrackedHours: 0,
    },
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "online" | "offline" | "active" | "paused"
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchLiveStatus = useCallback(async (isSilent = false) => {
    if (!auth?.token) return;
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);

    try {
      const res = await api("/api/work-sessions/admin/live-status", {
        token: auth.token,
      });

      if (res && res.users) {
        setData(res);
        setLastUpdated(new Date());
        if (typeof onOnlineCountChange === "function") {
          onOnlineCountChange(res.summary?.onlineCount || 0, res.summary?.offlineCount || 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch live employee status:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [auth?.token, onOnlineCountChange]);

  // Initial load
  useEffect(() => {
    fetchLiveStatus();
  }, [fetchLiveStatus]);

  // Auto-refresh polling every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLiveStatus(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLiveStatus]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    let list = data.users || [];

    // Filter by status category
    if (statusFilter === "online") {
      list = list.filter((u) => u.isOnline);
    } else if (statusFilter === "offline") {
      list = list.filter((u) => !u.isOnline);
    } else if (statusFilter === "active") {
      list = list.filter((u) => u.status === "active");
    } else if (statusFilter === "paused") {
      list = list.filter((u) => u.status === "paused");
    }

    // Filter by search keyword
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.employeeId && u.employeeId.toLowerCase().includes(s)) ||
          (u.designation && u.designation.toLowerCase().includes(s)) ||
          (u.currentSession?.projectName && u.currentSession.projectName.toLowerCase().includes(s)) ||
          (u.currentSession?.companyName && u.currentSession.companyName.toLowerCase().includes(s)) ||
          (u.currentSession?.machineInfo?.hostname && u.currentSession.machineInfo.hostname.toLowerCase().includes(s)) ||
          (u.currentSession?.machineId && u.currentSession.machineId.toLowerCase().includes(s))
      );
    }

    // Sort order: Active working first -> Paused next -> Completed offline next -> Inactive last
    const orderWeight = {
      active: 1,
      paused: 2,
      offline_completed: 3,
      offline_not_started: 4,
    };

    return [...list].sort((a, b) => {
      const wA = orderWeight[a.status] || 5;
      const wB = orderWeight[b.status] || 5;
      if (wA !== wB) return wA - wB;
      // If same status, sort by today's total time descending
      return (b.todayTotalMinutes || 0) - (a.todayTotalMinutes || 0);
    });
  }, [data.users, statusFilter, searchTerm]);

  // Export CSV of live attendance status
  const handleExportCSV = () => {
    if (!filteredUsers.length) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const headers = [
      "Employee Name",
      "Employee ID",
      "Email",
      "Designation",
      "Live Status",
      "Current Project",
      "Company",
      "Current Task",
      "Current Shift Duration (Mins)",
      "Today Total Hours",
      "Machine / PC",
      "Last Heartbeat",
    ];

    const csvRows = [headers.join(",")];

    for (const u of filteredUsers) {
      const curr = u.currentSession;
      const statusLabel =
        u.status === "active"
          ? "ONLINE - Working"
          : u.status === "paused"
          ? "ONLINE - Paused"
          : u.status === "offline_completed"
          ? "OFFLINE - Shift Ended"
          : "OFFLINE - Not Started Today";

      const row = [
        `"${(u.name || "").replace(/"/g, '""')}"`,
        `"${(u.employeeId || "").replace(/"/g, '""')}"`,
        `"${(u.email || "").replace(/"/g, '""')}"`,
        `"${(u.designation || "").replace(/"/g, '""')}"`,
        `"${statusLabel}"`,
        `"${(curr?.projectName || "—").replace(/"/g, '""')}"`,
        `"${(curr?.companyName || "—").replace(/"/g, '""')}"`,
        `"${(curr?.taskTitle || curr?.customTask || "—").replace(/"/g, '""')}"`,
        Math.round(curr?.sessionMinutes || 0),
        ((u.todayTotalMinutes || 0) / 60).toFixed(2),
        `"${(curr?.machineInfo?.hostname || curr?.machineId || "—").replace(/"/g, '""')}"`,
        `"${curr?.lastHeartbeatAt ? new Date(curr.lastHeartbeatAt).toLocaleTimeString() : "—"}"`,
      ];
      csvRows.push(row.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Live_User_Status_Report_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* 🔹 Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered Employees */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Staff
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {summary.totalEmployees}
            </span>
            <span className="text-xs font-semibold text-slate-500">Employees</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Active registered team members
          </div>
        </div>

        {/* Card 2: 🟢 Online (Using Tracker) */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Online Now
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-950 font-mono">
              {summary.onlineCount}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              ({summary.totalEmployees > 0 ? Math.round((summary.onlineCount / summary.totalEmployees) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {summary.activeCount} Working
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {summary.pausedCount} Paused
            </span>
          </div>
        </div>

        {/* Card 3: ⚪ Offline (Not Tracking) */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Offline Now
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <UserX className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-800 font-mono">
              {summary.offlineCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">Not Tracking</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            Shift completed or not logged in today
          </div>
        </div>

        {/* Card 4: Total Team Hours Today */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 to-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Tracked Today
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {summary.totalTrackedHours}h
            </span>
            <span className="text-xs font-semibold text-blue-700">Logged</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            Across {summary.totalEmployees} staff today
          </div>
        </div>
      </div>

      {/* 🔹 Filter Tabs, Search & Live Sync Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90">
          {[
            { id: "all", label: "All Staff", count: summary.totalEmployees },
            { id: "online", label: "🟢 Online", count: summary.onlineCount, isOnline: true },
            { id: "offline", label: "⚪ Offline", count: summary.offlineCount },
            { id: "active", label: "Working", count: summary.activeCount },
            { id: "paused", label: "Paused", count: summary.pausedCount },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                    isSelected
                      ? "bg-slate-800 text-slate-200"
                      : tab.isOnline && tab.count > 0
                      ? "bg-emerald-100 text-emerald-800 font-extrabold"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right side: Search, Auto-Refresh toggle, Refresh Now, Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Instant Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee, project, PC..."
              className="h-9.5 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Auto-Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? "Auto-refresh is active (polls every 15s)" : "Auto-refresh is paused"}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              autoRefresh
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            <span className="relative flex h-2 w-2">
              {autoRefresh && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  autoRefresh ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
            </span>
            <span className="text-[11px] font-bold">
              {autoRefresh ? "Live 15s" : "Paused"}
            </span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchLiveStatus()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
            title="Refresh live data now"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
            title="Download Live Attendance CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 🔹 Users Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 pl-6 pr-3">Employee</th>
                <th className="py-3.5 px-3">Tracker Status</th>
                <th className="py-3.5 px-3">Current / Latest Project</th>
                <th className="py-3.5 px-3">Current Shift</th>
                <th className="py-3.5 px-3">Today Total</th>
                <th className="py-3.5 px-3">Workstation (PC)</th>
                <th className="py-3.5 px-3">Last Heartbeat</th>
                <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {loading && filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
                      <span className="font-semibold text-slate-600">Loading live employee status...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-slate-300" />
                      <span className="font-semibold text-slate-700">No employees match this filter</span>
                      <span className="text-xs text-slate-400">
                        Try changing the status tab or clearing your search keywords.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((emp, idx) => {
                  const curr = emp.currentSession;
                  const isActive = emp.status === "active";
                  const isPaused = emp.status === "paused";
                  const isCompleted = emp.status === "offline_completed";
                  const isNotStarted = emp.status === "offline_not_started";

                  const pcName = curr?.machineInfo?.hostname || curr?.machineId || "—";
                  const projectName = curr?.projectName || "—";
                  const companyName = curr?.companyName && curr?.companyName !== "—" ? curr.companyName : null;
                  const taskTitle = curr?.taskTitle || curr?.customTask || null;

                  return (
                    <tr
                      key={emp.userId}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        isActive ? "bg-emerald-50/20" : isPaused ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* 1. Employee Info */}
                      <td className="py-3 pl-6 pr-3">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          {/* Avatar Circle with live status beacon */}
                          <div className="relative shrink-0">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-2xl font-bold text-xs uppercase shadow-2xs ${
                                isActive
                                  ? "bg-emerald-600 text-white"
                                  : isPaused
                                  ? "bg-amber-500 text-white"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {emp.name
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            {/* Live Badge dot */}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                                isActive
                                  ? "bg-emerald-500"
                                  : isPaused
                                  ? "bg-amber-500"
                                  : isCompleted
                                  ? "bg-slate-400"
                                  : "bg-slate-300"
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">
                                {emp.name}
                              </span>
                              {emp.employeeId && emp.employeeId !== "—" && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                                  {emp.employeeId}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {emp.designation || emp.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Tracker Status Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isActive && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shadow-2xs">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span>Online • Working</span>
                          </div>
                        )}

                        {isPaused && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold shadow-2xs">
                            <Pause className="h-3 w-3 text-amber-600" />
                            <span>Online • Paused</span>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium">
                            <CheckCircle2 className="h-3 w-3 text-slate-400" />
                            <span>Offline • Shift Ended</span>
                          </div>
                        )}

                        {isNotStarted && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-slate-400 text-[11px] font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            <span>Offline • No Activity</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Current / Latest Project */}
                      <td className="py-3 px-3 max-w-[220px]">
                        {projectName !== "—" ? (
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate" title={projectName}>
                              {projectName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                              {companyName && (
                                <span className="font-medium text-blue-600 truncate">
                                  {companyName}
                                </span>
                              )}
                              {companyName && taskTitle && <span>•</span>}
                              {taskTitle && (
                                <span className="text-slate-500 truncate" title={taskTitle}>
                                  {taskTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Not assigned</span>
                        )}
                      </td>

                      {/* 4. Current Shift / Session Duration */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isActive && curr?.currentStart ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <ActiveLiveDuration currentStart={curr.currentStart} />
                          </div>
                        ) : isPaused ? (
                          <div className="text-[11px] text-amber-700 font-medium font-mono">
                            Paused {timeAgo(curr?.pausedAt)}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* 5. Today's Total Work Time */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900 text-[12px]">
                            {formatDuration(emp.todayTotalMinutes, unit)}
                          </span>
                          {/* Mini Progress Bar relative to 8 hours (480 mins) */}
                          <div className="mt-1 h-1 w-18 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                emp.todayTotalMinutes >= 480
                                  ? "bg-emerald-500"
                                  : emp.todayTotalMinutes > 0
                                  ? "bg-blue-500"
                                  : "bg-transparent"
                              }`}
                              style={{
                                width: `${Math.min(100, Math.round((emp.todayTotalMinutes / 480) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 6. PC / Workstation */}
                      <td className="py-3 px-3 max-w-[140px] whitespace-nowrap">
                        {pcName !== "—" ? (
                          <div className="inline-flex items-center gap-1.5 text-slate-700 font-mono text-[11px] truncate" title={pcName}>
                            <Laptop className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{pcName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* 7. Last Heartbeat */}
                      <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                        {timeAgo(emp.lastHeartbeatAt)}
                      </td>

                      {/* 8. Action: View Details */}
                      <td className="py-3 pr-6 pl-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof onSelectUserForRaw === "function") {
                              onSelectUserForRaw(emp.userId);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-[11px] font-semibold transition cursor-pointer"
                          title={`View ${emp.name}'s detailed daily sessions`}
                        >
                          <span>Sessions</span>
                          <ArrowUpRight className="h-3 w-3 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 py-3 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              Showing <strong>{filteredUsers.length}</strong> of <strong>{summary.totalEmployees}</strong> employees
            </span>
          </div>
          <div>
            Last synced: <span className="font-mono font-medium">{lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
