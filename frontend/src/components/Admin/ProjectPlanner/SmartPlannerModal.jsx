import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles,
  X,
  Calendar,
  Clock,
  Layers,
  Users,
  User,
  CheckCircle2,
  Building2,
  FolderKanban,
  Sliders,
  ArrowRight,
  ShieldAlert,
  Crown,
  Trash2,
  Plus,
  Play,
  RotateCcw,
  Check,
} from "lucide-react";
import { EstimationEngine } from "../../../plannerEngine/estimationEngine.js";
import { SchedulerEngine } from "../../../plannerEngine/schedulerEngine.js";
import { DEFAULT_TEMPLATES } from "../../../plannerEngine/defaultTemplates.js";
import { CalendarEngine } from "../../../plannerEngine/calendarEngine.js";
import {
  DEFAULT_COMPLEXITY_CONFIG,
  PROJECT_TYPE_COMPLEXITIES,
} from "../../../plannerEngine/complexityConfig.js";
import { getNextProjectCode } from "../../../utils/projectCodeGenerator.js";

const ROLE_OPTIONS = [
  { key: "ID", label: "Instructional Designer", badgeBg: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "DEVELOPER", label: "eLearning Developer", badgeBg: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "ANIMATOR", label: "Motion / 2D Animator", badgeBg: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "DESIGNER", label: "Graphic / UI Designer", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "QA", label: "Quality Assurance", badgeBg: "bg-rose-50 text-rose-700 border-rose-200" },
];

export default function SmartPlannerModal({
  isOpen,
  onClose,
  onSavePlan,
  onOpenDetailedSetup,
  companies = [],
  categories = [],
  projects = [],
  users = [],
  complexityConfig = DEFAULT_COMPLEXITY_CONFIG,
}) {
  const [prompt, setPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedPlan, setParsedPlan] = useState(null);
  const [userToAddId, setUserToAddId] = useState("");

  // Filter only active users
  const activeUsers = useMemo(() => {
    return (users || []).filter((u) => u.status !== "inactive");
  }, [users]);

  // Build example prompts dynamically using real user names if available
  const samplePrompts = useMemo(() => {
    const pmUser = activeUsers.find(
      (u) =>
        String(u.role || "").toLowerCase() === "admin" ||
        String(u.designation || "").toLowerCase().includes("manager") ||
        String(u.designation || "").toLowerCase().includes("lead")
    ) || activeUsers[0];

    const teamUsers = activeUsers.filter((u) => u._id !== pmUser?._id);
    const idUser =
      teamUsers.find((u) =>
        String(u.designation || "").toLowerCase().includes("instruction") ||
        String(u.designation || "").toLowerCase().includes("id")
      ) || teamUsers[0] || pmUser;

    const devUser =
      teamUsers.find(
        (u) =>
          u._id !== idUser?._id &&
          (String(u.designation || "").toLowerCase().includes("dev") ||
            String(u.designation || "").toLowerCase().includes("author"))
      ) || teamUsers[1] || teamUsers[0] || pmUser;

    const pmName = pmUser?.name ? pmUser.name.split(" ")[0] : "Rahul";
    const idName = idUser?.name ? idUser.name.split(" ")[0] : "Priya";
    const devName = devUser?.name ? devUser.name.split(" ")[0] : "Amit";

    return [
      {
        title: "Storyline (Level 2 + Squad)",
        text: `Create a Level 2 Storyline 360 project with 4 modules, 60 minutes total, starting next Monday. Assign ${pmName} as PM, ${idName} as ID, and ${devName} as Developer.`,
      },
      {
        title: "Rise 360 Microlearning",
        text: `Create an Interactive Rise 360 responsive course with 3 modules, 20 minutes total, starting today for client Enterprise Academy. Assign ${devName} as Developer.`,
      },
      {
        title: "High-End MP4 Motion Video",
        text: `Create a High End MP4 Video Output series with 4 modules, 40 minutes of motion graphics, starting next Monday. Assign ${pmName} as PM and ${devName} as Animator.`,
      },
      {
        title: "Interactive PDF Publication",
        text: `Create an Interactive PDF publication with 5 modules, 50 pages total, starting next Monday with ${idName} as ID.`,
      },
    ];
  }, [activeUsers]);

  // Natural Language Heuristic Parser
  const parsePromptText = useCallback(
    (text) => {
      const lower = text.toLowerCase();

      // 1. Detect Project Type
      let projectType = "storyline-360";
      if (lower.includes("rise")) {
        projectType = "rise-360";
      } else if (
        lower.includes("video") ||
        lower.includes("mp4") ||
        lower.includes("motion graphic") ||
        lower.includes("animation video")
      ) {
        projectType = "mp4-video";
      } else if (
        lower.includes("pdf") ||
        lower.includes("book") ||
        lower.includes("brochure") ||
        lower.includes("graphic output") ||
        lower.includes("document") ||
        lower.includes("flyer")
      ) {
        projectType = "pdf-graphic";
      }

      // 2. Detect Complexity Level
      let complexity = "Level 2";
      if (projectType === "storyline-360") {
        if (
          lower.includes("level 4") ||
          lower.includes("extreme") ||
          lower.includes("heavy animation") ||
          lower.includes("heavy anim")
        ) {
          complexity = "Level 4";
        } else if (
          lower.includes("level 3") ||
          lower.includes("high animation") ||
          lower.includes("rich animation") ||
          lower.includes("complex")
        ) {
          complexity = "Level 3";
        } else if (
          lower.includes("level 2.5") ||
          lower.includes("level 2,5") ||
          lower.includes("2.5")
        ) {
          complexity = "Level 2.5";
        } else if (
          lower.includes("level 1") ||
          lower.includes("low") ||
          lower.includes("basic") ||
          lower.includes("simple")
        ) {
          complexity = "Level 1";
        } else {
          complexity = "Level 2";
        }
      } else if (projectType === "rise-360") {
        if (lower.includes("custom") || lower.includes("bespoke")) {
          complexity = "Custom";
        } else if (
          lower.includes("basic") ||
          lower.includes("text + image") ||
          lower.includes("simple")
        ) {
          complexity = "Basic (Text + Image)";
        } else {
          complexity = "Interactive (Clickables + Activities)";
        }
      } else if (projectType === "mp4-video") {
        if (
          lower.includes("ai") ||
          lower.includes("ai powered") ||
          lower.includes("avatar")
        ) {
          complexity = "AI Powered (AI + Editing)";
        } else if (
          lower.includes("high end") ||
          lower.includes("motion graphics") ||
          lower.includes("motion graphic") ||
          lower.includes("after effects")
        ) {
          complexity = "High End (Motion Graphics)";
        } else if (
          lower.includes("custom animated") ||
          lower.includes("character")
        ) {
          complexity = "Custom Animated";
        } else {
          complexity = "Video Editing";
        }
      } else if (projectType === "pdf-graphic") {
        if (
          lower.includes("book") ||
          lower.includes("handbook") ||
          lower.includes("manual")
        ) {
          complexity = "Book";
        } else if (
          lower.includes("brochure") ||
          lower.includes("flyer") ||
          lower.includes("leaflet")
        ) {
          complexity = "Brochure";
        } else if (lower.includes("custom") || lower.includes("bespoke")) {
          complexity = "Custom designed";
        } else {
          complexity = "Interactive PDF";
        }
      }

      // 3. Detect Module Count
      let moduleCount = 4;
      const modMatch = lower.match(
        /(\d+)\s*(?:modules|module|mods|sections|chapters|units|parts|pages)/i
      );
      if (modMatch) {
        moduleCount = Math.max(1, parseInt(modMatch[1], 10));
      } else {
        // Words to numbers
        if (lower.includes("one module") || lower.includes("1 module")) moduleCount = 1;
        else if (lower.includes("two modules") || lower.includes("2 modules")) moduleCount = 2;
        else if (lower.includes("three modules") || lower.includes("3 modules")) moduleCount = 3;
        else if (lower.includes("four modules") || lower.includes("4 modules")) moduleCount = 4;
        else if (lower.includes("five modules") || lower.includes("5 modules")) moduleCount = 5;
        else if (lower.includes("six modules") || lower.includes("6 modules")) moduleCount = 6;
      }

      // 4. Detect Course Length / Duration in Minutes
      let courseLengthMinutes = 60;
      const minEachMatch = lower.match(
        /(\d+)\s*(?:minutes|mins|min|pages)\s*each/i
      );
      const totalMinMatch = lower.match(
        /(\d+)\s*(?:minutes|mins|min|pages)(?:\s*(?:total|overall|course|duration))?/i
      );
      const hourMatch = lower.match(/(\d+)\s*(?:hours|hour|hr|hrs)/i);

      if (minEachMatch) {
        courseLengthMinutes = Math.max(1, parseInt(minEachMatch[1], 10) * moduleCount);
      } else if (totalMinMatch) {
        courseLengthMinutes = Math.max(1, parseInt(totalMinMatch[1], 10));
      } else if (hourMatch) {
        courseLengthMinutes = Math.max(1, parseInt(hourMatch[1], 10) * 60);
      }

      // 5. Detect Start Date
      let startDate = CalendarEngine.toISODate(new Date());
      if (lower.includes("tomorrow")) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        startDate = CalendarEngine.toISODate(d);
      } else if (lower.includes("next monday") || lower.includes("starting monday")) {
        const d = new Date();
        const day = d.getDay();
        const daysUntilNextMon = (1 + 7 - day) % 7 || 7;
        d.setDate(d.getDate() + daysUntilNextMon);
        startDate = CalendarEngine.toISODate(d);
      } else {
        // Check for ISO date format (YYYY-MM-DD)
        const isoMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        if (isoMatch) {
          startDate = isoMatch[1];
        }
      }

      // 6. Starting Phase
      let startPhaseId = "";
      if (
        lower.includes("visual design") ||
        lower.includes("asset creation") ||
        lower.includes("ui design")
      ) {
        startPhaseId = "phase-visual-design";
      } else if (
        lower.includes("alpha dev") ||
        lower.includes("development & animation") ||
        lower.includes("starts at dev") ||
        lower.includes("dev phase") ||
        lower.includes("development")
      ) {
        startPhaseId = "phase-development";
      } else if (
        lower.includes("storyboard") ||
        lower.includes("content authoring") ||
        lower.includes("script dev") ||
        lower.includes("instructional")
      ) {
        startPhaseId = "phase-instructional-design";
      } else if (
        lower.includes("qa") ||
        lower.includes("testing") ||
        lower.includes("quality assurance")
      ) {
        startPhaseId = "phase-qa";
      } else if (
        lower.includes("client review") ||
        lower.includes("beta review")
      ) {
        startPhaseId = "phase-client-review";
      } else if (
        lower.includes("delivery") ||
        lower.includes("packaging") ||
        lower.includes("closure")
      ) {
        startPhaseId = "phase-delivery";
      }

      // 7. Detect Target Company
      let matchedCompany = companies[0] || null;
      for (const comp of companies) {
        if (comp.name && lower.includes(comp.name.toLowerCase())) {
          matchedCompany = comp;
          break;
        }
      }

      // 8. Detect Target Category
      let matchedCategory = categories[0] || null;
      for (const cat of categories) {
        if (cat.name && lower.includes(cat.name.toLowerCase())) {
          matchedCategory = cat;
          break;
        }
      }

      // 8b. Detect HLD Conditional Option
      const includeHld = /\b(hld|cs hld|concept slide|high[- ]level design|prototype)\b/i.test(text);

      // 9. Client Name
      let clientName = matchedCompany?.name || "Enterprise Client";
      const clientMatch = lower.match(/(?:for client|client:?)\s+([a-z0-9\s&]+?)(?:\.|\,|$|\n|with|starting)/i);
      if (clientMatch && clientMatch[1]?.trim()) {
        clientName = clientMatch[1].trim();
      }

      // 10. Project Name
      let projectName = "";
      const projNameMatch = text.match(/project\s*(?:named|called)?\s*[:=\-]?\s*["']([^"']+)["']/i);
      if (projNameMatch && projNameMatch[1]?.trim()) {
        projectName = projNameMatch[1].trim();
      } else {
        const typeLabels = {
          "storyline-360": "Storyline 360 Interactive Course",
          "rise-360": "Rise 360 Responsive Course",
          "mp4-video": "MP4 Motion Video Series",
          "pdf-graphic": "Interactive PDF Publication",
        };
        const baseTitle = typeLabels[projectType] || "eLearning Course";
        projectName = matchedCompany?.name ? `${matchedCompany.name} — ${baseTitle}` : baseTitle;
      }

      // 11. PERSON & TEAM DETECTION
      let detectedPM = null;
      const detectedTeamMap = new Map(); // userId -> { user, roleCategory }

      // Helper to check user name in prompt
      activeUsers.forEach((u) => {
        if (!u.name) return;
        const fullName = u.name.toLowerCase().trim();
        const firstName = u.name.split(/\s+/)[0]?.toLowerCase().trim();

        // Exact match or first-name boundary match (if >= 3 characters)
        const hasFullName = lower.includes(fullName);
        const hasFirstName =
          firstName &&
          firstName.length >= 3 &&
          new RegExp(`\\b${firstName}\\b`, "i").test(lower);

        if (hasFullName || hasFirstName) {
          // Find window around name
          const matchIdx = hasFullName ? lower.indexOf(fullName) : lower.indexOf(firstName);
          const startIdx = Math.max(0, matchIdx - 35);
          const endIdx = Math.min(lower.length, matchIdx + (hasFullName ? fullName.length : firstName.length) + 40);
          const contextWindow = lower.substring(startIdx, endIdx);

          // Check if designated as PM
          const isPM =
            contextWindow.includes("pm") ||
            contextWindow.includes("project manager") ||
            contextWindow.includes("manager") ||
            contextWindow.includes("lead") ||
            contextWindow.includes("pmo") ||
            contextWindow.includes("managed by");

          if (isPM && !detectedPM) {
            detectedPM = u;
          }

          // Check Role for Squad
          let roleCategory = "DEVELOPER";
          if (
            contextWindow.includes("id") ||
            contextWindow.includes("instructional") ||
            contextWindow.includes("storyboard") ||
            contextWindow.includes("content") ||
            contextWindow.includes("writer")
          ) {
            roleCategory = "ID";
          } else if (
            contextWindow.includes("animat") ||
            contextWindow.includes("motion") ||
            contextWindow.includes("after effects") ||
            contextWindow.includes("2d")
          ) {
            roleCategory = "ANIMATOR";
          } else if (
            contextWindow.includes("designer") ||
            contextWindow.includes("graphic") ||
            contextWindow.includes("visual") ||
            contextWindow.includes("ui")
          ) {
            roleCategory = "DESIGNER";
          } else if (
            contextWindow.includes("qa") ||
            contextWindow.includes("tester") ||
            contextWindow.includes("review") ||
            contextWindow.includes("qc")
          ) {
            roleCategory = "QA";
          } else if (
            contextWindow.includes("dev") ||
            contextWindow.includes("developer") ||
            contextWindow.includes("author") ||
            contextWindow.includes("programmer")
          ) {
            roleCategory = "DEVELOPER";
          } else {
            // Infer from user's designation
            const desig = (u.designation || "").toUpperCase();
            if (desig.includes("INSTRUCT") || desig.includes("ID")) roleCategory = "ID";
            else if (desig.includes("ANIM") || desig.includes("MOTION")) roleCategory = "ANIMATOR";
            else if (desig.includes("DESIGN") || desig.includes("GRAPHIC") || desig.includes("VISUAL")) roleCategory = "DESIGNER";
            else if (desig.includes("QA") || desig.includes("TEST")) roleCategory = "QA";
            else roleCategory = "DEVELOPER";
          }

          if (!detectedTeamMap.has(u._id)) {
            detectedTeamMap.set(u._id, { user: u, roleCategory });
          }
        }
      });

      // Default PM fallback if none explicitly mentioned
      if (!detectedPM) {
        const adminOrManager = activeUsers.find(
          (u) =>
            String(u.role || "").toLowerCase() === "admin" ||
            String(u.designation || "").toLowerCase().includes("manager") ||
            String(u.designation || "").toLowerCase().includes("lead")
        );
        detectedPM = adminOrManager || activeUsers[0] || null;
      }

      // If team map is empty, suggest 1 ID and 1 Developer
      if (detectedTeamMap.size === 0) {
        const idCand = activeUsers.find(
          (u) =>
            u._id !== detectedPM?._id &&
            (String(u.designation || "").toLowerCase().includes("instruction") ||
              String(u.designation || "").toLowerCase().includes("id"))
        ) || activeUsers[1] || activeUsers[0];

        const devCand = activeUsers.find(
          (u) =>
            u._id !== detectedPM?._id &&
            u._id !== idCand?._id &&
            (String(u.designation || "").toLowerCase().includes("dev") ||
              String(u.designation || "").toLowerCase().includes("author"))
        ) || activeUsers[2] || activeUsers[0];

        if (idCand) detectedTeamMap.set(idCand._id, { user: idCand, roleCategory: "ID" });
        if (devCand && devCand._id !== idCand?._id) {
          detectedTeamMap.set(devCand._id, { user: devCand, roleCategory: "DEVELOPER" });
        }
      }

      const assignedTeam = Array.from(detectedTeamMap.values());

      // 12. Calculate Breakdown and Schedule with Start Phase
      const breakdown = EstimationEngine.calculateBreakdown({
        projectType,
        courseLengthMinutes,
        moduleCount,
        complexity,
        complexityConfig,
      });

      const tempSchedule = SchedulerEngine.generateSchedule({
        projectId: "smart-preview",
        projectName,
        projectType,
        complexity,
        startPhaseId,
        includeHld,
        courseLengthMinutes,
        moduleCount,
        startDate,
        projectManager: detectedPM,
        assignedTeam: assignedTeam.map((t) => ({
          ...(t.user || t),
          roleCategory: t.roleCategory || t.user?.roleCategory,
          dailyHours: 7,
        })),
        complexityConfig,
      });

      return {
        projectName,
        clientName,
        companyId: matchedCompany?._id || "",
        categoryId: matchedCategory?._id || "",
        projectType,
        complexity,
        startPhaseId,
        includeHld,
        startPhaseName: tempSchedule.startPhaseName,
        courseLengthMinutes,
        moduleCount,
        startDate,
        projectManager: detectedPM,
        assignedTeam,
        parallelPipelining: true,
        breakdown: tempSchedule.estimation || breakdown,
        totalHours: tempSchedule.estimatedEffortHours,
        totalWorkingDays: tempSchedule.totalWorkingDays,
        endDate: tempSchedule.calculatedEndDate,
      };
    },
    [activeUsers, companies, categories, complexityConfig]
  );

  // Trigger analysis
  const handleAnalyzePrompt = (customText) => {
    const textToAnalyze = (typeof customText === "string" ? customText : prompt).trim();
    if (!textToAnalyze) {
      alert("Please enter a project description prompt to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      try {
        const result = parsePromptText(textToAnalyze);
        setParsedPlan(result);
      } catch (err) {
        console.error("AI Parser error:", err);
        alert("Failed to analyze prompt. Please refine your input.");
      } finally {
        setIsAnalyzing(false);
      }
    }, 250);
  };

  // Recalculate breakdown when parameters change in preview
  const recalculateBreakdown = (updated) => {
    const tempSchedule = SchedulerEngine.generateSchedule({
      projectId: "smart-preview",
      projectName: updated.projectName,
      projectType: updated.projectType,
      complexity: updated.complexity,
      startPhaseId: updated.startPhaseId,
      includeHld: Boolean(updated.includeHld),
      courseLengthMinutes: Number(updated.courseLengthMinutes) || 60,
      moduleCount: Number(updated.moduleCount) || 4,
      startDate: updated.startDate,
      projectManager: updated.projectManager,
      assignedTeam: (updated.assignedTeam || []).map((t) => ({
        ...(t.user || t),
        roleCategory: t.roleCategory || t.user?.roleCategory,
        dailyHours: 7,
      })),
      complexityConfig,
    });

    return {
      ...updated,
      breakdown: tempSchedule.estimation,
      totalHours: tempSchedule.estimatedEffortHours,
      totalWorkingDays: tempSchedule.totalWorkingDays,
      endDate: tempSchedule.calculatedEndDate,
      startPhaseName: tempSchedule.startPhaseName,
    };
  };

  // Team Squad manipulations
  const handleRemoveTeamMember = (userId) => {
    if (!parsedPlan) return;
    const filtered = parsedPlan.assignedTeam.filter((t) => t.user._id !== userId);
    setParsedPlan({ ...parsedPlan, assignedTeam: filtered });
  };

  const handleRoleChange = (userId, newRole) => {
    if (!parsedPlan) return;
    const updated = parsedPlan.assignedTeam.map((t) =>
      t.user._id === userId ? { ...t, roleCategory: newRole } : t
    );
    setParsedPlan({ ...parsedPlan, assignedTeam: updated });
  };

  const handleAddTeamMember = (userId) => {
    if (!parsedPlan || !userId) return;
    const candidate = activeUsers.find((u) => u._id === userId);
    if (!candidate) return;

    if (parsedPlan.assignedTeam.some((t) => t.user._id === userId)) {
      alert("User is already in assigned team squad.");
      return;
    }

    let defaultRole = "DEVELOPER";
    const desig = (candidate.designation || "").toUpperCase();
    if (desig.includes("INSTRUCT") || desig.includes("ID")) defaultRole = "ID";
    else if (desig.includes("ANIM") || desig.includes("MOTION")) defaultRole = "ANIMATOR";
    else if (desig.includes("DESIGN") || desig.includes("GRAPHIC")) defaultRole = "DESIGNER";
    else if (desig.includes("QA") || desig.includes("TEST")) defaultRole = "QA";

    setParsedPlan({
      ...parsedPlan,
      assignedTeam: [
        ...parsedPlan.assignedTeam,
        { user: candidate, roleCategory: defaultRole },
      ],
    });
    setUserToAddId("");
  };

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen && !prompt) {
      const defaultSample = samplePrompts[0]?.text || "";
      setPrompt(defaultSample);
      // Auto analyze the initial sample
      const initialParsed = parsePromptText(defaultSample);
      setParsedPlan(initialParsed);
    }
  }, [isOpen, prompt, samplePrompts, parsePromptText]);

  // Apply Plan Action
  const handleApply = () => {
    if (!parsedPlan) return;
    if (!parsedPlan.companyId) {
      alert("Please select a target company.");
      return;
    }
    if (!parsedPlan.projectName.trim()) {
      alert("Please provide a project name.");
      return;
    }

    const compObj = companies.find((c) => String(c._id) === String(parsedPlan.companyId));
    const compName = compObj?.name || "";
    const autoCode = getNextProjectCode(compName, projects || []);

    const payload = {
      projectId: null,
      newProjectName: parsedPlan.projectName.trim(),
      newProjectCode: parsedPlan.newProjectCode?.trim() || autoCode,
      companyId: parsedPlan.companyId,
      categoryId: parsedPlan.categoryId || categories[0]?._id,
      clientName: parsedPlan.clientName || "Enterprise Client",
      projectType: parsedPlan.projectType,
      complexity: parsedPlan.complexity,
      startPhaseId: parsedPlan.startPhaseId || "",
      includeHld: Boolean(parsedPlan.includeHld),
      courseLengthMinutes: Number(parsedPlan.courseLengthMinutes) || 60,
      moduleCount: Number(parsedPlan.moduleCount) || 4,
      startDate: parsedPlan.startDate,
      projectManager: parsedPlan.projectManager?._id || parsedPlan.projectManager,
      assignedTeam: (parsedPlan.assignedTeam || []).map((t) => ({
        _id: t.user._id,
        name: t.user.name,
        email: t.user.email,
        roleCategory: t.roleCategory,
        designation: t.user.designation,
      })),
      parallelPipelining: parsedPlan.parallelPipelining !== false,
    };

    onSavePlan(payload);
  };

  if (!isOpen) return null;

  const b = parsedPlan?.breakdown;
  const hoursPerDay = complexityConfig.hoursPerWorkingDay || 7;
  const totalDays = parsedPlan?.totalWorkingDays !== undefined
    ? parsedPlan.totalWorkingDays
    : (b ? Math.ceil((parsedPlan.totalHours || b.hours.grandTotalHours) / hoursPerDay) : 0);
  const totalEffortHours = parsedPlan?.totalHours !== undefined
    ? parsedPlan.totalHours
    : (b?.hours?.grandTotalHours || 0);

  const templatePhases = DEFAULT_TEMPLATES.find((t) => t.id === (parsedPlan?.projectType || 'storyline-360'))?.phases || DEFAULT_TEMPLATES[0].phases;
  const availableComplexities = useMemo(() => {
    const pType = parsedPlan?.projectType || 'storyline-360';
    const cpxMap = complexityConfig?.projectTypeComplexities || PROJECT_TYPE_COMPLEXITIES;
    return cpxMap[pType] || PROJECT_TYPE_COMPLEXITIES[pType] || PROJECT_TYPE_COMPLEXITIES['storyline-360'] || [];
  }, [complexityConfig, parsedPlan?.projectType]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden my-6">
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-purple-50/60 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 border border-purple-200 shadow-xs">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  AI-Assisted Smart Project Planner
                </h3>
                <span className="rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700">
                  NLP Automated
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Describe course scope, timeline, and team member assignments in natural language
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* PROMPT INPUT SECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-600" />
                <span>Enter Project Description Prompt</span>
              </label>
              <span className="text-[11px] text-gray-400">
                Mention modules, duration, complexity, company, PM & assigned team
              </span>
            </div>

            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a Level 2 Storyline 360 project with 4 modules, 60 minutes total, starting next Monday. Assign Rahul as PM, Priya as ID, and Amit as Developer."
              className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-xs text-gray-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition shadow-2xs leading-relaxed"
            />
          </div>

          {/* SAMPLE QUICK PROMPT BUTTONS */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Try Example Prompts:
            </span>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((sp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(sp.text);
                    handleAnalyzePrompt(sp.text);
                  }}
                  className="rounded-lg border border-purple-100 bg-purple-50/70 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition cursor-pointer shadow-2xs"
                >
                  {sp.title}
                </button>
              ))}
            </div>
          </div>

          {/* ANALYZE BUTTON */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleAnalyzePrompt()}
              disabled={isAnalyzing}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:from-purple-500 hover:to-indigo-500 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} className={isAnalyzing ? "animate-spin" : ""} />
              <span>{isAnalyzing ? "Analyzing Prompt..." : "Analyze & Generate Plan Preview"}</span>
            </button>

            {parsedPlan && (
              <button
                type="button"
                onClick={() => handleAnalyzePrompt(prompt)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Re-parse Prompt</span>
              </button>
            )}
          </div>

          {/* ── PARSED AI PREVIEW CARD ── */}
          {parsedPlan && b && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/20 p-5 space-y-5 animate-fade-in">
              {/* TOP STATUS HEADER */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={14} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">
                    AI Plan Proposal Ready for Review
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
                    {parsedPlan.projectType}
                  </span>
                  <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    {parsedPlan.complexity}
                  </span>
                </div>
              </div>

              {/* 4 SCOPE KPI CARDS */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Project Type
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-1 block truncate">
                    {parsedPlan.projectType}
                  </span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Scope / Modules
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-1 block">
                    {parsedPlan.moduleCount} Mods ({parsedPlan.courseLengthMinutes}m)
                  </span>
                </div>

                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">
                    Total Estimated Effort
                  </span>
                  <span className="text-xs font-extrabold text-purple-700 mt-1 block">
                    {totalEffortHours}h (~{totalDays} Days)
                  </span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Kickoff Start Date
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-1 block">
                    {CalendarEngine.formatDisplayDate(parsedPlan.startDate)}
                  </span>
                </div>
              </div>

              {/* PROJECT & COMPANY CONTROLS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                {/* Project Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                    <FolderKanban size={12} className="text-blue-500" />
                    <span>Project Name</span>
                  </label>
                  <input
                    type="text"
                    value={parsedPlan.projectName}
                    onChange={(e) =>
                      setParsedPlan({ ...parsedPlan, projectName: e.target.value })
                    }
                    className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-800 outline-none focus:border-purple-500"
                  />
                </div>

                {/* Company Selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                    <Building2 size={12} className="text-blue-500" />
                    <span>Target Company</span>
                  </label>
                  <select
                    value={parsedPlan.companyId}
                    onChange={(e) =>
                      setParsedPlan({ ...parsedPlan, companyId: e.target.value })
                    }
                    className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-purple-500"
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Client Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={parsedPlan.clientName}
                    onChange={(e) =>
                      setParsedPlan({ ...parsedPlan, clientName: e.target.value })
                    }
                    className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 outline-none focus:border-purple-500"
                  />
                </div>

                {/* Complexity Level */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                    <Sliders size={12} className="text-emerald-500" />
                    <span>Complexity</span>
                  </label>
                  <select
                    value={parsedPlan.complexity || "Level 2"}
                    onChange={(e) => {
                      const updated = { ...parsedPlan, complexity: e.target.value };
                      setParsedPlan(recalculateBreakdown(updated));
                    }}
                    className="h-9 w-full rounded-xl border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-800 outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {availableComplexities.map((c) => (
                      <option key={c.id || c.name} value={c.id || c.name}>
                        {c.name} {c.effortMultiplier ? `(${c.effortMultiplier}x)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Starting Phase Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                    <Sliders size={12} className="text-purple-500" />
                    <span>Starting Phase</span>
                  </label>
                  <select
                    value={parsedPlan.startPhaseId || (templatePhases[0]?.id || "")}
                    onChange={(e) => {
                      const updated = { ...parsedPlan, startPhaseId: e.target.value };
                      setParsedPlan(recalculateBreakdown(updated));
                    }}
                    className="h-9 w-full rounded-xl border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-800 outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {templatePhases.map((ph) => (
                      <option key={ph.id} value={ph.id}>
                        {ph.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional HLD Prototype Option for Storyline 360 */}
              {parsedPlan.projectType === "storyline-360" && (
                <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-gray-900 block">
                      Phase 4 Conditional HLD Prototype (HLD / CS HLD)
                    </span>
                    <span className="text-[11px] text-gray-500 block">
                      Enables Tasks 4.1 & 4.2 Concept Slide and Client HLD Approval Gate before full interaction authoring.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(parsedPlan.includeHld)}
                      onChange={(e) => {
                        const updated = { ...parsedPlan, includeHld: e.target.checked };
                        setParsedPlan(recalculateBreakdown(updated));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              )}

              {/* ── ASSIGNED TEAM & PERSON ASSIGNMENT (CORE CAPABILITY) ── */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                    <Users size={14} className="text-purple-600" />
                    <span>Assigned Team & Roles</span>
                    <span className="ml-1 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.2 text-[10px] text-purple-700">
                      {parsedPlan.assignedTeam.length} Member{parsedPlan.assignedTeam.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <span className="text-[11px] text-gray-400">
                    Auto-detected from prompt • Click role badge to customize
                  </span>
                </div>

                {/* Project Manager Selection */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/40 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Crown size={15} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-amber-900 block">
                        Designated Project Manager
                      </span>
                      <span className="text-[11px] text-amber-700">
                        Oversees kickoff, client deliverables & overall Gantt alignment
                      </span>
                    </div>
                  </div>

                  <select
                    value={parsedPlan.projectManager?._id || ""}
                    onChange={(e) => {
                      const found = activeUsers.find((u) => u._id === e.target.value);
                      setParsedPlan({ ...parsedPlan, projectManager: found || null });
                    }}
                    className="h-8 rounded-lg border border-amber-300 bg-white px-2.5 text-xs font-bold text-amber-900 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">No PM Assigned</option>
                    {activeUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.designation || u.role || "User"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Squad Members List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    Squad Production Members:
                  </span>

                  {parsedPlan.assignedTeam.length === 0 ? (
                    <div className="text-center py-3 text-xs text-gray-400 italic">
                      No team members assigned yet. Add members below.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {parsedPlan.assignedTeam.map((item) => {
                        const u = item.user;
                        const roleObj = ROLE_OPTIONS.find((r) => r.key === item.roleCategory) || ROLE_OPTIONS[1];

                        return (
                          <div
                            key={u._id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 hover:border-purple-300 transition"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 text-xs font-bold shrink-0">
                                {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-gray-800 block truncate">
                                  {u.name}
                                </span>
                                <span className="text-[10px] text-gray-400 block truncate">
                                  {u.designation || u.email}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Role Dropdown */}
                              <select
                                value={item.roleCategory}
                                onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                className={`h-7 rounded-md border text-[11px] font-bold px-2 cursor-pointer outline-none ${roleObj.badgeBg}`}
                              >
                                {ROLE_OPTIONS.map((opt) => (
                                  <option key={opt.key} value={opt.key}>
                                    {opt.key} ({opt.label})
                                  </option>
                                ))}
                              </select>

                              {/* Remove Member Button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveTeamMember(u._id)}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                                title="Remove team member"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Extra Member Dropdown */}
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={userToAddId}
                      onChange={(e) => setUserToAddId(e.target.value)}
                      className="h-8 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-gray-700 outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">+ Add More Employees to Squad...</option>
                      {activeUsers
                        .filter(
                          (u) =>
                            !parsedPlan.assignedTeam.some((t) => t.user._id === u._id)
                        )
                        .map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.designation || u.role})
                          </option>
                        ))}
                    </select>

                    {userToAddId && (
                      <button
                        type="button"
                        onClick={() => handleAddTeamMember(userToAddId)}
                        className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* PIPELINING & PRODUCTION STRATEGY BANNER */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 text-xs text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Sliders size={13} />
                  <span>Production Pipelining Strategy</span>
                </span>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  {parsedPlan.moduleCount} modules pipelined with{" "}
                  <strong>{b.minutes.totalDevMinutes.toFixed(0)}m</strong> development and{" "}
                  <strong>{b.minutes.totalAnimMinutes.toFixed(0)}m</strong> animation/motion.
                  {parsedPlan.assignedTeam.filter((t) => t.roleCategory === "ID").length > 1
                    ? " Multiple Instructional Designers will author modules concurrently."
                    : " Instructional Design is pipelined sequentially per module."}{" "}
                  Tasks will automatically link to employee dashboards.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50/70">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {parsedPlan && onOpenDetailedSetup && (
              <button
                type="button"
                onClick={() => onOpenDetailedSetup(parsedPlan)}
                className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer shadow-2xs"
              >
                <Sliders size={13} />
                <span>Open in Detailed Setup</span>
              </button>
            )}

            {parsedPlan && (
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:from-purple-500 hover:to-indigo-500 transition cursor-pointer"
              >
                <Check size={15} />
                <span>Apply & Generate Plan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
