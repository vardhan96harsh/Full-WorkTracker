import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Calendar,
  Search,
  Filter,
  Eye,
  Sliders,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Flag,
  User,
} from "lucide-react";
import { CalendarEngine } from "../../../plannerEngine/calendarEngine.js";
import ExportPlanDropdown from "./ExportPlanDropdown.jsx";

const ROW_HEIGHT = 48;

const ROLE_COLORS = {
  PM: { bg: "bg-purple-600", border: "border-purple-400", text: "text-purple-300", light: "rgba(147, 51, 234, 0.2)" },
  ID: { bg: "bg-emerald-600", border: "border-emerald-400", text: "text-emerald-300", light: "rgba(5, 150, 105, 0.2)" },
  DEVELOPER: { bg: "bg-sky-600", border: "border-sky-400", text: "text-sky-300", light: "rgba(2, 132, 199, 0.2)" },
  ANIMATOR: { bg: "bg-violet-600", border: "border-violet-400", text: "text-violet-300", light: "rgba(124, 58, 237, 0.2)" },
  MOTION_GRAPHICS: { bg: "bg-pink-600", border: "border-pink-400", text: "text-pink-300", light: "rgba(219, 39, 119, 0.2)" },
  DESIGNER: { bg: "bg-amber-600", border: "border-amber-400", text: "text-amber-300", light: "rgba(217, 119, 6, 0.2)" },
  QA: { bg: "bg-rose-600", border: "border-rose-400", text: "text-rose-300", light: "rgba(225, 29, 72, 0.2)" },
  VO: { bg: "bg-teal-600", border: "border-teal-400", text: "text-teal-300", light: "rgba(13, 148, 136, 0.2)" },
  CLIENT: { bg: "bg-yellow-600", border: "border-yellow-400", text: "text-yellow-300", light: "rgba(202, 138, 4, 0.2)" },
};

// Robust helper to extract full assignee name across data formats
export const getAssigneeName = (task) => {
  if (!task) return "";
  if (task.assignedResource) {
    if (typeof task.assignedResource === "string") return task.assignedResource;
    if (task.assignedResource.name) return task.assignedResource.name;
    if (task.assignedResource.fullName) return task.assignedResource.fullName;
  }
  if (Array.isArray(task.assignedResources) && task.assignedResources.length > 0) {
    return task.assignedResources
      .map((r) => (typeof r === "string" ? r : r.name || r.fullName || ""))
      .filter(Boolean)
      .join(", ");
  }
  if (task.assignee) {
    if (typeof task.assignee === "string") return task.assignee;
    if (task.assignee.name) return task.assignee.name;
    if (task.assignee.fullName) return task.assignee.fullName;
  }
  return "";
};

export default function GanttChart({ project, onEditTask }) {
  const [zoom, setZoom] = useState("day"); // 'day' | 'week' | 'month'
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showArrows, setShowArrows] = useState(true);
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [hoveredTask, setHoveredTask] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(440); // 320: compact, 440: standard, 560: wide
  const timelineContainerRef = useRef(null);
  const leftListRef = useRef(null);
  const isSyncingScroll = useRef(false);

  const handleLeftScroll = (e) => {
    if (isSyncingScroll.current) return;
    if (timelineContainerRef.current) {
      isSyncingScroll.current = true;
      timelineContainerRef.current.scrollTop = e.target.scrollTop;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };

  const handleRightScroll = (e) => {
    if (isSyncingScroll.current) return;
    if (leftListRef.current) {
      isSyncingScroll.current = true;
      leftListRef.current.scrollTop = e.target.scrollTop;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };

  const cellWidth = zoom === "day" ? 36 : zoom === "week" ? 22 : 12;

  // Compute timeline date range
  const { dateRange, dateToIndexMap, totalWidth, todayIndex } = useMemo(() => {
    if (!project || !project.startDate || !project.calculatedEndDate) {
      return { dateRange: [], dateToIndexMap: new Map(), totalWidth: 0, todayIndex: -1 };
    }

    const start = CalendarEngine.parseDate(project.startDate);
    const end = CalendarEngine.parseDate(project.calculatedEndDate);
    end.setDate(end.getDate() + 4); // buffer days

    const range = CalendarEngine.generateDateRange(start, end);
    const map = new Map();
    const todayIso = CalendarEngine.toISODate(new Date());
    let tIdx = -1;

    range.forEach((d, idx) => {
      const iso = CalendarEngine.toISODate(d);
      map.set(iso, idx);
      if (iso === todayIso) tIdx = idx;
    });

    return {
      dateRange: range,
      dateToIndexMap: map,
      totalWidth: range.length * cellWidth,
      todayIndex: tIdx,
    };
  }, [project?.startDate, project?.calculatedEndDate, cellWidth]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!project || !Array.isArray(project.tasks)) return [];
    return project.tasks.filter((t) => {
      if (t.durationWorkingDays <= 0 && t.hours <= 0 && !t.isMilestone) return false;
      if (roleFilter !== "ALL" && (t.roleCategory || "").toUpperCase() !== roleFilter.toUpperCase()) return false;
      if (onlyCritical && !t.criticalPath) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (t.name || "").toLowerCase().includes(q);
        const matchPhase = (t.phaseName || "").toLowerCase().includes(q);
        const matchAssignee = getAssigneeName(t).toLowerCase().includes(q);
        if (!matchName && !matchPhase && !matchAssignee) return false;
      }
      return true;
    });
  }, [project?.tasks, roleFilter, onlyCritical, search]);

  // Group filtered tasks by phase for display
  const phaseGroups = useMemo(() => {
    const groups = [];
    const map = new Map();

    filteredTasks.forEach((t) => {
      const pId = t.phaseId || "general";
      const pName = t.phaseName || "General Phase";
      if (!map.has(pId)) {
        const group = { id: pId, name: pName, tasks: [] };
        map.set(pId, group);
        groups.push(group);
      }
      map.get(pId).tasks.push(t);
    });

    return groups;
  }, [filteredTasks]);

  // Month groups for header
  const monthGroups = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const groups = [];
    dateRange.forEach((d) => {
      const m = d.getMonth();
      const yr = d.getFullYear();
      const last = groups[groups.length - 1];
      if (!last || last.month !== m || last.year !== yr) {
        groups.push({ month: m, year: yr, name: `${months[m]} ${yr}`, count: 1 });
      } else {
        last.count++;
      }
    });
    return groups;
  }, [dateRange]);

  const togglePhase = (phaseId) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  // Build task coordinates for SVG arrows
  const taskRowPositions = useMemo(() => {
    const posMap = new Map();
    let rowIndex = 0;

    phaseGroups.forEach((group) => {
      rowIndex++; // Phase Header row
      if (!collapsedPhases.has(group.id)) {
        group.tasks.forEach((t) => {
          const sIdx = dateToIndexMap.get(t.startDate);
          const eIdx = dateToIndexMap.get(t.endDate) ?? sIdx;
          if (sIdx !== undefined) {
            const left = sIdx * cellWidth;
            const right = (eIdx + 1) * cellWidth;
            const top = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2; // vertical center of bar in row
            posMap.set(t.id, { left, right, top, rowIndex });
          }
          rowIndex++;
        });
      }
    });

    return posMap;
  }, [phaseGroups, collapsedPhases, dateToIndexMap, cellWidth]);

  // Dependency arrows paths
  const dependencyLines = useMemo(() => {
    if (!showArrows) return [];
    const lines = [];

    filteredTasks.forEach((t) => {
      const targetPos = taskRowPositions.get(t.id);
      if (!targetPos) return;

      const deps = t.dependencies || t.dependsOn || [];
      deps.forEach((depId) => {
        const sourcePos = taskRowPositions.get(depId);
        if (!sourcePos) return;

        const x1 = sourcePos.right;
        const y1 = sourcePos.top;
        const x2 = targetPos.left;
        const y2 = targetPos.top;

        // Draw clean orthogonal line
        const midX = x1 + Math.max(8, (x2 - x1) / 2);
        const pathData = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
        lines.push({ id: `${depId}->${t.id}`, pathData, isCritical: t.criticalPath });
      });
    });

    return lines;
  }, [showArrows, filteredTasks, taskRowPositions]);

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No active project plan to display in timeline.
      </div>
    );
  }

  const holidays = project.holidays || [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden flex flex-col">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center rounded-xl bg-gray-200/80 p-1">
            <button
              onClick={() => setZoom("day")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                zoom === "day"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setZoom("week")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                zoom === "week"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setZoom("month")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                zoom === "month"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Month
            </button>
          </div>

          {/* Sidebar Width Control */}
          <div className="flex items-center rounded-xl bg-gray-200/80 p-1">
            <span className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              List:
            </span>
            <button
              onClick={() => setSidebarWidth(320)}
              className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition ${
                sidebarWidth === 320
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Compact sidebar (320px)"
            >
              Compact
            </button>
            <button
              onClick={() => setSidebarWidth(440)}
              className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition ${
                sidebarWidth === 440
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Standard sidebar (440px) - Great for full names"
            >
              Standard
            </button>
            <button
              onClick={() => setSidebarWidth(560)}
              className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition ${
                sidebarWidth === 560
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Wide sidebar (560px) - Full visibility for long names"
            >
              Wide
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search task, phase, assignee..."
              className="h-8 w-52 rounded-xl border border-gray-300 bg-white pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Roles</option>
            <option value="PM">Project Manager</option>
            <option value="ID">Instructional Designer</option>
            <option value="DEVELOPER">Course Developer</option>
            <option value="ANIMATOR">Motion Animator</option>
            <option value="DESIGNER">Visual Designer</option>
            <option value="QA">Quality Assurance</option>
            <option value="VO">Voiceover</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={showArrows}
              onChange={(e) => setShowArrows(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Dependency Arrows</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium select-none text-rose-600">
            <input
              type="checkbox"
              checked={onlyCritical}
              onChange={(e) => setOnlyCritical(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="flex items-center gap-1">
              <Sparkles size={12} />
              Critical Path Only
            </span>
          </label>

          <div className="h-4 w-px bg-gray-300 mx-1 hidden sm:block" />

          {/* Export Timeline Dropdown */}
          <ExportPlanDropdown plan={project} variant="compact" label="Export Timeline" align="right" />
        </div>
      </div>

      {/* SPLIT GANTT BODY */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 275px)", minHeight: "560px", maxHeight: "880px" }}>
        {/* LEFT TASK LIST SIDEBAR */}
        <div
          style={{ width: `${sidebarWidth}px` }}
          className="shrink-0 border-r border-gray-200 bg-white flex flex-col z-10 shadow-xs transition-all duration-150"
        >
          {/* Header Row */}
          <div className="h-14 border-b border-gray-200 bg-gray-50/70 px-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-600">
            <span className="truncate">Task Name & Assignee</span>
            <span className="shrink-0">Duration</span>
          </div>

          {/* Task Rows */}
          <div
            ref={leftListRef}
            onScroll={handleLeftScroll}
            className="flex-1 overflow-y-auto divide-y divide-gray-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {phaseGroups.map((group) => {
              const isCollapsed = collapsedPhases.has(group.id);
              return (
                <div key={group.id}>
                  {/* Phase Row */}
                  <div
                    onClick={() => togglePhase(group.id)}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    className="px-3 bg-gray-50/90 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition text-xs font-bold text-gray-800 select-none border-b border-gray-100"
                    title={`Click to collapse/expand ${group.name}`}
                  >
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      {isCollapsed ? <ChevronRight size={14} className="shrink-0 text-gray-500" /> : <ChevronDown size={14} className="shrink-0 text-gray-500" />}
                      <span className="truncate font-bold text-gray-900" title={group.name}>{group.name}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500 shrink-0 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                      {group.tasks.length} tasks
                    </span>
                  </div>

                  {/* Tasks under Phase */}
                  {!isCollapsed &&
                    group.tasks.map((t) => {
                      const color = ROLE_COLORS[t.roleCategory] || ROLE_COLORS.DEVELOPER;
                      const assigneeName = getAssigneeName(t);
                      return (
                        <div
                          key={t.id}
                          style={{ height: `${ROW_HEIGHT}px` }}
                          onMouseEnter={() => setHoveredTask(t)}
                          onMouseLeave={() => setHoveredTask(null)}
                          onClick={() => onEditTask && onEditTask(t)}
                          className={`px-3 flex items-center justify-between text-xs transition border-b border-gray-100 border-l-3 cursor-pointer ${
                            t.criticalPath ? "border-l-rose-500 bg-rose-50/30" : "border-l-transparent hover:bg-gray-50/80"
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${color.bg}`}
                                title={`Role: ${t.roleCategory || t.role}`}
                              />
                              <span
                                className="truncate font-semibold text-gray-900 text-[12px]"
                                title={t.name}
                              >
                                {t.name}
                              </span>
                              {t.isMilestone && (
                                <Flag size={11} className="text-amber-500 shrink-0" title="Milestone" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 pl-3.5 truncate mt-0.5">
                              <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded text-[10px] shrink-0">
                                {t.roleCategory || t.role}
                              </span>
                              {assigneeName ? (
                                <span
                                  className="font-medium text-gray-700 truncate flex items-center gap-1"
                                  title={`Assigned Resource: ${assigneeName}`}
                                >
                                  <User size={11} className="text-gray-400 shrink-0" />
                                  <span className="truncate">{assigneeName}</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 italic text-[10px]">Unassigned</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end text-[11px] font-semibold text-gray-500 shrink-0 pl-1">
                            <span>{t.durationWorkingDays}d</span>
                            <span className="text-[10px] font-normal text-gray-400">{t.hours}h</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
            {/* Bottom spacer so last row is never cramped */}
            <div className="h-10 shrink-0" />
          </div>
        </div>

        {/* RIGHT TIMELINE CANVAS */}
        <div
          ref={timelineContainerRef}
          onScroll={handleRightScroll}
          className="flex-1 overflow-x-auto overflow-y-auto bg-gray-50 relative"
        >
          <div style={{ width: `${Math.max(totalWidth, 800)}px` }} className="relative select-none min-h-full">
            {/* STICKY TIMELINE HEADER */}
            <div className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-2xs">
              {/* Month Row */}
              <div className="flex h-7 border-b border-gray-100 text-[11px] font-bold text-gray-700">
                {monthGroups.map((mg, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${mg.count * cellWidth}px` }}
                    className="border-r border-gray-200 px-2 flex items-center shrink-0"
                  >
                    {mg.name}
                  </div>
                ))}
              </div>

              {/* Day Row */}
              <div className="flex h-7 text-[10px] text-gray-500 font-medium">
                {dateRange.map((d, idx) => {
                  const isWknd = CalendarEngine.isWeekend(d);
                  const isHol = CalendarEngine.isHoliday(d, holidays);
                  const isToday = idx === todayIndex;
                  return (
                    <div
                      key={idx}
                      style={{ width: `${cellWidth}px` }}
                      className={`flex flex-col items-center justify-center border-r border-gray-100 shrink-0 ${
                        isToday
                          ? "bg-blue-100 text-blue-700 font-bold"
                          : isWknd
                          ? "bg-gray-100/70 text-gray-400"
                          : isHol
                          ? "bg-rose-50 text-rose-500 font-semibold"
                          : ""
                      }`}
                      title={CalendarEngine.formatDisplayDate(d, true)}
                    >
                      <span>{d.getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRID BACKGROUND (WEEKENDS, HOLIDAYS & TODAY) */}
            <div className="absolute inset-0 pointer-events-none flex" style={{ top: "56px" }}>
              {dateRange.map((d, idx) => {
                const isWknd = CalendarEngine.isWeekend(d);
                const isHol = CalendarEngine.isHoliday(d, holidays);
                const isToday = idx === todayIndex;
                return (
                  <div
                    key={idx}
                    style={{ width: `${cellWidth}px` }}
                    className={`h-full border-r border-gray-100 shrink-0 ${
                      isToday
                        ? "bg-blue-50/40"
                        : isWknd
                        ? "bg-gray-100/40"
                        : isHol
                        ? "bg-rose-50/30"
                        : ""
                    }`}
                  />
                );
              })}
            </div>

            {/* TODAY VERTICAL INDICATOR LINE */}
            {todayIndex >= 0 && (
              <div
                style={{ left: `${todayIndex * cellWidth + cellWidth / 2}px` }}
                className="absolute top-14 bottom-0 w-0.5 bg-blue-500 pointer-events-none z-10"
              />
            )}

            {/* SVG ARROWS LAYER */}
            {showArrows && (
              <svg
                className="absolute inset-0 pointer-events-none z-10"
                style={{ top: "56px", bottom: 0, width: "100%", height: "calc(100% - 56px)" }}
              >
                <defs>
                  <marker
                    id="arrow-end"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
                  </marker>
                  <marker
                    id="arrow-end-critical"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                  </marker>
                </defs>
                {dependencyLines.map((line) => (
                  <path
                    key={line.id}
                    d={line.pathData}
                    fill="none"
                    stroke={line.isCritical ? "#f43f5e" : "#94a3b8"}
                    strokeWidth={line.isCritical ? "1.75" : "1.25"}
                    strokeDasharray={line.isCritical ? undefined : "3 3"}
                    markerEnd={line.isCritical ? "url(#arrow-end-critical)" : "url(#arrow-end)"}
                  />
                ))}
              </svg>
            )}

            {/* TASK BARS ROWS */}
            <div className="relative pt-0" style={{ marginTop: "0px" }}>
              {phaseGroups.map((group) => {
                const isCollapsed = collapsedPhases.has(group.id);
                return (
                  <div key={group.id}>
                    {/* Phase Spacer row */}
                    <div
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className="border-b border-gray-100 bg-gray-50/70"
                    />

                    {/* Task Rows */}
                    {!isCollapsed &&
                      group.tasks.map((t) => {
                        const sIdx = dateToIndexMap.get(t.startDate);
                        const eIdx = dateToIndexMap.get(t.endDate) ?? sIdx;

                        if (sIdx === undefined) {
                          return (
                            <div
                              key={t.id}
                              style={{ height: `${ROW_HEIGHT}px` }}
                              className="border-b border-gray-100"
                            />
                          );
                        }

                        const left = sIdx * cellWidth;
                        const width = Math.max(cellWidth, (eIdx - sIdx + 1) * cellWidth - 4);
                        const roleColor = ROLE_COLORS[t.roleCategory] || ROLE_COLORS.DEVELOPER;
                        const assigneeName = getAssigneeName(t);

                        return (
                          <div
                            key={t.id}
                            style={{ height: `${ROW_HEIGHT}px` }}
                            className="border-b border-gray-100 relative flex items-center"
                          >
                            {/* Bar container */}
                            <div
                              style={{ left: `${left}px`, width: `${width}px` }}
                              onMouseEnter={() => setHoveredTask(t)}
                              onMouseLeave={() => setHoveredTask(null)}
                              onClick={() => onEditTask && onEditTask(t)}
                              title={`${t.name}${assigneeName ? `\nAssignee: ${assigneeName}` : ""}\nPhase: ${t.phaseName || ""}\nDuration: ${t.durationWorkingDays} days (${t.hours}h)\nDates: ${CalendarEngine.formatDisplayDate(t.startDate)} - ${CalendarEngine.formatDisplayDate(t.endDate)}`}
                              className={`absolute h-8 rounded-lg shadow-xs cursor-pointer flex items-center px-2.5 text-white text-[11px] font-semibold transition hover:brightness-110 hover:shadow-md z-10 ${
                                roleColor.bg
                              } ${
                                t.criticalPath
                                  ? "ring-2 ring-rose-500 shadow-md shadow-rose-500/20"
                                  : ""
                              }`}
                            >
                              <span className="truncate">
                                {t.name}
                                {width > 220 && assigneeName && (
                                  <span className="ml-1 opacity-90 font-normal">({assigneeName})</span>
                                )}
                              </span>
                              {t.status === "Completed" && (
                                <span className="ml-1.5 text-[9px] bg-white/30 rounded px-1 py-0.2 shrink-0">
                                  ✓
                                </span>
                              )}
                            </div>

                            {/* Outside label for short bars so full name is clearly visible */}
                            {width < 180 && (
                              <div
                                style={{ left: `${left + width + 8}px` }}
                                className="absolute flex items-center gap-1.5 text-[11px] font-semibold text-gray-800 whitespace-nowrap pointer-events-none select-none z-10 drop-shadow-2xs"
                              >
                                <span>{t.name}</span>
                                {assigneeName && (
                                  <span className="text-gray-500 text-[10px] font-normal">
                                    • {assigneeName}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
              {/* Bottom spacer so last row is never cramped */}
              <div className="h-10 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* PERMANENT BOTTOM STATUS BAR - Fixed height prevents layout shifts & scroll blinking */}
      <div className="h-11 border-t border-gray-200 bg-gray-50/95 px-4 flex items-center justify-between text-xs text-gray-700 shrink-0 select-none">
        {hoveredTask ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0 truncate">
              <span className="font-bold text-gray-900 text-xs truncate max-w-[260px]" title={hoveredTask.name}>
                {hoveredTask.name}
              </span>
              {hoveredTask.phaseName && (
                <span className="text-gray-500 text-[11px] truncate hidden sm:inline">
                  • {hoveredTask.phaseName}
                </span>
              )}
              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 shrink-0">
                {hoveredTask.roleCategory || hoveredTask.role}
              </span>
              {(() => {
                const hAssignee = getAssigneeName(hoveredTask);
                return hAssignee ? (
                  <span className="flex items-center gap-1 font-semibold text-gray-800 bg-white border border-gray-200 rounded-md px-2 py-0.5 shadow-2xs shrink-0 text-[11px]">
                    <User size={11} className="text-blue-600" />
                    <span className="truncate max-w-[150px]">{hAssignee}</span>
                  </span>
                ) : null;
              })()}
              <span className="text-gray-500 font-medium text-[11px] shrink-0 hidden md:inline">
                {CalendarEngine.formatDisplayDate(hoveredTask.startDate)} ➔ {CalendarEngine.formatDisplayDate(hoveredTask.endDate)}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
              <span className="text-[11px] hidden lg:inline">
                Duration: <strong className="text-gray-900">{hoveredTask.durationWorkingDays}d</strong> ({hoveredTask.hours}h)
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  hoveredTask.status === "Completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : hoveredTask.status === "In Progress"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {hoveredTask.status || "Not Started"}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full text-gray-500 text-[11px]">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-blue-500 shrink-0" />
              <span>Hover over any task or milestone to inspect dates, assignees, effort & dependencies</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 font-medium">
              <span>{filteredTasks.length} Tasks visible</span>
              <span>•</span>
              <span>{project.totalWorkingDays || 0} Working Days</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
