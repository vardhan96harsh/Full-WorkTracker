import React, { useState, useEffect, useMemo } from "react";
import {
  ListTodo,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  CalendarDays,
  Play,
  Briefcase,
  AlertCircle,
  FolderKanban,
  RotateCcw,
  Sparkles,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { api } from "../../api.js";

const STATUS_CONFIG = {
  open: {
    label: "Open / Planned",
    pillClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
  not_started: {
    label: "Not Started",
    pillClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
  in_progress: {
    label: "In Progress",
    pillClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  review: {
    label: "Review",
    pillClass: "bg-purple-50 text-purple-700 border-purple-200",
    dotClass: "bg-purple-500",
  },
  completed: {
    label: "Completed",
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  blocked: {
    label: "Blocked",
    pillClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
  on_hold: {
    label: "On Hold",
    pillClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
};

export default function MyTasks({ auth, onStartTaskTimer }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const loadTasks = async () => {
    if (!auth?.token) return;
    setLoading(true);
    try {
      const res = await api("/api/tasks/my", { token: auth.token });
      setTasks(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load employee tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [auth?.token]);

  // Update task status
  const updateStatus = async (taskId, newStatus) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );

      await api(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        token: auth.token,
        body: { status: newStatus },
      });

      window.dispatchEvent(new CustomEvent("taskCount:refresh"));
    } catch (err) {
      console.error("Failed to update status:", err);
      loadTasks(); // rollback
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const open = tasks.filter((t) => t.status === "open" || t.status === "not_started").length;
    const review = tasks.filter((t) => t.status === "review").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const onHold = tasks.filter((t) => t.status === "on_hold").length;
    return { total, completed, inProgress, open, review, blocked, onHold };
  }, [tasks]);

  // Project options
  const projectOptions = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t.project) {
        const id = t.project._id || t.project.id;
        const name = t.project.name;
        if (id && name) map.set(id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (projectFilter !== "all") {
        const pId = t.project?._id || t.project?.id || t.project;
        if (String(pId) !== String(projectFilter)) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = (t.title || "").toLowerCase().includes(q);
        const matchDesc = (t.description || "").toLowerCase().includes(q);
        const matchProj = (t.project?.name || "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchProj) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, projectFilter, search]);

  const formatDate = (d) => {
    if (!d) return "";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return String(d);
    }
  };

  const formatMinutes = (mins) => {
    if (!mins) return "0h";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* ── HEADER BANNER (Clean Light Aesthetic) ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ListTodo className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                My Assigned Tasks
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tasks assigned to you across all project plans. Click to start your timer or update status.
              </p>
            </div>
          </div>

          <button
            onClick={loadTasks}
            disabled={loading}
            className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
            title="Refresh tasks"
          >
            <RotateCcw size={14} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── METRIC CARDS (Bright, Elegant, Soft Color Tints) ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Assigned */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Assigned</span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <ListTodo size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.total}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">From active project plans</p>
        </div>

        {/* In Progress */}
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
            <span>In Progress</span>
            <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Clock size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-blue-700">
            {metrics.inProgress}
          </div>
          <p className="mt-0.5 text-[11px] text-blue-600/80">Currently being worked on</p>
        </div>

        {/* Open / Planned */}
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-700">
            <span>Open / Planned</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <CalendarDays size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-700">
            {metrics.open}
          </div>
          <p className="mt-0.5 text-[11px] text-indigo-600/80">Ready to start</p>
        </div>

        {/* Completed */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Completed</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            {metrics.completed}
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-600/80">
            {metrics.total ? Math.round((metrics.completed / metrics.total) * 100) : 0}% completion rate
          </p>
        </div>
      </div>

      {/* ── SEARCH & FILTER TOOLBAR ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by task title, description, or project name..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3.5 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer transition"
              >
                <option value="all">All Projects ({projectOptions.length})</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <FolderKanban size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Status Filter Tabs (Clean Blue / Slate Pills) */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1.5">
            Status:
          </span>
          {[
            { key: "all", label: "All", count: metrics.total },
            { key: "open", label: "Open", count: metrics.open },
            { key: "in_progress", label: "In Progress", count: metrics.inProgress },
            { key: "review", label: "Review", count: metrics.review },
            { key: "completed", label: "Completed", count: metrics.completed },
            { key: "blocked", label: "Blocked", count: metrics.blocked },
            { key: "on_hold", label: "On Hold", count: metrics.onHold },
          ].map(({ key, label, count }) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-600 border border-slate-200/60"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TASKS LIST ── */}
      <div className="space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-14 text-center space-y-3 shadow-xs">
            <RotateCcw className="h-6 w-6 animate-spin text-blue-600" />
            <p className="text-xs font-semibold text-slate-500">Loading your assigned tasks...</p>
          </div>
        )}

        {!loading && filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center space-y-2 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <ListTodo size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No tasks found</h4>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              {search || statusFilter !== "all" || projectFilter !== "all"
                ? "Try adjusting your search query or clear the active status filter."
                : "You currently have no tasks assigned from active project plans."}
            </p>
          </div>
        )}

        {!loading &&
          filteredTasks.map((task) => {
            const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;
            return (
              <div
                key={task._id}
                className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all duration-200 space-y-3.5"
              >
                {/* Header row of card */}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 flex-1 pr-2">
                    {/* Project & Task Type Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      {task.project && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          <Briefcase size={12} className="text-blue-500" />
                          <span>{task.project.name}</span>
                          {task.project.code && (
                            <span className="font-mono text-[10px] text-blue-500">
                              ({task.project.code})
                            </span>
                          )}
                        </span>
                      )}

                      <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200/70 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {task.taskType || "Alpha"}
                      </span>
                    </div>

                    {/* Task Title */}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {task.title}
                    </h3>

                    {/* Task Description */}
                    {task.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Status Dropdown Selector */}
                  <div className="flex items-center gap-2 self-start shrink-0">
                    <select
                      value={task.status || "open"}
                      onChange={(e) => updateStatus(task._id, e.target.value)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-bold outline-none cursor-pointer shadow-2xs transition ${statusCfg.pillClass}`}
                    >
                      <option value="open">Open / Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                </div>

                {/* Bottom Metadata & Start Timer Action Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-3">
                    {task.estimatedMinutes && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200/60 px-2.5 py-1 font-medium text-slate-700">
                        <Clock size={12} className="text-slate-400" />
                        Est: <strong className="text-slate-800">{formatMinutes(task.estimatedMinutes)}</strong>
                      </span>
                    )}

                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200/60 px-2.5 py-1 font-medium text-slate-700">
                        <CalendarDays size={12} className="text-slate-400" />
                        Due: <span className="font-semibold">{formatDate(task.dueDate)}</span>
                      </span>
                    )}
                  </div>

                  {/* ── QUICK START TIMER ACTION ── */}
                  {onStartTaskTimer && task.status !== "completed" && (
                    <button
                      onClick={() => onStartTaskTimer(task)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:shadow-sm transition cursor-pointer"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Start Project / Task</span>
                    </button>
                  )}

                  {task.status === "completed" && (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle size={13} className="text-emerald-600" />
                      <span>Task Completed</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
