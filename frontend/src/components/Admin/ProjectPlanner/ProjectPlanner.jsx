import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarRange,
  Plus,
  Sliders,
  Layers,
  BarChart3,
  ListTodo,
  RefreshCw,
  Trash2,
  Edit3,
  Building2,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LayoutDashboard,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { api } from "../../../api.js";
import { SchedulerEngine } from "../../../plannerEngine/schedulerEngine.js";
import { DEFAULT_COMPLEXITY_CONFIG } from "../../../plannerEngine/complexityConfig.js";
import { CalendarEngine } from "../../../plannerEngine/calendarEngine.js";

import GanttChart from "./GanttChart.jsx";
import SummaryDashboard from "./SummaryDashboard.jsx";
import TaskTable from "./TaskTable.jsx";
import ProjectPlanSetupModal from "./ProjectPlanSetupModal.jsx";
import PlansDashboard from "./PlansDashboard.jsx";
import SmartPlannerModal from "./SmartPlannerModal.jsx";
import ExportPlanDropdown from "./ExportPlanDropdown.jsx";

const PROJECT_VIEWS = [
  { key: "gantt", label: "Gantt Timeline", icon: CalendarRange },
  { key: "pipeline", label: "Production Pipelining & KPI", icon: BarChart3 },
  { key: "wbs", label: "Task Breakdown Grid (WBS)", icon: ListTodo },
];

/**
 * Lightweight serializer to prevent PayloadTooLargeError when saving large multi-module plans.
 * Strips heavy nested populated objects (full user profiles, redundant permissions, etc.)
 * keeping the payload extremely compact (~15-30 KB instead of megabytes).
 */
function sanitizePlanPayload(plan) {
  if (!plan) return {};

  const cleanAssignedTeam = Array.isArray(plan.assignedTeam)
    ? plan.assignedTeam.map((tm) => {
        const u = tm.user;
        const userId = typeof u === "object" && u ? (u._id || u.id) : u;
        return {
          user: userId,
          name: tm.name || (typeof u === "object" ? u?.name : ""),
          email: tm.email || (typeof u === "object" ? u?.email : ""),
          roleCategory: tm.roleCategory || "",
          designation: tm.designation || "",
          dailyHours: Number(tm.dailyHours) || 7,
        };
      })
    : [];

  const cleanTasks = Array.isArray(plan.tasks)
    ? plan.tasks.map((t) => {
        let cleanAssignedResource = null;
        if (t.assignedResource) {
          if (typeof t.assignedResource === "string") {
            cleanAssignedResource = t.assignedResource;
          } else {
            const rawId = t.assignedResource._id || t.assignedResource.id || t.assignedResource.user;
            cleanAssignedResource = {
              id: rawId ? String(rawId) : undefined,
              name: t.assignedResource.name || "",
              roleCategory: t.assignedResource.roleCategory || t.roleCategory || "",
            };
          }
        }

        let cleanAssignedResources = [];
        if (Array.isArray(t.assignedResources)) {
          cleanAssignedResources = t.assignedResources.map((r) => {
            if (typeof r === "string") return r;
            const rId = r._id || r.id || r.user;
            return {
              id: rId ? String(rId) : undefined,
              name: r.name || "",
              roleCategory: r.roleCategory || "",
            };
          });
        }

        return {
          id: t.id,
          name: t.name,
          phaseId: t.phaseId,
          phaseName: t.phaseName,
          role: t.role,
          roleCategory: t.roleCategory,
          assignedResource: cleanAssignedResource,
          assignedResources: cleanAssignedResources,
          startDate: t.startDate,
          endDate: t.endDate,
          durationWorkingDays: Number(t.durationWorkingDays) || 1,
          hours: Number(t.hours) || 0,
          allocatedHours: Number(t.allocatedHours) || 0,
          actualUsedHours: Number(t.actualUsedHours) || 0,
          dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
          status: t.status || "Not Started",
          isMilestone: Boolean(t.isMilestone),
          isClientTask: Boolean(t.isClientTask),
          isManualOverride: Boolean(t.isManualOverride),
          criticalPath: Boolean(t.criticalPath),
          slack: Number(t.slack) || 0,
        };
      })
    : [];

  const cleanPhases = Array.isArray(plan.phases)
    ? plan.phases.map((ph) => ({
        id: ph.id,
        name: ph.name,
        taskIds: Array.isArray(ph.taskIds) ? ph.taskIds : [],
      }))
    : [];

  const pmId =
    plan.projectManager?._id ||
    plan.projectManager?.id ||
    (typeof plan.projectManager === "string" ? plan.projectManager : null);

  return {
    projectId: plan.projectId || plan.project?._id || plan.project,
    companyId: plan.companyId || plan.company?._id || plan.company,
    clientName: plan.clientName || "",
    projectType: plan.projectType || "storyline-360",
    complexity: plan.complexity || "Level 2",
    startPhaseId: plan.startPhaseId || null,
    startPhaseName: plan.startPhaseName || null,
    startDate: plan.startDate,
    calculatedEndDate: plan.calculatedEndDate,
    courseLengthMinutes: Number(plan.courseLengthMinutes) || 60,
    moduleCount: Number(plan.moduleCount) || 4,
    parallelPipelining: plan.parallelPipelining !== undefined ? Boolean(plan.parallelPipelining) : true,
    includeHld: Boolean(plan.includeHld),
    totalWorkingDays: Number(plan.totalWorkingDays) || 0,
    totalCalendarDays: Number(plan.totalCalendarDays) || 0,
    nonWorkingDays: Number(plan.nonWorkingDays) || 0,
    estimatedEffortHours: Number(plan.estimatedEffortHours) || 0,
    allocatedEffortHours: Number(plan.allocatedEffortHours) || 0,
    actualUsedEffortHours: Number(plan.actualUsedEffortHours) || 0,
    projectManager: pmId,
    assignedTeam: cleanAssignedTeam,
    phases: cleanPhases,
    tasks: cleanTasks,
    manualOverrides: plan.manualOverrides || {},
    complexityConfig: plan.complexityConfig || null,
  };
}

export default function ProjectPlanner({ auth, onOpenComplexityTab }) {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");

  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [complexityConfig, setComplexityConfig] = useState(DEFAULT_COMPLEXITY_CONFIG);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [setupInitialPlan, setSetupInitialPlan] = useState(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [syncingTasks, setSyncingTasks] = useState(false);
  const [syncingPlanId, setSyncingPlanId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Load plans and master data
  const loadInitialData = useCallback(async () => {
    if (!auth?.token) return;
    setLoading(true);

    try {
      const [plansRes, compRes, catRes, projRes, usersRes, cpxRes] = await Promise.all([
        api("/api/project-plans", { token: auth.token }).catch(() => []),
        api("/api/companies", { token: auth.token }).catch(() => []),
        api("/api/categories", { token: auth.token }).catch(() => []),
        api("/api/projects", { token: auth.token }).catch(() => []),
        api("/api/users?status=active", { token: auth.token }).catch(() => []),
        api("/api/project-plans/config/complexity", { token: auth.token }).catch(() => null),
      ]);

      const validPlans = Array.isArray(plansRes) ? plansRes : [];
      setPlans(validPlans);
      setCompanies(
        (Array.isArray(compRes) ? compRes : []).sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        )
      );
      setCategories(
        (Array.isArray(catRes) ? catRes : []).sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        )
      );
      setProjects(Array.isArray(projRes) ? projRes : []);
      setUsers(
        (Array.isArray(usersRes) ? usersRes : []).filter((u) => u.status !== "inactive")
      );

      if (cpxRes && cpxRes.config) {
        const mergedComplexities = {};
        const defaultMap = DEFAULT_COMPLEXITY_CONFIG.projectTypeComplexities || {};
        const serverMap = cpxRes.config.projectTypeComplexities || {};

        for (const key of Object.keys(defaultMap)) {
          const defLevels = defaultMap[key] || [];
          const srvLevels = serverMap[key] || [];
          const merged = [...srvLevels];
          defLevels.forEach((defLvl, idx) => {
            const exists = merged.some((sl) => sl.id === defLvl.id || sl.name === defLvl.name);
            if (!exists) {
              merged.splice(idx, 0, defLvl);
            }
          });
          mergedComplexities[key] = merged;
        }

        setComplexityConfig({
          ...DEFAULT_COMPLEXITY_CONFIG,
          ...cpxRes.config,
          projectTypeComplexities: mergedComplexities,
        });
      }

      // By default on initial load, show portfolio dashboard without auto-selecting a single project
      setCurrentPlan(null);
      setActiveView("dashboard");
    } catch (err) {
      console.error("Failed to load planner data:", err);
    } finally {
      setLoading(false);
    }
  }, [auth?.token]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle plan selection change
  const handleSelectPlan = (planId) => {
    const selected = plans.find((p) => p._id === planId);
    if (selected) {
      setCurrentPlan(selected);
      if (activeView === "dashboard") {
        setActiveView("gantt");
      }
    }
  };

  // Save / generate plan from modal
  const handleSavePlanSetup = async (formData) => {
    if (!auth?.token) return;
    setLoading(true);

    try {
      let targetProjectId = formData.projectId;

      // 1. If creating a new project, create it in backend first
      if (!targetProjectId && formData.newProjectName) {
        const assignedCat = formData.categoryId || categories[0]?._id;

        const newProjRes = await api("/api/projects", {
          method: "POST",
          token: auth.token,
          body: {
            name: formData.newProjectName,
            code: formData.newProjectCode || "",
            company: formData.companyId,
            category: assignedCat,
          },
        });

        if (newProjRes && newProjRes._id) {
          targetProjectId = newProjRes._id;
          // Refresh projects list
          const updatedProjects = await api("/api/projects", { token: auth.token }).catch(() => []);
          setProjects(updatedProjects);
        } else {
          throw new Error("Failed to create new project record");
        }
      }

      const matchedProj = projects.find((p) => String(p._id) === String(targetProjectId));
      const targetProjectName =
        formData.newProjectName ||
        formData.projectName ||
        matchedProj?.name ||
        currentPlan?.project?.name ||
        "eLearning Project";

      // 2. Generate mathematical schedule using SchedulerEngine
      const generated = SchedulerEngine.generateSchedule({
        projectId: String(targetProjectId),
        projectName: targetProjectName,
        clientName: formData.clientName,
        projectType: formData.projectType,
        complexity: formData.complexity,
        startPhaseId: formData.startPhaseId,
        courseLengthMinutes: formData.courseLengthMinutes,
        moduleCount: formData.moduleCount,
        startDate: formData.startDate,
        projectManager: formData.projectManager,
        assignedTeam: (formData.assignedTeam || []).map((u) => ({
          user: u._id || u.id,
          name: u.name,
          email: u.email,
          roleCategory: u.roleCategory || u.designation || "DEVELOPER",
          designation: u.designation,
          dailyHours: 7,
        })),
        complexityConfig,
        existingTasks: formData.isEditing ? (currentPlan?.tasks || []) : [],
        includeHld: Boolean(formData.includeHld),
      });

      // 3. Persist plan to backend (POST /api/project-plans)
      const payload = sanitizePlanPayload({
        projectId: targetProjectId,
        companyId: formData.companyId,
        clientName: formData.clientName,
        projectType: formData.projectType,
        complexity: formData.complexity,
        startPhaseId: formData.startPhaseId || generated.startPhaseId,
        startPhaseName: generated.startPhaseName,
        startDate: generated.startDate,
        calculatedEndDate: generated.calculatedEndDate,
        courseLengthMinutes: formData.courseLengthMinutes,
        moduleCount: formData.moduleCount,
        parallelPipelining: formData.parallelPipelining,
        includeHld: Boolean(formData.includeHld),
        totalWorkingDays: generated.totalWorkingDays,
        totalCalendarDays: generated.totalCalendarDays,
        nonWorkingDays: generated.nonWorkingDays,
        estimatedEffortHours: generated.estimatedEffortHours,
        allocatedEffortHours: generated.allocatedEffortHours,
        actualUsedEffortHours: generated.actualUsedEffortHours,
        projectManager: formData.projectManager?._id || formData.projectManager?.id || (typeof formData.projectManager === 'string' ? formData.projectManager : null),
        assignedTeam: generated.assignedTeam,
        phases: generated.phases,
        tasks: generated.tasks,
        manualOverrides: generated.manualOverrides || {},
        complexityConfig,
      });

      const savedPlan = await api("/api/project-plans", {
        method: "POST",
        token: auth.token,
        body: payload,
      });

      setIsModalOpen(false);
      showToast("Project plan generated and synced to employee tasks successfully!");

      // Refresh plans list
      const refreshedPlans = await api("/api/project-plans", { token: auth.token }).catch(() => []);
      setPlans(refreshedPlans);
      const match = refreshedPlans.find((p) => p.project?._id === targetProjectId || p._id === savedPlan._id);
      const selectedPlan = match || savedPlan;
      setCurrentPlan(selectedPlan);
      setActiveView("gantt");
    } catch (err) {
      console.error("Save plan setup error:", err);
      alert(`Error saving project plan: ${err.message || "Please check inputs."}`);
    } finally {
      setLoading(false);
    }
  };

  // Sync tasks for specific or current plan
  const handleSyncTasks = async (targetPlan = null) => {
    const planToSync = targetPlan || currentPlan;
    if (!planToSync?._id || !auth?.token) return;
    setSyncingTasks(true);
    setSyncingPlanId(planToSync._id);
    try {
      const res = await api(`/api/project-plans/${planToSync._id}/sync-tasks`, {
        method: "POST",
        token: auth.token,
      });
      if (res?.ok) {
        showToast(
          `Synced ${res.createdCount || 0} new and ${res.updatedCount || 0} existing tasks for "${
            planToSync.project?.name || "Project"
          }" to employee dashboard!`
        );
      }
    } catch (err) {
      console.error("Sync tasks error:", err);
      alert("Failed to sync tasks.");
    } finally {
      setSyncingTasks(false);
      setSyncingPlanId(null);
    }
  };

  // Switch to specific plan and open a chosen view (e.g. from PlansDashboard card)
  const handleOpenPlanView = (planId, viewKey = "gantt") => {
    const match = plans.find((p) => p._id === planId);
    if (match) {
      setCurrentPlan(match);
    }
    setActiveView(viewKey);
  };

  // Return to portfolio dashboard
  const handleBackToDashboard = () => {
    setCurrentPlan(null);
    setActiveView("dashboard");
  };

  // Update single task status in current plan
  const handleTaskStatusChange = async (taskId, newStatus) => {
    if (!currentPlan || !Array.isArray(currentPlan.tasks)) return;

    const updatedTasks = currentPlan.tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );

    const updatedPlan = {
      ...currentPlan,
      tasks: updatedTasks,
    };

    setCurrentPlan(updatedPlan);

    // Save update to backend in background
    try {
      await api("/api/project-plans", {
        method: "POST",
        token: auth.token,
        body: sanitizePlanPayload({
          ...updatedPlan,
          projectId: updatedPlan.project?._id || updatedPlan.project,
          companyId: updatedPlan.company?._id || updatedPlan.company,
        }),
      });
    } catch (err) {
      console.warn("Background plan status update failed:", err);
    }
  };

  // Delete specific or current plan
  const handleDeletePlan = async (targetPlan = null) => {
    const planToDelete = targetPlan || currentPlan;
    if (!planToDelete?._id || !auth?.token) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the plan for "${planToDelete.project?.name || "Project"}"?`
    );
    if (!confirmDelete) return;

    try {
      await api(`/api/project-plans/${planToDelete._id}`, {
        method: "DELETE",
        token: auth.token,
      });

      showToast("Project plan deleted successfully.");
      const updated = plans.filter((p) => p._id !== planToDelete._id);
      setPlans(updated);
      if (currentPlan?._id === planToDelete._id) {
        setCurrentPlan(null);
        setActiveView("dashboard");
      }
    } catch (err) {
      console.error("Delete plan error:", err);
      alert("Failed to delete project plan.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER CONTROL BAR ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {activeView === "dashboard" || !currentPlan ? (
            /* Left: Dashboard Title */
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100 shadow-2xs">
                <CalendarRange size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  Project Plans Dashboard
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select any project below to inspect its Gantt Timeline, Production Pipeline, or Task Breakdown
                </p>
              </div>
            </div>
          ) : (
            /* Left: Active Project with Back to Dashboard Button */
            <div className="flex items-center gap-3 min-w-0 flex-wrap sm:flex-nowrap">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              >
                <ArrowLeft size={14} />
                <span>Back to Plans Dashboard</span>
              </button>

              <div className="h-6 w-px bg-gray-200 hidden sm:block shrink-0" />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-1.5 truncate">
                    <span className="truncate">{currentPlan.project?.name || "Project Plan"}</span>
                    {currentPlan.project?.code && (
                      <span className="text-xs font-semibold text-gray-400 shrink-0">({currentPlan.project.code})</span>
                    )}
                  </h2>
                  {currentPlan.company?.name && (
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-md px-2 py-0.5 shrink-0">
                      {currentPlan.company.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {currentPlan.clientName ? `Client: ${currentPlan.clientName} • ` : ""}
                  {currentPlan.projectType} • {currentPlan.complexity} complexity
                </p>
              </div>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            {activeView === "dashboard" || !currentPlan ? (
              <>
                <button
                  onClick={onOpenComplexityTab}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Sliders size={13} className="text-blue-600" />
                  <span>Complexity Rates & Ratios</span>
                </button>

                <button
                  onClick={() => setIsAIModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs hover:from-purple-500 hover:to-indigo-500 transition cursor-pointer whitespace-nowrap"
                  title="Generate courseware schedule with AI prompt"
                >
                  <Sparkles size={14} className="text-purple-200" />
                  <span>AI Smart Planner</span>
                </button>

                <button
                  onClick={() => {
                    setSetupInitialPlan(null);
                    setModalMode("create");
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-500 transition cursor-pointer whitespace-nowrap"
                >
                  <Plus size={15} />
                  <span>New Project Plan</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsAIModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:from-purple-500 hover:to-indigo-500 transition cursor-pointer whitespace-nowrap"
                  title="Generate courseware plan with AI prompt"
                >
                  <Sparkles size={13} className="text-purple-200" />
                  <span>AI Planner</span>
                </button>

                <ExportPlanDropdown plan={currentPlan} variant="primary" label="Download Plan" />

                <button
                  onClick={() => {
                    setSetupInitialPlan(currentPlan);
                    setModalMode("edit");
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Edit3 size={13} />
                  <span>Edit Plan</span>
                </button>

                <button
                  onClick={() => handleSyncTasks()}
                  disabled={syncingTasks}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer shadow-xs whitespace-nowrap"
                  title="Push tasks to employee task list"
                >
                  <RefreshCw size={13} className={syncingTasks ? "animate-spin" : ""} />
                  <span>Sync Tasks</span>
                </button>

                <button
                  onClick={() => handleDeletePlan()}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer shadow-xs whitespace-nowrap"
                  title="Delete Plan"
                >
                  <Trash2 size={13} />
                </button>

                <button
                  onClick={() => {
                    setSetupInitialPlan(null);
                    setModalMode("create");
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-500 transition cursor-pointer whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>New Plan</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* PLANS PILLS SWITCHER (Clean button pills if multiple plans, shown inside active project views) */}
        {plans.length > 1 && activeView !== "dashboard" && currentPlan && (
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mr-1">
              Switch Project:
            </span>
            {plans.map((p) => {
              const isSelected = currentPlan?._id === p._id;
              return (
                <button
                  key={p._id}
                  onClick={() => handleSelectPlan(p._id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 border-blue-300 text-blue-700 shadow-xs"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p.project?.name || "Project"} ({p.company?.name || "Company"})
                </button>
              );
            })}
          </div>
        )}

        {/* ACTIVE PROJECT DETAILS RIBBON (Shown when inside a plan view) */}
        {currentPlan && activeView !== "dashboard" && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 text-xs text-gray-600">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold text-gray-900">
                <FolderKanban size={14} className="text-blue-600" />
                {currentPlan.project?.name} {currentPlan.project?.code ? `(${currentPlan.project.code})` : ""}
              </span>

              {currentPlan.company?.name && (
                <span className="flex items-center gap-1 text-gray-500 font-medium">
                  <Building2 size={13} />
                  {currentPlan.company.name}
                </span>
              )}

              {currentPlan.clientName && (
                <span className="text-gray-500">
                  Client: <strong className="text-gray-700">{currentPlan.clientName}</strong>
                </span>
              )}

              <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                {currentPlan.projectType}
              </span>

              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                {currentPlan.complexity}
              </span>

              {currentPlan.startPhaseName && !currentPlan.startPhaseName.toLowerCase().includes("phase 1") && (
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  Starts: {currentPlan.startPhaseName.split("—")[1] || currentPlan.startPhaseName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
              <span>Timeline: <strong className="text-gray-800">{currentPlan.totalWorkingDays}</strong> Working Days</span>
              <span>•</span>
              <span>Effort: <strong className="text-gray-800">{currentPlan.estimatedEffortHours}h</strong> Total</span>
            </div>
          </div>
        )}
      </div>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xs animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── PROJECT VIEW TABS (ONLY shown when inside a specific project view!) ── */}
      {activeView !== "dashboard" && currentPlan && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-xs">
            {PROJECT_VIEWS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                  activeView === key
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onOpenComplexityTab}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            <Sliders size={13} />
            <span>Adjust Complexity Rates & Ratios</span>
          </button>
        </div>
      )}

      {/* ── ACTIVE VIEW CONTENT ── */}
      {activeView === "dashboard" || !currentPlan ? (
        <PlansDashboard
          plans={plans}
          onSelectPlan={(id, v) => handleOpenPlanView(id, v || "gantt")}
          onOpenView={(id, v) => handleOpenPlanView(id, v)}
          onNewPlan={() => {
            setSetupInitialPlan(null);
            setModalMode("create");
            setIsModalOpen(true);
          }}
          onOpenAIPlanner={() => setIsAIModalOpen(true)}
          onEditPlan={(plan) => {
            setCurrentPlan(plan);
            setSetupInitialPlan(plan);
            setModalMode("edit");
            setIsModalOpen(true);
          }}
          onSyncTasks={(plan) => handleSyncTasks(plan)}
          onDeletePlan={(plan) => handleDeletePlan(plan)}
          onOpenComplexityTab={onOpenComplexityTab}
          syncingPlanId={syncingPlanId}
        />
      ) : (
        <div>
          {activeView === "gantt" && (
            <GanttChart
              project={currentPlan}
              onEditTask={(task) => {}}
            />
          )}

          {activeView === "pipeline" && (
            <SummaryDashboard project={currentPlan} />
          )}

          {activeView === "wbs" && (
            <TaskTable
              project={currentPlan}
              onStatusChange={handleTaskStatusChange}
            />
          )}
        </div>
      )}

      {/* SETUP / EDIT MODAL */}
      <ProjectPlanSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlanSetup}
        companies={companies}
        categories={categories}
        projects={projects}
        users={users}
        auth={auth}
        modalMode={modalMode}
        initialPlan={modalMode === "edit" ? currentPlan : setupInitialPlan}
        complexityConfig={complexityConfig}
        onOpenComplexityAdjuster={() => {
          setIsModalOpen(false);
          if (onOpenComplexityTab) onOpenComplexityTab();
        }}
      />

      {/* AI SMART PLANNER MODAL */}
      <SmartPlannerModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSavePlan={(planData) => {
          setIsAIModalOpen(false);
          handleSavePlanSetup(planData);
        }}
        onOpenDetailedSetup={(parsedData) => {
          setIsAIModalOpen(false);
          setSetupInitialPlan(parsedData);
          setModalMode("create");
          setIsModalOpen(true);
        }}
        companies={companies}
        categories={categories}
        projects={projects}
        users={users}
        complexityConfig={complexityConfig}
      />
    </div>
  );
}
