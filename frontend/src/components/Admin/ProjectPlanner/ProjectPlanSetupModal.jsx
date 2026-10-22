import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Layers,
  Sliders,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Building2,
  FolderKanban,
  User,
  Plus,
  RotateCcw,
} from "lucide-react";
import { api } from "../../../api.js";
import { PROJECT_TYPE_COMPLEXITIES, DEFAULT_COMPLEXITY_CONFIG } from "../../../plannerEngine/complexityConfig.js";
import { DEFAULT_TEMPLATES } from "../../../plannerEngine/defaultTemplates.js";
import { EstimationEngine } from "../../../plannerEngine/estimationEngine.js";
import { CalendarEngine } from "../../../plannerEngine/calendarEngine.js";
import { SchedulerEngine } from "../../../plannerEngine/schedulerEngine.js";
import { getNextProjectCode, getCompanyPrefix } from "../../../utils/projectCodeGenerator.js";

const getUserId = (u) => {
  if (!u) return "";
  const raw = typeof u === "object" ? (u._id || u.id) : u;
  return raw ? String(raw) : "";
};

export default function ProjectPlanSetupModal({
  isOpen,
  onClose,
  onSave,
  companies = [],
  categories = [],
  projects = [],
  users = [],
  auth,
  initialPlan = null,
  modalMode = "create",
  complexityConfig = DEFAULT_COMPLEXITY_CONFIG,
  onOpenComplexityAdjuster,
}) {
  const isEditing = modalMode === "edit" && Boolean(initialPlan && initialPlan.project);

  // Form states
  const [companyId, setCompanyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [liveProjects, setLiveProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");

  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState("storyline-360");
  const [complexity, setComplexity] = useState("Level 2");
  const [startPhaseId, setStartPhaseId] = useState("");
  const [startDate, setStartDate] = useState(() => CalendarEngine.toISODate(new Date()));
  const [courseLengthMinutes, setCourseLengthMinutes] = useState(60);
  const [moduleCount, setModuleCount] = useState(4);
  const [parallelPipelining, setParallelPipelining] = useState(true);
  const [includeHld, setIncludeHld] = useState(false);
  const [projectManagerId, setProjectManagerId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());

  // Live fetch projects whenever companyId or categoryId changes
  useEffect(() => {
    setLiveProjects([]);
    if (!isOpen || !companyId) {
      return;
    }

    let isMounted = true;
    setLoadingProjects(true);

    let url = `/api/projects?company=${companyId}`;
    if (categoryId) {
      url += `&category=${categoryId}`;
    }

    api(url, { token: auth?.token })
      .then((res) => {
        if (isMounted && Array.isArray(res)) {
          setLiveProjects(
            [...res].sort((a, b) =>
              (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
            )
          );
        }
      })
      .catch((err) => {
        console.error("Error loading company projects in modal:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingProjects(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, companyId, categoryId, auth?.token]);

  // Combine live fetched projects with projects passed in props (fallback)
  const availableCompanyProjects = useMemo(() => {
    if (!companyId) return [];
    let list = [];
    if (liveProjects.length > 0) {
      list = [...liveProjects];
    } else {
      list = projects.filter((p) => {
        const pCompId = typeof p.company === "object" ? p.company?._id : p.company;
        const matchComp = String(pCompId) === String(companyId);
        if (!matchComp) return false;
        if (!categoryId) return true;
        const pCatId = typeof p.category === "object" ? p.category?._id : p.category;
        return String(pCatId) === String(categoryId);
      });
    }

    // Preserve the initial project if editing or already chosen, so the dropdown doesn't blank
    if (initialPlan?.project) {
      const initProj = initialPlan.project;
      const initProjId = typeof initProj === "object" ? initProj?._id : initProj;
      const initCompId = typeof initialPlan.company === "object" ? initialPlan.company?._id : initialPlan.company;
      if (!companyId || String(initCompId) === String(companyId)) {
        const alreadyInList = list.some((p) => String(p._id) === String(initProjId));
        if (!alreadyInList && initProjId) {
          const fallbackObj =
            typeof initProj === "object"
              ? initProj
              : { _id: initProjId, name: initialPlan.projectName || "Selected Project" };
          list = [fallbackObj, ...list];
        }
      }
    }

    return list;
  }, [companyId, categoryId, liveProjects, projects, initialPlan]);

  // Available complexity levels for selected project type
  const availableComplexities = useMemo(() => {
    const cpxMap = complexityConfig?.projectTypeComplexities || PROJECT_TYPE_COMPLEXITIES;
    return cpxMap[projectType] || PROJECT_TYPE_COMPLEXITIES[projectType] || PROJECT_TYPE_COMPLEXITIES["storyline-360"] || [];
  }, [complexityConfig, projectType]);

  // Available phases for selected project type
  const availablePhases = useMemo(() => {
    const tpl = DEFAULT_TEMPLATES.find((t) => t.id === projectType) || DEFAULT_TEMPLATES[0];
    return tpl?.phases || [];
  }, [projectType]);

  // Strictly filter to active users only (never show inactive users)
  const activeUsers = useMemo(() => {
    return (users || []).filter((u) => u.status !== "inactive");
  }, [users]);

  // Categorize available users by designation / role category
  const categorizedUsers = useMemo(() => {
    const map = {
      PM: [],
      ID: [],
      DEVELOPER: [],
      ANIMATOR: [],
      DESIGNER: [],
      QA: [],
      VO: [],
      OTHER: [],
    };

    const normalizeCat = (roleOrDesig) => {
      const str = String(roleOrDesig || "").toUpperCase();
      if (str.includes("PM") || str.includes("MANAGER")) return "PM";
      if (str.includes("ID") || str.includes("INSTRUCTION") || str.includes("CONTENT")) return "ID";
      if (str.includes("ANIM") || str.includes("MOTION")) return "ANIMATOR";
      if (str.includes("DEV") || str.includes("AUTHOR") || str.includes("STORYLINE") || str.includes("RISE")) return "DEVELOPER";
      if (str.includes("DESIGN") || str.includes("GRAPHIC") || str.includes("VISUAL")) return "DESIGNER";
      if (str.includes("QA") || str.includes("TEST") || str.includes("QUALITY")) return "QA";
      if (str.includes("VO") || str.includes("VOICE") || str.includes("AUDIO")) return "VO";
      return "OTHER";
    };

    activeUsers.forEach((u) => {
      const cat = normalizeCat(u.designation || u.role);
      if (map[cat]) map[cat].push(u);
      else map.OTHER.push(u);
    });

    return map;
  }, [activeUsers]);

  // Pre-fill on open or edit
  useEffect(() => {
    if (!isOpen) return;

    if (initialPlan) {
      const cId = typeof initialPlan.company === "object" ? initialPlan.company?._id : (initialPlan.companyId || initialPlan.company);
      const pId = typeof initialPlan.project === "object" ? initialPlan.project?._id : (initialPlan.projectId || initialPlan.project);
      const isNew = Boolean(initialPlan.isCreatingNewProject || initialPlan.newProjectName || !pId);
      const catId = typeof initialPlan.project === "object"
        ? (initialPlan.project?.category?._id || initialPlan.project?.category || "")
        : (initialPlan.categoryId || "");

      setCompanyId(cId || (companies.length > 0 ? companies[0]._id : ""));
      setCategoryId(catId || "");
      setProjectId(pId || "");
      setIsCreatingNewProject(isNew);
      setNewProjectName(initialPlan.newProjectName || initialPlan.projectName || "");
      setNewProjectCode(initialPlan.newProjectCode || "");
      setClientName(initialPlan.clientName || "");
      setProjectType(initialPlan.projectType || "storyline-360");
      setComplexity(initialPlan.complexity || "Level 2");
      setStartPhaseId(initialPlan.startPhaseId || "");
      setStartDate(initialPlan.startDate || CalendarEngine.toISODate(new Date()));
      setCourseLengthMinutes(initialPlan.courseLengthMinutes || 60);
      setModuleCount(initialPlan.moduleCount || 4);
      setParallelPipelining(initialPlan.parallelPipelining !== false);
      setIncludeHld(Boolean(initialPlan.includeHld));
      const pmId = getUserId(initialPlan.projectManager);
      setProjectManagerId(pmId || "");

      const activeIds = new Set(activeUsers.map((u) => getUserId(u)));
      const userSet = new Set();
      (initialPlan.assignedTeam || []).forEach((tm) => {
        const uId = getUserId(tm.user || tm);
        if (uId && activeIds.has(uId)) userSet.add(uId);
      });
      setSelectedUserIds(userSet);
    } else {
      // Default new plan
      setCompanyId(companies.length > 0 ? companies[0]._id : "");
      setCategoryId("");
      setProjectId("");
      setIsCreatingNewProject(false);
      setNewProjectName("");
      setNewProjectCode("");
      setClientName("");
      setProjectType("storyline-360");
      setComplexity("Level 2");
      setStartPhaseId("");
      setStartDate(CalendarEngine.toISODate(new Date()));
      setCourseLengthMinutes(60);
      setModuleCount(4);
      setParallelPipelining(true);
      setIncludeHld(false);

      // Default select PM and start with empty squad selection (active users only)
      const pmUser = activeUsers.find((u) => (u.role === "admin" || (u.designation || "").toUpperCase().includes("PM")));
      setProjectManagerId(getUserId(pmUser) || getUserId(activeUsers[0]) || "");
      setSelectedUserIds(new Set());
    }
  }, [isOpen, modalMode, initialPlan, companies, activeUsers]);

  // Keep complexity and startPhase in sync when projectType changes
  useEffect(() => {
    if (availableComplexities.length > 0) {
      const exists = availableComplexities.some((c) => c.id === complexity || c.name === complexity);
      if (!exists) {
        setComplexity(availableComplexities[0].id || availableComplexities[0].name);
      }
    }
    if (availablePhases.length > 0) {
      const exists = availablePhases.some((p) => p.id === startPhaseId);
      if (!exists) {
        setStartPhaseId(availablePhases[0].id);
      }
    }
  }, [projectType, availableComplexities, availablePhases, startPhaseId]);

  // Helper to generate next project code for a company
  const generateCodeForCompany = (targetCompanyId = companyId, currentProjects = liveProjects) => {
    const targetId = targetCompanyId || companyId || (companies[0]?._id || "");
    const compObj = companies.find((c) => String(c._id) === String(targetId));
    const compName = compObj?.name || "";
    const allKnown = [...(projects || []), ...(currentProjects || [])];
    return getNextProjectCode(compName, allKnown);
  };

  // Toggle create new project with immediate automatic code generation
  const handleToggleNewProject = () => {
    const willBeNew = !isCreatingNewProject;
    setIsCreatingNewProject(willBeNew);
    setProjectId("");
    if (willBeNew) {
      const targetCId = companyId || (companies[0]?._id || "");
      if (!companyId && companies[0]?._id) {
        setCompanyId(companies[0]._id);
      }
      const code = generateCodeForCompany(targetCId);
      setNewProjectCode(code);
    }
  };

  // Force regenerate next code
  const handleRegenerateCode = () => {
    const targetCId = companyId || (companies[0]?._id || "");
    const code = generateCodeForCompany(targetCId);
    setNewProjectCode(code);
  };

  // When companyId changes and user is creating a new project, automatically update code to match company
  useEffect(() => {
    if (isCreatingNewProject && companyId) {
      const code = generateCodeForCompany(companyId);
      setNewProjectCode(code);
    }
  }, [companyId, isCreatingNewProject, companies]);

  // When liveProjects update, ensure code doesn't collide with existing project codes
  useEffect(() => {
    if (isCreatingNewProject && companyId && liveProjects.length > 0) {
      const compObj = companies.find((c) => String(c._id) === String(companyId));
      const prefix = getCompanyPrefix(compObj?.name || "");
      const isAutoPattern =
        !newProjectCode ||
        newProjectCode === "PRJ-001" ||
        new RegExp(`^${prefix}-\\d+`, "i").test(newProjectCode);

      if (isAutoPattern) {
        const code = generateCodeForCompany(companyId, liveProjects);
        setNewProjectCode(code);
      }
    }
  }, [liveProjects, isCreatingNewProject, companyId, companies]);

  // Live effort calculation preview
  const livePreview = useMemo(() => {
    try {
      const selectedUsersList = activeUsers.filter((u) => selectedUserIds.has(getUserId(u)));
      const pmUser = activeUsers.find((u) => getUserId(u) === String(projectManagerId));

      const tempSchedule = SchedulerEngine.generateSchedule({
        projectId: "preview",
        projectName: "Preview",
        projectType,
        complexity,
        startPhaseId,
        courseLengthMinutes: Number(courseLengthMinutes) || 60,
        moduleCount: Number(moduleCount) || 4,
        startDate,
        projectManager: pmUser,
        assignedTeam: selectedUsersList.map((u) => ({
          ...u,
          roleCategory: u.roleCategory || u.designation || "DEVELOPER",
          dailyHours: 7,
        })),
        complexityConfig,
        includeHld,
      });

      return {
        breakdown: tempSchedule.estimation,
        totalHours: tempSchedule.estimatedEffortHours,
        totalWorkingDays: tempSchedule.totalWorkingDays,
        endDate: tempSchedule.calculatedEndDate,
        teamCount: selectedUsersList.length,
        startPhaseName: tempSchedule.startPhaseName,
      };
    } catch (e) {
      return { totalHours: 0, totalWorkingDays: 0, endDate: startDate, teamCount: 0, startPhaseName: "" };
    }
  }, [
    projectType,
    courseLengthMinutes,
    moduleCount,
    complexity,
    startPhaseId,
    startDate,
    includeHld,
    projectManagerId,
    selectedUserIds,
    complexityConfig,
    activeUsers,
  ]);

  const toggleUserSelection = (userId) => {
    const idStr = String(userId || "").trim();
    if (!idStr || idStr === "undefined" || idStr === "null") return;
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(idStr)) next.delete(idStr);
      else next.add(idStr);
      return next;
    });
  };

  const handleSelectAllTeam = () => {
    setSelectedUserIds(new Set(activeUsers.map((u) => getUserId(u)).filter(Boolean)));
  };

  const handleClearTeam = () => {
    setSelectedUserIds(new Set());
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!companyId) {
      alert("Please select a company.");
      return;
    }

    if (!isCreatingNewProject && !projectId) {
      alert("Please select an existing project or choose to create a new one.");
      return;
    }

    if (isCreatingNewProject && !newProjectName.trim()) {
      alert("Please provide a name for the new project.");
      return;
    }

    const selectedUsersList = activeUsers.filter((u) => selectedUserIds.has(getUserId(u)));
    const pmUser = activeUsers.find((u) => getUserId(u) === String(projectManagerId));
    const selectedExistingProject = availableCompanyProjects.find((p) => String(p._id) === String(projectId));
    const finalProjectName = isCreatingNewProject
      ? newProjectName.trim()
      : selectedExistingProject?.name || initialPlan?.project?.name || "";

    onSave({
      isEditing,
      companyId,
      categoryId: categoryId || null,
      projectId: isCreatingNewProject ? null : projectId,
      projectName: finalProjectName,
      newProjectName: isCreatingNewProject ? newProjectName.trim() : null,
      newProjectCode: isCreatingNewProject ? (newProjectCode.trim() || generateCodeForCompany(companyId)) : null,
      clientName: clientName.trim(),
      projectType,
      complexity,
      startPhaseId,
      startDate,
      courseLengthMinutes: Number(courseLengthMinutes) || 60,
      moduleCount: Number(moduleCount) || 4,
      parallelPipelining,
      includeHld,
      projectManager: pmUser,
      assignedTeam: selectedUsersList,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden my-6">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {isEditing ? "Edit Project Plan Parameters" : "Create New Project Plan"}
              </h3>
              <p className="text-xs text-gray-500">
                Setup parametric schedule, dynamic complexity level, and assigned team squad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* ROW 1: COMPANY, CATEGORY & COMPANY PROJECT */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* 1. Company Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Building2 size={13} className="text-blue-500" />
                <span>Company *</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => {
                  const newCId = e.target.value;
                  setCompanyId(newCId);
                  setProjectId("");
                  if (isCreatingNewProject) {
                    const code = generateCodeForCompany(newCId);
                    setNewProjectCode(code);
                  }
                }}
                required
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Category Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Layers size={13} className="text-purple-500" />
                <span>Category</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setProjectId("");
                  if (isCreatingNewProject && (!newProjectCode || newProjectCode === "PRJ-001")) {
                    const code = generateCodeForCompany(companyId);
                    setNewProjectCode(code);
                  }
                }}
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Categories (Optional Filter)</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Company Project Selection / Create New */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <FolderKanban size={13} className="text-emerald-500" />
                  <span>Company Project *</span>
                </label>
                <button
                  type="button"
                  onClick={handleToggleNewProject}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  {isCreatingNewProject ? (
                    "Choose Existing"
                  ) : (
                    <>
                      <Plus size={13} className="text-blue-600" />
                      <span>New Project</span>
                    </>
                  )}
                </button>
              </div>

              {!isCreatingNewProject ? (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={!companyId}
                  required
                  className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!companyId
                      ? "Select Company first..."
                      : loadingProjects
                      ? "Loading projects..."
                      : availableCompanyProjects.length === 0
                      ? "No projects found (Click '+ New Project')"
                      : `Select Project (${availableCompanyProjects.length} available)`}
                  </option>
                  {availableCompanyProjects.map((p) => {
                    const catName = p.category?.name || "";
                    return (
                      <option key={p._id} value={p._id}>
                        {p.name} {p.code ? `(${p.code})` : ""} {catName ? `• ${catName}` : ""}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Project Name * (e.g. Compliance Training)"
                      required
                      className="h-10 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={newProjectCode}
                        onChange={(e) => setNewProjectCode(e.target.value.toUpperCase())}
                        placeholder="Code (e.g. PRJ-001)"
                        title="Auto-generated project code. You can edit or click regenerate."
                        className="h-10 w-36 rounded-xl border border-blue-200 bg-blue-50/40 pl-3 pr-8 text-xs font-bold text-blue-700 uppercase outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono tracking-wide"
                      />
                      <button
                        type="button"
                        onClick={handleRegenerateCode}
                        title="Regenerate project code based on company"
                        className="absolute right-2.5 text-gray-400 hover:text-blue-600 transition cursor-pointer p-0.5 rounded hover:bg-blue-100"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-gray-500">
                      Project will be created under selected Company &amp; Category
                    </span>
                    <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Auto Code: {newProjectCode || "Generating..."}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ROW 2: CLIENT NAME & PROJECT TYPE */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Health Corp"
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Project Type (Workflow Template)
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="storyline-360">Storyline 360 Course</option>
                <option value="rise-360">Rise 360 Course</option>
                <option value="mp4-video">MP4 Video Output</option>
                <option value="pdf-graphic">PDF/Graphic Output</option>
              </select>
            </div>
          </div>

          {/* ROW 3: COMPLEXITY LEVEL & STARTING PHASE */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Project Complexity Level
                </label>
                {onOpenComplexityAdjuster && (
                  <button
                    type="button"
                    onClick={() => onOpenComplexityAdjuster(projectType)}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    <Sliders size={12} />
                    <span>Adjust Rates</span>
                  </button>
                )}
              </div>
              <select
                value={complexity}
                onChange={(e) => setComplexity(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {availableComplexities.map((c) => (
                  <option key={c.id || c.name} value={c.id || c.name}>
                    {c.name} {c.effortMultiplier ? `(${c.effortMultiplier}x)` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Plan Starting Phase
              </label>
              <select
                value={startPhaseId}
                onChange={(e) => setStartPhaseId(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {availablePhases.map((ph) => (
                  <option key={ph.id} value={ph.id}>
                    {ph.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ROW 4: START DATE, SEAT TIME & MODULE COUNT */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Project Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Seat Time (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="600"
                step="5"
                value={courseLengthMinutes}
                onChange={(e) => setCourseLengthMinutes(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Number of Modules
              </label>
              <input
                type="number"
                min="1"
                max="20"
                step="1"
                value={moduleCount}
                onChange={(e) => setModuleCount(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* ROW 5: LEAD PROJECT MANAGER & PARALLEL PIPELINING */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Lead Project Manager
              </label>
              <select
                value={projectManagerId}
                onChange={(e) => setProjectManagerId(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Select Project Manager (Optional) --</option>
                {activeUsers.map((u) => {
                  const uId = getUserId(u);
                  return (
                    <option key={uId} value={uId}>
                      {u.name} ({u.designation || u.role})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex flex-col justify-center gap-2 pt-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={parallelPipelining}
                  onChange={(e) => setParallelPipelining(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Parallel Pipelining Across Modules</span>
              </label>

              {projectType === "storyline-360" && (
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-purple-700 select-none">
                  <input
                    type="checkbox"
                    checked={includeHld}
                    onChange={(e) => setIncludeHld(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Enable Phase 4 Conditional HLD Prototype (HLD / CS HLD)</span>
                </label>
              )}
            </div>
          </div>

          {/* ROW 6: SQUAD TEAM ASSIGNMENT BY ROLE */}
          <div className="space-y-2.5 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <span>Assign Team Members to Project</span>
                  <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
                    {selectedUserIds.size} of {activeUsers.length} selected
                  </span>
                </h4>
                <p className="text-[11px] text-gray-500">
                  Select squad members for this project. Click any card to select or unselect.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllTeam}
                  className="rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearTeam}
                  className="rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* List by categories */}
            <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
              {Object.entries(categorizedUsers).map(([catKey, userList]) => {
                if (userList.length === 0) return null;
                return (
                  <div key={catKey} className="space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400">
                      {catKey === "DEVELOPER"
                        ? "Course Developers"
                        : catKey === "ID"
                        ? "Instructional Designers"
                        : catKey === "ANIMATOR"
                        ? "Motion Animators"
                        : catKey === "DESIGNER"
                        ? "Visual Designers"
                        : catKey === "QA"
                        ? "QA Specialists"
                        : catKey === "PM"
                        ? "Project Managers"
                        : "Team Specialists"}
                    </span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {userList.map((u) => {
                        const uId = getUserId(u);
                        const isSelected = selectedUserIds.has(uId);
                        return (
                          <div
                            key={uId}
                            onClick={() => toggleUserSelection(uId)}
                            className={`flex items-center gap-2 rounded-xl border p-2 cursor-pointer transition select-none ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 text-blue-900 shadow-xs ring-1 ring-blue-500"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              tabIndex={-1}
                              className="pointer-events-none h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold leading-tight">{u.name}</p>
                              <p className="truncate text-[10px] text-gray-400 leading-tight">
                                {u.designation || "Specialist"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROW 7: LIVE EFFORT & SCHEDULE PREVIEW CARD */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-600" />
                Live Effort & Schedule Preview
              </span>
              <span className="text-sm font-extrabold text-blue-700">
                {livePreview.totalHours} Total Hours
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between text-xs text-gray-600">
              <span>
                Estimated Schedule: <strong className="text-gray-900">{livePreview.totalWorkingDays} Work Days</strong>
              </span>
              <span>
                Projected Delivery:{" "}
                <strong className="text-gray-900">{CalendarEngine.formatDisplayDate(livePreview.endDate)}</strong>
              </span>
              <span>
                Assigned Team: <strong className="text-gray-900">{livePreview.teamCount} Members</strong>
              </span>
            </div>
            {livePreview.startPhaseName && !livePreview.startPhaseName.toLowerCase().includes("phase 1") && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1">
                <span>⚡ Starting from {livePreview.startPhaseName}:</span>
                <span className="font-normal text-indigo-600">Preceding phases excluded — total effort & delivery timeline reduced accordingly.</span>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-500 transition cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>{isEditing ? "Save Plan Updates" : "Generate Complete Plan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
