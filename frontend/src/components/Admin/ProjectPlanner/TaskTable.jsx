import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { CalendarEngine } from "../../../plannerEngine/calendarEngine.js";
import ExportPlanDropdown from "./ExportPlanDropdown.jsx";

const STATUS_CLASSES = {
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Review: "bg-purple-50 text-purple-700 border-purple-200",
  "Not Started": "bg-gray-50 text-gray-700 border-gray-200",
  Blocked: "bg-rose-50 text-rose-700 border-rose-200",
  "On Hold": "bg-amber-50 text-amber-700 border-amber-200",
};

export default function TaskTable({ project, onStatusChange, onEditTask }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredTasks = useMemo(() => {
    if (!project || !Array.isArray(project.tasks)) return [];
    return project.tasks.filter((t) => {
      if (roleFilter !== "ALL" && (t.roleCategory || "").toUpperCase() !== roleFilter.toUpperCase()) {
        return false;
      }
      if (statusFilter !== "ALL" && (t.status || "Not Started") !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (t.name || "").toLowerCase().includes(q);
        const matchPhase = (t.phaseName || "").toLowerCase().includes(q);
        const matchRole = (t.role || t.roleCategory || "").toLowerCase().includes(q);
        if (!matchName && !matchPhase && !matchRole) return false;
      }
      return true;
    });
  }, [project?.tasks, roleFilter, statusFilter, search]);

  if (!project) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden flex flex-col space-y-4 p-5">
      {/* FILTER TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, phases, roles..."
              className="h-9 w-60 rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Completed">Completed</option>
            <option value="Blocked">Blocked</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400">
            Showing <strong>{filteredTasks.length}</strong> of {project.tasks?.length || 0} tasks
          </span>
          <ExportPlanDropdown plan={project} variant="compact" label="Export Tasks" align="right" />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="bg-gray-50 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Task Name & Phase</th>
              <th className="py-3 px-4">Role / Assignee</th>
              <th className="py-3 px-3">Start Date</th>
              <th className="py-3 px-3">End Date</th>
              <th className="py-3 px-3 text-center">Days</th>
              <th className="py-3 px-3 text-center">Effort</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-3 text-center">Critical</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTasks.map((t) => {
              const currentStatus = t.status || "Not Started";
              return (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50/80 transition"
                >
                  {/* Task Name & Phase */}
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span>{t.name}</span>
                        {t.isManualOverride && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-700">
                            Override
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">{t.phaseName}</p>
                    </div>
                  </td>

                  {/* Role / Assignee */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {t.roleCategory || t.role}
                      </span>
                      {t.assignedResource?.name && (
                        <span className="text-xs text-gray-600">
                          {t.assignedResource.name}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Dates */}
                  <td className="py-3 px-3 font-medium whitespace-nowrap text-gray-600">
                    {CalendarEngine.formatDisplayDate(t.startDate)}
                  </td>
                  <td className="py-3 px-3 font-medium whitespace-nowrap text-gray-600">
                    {CalendarEngine.formatDisplayDate(t.endDate)}
                  </td>

                  {/* Days */}
                  <td className="py-3 px-3 text-center font-bold text-gray-800">
                    {t.durationWorkingDays}d
                  </td>

                  {/* Hours */}
                  <td className="py-3 px-3 text-center font-semibold text-gray-600">
                    {t.hours}h
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-3 px-4">
                    <select
                      value={currentStatus}
                      onChange={(e) => onStatusChange && onStatusChange(t.id, e.target.value)}
                      className={`h-7 rounded-lg border px-2 text-[11px] font-bold outline-none cursor-pointer ${
                        STATUS_CLASSES[currentStatus] || STATUS_CLASSES["Not Started"]
                      }`}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                      <option value="Blocked">Blocked</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </td>

                  {/* Critical Path Badge */}
                  <td className="py-3 px-3 text-center">
                    {t.criticalPath ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                        <Sparkles size={10} />
                        CPM
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
