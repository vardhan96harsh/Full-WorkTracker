// frontend/src/plannerEngine/projectPlanExporter.js
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { CalendarEngine } from "./calendarEngine.js";

/**
 * Robust helper to extract full assignee names across diverse task data formats.
 */
export function getTaskAssigneeName(task) {
  if (!task) return "Unassigned";
  if (task.assignedResource) {
    if (typeof task.assignedResource === "string") return task.assignedResource;
    if (task.assignedResource.name) return task.assignedResource.name;
    if (task.assignedResource.fullName) return task.assignedResource.fullName;
  }
  if (Array.isArray(task.assignedResources) && task.assignedResources.length > 0) {
    return task.assignedResources
      .map((r) => (typeof r === "string" ? r : r.name || r.fullName || ""))
      .filter(Boolean)
      .join(", ") || "Unassigned";
  }
  if (task.assignee) {
    if (typeof task.assignee === "string") return task.assignee;
    if (task.assignee.name) return task.assignee.name;
    if (task.assignee.fullName) return task.assignee.fullName;
  }
  return "Unassigned";
}

/**
 * Sanitize filename to prevent illegal character issues.
 */
function sanitizeFilename(name) {
  return (name || "Project_Plan")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .trim();
}

/**
 * Builds styling tokens for professional Excel worksheet output.
 */
const STYLES = {
  titleBanner: {
    font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1E3A8A" } }, // Dark Navy Blue
    alignment: { vertical: "center", horizontal: "left" },
  },
  sectionHeader: {
    font: { bold: true, size: 11, color: { rgb: "1E3A8A" } },
    fill: { fgColor: { rgb: "E0E7FF" } }, // Indigo tint
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      top: { style: "thin", color: { rgb: "C7D2FE" } },
      bottom: { style: "medium", color: { rgb: "4F46E5" } },
    },
  },
  tableHeader: {
    font: { bold: true, size: 10, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "2563EB" } }, // Blue 600
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "93C5FD" } },
      bottom: { style: "medium", color: { rgb: "1D4ED8" } },
      left: { style: "thin", color: { rgb: "93C5FD" } },
      right: { style: "thin", color: { rgb: "93C5FD" } },
    },
  },
  cellNormal: {
    font: { size: 9, color: { rgb: "1F2937" } },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } },
    },
  },
  cellCenter: {
    font: { size: 9, color: { rgb: "1F2937" } },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } },
    },
  },
  cellRight: {
    font: { size: 9, color: { rgb: "1F2937" } },
    alignment: { vertical: "center", horizontal: "right" },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } },
    },
  },
  cellZebra: {
    font: { size: 9, color: { rgb: "1F2937" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } },
    },
  },
  metaLabel: {
    font: { bold: true, size: 9, color: { rgb: "4B5563" } },
    fill: { fgColor: { rgb: "F1F5F9" } },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  },
  metaValue: {
    font: { bold: true, size: 9, color: { rgb: "111827" } },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  },
};

/**
 * Applies a cell style object to a target worksheet coordinate.
 */
function styleCell(ws, r, c, style) {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (!ws[addr]) ws[addr] = { t: "s", v: "" };
  ws[addr].s = style;
}

/**
 * Sets explicit column widths for an XLSX worksheet.
 */
function setColWidths(ws, widths) {
  ws["!cols"] = widths.map((w) => ({ wch: w }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MASTER WORKBOOK EXPORTER (Excel .xlsx with 3 Full Worksheets)
// ─────────────────────────────────────────────────────────────────────────────

export function exportCompleteProjectPlanExcel(project) {
  if (!project) return;

  const projectName = project.project?.name || project.projectName || "eLearning Project";
  const projectCode = project.project?.code || "";
  const companyName = project.company?.name || "";
  const clientName = project.clientName || "Enterprise Client";
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];

  const wb = XLSX.utils.book_new();

  // ─────────────────────────────────────────────
  // SHEET 1: PRODUCTION KPIS & PIPELINING
  // ─────────────────────────────────────────────
  const kpiData = [];
  // Row 0: Banner
  kpiData.push([`PROJECT WORKFLOW & PRODUCTION KPI REPORT — ${projectName.toUpperCase()}`, "", "", "", "", ""]);
  // Row 1: Blank
  kpiData.push(["", "", "", "", "", ""]);

  // Project Parameters Table
  kpiData.push(["PROJECT SCOPE & GOVERNANCE PARAMETERS", "", "", "", "", ""]);
  kpiData.push(["Project Name:", projectName, "", "Company:", companyName, ""]);
  kpiData.push(["Project Code:", projectCode || "N/A", "", "Client Stakeholder:", clientName, ""]);
  kpiData.push(["Authoring Platform:", project.projectType || "storyline-360", "", "Complexity Tier:", project.complexity || "Level 2", ""]);
  kpiData.push(["Starting Phase:", project.startPhaseName || "Phase 1 — Project Initiation", "", "Conditional HLD Gate:", project.includeHld ? "Enabled (HLD Concept + Gate)" : "Disabled (Direct Production)", ""]);
  kpiData.push(["Scope Curriculum:", `${project.moduleCount || 4} Modules (~${project.courseLengthMinutes || 60} mins)`, "", "Pipelining Architecture:", project.parallelPipelining ? "Concurrent Modular Pipelining" : "Linear", ""]);
  kpiData.push(["Lead Project Manager:", project.projectManager?.name || "Unassigned", "", "Export Generated Date:", new Date().toISOString().slice(0, 10), ""]);
  kpiData.push(["", "", "", "", "", ""]);

  // Execution KPIs Table
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const estHours = Number(project.estimatedEffortHours) || 0;
  const allocHours = Number(project.allocatedEffortHours) || 0;
  const actualHours =
    project.actualUsedEffortHours !== undefined && project.actualUsedEffortHours !== null && project.actualUsedEffortHours > 0
      ? Number(project.actualUsedEffortHours)
      : Number(tasks.filter((t) => t.status === "Completed").reduce((s, t) => s + (t.actualUsedHours || t.hours || 0), 0).toFixed(1)) || 0;

  kpiData.push(["PROJECT DELIVERY & EFFORT KPIS", "", "", "", "", ""]);
  kpiData.push(["Kickoff Start Date:", CalendarEngine.formatDisplayDate(project.startDate), "", "Calculated End Date:", CalendarEngine.formatDisplayDate(project.calculatedEndDate), ""]);
  kpiData.push(["Total Working Days:", `${project.totalWorkingDays || 0} Days`, "", "Total Calendar Days:", `${project.totalCalendarDays || 0} Days`, ""]);
  kpiData.push(["Non-Working Days (Holidays/Weekends):", `${project.nonWorkingDays || 0} Days`, "", "Overall Task Completion:", `${progressPercent}% (${completedTasks}/${tasks.length} tasks)`, ""]);
  kpiData.push(["Total Estimated Effort:", `${estHours} Hours`, "", "Allocated Capacity:", `${allocHours} Hours`, ""]);
  kpiData.push(["Actual Burned Effort:", `${actualHours} Hours`, "", "Effort Variance:", `${(actualHours - estHours).toFixed(1)} Hours`, ""]);
  kpiData.push(["", "", "", "", "", ""]);

  // Role Breakdown Table
  const est = project.estimation || {};
  const h = est.hours || {};
  kpiData.push(["ROLE-BASED EFFORT ALLOCATION BREAKDOWN", "", "", "", "", ""]);
  kpiData.push(["Role Category", "Assigned Capacity", "Estimated Hours (h)", "% of Total Effort", "", ""]);
  const roleHoursList = [
    { role: "Instructional Design (ID)", hrs: h.totalIdHours || 0 },
    { role: "Storyline Slide Development (Dev)", hrs: h.totalDeveloperHours || 0 },
    { role: "2D Motion Animation (Anim)", hrs: h.totalAnimatorHours || 0 },
    { role: "Quality Assurance & Testing (QA)", hrs: h.totalQaHours || 0 },
    { role: "Visual Design & UI Graphics (VD)", hrs: h.totalVdHours || 0 },
    { role: "Project Management & Delivery (PM)", hrs: h.totalPmHours || 0 },
  ];
  const grandTotal = estHours || roleHoursList.reduce((s, r) => s + r.hrs, 0) || 1;
  roleHoursList.forEach((r) => {
    const pct = Math.round((r.hrs / grandTotal) * 100);
    kpiData.push([r.role, "Dedicated Squad", r.hrs.toFixed(1), `${pct}%`, "", ""]);
  });
  kpiData.push(["", "", "", "", "", ""]);

  // Pipeline Stages Table
  const stageMap = new Map();
  (project.phases || []).forEach((ph) => {
    let baseName = ph.name.replace(/\s*\(Module\s*\d+\)/i, "").trim();
    if (!stageMap.has(baseName)) {
      stageMap.set(baseName, { name: baseName, taskIds: [...(ph.taskIds || [])], phaseIds: [ph.id] });
    } else {
      const existing = stageMap.get(baseName);
      existing.taskIds.push(...(ph.taskIds || []));
      existing.phaseIds.push(ph.id);
    }
  });

  kpiData.push(["PRODUCTION PIPELINE STAGES PROGRESS", "", "", "", "", ""]);
  kpiData.push(["Production Stage", "Total Tasks", "Completed", "Stage Progress", "Est. Hours", "Status"]);
  Array.from(stageMap.values()).forEach((stg) => {
    const stgTasks = tasks.filter((t) => stg.taskIds.includes(t.id) || stg.phaseIds.includes(t.phaseId) || (t.phaseName && t.phaseName.startsWith(stg.name)));
    const stgTotal = stgTasks.length;
    const stgDone = stgTasks.filter((t) => t.status === "Completed").length;
    const stgPct = stgTotal > 0 ? `${Math.round((stgDone / stgTotal) * 100)}%` : "0%";
    const stgHours = stgTasks.reduce((s, t) => s + (t.hours || 0), 0).toFixed(1);
    const stgStatus = stgTotal > 0 && stgDone === stgTotal ? "Completed" : stgDone > 0 ? "In Progress" : "Pending";
    kpiData.push([stg.name, stgTotal, stgDone, stgPct, `${stgHours}h`, stgStatus]);
  });

  const wsKpi = XLSX.utils.aoa_to_sheet(kpiData);
  setColWidths(wsKpi, [38, 22, 16, 26, 26, 16]);

  // Style Title Banner
  styleCell(wsKpi, 0, 0, STYLES.titleBanner);
  // Style Section Headers
  [2, 11, 18, 28].forEach((r) => {
    if (r < kpiData.length) styleCell(wsKpi, r, 0, STYLES.sectionHeader);
  });
  XLSX.utils.book_append_sheet(wb, wsKpi, "Production KPIs");

  // ─────────────────────────────────────────────
  // SHEET 2: TASK BREAKDOWN GRID (WBS)
  // ─────────────────────────────────────────────
  const wbsHeaders = [
    "WBS Task ID",
    "Task Name",
    "Phase / Module",
    "Role Category",
    "Assigned Resource(s)",
    "Start Date",
    "End Date",
    "Duration (Days)",
    "Estimated Hours (h)",
    "Allocated Hours (h)",
    "Actual Used (h)",
    "Pre-requisite Dependencies",
    "Status",
    "Critical / Gate Type",
  ];

  const wbsRows = tasks.map((t) => {
    const isGate = t.isClientTask || (t.name || "").toLowerCase().includes("approval") || (t.name || "").toLowerCase().includes("sign-off");
    return [
      t.id,
      t.name,
      t.phaseName || "",
      t.roleCategory || t.role || "",
      getTaskAssigneeName(t),
      t.startDate ? CalendarEngine.formatDisplayDate(t.startDate) : "",
      t.endDate ? CalendarEngine.formatDisplayDate(t.endDate) : "",
      t.durationWorkingDays !== undefined ? t.durationWorkingDays : 1,
      Number(t.hours || 0).toFixed(1),
      Number(t.allocatedHours || 0).toFixed(1),
      Number(t.actualUsedHours || 0).toFixed(1),
      Array.isArray(t.dependencies) ? t.dependencies.join(", ") : "",
      t.status || "Not Started",
      isGate ? "Client Gate / Sign-off" : t.isMilestone ? "Milestone" : "Standard Production Task",
    ];
  });

  const wsWbs = XLSX.utils.aoa_to_sheet([wbsHeaders, ...wbsRows]);
  setColWidths(wsWbs, [22, 42, 34, 18, 26, 14, 14, 16, 18, 18, 16, 32, 16, 22]);

  // Style WBS Header
  wbsHeaders.forEach((_, c) => styleCell(wsWbs, 0, c, STYLES.tableHeader));

  // Style WBS Data Rows
  wbsRows.forEach((_, rIdx) => {
    const rowNum = rIdx + 1;
    const isZebra = rIdx % 2 === 1;
    wbsHeaders.forEach((_, c) => {
      const isNum = c === 7 || c === 8 || c === 9 || c === 10;
      const isCenter = c === 5 || c === 6 || c === 12;
      const baseStyle = isNum ? STYLES.cellRight : isCenter ? STYLES.cellCenter : isZebra ? STYLES.cellZebra : STYLES.cellNormal;
      styleCell(wsWbs, rowNum, c, baseStyle);
    });
  });
  XLSX.utils.book_append_sheet(wb, wsWbs, "Task Breakdown (WBS)");

  // ─────────────────────────────────────────────
  // SHEET 3: GANTT TIMELINE SCHEDULE
  // ─────────────────────────────────────────────
  const ganttHeaders = [
    "Seq #",
    "Task ID",
    "Task Description",
    "Phase / Module Track",
    "Assigned Resource",
    "Scheduled Start Date",
    "Scheduled End Date",
    "Working Days",
    "Effort Hours",
    "Current Status",
    "Direct Dependencies",
    "Sequential Predecessor",
  ];

  const sortedTasks = [...tasks].sort((a, b) => {
    const da = new Date(a.startDate || "2099-01-01").getTime();
    const db = new Date(b.startDate || "2099-01-01").getTime();
    return da - db;
  });

  const ganttRows = sortedTasks.map((t, idx) => [
    idx + 1,
    t.id,
    t.name,
    t.phaseName || "",
    getTaskAssigneeName(t),
    t.startDate ? CalendarEngine.formatDisplayDate(t.startDate) : "",
    t.endDate ? CalendarEngine.formatDisplayDate(t.endDate) : "",
    t.durationWorkingDays || 1,
    Number(t.hours || 0).toFixed(1),
    t.status || "Not Started",
    Array.isArray(t.dependencies) && t.dependencies.length > 0 ? t.dependencies.join("; ") : "None (Kickoff/Parallel)",
    Array.isArray(t.dependencies) && t.dependencies.length > 0 ? t.dependencies[0] : "-",
  ]);

  const wsGantt = XLSX.utils.aoa_to_sheet([ganttHeaders, ...ganttRows]);
  setColWidths(wsGantt, [8, 22, 42, 34, 26, 18, 18, 14, 14, 16, 32, 24]);

  // Style Gantt Header
  ganttHeaders.forEach((_, c) => styleCell(wsGantt, 0, c, STYLES.tableHeader));

  // Style Gantt Rows
  ganttRows.forEach((_, rIdx) => {
    const rowNum = rIdx + 1;
    const isZebra = rIdx % 2 === 1;
    ganttHeaders.forEach((_, c) => {
      const isNum = c === 0 || c === 7 || c === 8;
      const isCenter = c === 5 || c === 6 || c === 9;
      const baseStyle = isNum ? STYLES.cellRight : isCenter ? STYLES.cellCenter : isZebra ? STYLES.cellZebra : STYLES.cellNormal;
      styleCell(wsGantt, rowNum, c, baseStyle);
    });
  });
  XLSX.utils.book_append_sheet(wb, wsGantt, "Gantt Timeline Schedule");

  // Write and Save Complete Workbook
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const fileName = `${sanitizeFilename(projectName)}_Complete_Project_Plan_${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CSV EXPORTERS (Instant Export & External PM Tools Compatibility)
// ─────────────────────────────────────────────────────────────────────────────

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Downloads Task Breakdown Grid (WBS) as clean RFC4180 CSV.
 */
export function exportTaskBreakdownCSV(project) {
  if (!project) return;
  const projectName = project.project?.name || project.projectName || "eLearning Project";
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];

  const headers = [
    "Task ID",
    "Task Name",
    "Phase Name",
    "Role Category",
    "Assigned Resource",
    "Start Date",
    "End Date",
    "Working Days",
    "Effort Hours",
    "Allocated Hours",
    "Actual Used Hours",
    "Dependencies",
    "Status",
  ];

  const rows = tasks.map((t) => [
    t.id,
    t.name,
    t.phaseName || "",
    t.roleCategory || t.role || "",
    getTaskAssigneeName(t),
    t.startDate || "",
    t.endDate || "",
    t.durationWorkingDays || 1,
    t.hours || 0,
    t.allocatedHours || 0,
    t.actualUsedHours || 0,
    Array.isArray(t.dependencies) ? t.dependencies.join(";") : "",
    t.status || "Not Started",
  ]);

  const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\r\n");
  const fileName = `${sanitizeFilename(projectName)}_Task_Breakdown_WBS_${new Date().toISOString().slice(0, 10)}.csv`;
  saveAs(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), fileName);
}

/**
 * Downloads Gantt Timeline Schedule as CSV.
 */
export function exportGanttTimelineCSV(project) {
  if (!project) return;
  const projectName = project.project?.name || project.projectName || "eLearning Project";
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];

  const headers = [
    "Sequence",
    "Task ID",
    "Task Name",
    "Phase Track",
    "Assigned Resource",
    "Scheduled Start Date",
    "Scheduled End Date",
    "Duration (Days)",
    "Hours",
    "Status",
    "Dependencies",
  ];

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));

  const rows = sortedTasks.map((t, idx) => [
    idx + 1,
    t.id,
    t.name,
    t.phaseName || "",
    getTaskAssigneeName(t),
    t.startDate || "",
    t.endDate || "",
    t.durationWorkingDays || 1,
    t.hours || 0,
    t.status || "Not Started",
    Array.isArray(t.dependencies) ? t.dependencies.join(";") : "",
  ]);

  const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\r\n");
  const fileName = `${sanitizeFilename(projectName)}_Gantt_Timeline_${new Date().toISOString().slice(0, 10)}.csv`;
  saveAs(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), fileName);
}

/**
 * Downloads Production KPIs & Stage Pipelining as CSV.
 */
export function exportProductionKpisCSV(project) {
  if (!project) return;
  const projectName = project.project?.name || project.projectName || "eLearning Project";
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];

  const lines = [];
  lines.push(["=== PRODUCTION KPI & SCOPE SUMMARY ==="]);
  lines.push(["Project Name", project.project?.name || projectName]);
  lines.push(["Project Code", project.project?.code || "N/A"]);
  lines.push(["Company", project.company?.name || ""]);
  lines.push(["Client", project.clientName || "Enterprise Client"]);
  lines.push(["Authoring Platform", project.projectType || "storyline-360"]);
  lines.push(["Complexity Tier", project.complexity || "Level 2"]);
  lines.push(["Starting Phase", project.startPhaseName || "Phase 1"]);
  lines.push(["Start Date", project.startDate || ""]);
  lines.push(["Calculated End Date", project.calculatedEndDate || ""]);
  lines.push(["Total Working Days", `${project.totalWorkingDays || 0} Days`]);
  lines.push(["Total Calendar Days", `${project.totalCalendarDays || 0} Days`]);
  lines.push(["Total Estimated Effort", `${project.estimatedEffortHours || 0} Hours`]);
  lines.push(["Actual Burned Effort", `${project.actualUsedEffortHours || 0} Hours`]);
  lines.push([]);

  // Pipeline summary
  const stageMap = new Map();
  (project.phases || []).forEach((ph) => {
    let baseName = ph.name.replace(/\s*\(Module\s*\d+\)/i, "").trim();
    if (!stageMap.has(baseName)) {
      stageMap.set(baseName, { name: baseName, taskIds: [...(ph.taskIds || [])], phaseIds: [ph.id] });
    } else {
      const existing = stageMap.get(baseName);
      existing.taskIds.push(...(ph.taskIds || []));
      existing.phaseIds.push(ph.id);
    }
  });

  lines.push(["=== STAGE PIPELINING PROGRESS ==="]);
  lines.push(["Stage Name", "Total Tasks", "Completed Tasks", "Progress %", "Estimated Hours", "Status"]);
  Array.from(stageMap.values()).forEach((stg) => {
    const stgTasks = tasks.filter((t) => stg.taskIds.includes(t.id) || stg.phaseIds.includes(t.phaseId) || (t.phaseName && t.phaseName.startsWith(stg.name)));
    const stgTotal = stgTasks.length;
    const stgDone = stgTasks.filter((t) => t.status === "Completed").length;
    const stgPct = stgTotal > 0 ? `${Math.round((stgDone / stgTotal) * 100)}%` : "0%";
    const stgHours = stgTasks.reduce((s, t) => s + (t.hours || 0), 0).toFixed(1);
    const stgStatus = stgTotal > 0 && stgDone === stgTotal ? "Completed" : stgDone > 0 ? "In Progress" : "Pending";
    lines.push([stg.name, stgTotal, stgDone, stgPct, stgHours, stgStatus]);
  });

  const csvContent = "\uFEFF" + lines.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const fileName = `${sanitizeFilename(projectName)}_Production_KPIs_${new Date().toISOString().slice(0, 10)}.csv`;
  saveAs(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), fileName);
}
