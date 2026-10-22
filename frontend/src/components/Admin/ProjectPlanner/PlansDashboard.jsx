import React, { useState, useMemo } from "react";
import {
  LayoutDashboard,
  CalendarRange,
  BarChart3,
  ListTodo,
  Plus,
  Search,
  Filter,
  Building2,
  FolderKanban,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Edit3,
  RefreshCw,
  Trash2,
  Layers,
  Sliders,
  Calendar,
  X,
  ExternalLink,
} from "lucide-react";
import { CalendarEngine } from "../../../plannerEngine/calendarEngine.js";
import ExportPlanDropdown from "./ExportPlanDropdown.jsx";

export default function PlansDashboard({
  plans = [],
  onSelectPlan,
  onOpenView,
  onNewPlan,
  onOpenAIPlanner,
  onEditPlan,
  onSyncTasks,
  onDeletePlan,
  onOpenComplexityTab,
  syncingPlanId,
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [complexityFilter, setComplexityFilter] = useState("ALL");

  // Filter plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (typeFilter !== "ALL" && p.projectType !== typeFilter) return false;
      if (complexityFilter !== "ALL" && p.complexity !== complexityFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const pName = (p.project?.name || "").toLowerCase();
        const pCode = (p.project?.code || "").toLowerCase();
        const cName = (p.company?.name || "").toLowerCase();
        const client = (p.clientName || "").toLowerCase();
        if (!pName.includes(q) && !pCode.includes(q) && !cName.includes(q) && !client.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [plans, typeFilter, complexityFilter, search]);

  // Aggregate Portfolio KPIs
  const totalPlans = plans.length;
  const totalModules = plans.reduce((sum, p) => sum + (Number(p.moduleCount) || 0), 0);
  const totalEstHours = plans
    .reduce((sum, p) => sum + (Number(p.estimatedEffortHours) || 0), 0)
    .toFixed(0);
  const totalAllocHours = plans
    .reduce((sum, p) => sum + (Number(p.allocatedEffortHours) || 0), 0)
    .toFixed(0);
  const totalActualHours = plans
    .reduce((sum, p) => {
      const act =
        p.actualUsedEffortHours !== undefined && p.actualUsedEffortHours !== null && p.actualUsedEffortHours > 0
          ? Number(p.actualUsedEffortHours)
          : (p.tasks || [])
              .filter((t) => t.status === "Completed")
              .reduce((s, t) => s + (t.actualUsedHours || t.hours || 0), 0);
      return sum + act;
    }, 0)
    .toFixed(0);

  // Collect unique project types and complexities for filters
  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(plans.map((p) => p.projectType).filter(Boolean)));
  }, [plans]);

  const uniqueComplexities = useMemo(() => {
    return Array.from(new Set(plans.map((p) => p.complexity).filter(Boolean)));
  }, [plans]);

  const hasActiveFilters = search.trim() !== "" || typeFilter !== "ALL" || complexityFilter !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setComplexityFilter("ALL");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── TOP KPI STRIP (3 EFFORT DIMENSIONS & PORTFOLIO METRICS) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Active Plans */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Active Project Plans
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FolderKanban size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{totalPlans}</span>
            <span className="text-xs font-semibold text-gray-500">
              Plans ({totalModules} Modules)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Across active clients & companies
          </p>
        </div>

        {/* KPI 2: Estimated Effort */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-purple-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Total Estimated Effort
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{totalEstHours}h</span>
            <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
              Auto-Assigned
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Algorithmic scope workload total
          </p>
        </div>

        {/* KPI 3: Allocated Effort */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-sky-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Allocated Squad Capacity
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-700">{totalAllocHours}h</span>
            <span className="rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-bold text-sky-700">
              8h / Day / Member
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Squad production scheduling capacity
          </p>
        </div>

        {/* KPI 4: Actual Used Effort */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Actual Completed Effort
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{totalActualHours}h</span>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Burned
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Verified finished work tasks
          </p>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project, code, company, or client..."
              className="h-9 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Project Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Project Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Complexity Filter */}
          <select
            value={complexityFilter}
            onChange={(e) => setComplexityFilter(e.target.value)}
            className="h-9 rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Complexities</option>
            {uniqueComplexities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              <X size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">
            Showing <strong>{filteredPlans.length}</strong> of {totalPlans} Plans
          </span>
        </div>
      </div>

      {/* ── PLANS CARDS GRID ── */}
      {filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center space-y-4 shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <FolderKanban size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">No project plans found</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm">
              {plans.length === 0
                ? "Get started by generating your first courseware project plan with parametric resource estimations."
                : "No plans matched your filter criteria. Try clearing search or filters."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {plans.length === 0 ? (
              <>
                {onOpenAIPlanner && (
                  <button
                    onClick={onOpenAIPlanner}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:from-purple-500 hover:to-indigo-500 transition cursor-pointer"
                  >
                    <Sparkles size={15} className="text-purple-200" />
                    <span>AI Smart Planner</span>
                  </button>
                )}
                <button
                  onClick={onNewPlan}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-500 transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Create Project Plan</span>
                </button>
              </>
            ) : (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-500 transition cursor-pointer"
              >
                <X size={15} />
                <span>Clear Active Filters</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlans.map((plan) => {
            const pName = plan.project?.name || "eLearning Project";
            const pCode = plan.project?.code;
            const cName = plan.company?.name || "Company";
            const estHours = Number(plan.estimatedEffortHours) || 0;
            const allocHours = Number(plan.allocatedEffortHours) || 0;
            const actualHours =
              plan.actualUsedEffortHours !== undefined && plan.actualUsedEffortHours !== null && plan.actualUsedEffortHours > 0
                ? Number(plan.actualUsedEffortHours)
                : Number(
                    (plan.tasks || [])
                      .filter((t) => t.status === "Completed")
                      .reduce((sum, t) => sum + (t.actualUsedHours || t.hours || 0), 0)
                      .toFixed(1)
                  ) || 0;
            const completedCount = (plan.tasks || []).filter((t) => t.status === "Completed").length;
            const totalTasks = (plan.tasks || []).length;
            const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
            const teamMembersCount = (plan.assignedTeam || []).length;
            const isSyncing = syncingPlanId === plan._id;

            return (
              <div
                key={plan._id}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 overflow-hidden group"
              >
                <div>
                  {/* Card Top: Badges & Company */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-gray-600">
                      <Building2 size={13} className="text-blue-600 shrink-0" />
                      <span className="truncate max-w-[150px]">{cName}</span>
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {plan.startPhaseName && !plan.startPhaseName.toLowerCase().includes("phase 1") && (
                        <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700" title={`Starts at ${plan.startPhaseName}`}>
                          Starts: {plan.startPhaseName.split("—")[1] || plan.startPhaseName}
                        </span>
                      )}
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                        {plan.projectType}
                      </span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {plan.complexity}
                      </span>
                    </div>
                  </div>

                  {/* Project Title & Client */}
                  <div className="mt-3.5">
                    <h3
                      onClick={() => onSelectPlan && onSelectPlan(plan._id, "gantt")}
                      className="text-base font-extrabold text-gray-900 group-hover:text-blue-600 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="truncate">{pName}</span>
                      {pCode && <span className="text-xs font-semibold text-gray-400 shrink-0">({pCode})</span>}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Client: <strong className="text-gray-700">{plan.clientName || "Enterprise Client"}</strong>
                    </p>
                  </div>

                  {/* Schedule Details Strip */}
                  <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Timeline
                      </span>
                      <span className="font-extrabold text-gray-800">
                        {plan.totalWorkingDays || 0} Working Days
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {CalendarEngine.formatDisplayDate(plan.startDate)} →{" "}
                        {CalendarEngine.formatDisplayDate(plan.calculatedEndDate)}
                      </p>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Courseware Specs
                      </span>
                      <span className="font-extrabold text-gray-800">
                        {plan.moduleCount || 1} Mods • {plan.courseLengthMinutes || 60}m
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {teamMembersCount} Squad Member{teamMembersCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* 3 Effort Dimensions Micro-Grid */}
                  <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-purple-50/60 border border-purple-100 p-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700 block">
                        Estimated
                      </span>
                      <span className="text-sm font-black text-purple-800 block">
                        {estHours}h
                      </span>
                    </div>

                    <div className="rounded-lg bg-sky-50/60 border border-sky-100 p-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-sky-700 block">
                        Allocated
                      </span>
                      <span className="text-sm font-black text-sky-800 block">
                        {allocHours}h
                      </span>
                    </div>

                    <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 block">
                        Burned
                      </span>
                      <span className="text-sm font-black text-emerald-800 block">
                        {actualHours}h
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-700">
                        Scope Progress
                      </span>
                      <span className="text-xs font-extrabold text-blue-600">
                        {progress}% ({completedCount}/{totalTasks} tasks)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer: View Launchers & Quick Actions */}
                <div className="mt-4 border-t border-gray-100 pt-3 space-y-2.5">
                  {/* Row 1: Primary View Launchers Grid (Full Width, Balanced 3 Columns) */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onOpenView && onOpenView(plan._id, "gantt")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                      title="Open Gantt Timeline"
                    >
                      <CalendarRange size={13} className="shrink-0" />
                      <span>Timeline</span>
                    </button>

                    <button
                      onClick={() => onOpenView && onOpenView(plan._id, "pipeline")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                      title="Open Production Pipeline Flow"
                    >
                      <BarChart3 size={13} className="text-purple-600 shrink-0" />
                      <span>Pipeline</span>
                    </button>

                    <button
                      onClick={() => onOpenView && onOpenView(plan._id, "wbs")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                      title="Open Task Breakdown Grid"
                    >
                      <ListTodo size={13} className="text-emerald-600 shrink-0" />
                      <span>Tasks</span>
                    </button>
                  </div>

                  {/* Row 2: Lead PM & Action Icons */}
                  <div className="flex items-center justify-between pt-0.5 text-[11px] text-gray-500">
                    <span className="truncate max-w-[170px] text-gray-500 font-medium">
                      Lead: <strong className="text-gray-700">{plan.projectManager?.name || "Unassigned"}</strong>
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <ExportPlanDropdown plan={plan} variant="icon" align="right" />

                      <button
                        onClick={() => onEditPlan && onEditPlan(plan)}
                        className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer"
                        title="Edit Plan Setup"
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        onClick={() => onSyncTasks && onSyncTasks(plan)}
                        disabled={isSyncing}
                        className="rounded-lg border border-blue-200 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                        title="Sync Tasks to Employees"
                      >
                        <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                      </button>

                      <button
                        onClick={() => onDeletePlan && onDeletePlan(plan)}
                        className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition cursor-pointer"
                        title="Delete Plan"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
