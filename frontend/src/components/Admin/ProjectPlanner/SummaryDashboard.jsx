import React from "react";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { CalendarEngine } from "../../../plannerEngine/calendarEngine.js";
import ExportPlanDropdown from "./ExportPlanDropdown.jsx";

export default function SummaryDashboard({ project }) {
  if (!project) return null;

  const est = project.estimation || {
    hours: {
      grandTotalHours: 0,
      totalIdHours: 0,
      totalDeveloperHours: 0,
      totalAnimatorHours: 0,
      totalQaHours: 0,
      totalVdHours: 0,
      totalPmHours: 0,
    },
  };

  const tasks = project.tasks || [];
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const estimatedHours =
    project.estimatedEffortHours !== undefined
      ? project.estimatedEffortHours
      : est.hours.grandTotalHours || 0;
  const allocatedHours = project.allocatedEffortHours !== undefined ? project.allocatedEffortHours : 0;
  const actualUsedHours =
    project.actualUsedEffortHours !== undefined
      ? project.actualUsedEffortHours
      : Number(
          tasks
            .filter((t) => t.status === "Completed")
            .reduce((sum, t) => sum + (t.actualUsedHours || t.hours || 0), 0)
            .toFixed(1)
        );

  const actualUsedPercent =
    estimatedHours > 0 ? Math.round((actualUsedHours / estimatedHours) * 100) : 0;

  // Extract pipeline stages from active project phases
  const stageMap = new Map();
  (project.phases || []).forEach((ph) => {
    let baseName = ph.name.replace(/\s*\(Module\s*\d+\)/i, "").trim();
    if (!stageMap.has(baseName)) {
      stageMap.set(baseName, {
        name: baseName,
        taskIds: [...(ph.taskIds || [])],
        phaseIds: [ph.id],
      });
    } else {
      const existing = stageMap.get(baseName);
      existing.taskIds.push(...(ph.taskIds || []));
      existing.phaseIds.push(ph.id);
    }
  });

  const pipelineStages = Array.from(stageMap.values()).map((stage, idx) => {
    const stageTasks = tasks.filter(
      (t) =>
        stage.taskIds.includes(t.id) ||
        stage.phaseIds.includes(t.phaseId) ||
        (t.phaseName && t.phaseName.startsWith(stage.name))
    );
    const stageEstHours = Number(
      stageTasks.reduce((sum, t) => sum + (t.hours || 0), 0).toFixed(1)
    );
    const stageAllocHours = Number(
      stageTasks.reduce((sum, t) => sum + (t.allocatedHours || 0), 0).toFixed(1)
    );
    const stageCompleted = stageTasks.filter((t) => t.status === "Completed").length;
    const stageTotal = stageTasks.length;
    const isComplete = stageTotal > 0 && stageCompleted === stageTotal;
    const isInProgress =
      stageTasks.some((t) => t.status === "In Progress" || t.status === "Completed") && !isComplete;

    const roleSet = new Set();
    stageTasks.forEach((t) => {
      if (t.roleCategory) roleSet.add(t.roleCategory);
    });

    const rolesSummary =
      Array.from(roleSet)
        .map((r) => {
          if (r === "ID") return "Instructional Designer";
          if (r === "DEVELOPER") return "Developer";
          if (r === "ANIMATOR") return "Motion Animator";
          if (r === "DESIGNER") return "Visual Designer";
          if (r === "QA") return "QA Specialist";
          if (r === "PM") return "Project Manager";
          if (r === "VO") return "Voiceover";
          return r;
        })
        .slice(0, 2)
        .join(" & ") || "Specialist Squad";

    return {
      stepNum: idx + 1,
      name: stage.name,
      rolesSummary,
      estimatedHours: stageEstHours,
      allocatedHours: stageAllocHours,
      completedCount: stageCompleted,
      totalCount: stageTotal,
      isComplete,
      isInProgress,
    };
  });

  // Calculate role distribution stats
  const roleMetrics = [
    { key: "ID", label: "Instructional Design", est: est.hours.totalIdHours || 0, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    { key: "DEVELOPER", label: "Course Development", est: est.hours.totalDeveloperHours || 0, color: "text-sky-700 bg-sky-50 border-sky-200" },
    { key: "ANIMATOR", label: "Motion Animation", est: est.hours.totalAnimatorHours || 0, color: "text-purple-700 bg-purple-50 border-purple-200" },
    { key: "DESIGNER", label: "Visual Design", est: est.hours.totalVdHours || 0, color: "text-amber-700 bg-amber-50 border-amber-200" },
    { key: "QA", label: "Quality Assurance", est: est.hours.totalQaHours || 0, color: "text-rose-700 bg-rose-50 border-rose-200" },
    { key: "PM", label: "Project Management", est: est.hours.totalPmHours || 0, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  ].filter((r) => r.est > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── TOP KPI METRIC CARDS (3 EFFORT DIMENSIONS) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Project Timeline */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3 hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Project Timeline
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Calendar size={18} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-gray-900">
              {CalendarEngine.formatDisplayDate(project.startDate)}
            </span>
            <span className="text-blue-600 font-bold">➔</span>
            <span className="text-sm font-extrabold text-emerald-600">
              {CalendarEngine.formatDisplayDate(project.calculatedEndDate)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 font-bold border border-blue-100">
              {project.totalWorkingDays || 0} Work Days
            </span>
            <span>•</span>
            <span>{project.totalCalendarDays || project.totalWorkingDays} Cal. Days</span>
          </div>
        </div>

        {/* 2. Estimated Efforts (Auto-Assigned) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3 hover:border-purple-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Estimated Efforts
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Clock size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">
              {estimatedHours}h
            </span>
            <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
              Auto-Assigned
            </span>
          </div>
          <div className="flex flex-wrap gap-1 text-[11px] font-semibold text-gray-500">
            {est.hours.totalIdHours > 0 && <span>ID: <strong className="text-emerald-700">{est.hours.totalIdHours}h</strong> • </span>}
            {est.hours.totalDeveloperHours > 0 && <span>Dev: <strong className="text-sky-700">{est.hours.totalDeveloperHours}h</strong> • </span>}
            {est.hours.totalAnimatorHours > 0 && <span>Ani: <strong className="text-purple-700">{est.hours.totalAnimatorHours}h</strong> • </span>}
            {est.hours.totalQaHours > 0 && <span>QA: <strong className="text-rose-700">{est.hours.totalQaHours}h</strong></span>}
          </div>
        </div>

        {/* 3. Allocated Efforts (8h/resource/day capacity) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3 hover:border-sky-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Allocated Squad Capacity
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Users size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-700">
              {allocatedHours}h
            </span>
            <span className="rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-bold text-sky-700">
              8h / Day / Member
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Based on <strong>{project.assignedTeam?.length || 1} squad members</strong> across {project.totalWorkingDays || 0} days
          </p>
        </div>

        {/* 4. Actual Used Efforts & Completion */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3 hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Actual Used Efforts
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">
              {actualUsedHours}h
            </span>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              {actualUsedPercent}% Scope Burned
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Completed: <strong>{completedTasks} / {tasks.length}</strong> tasks</span>
            <span className="text-emerald-600 font-bold">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* ── PARALLEL PRODUCTION PIPELINING FLOW SECTION ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span>Parallel eLearning Production Pipelining Flow</span>
                {project.startPhaseName && (
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    Starts at: {project.startPhaseName.split("—")[1] || project.startPhaseName}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                Pipelined stage progression across {pipelineStages.length} phases with milestone gates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <span className="text-xs font-semibold text-gray-500">
              Pipeline Burn: <strong className="text-emerald-700">{actualUsedHours}h / {estimatedHours}h</strong> ({actualUsedPercent}%)
            </span>
            <div className="h-2.5 w-28 overflow-hidden rounded-full bg-gray-100 border border-gray-200 hidden sm:block">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${Math.min(100, actualUsedPercent)}%` }}
              />
            </div>
            <ExportPlanDropdown plan={project} variant="compact" label="Export KPIs" align="right" />
          </div>
        </div>

        {/* Pipeline Stage Cards Ribbon */}
        <div className="flex items-stretch gap-2.5 overflow-x-auto pb-3 pt-1">
          {pipelineStages.map((stage, sIdx) => {
            return (
              <React.Fragment key={stage.stepNum}>
                <div
                  className={`min-w-[210px] max-w-[240px] flex-shrink-0 rounded-xl border p-4 space-y-2.5 transition flex flex-col justify-between ${
                    stage.isComplete
                      ? "border-emerald-300 bg-emerald-50/40 shadow-xs"
                      : stage.isInProgress
                      ? "border-blue-400 bg-blue-50/40 ring-1 ring-blue-400 shadow-xs"
                      : "border-gray-200 bg-gray-50/70"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                          stage.isComplete
                            ? "bg-emerald-600 text-white"
                            : stage.isInProgress
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {stage.stepNum}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          stage.isComplete
                            ? "text-emerald-700"
                            : stage.isInProgress
                            ? "text-blue-700"
                            : "text-gray-400"
                        }`}
                      >
                        {stage.isComplete
                          ? "Completed"
                          : stage.isInProgress
                          ? "In Progress"
                          : "Queued"}
                      </span>
                    </div>

                    <h4 className="mt-2 text-xs font-extrabold text-gray-900 line-clamp-2">
                      {stage.name}
                    </h4>

                    <p className="mt-1 text-[11px] text-gray-500 line-clamp-1">
                      {stage.rolesSummary}
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 pt-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
                      <span className="rounded bg-white px-1.5 py-0.5 border border-gray-200">
                        {stage.estimatedHours}h Est.
                      </span>
                      <span className="rounded bg-sky-50 px-1.5 py-0.5 border border-sky-200 text-sky-700">
                        {stage.allocatedHours}h Alloc.
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-500 font-bold flex items-center justify-between">
                      <span>Tasks:</span>
                      <span className={stage.isComplete ? "text-emerald-700" : "text-gray-700"}>
                        {stage.completedCount}/{stage.totalCount} completed
                      </span>
                    </div>
                  </div>
                </div>

                {sIdx < pipelineStages.length - 1 && (
                  <div className="flex items-center justify-center px-1 text-gray-300">
                    <ArrowRight size={16} className={stage.isComplete ? "text-emerald-500" : "text-gray-300"} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── ROLE EFFORT ALLOCATION BREAKDOWN ── */}
      {roleMetrics.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h3 className="text-base font-extrabold text-gray-900">
              Specialist Squad Role Effort Breakdown
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {roleMetrics.map((rm) => (
              <div
                key={rm.key}
                className={`rounded-xl border p-3.5 space-y-1.5 ${rm.color}`}
              >
                <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                  {rm.key}
                </span>
                <span className="text-xl font-black block">
                  {rm.est}h
                </span>
                <span className="text-[11px] font-medium block truncate">
                  {rm.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
