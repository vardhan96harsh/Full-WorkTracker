// frontend/src/components/Admin/AdminTemplates.jsx
import React, { useState, useMemo } from "react";
import {
  Layers,
  Film,
  Smartphone,
  Video,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Users,
  Repeat,
  Sparkles,
  Info,
} from "lucide-react";
import { DEFAULT_TEMPLATES } from "../../plannerEngine/defaultTemplates.js";

const TEMPLATE_ICONS = {
  "storyline-360": Film,
  "rise-360": Smartphone,
  "mp4-video": Video,
  "pdf-graphic": FileText,
};

const TEMPLATE_TAGS = {
  "storyline-360": "Custom eLearning",
  "rise-360": "Rapid Microlearning",
  "mp4-video": "Motion & Animation",
  "pdf-graphic": "Document & Visual",
};

const ROLE_COLORS = {
  "Project Manager": {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  "Instructional Designer": {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  "Visual Designer": {
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
  },
  "Course Developer": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  Animator: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  "QA Specialist": {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
  },
  "Voiceover Artist": {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
  },
  "Client Stakeholder": {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
  },
};

export default function AdminTemplates({
  auth,
  selectedTemplateId: externalSelectedId,
  onSelectTemplate,
}) {
  const [internalSelectedId, setInternalSelectedId] = useState(
    DEFAULT_TEMPLATES[0]?.id || "storyline-360"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const activeTemplateId = externalSelectedId || internalSelectedId;

  const handleSelectTemplate = (id) => {
    setInternalSelectedId(id);
    if (onSelectTemplate) {
      onSelectTemplate(id);
    }
    setSearchQuery("");
    setRoleFilter("ALL");
  };

  const currentTemplate = useMemo(() => {
    return (
      DEFAULT_TEMPLATES.find((t) => t.id === activeTemplateId) ||
      DEFAULT_TEMPLATES[0]
    );
  }, [activeTemplateId]);

  // Extract all distinct roles present in current template
  const availableRoles = useMemo(() => {
    if (!currentTemplate) return [];
    const roles = new Set();
    currentTemplate.phases.forEach((p) => {
      p.tasks.forEach((t) => {
        if (t.role) roles.add(t.role);
      });
    });
    return Array.from(roles);
  }, [currentTemplate]);

  // Filter tasks in current template based on search and role
  const filteredPhases = useMemo(() => {
    if (!currentTemplate) return [];
    const q = searchQuery.trim().toLowerCase();

    return currentTemplate.phases
      .map((phase) => {
        const matchingTasks = phase.tasks.filter((t) => {
          const matchesQuery =
            !q ||
            t.name.toLowerCase().includes(q) ||
            (t.role && t.role.toLowerCase().includes(q));

          const matchesRole =
            roleFilter === "ALL" || t.role === roleFilter;

          return matchesQuery && matchesRole;
        });

        return {
          ...phase,
          tasks: matchingTasks,
        };
      })
      .filter((phase) => phase.tasks.length > 0);
  }, [currentTemplate, searchQuery, roleFilter]);

  // Calculate statistics for the active template
  const stats = useMemo(() => {
    if (!currentTemplate)
      return {
        totalPhases: 0,
        modulePhases: 0,
        projectPhases: 0,
        totalTasks: 0,
        totalRoles: 0,
      };
    const totalPhases = currentTemplate.phases.length;
    const modulePhases = currentTemplate.phases.filter(
      (p) => p.isModuleLevel
    ).length;
    let totalTasks = 0;
    currentTemplate.phases.forEach((p) => {
      totalTasks += p.tasks.length;
    });

    return {
      totalPhases,
      modulePhases,
      projectPhases: totalPhases - modulePhases,
      totalTasks,
      totalRoles: availableRoles.length,
    };
  }, [currentTemplate, availableRoles]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <Layers size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span>Project Workflow Templates</span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                Project Plan Engine
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Production workflows, modular pipelining, task dependencies, and role staffing baselines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <Sparkles size={12} className="text-blue-600" />
            4 Core Delivery Templates
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Repeat size={12} />
            Module-Level Pipelining
          </span>
        </div>
      </div>

      {/* Main 2-Column Split Layout matching Project Plan Tool's TemplateManager */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* LEFT PANEL: TEMPLATES LIST */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs space-y-3">
          <div className="px-2 pt-1 pb-2 border-b border-gray-100">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Workflow Templates
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Select a template to view phases & tasks
            </div>
          </div>

          <div className="space-y-1.5">
            {DEFAULT_TEMPLATES.map((tpl) => {
              const isSelected = tpl.id === activeTemplateId;
              const Icon = TEMPLATE_ICONS[tpl.id] || Layers;
              const tag = TEMPLATE_TAGS[tpl.id] || "Workflow";
              const modulePhaseCount = tpl.phases.filter((p) => p.isModuleLevel).length;

              return (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-400 shadow-xs ring-1 ring-blue-400/30"
                      : "bg-white border-gray-150 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-sm font-bold truncate ${
                          isSelected ? "text-blue-900" : "text-gray-900"
                        }`}
                      >
                        {tpl.name}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {tag}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                          isSelected
                            ? "bg-blue-200/70 text-blue-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {tpl.phases.length} Phases
                      </span>

                      {modulePhaseCount > 0 && (
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {modulePhaseCount} Repeat
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <ArrowRight
                      size={15}
                      className="text-blue-600 shrink-0 self-center"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Architectural Info in Left Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2 mt-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info size={14} className="text-blue-600" />
              <span>Pipelining Logic</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>Module-Level Phases:</strong> Automatically clone and repeat per module count (Module 1, 2, ... N) in the Gantt engine with staggered pipeline scheduling.
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>Project-Level Phases:</strong> Execute only once for the entire project (Kickoff, Final Gold Signoff, Handover).
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: SELECTED TEMPLATE DETAILS */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-5 overflow-hidden">
          {/* Active Template Header Banner */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                    {currentTemplate.name}
                  </h3>
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Default Template
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                  {currentTemplate.description}
                </p>
              </div>

              {/* Template Quick Stats */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-center">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">
                    Phases
                  </div>
                  <div className="text-sm font-bold text-gray-800">
                    {stats.totalPhases}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-center">
                  <div className="text-[10px] text-amber-700 font-semibold uppercase">
                    Repeat Modules
                  </div>
                  <div className="text-sm font-bold text-amber-800">
                    {stats.modulePhases}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-center">
                  <div className="text-[10px] text-blue-700 font-semibold uppercase">
                    Tasks
                  </div>
                  <div className="text-sm font-bold text-blue-800">
                    {stats.totalTasks}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg text-center">
                  <div className="text-[10px] text-purple-700 font-semibold uppercase">
                    Roles
                  </div>
                  <div className="text-sm font-bold text-purple-800">
                    {stats.totalRoles}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search phase name or task description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={15} className="text-gray-400 shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto font-medium"
              >
                <option value="ALL">All Roles ({availableRoles.length})</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Phase Breakdown & Tasks Header */}
          <div className="flex items-center justify-between pt-1">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Phase Breakdown & Tasks ({filteredPhases.length} Phases Showing)
            </h4>
            <span className="text-[11px] text-gray-400">
              Ordered in chronological dependency execution
            </span>
          </div>

          {/* Phases List */}
          <div className="space-y-4">
            {filteredPhases.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                <Search size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-600">
                  No tasks or phases match your filter
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Try clearing the search query or changing the role filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("ALL");
                  }}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredPhases.map((phase, pIdx) => {
                const isModuleLevel = phase.isModuleLevel;

                return (
                  <div
                    key={phase.id || `phase-${pIdx}`}
                    className={`border rounded-xl p-4 transition-all duration-150 ${
                      isModuleLevel
                        ? "bg-amber-50/20 border-amber-200/70"
                        : "bg-slate-50/40 border-slate-200"
                    }`}
                  >
                    {/* Phase Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200/70">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {pIdx + 1}
                        </span>
                        <div>
                          <strong className="text-sm font-bold text-gray-900">
                            {phase.name}
                          </strong>
                          <span className="text-xs text-gray-500 ml-2">
                            ({phase.tasks.length} {phase.tasks.length === 1 ? "task" : "tasks"})
                          </span>
                        </div>
                      </div>

                      <div>
                        {isModuleLevel ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                            <Repeat size={12} />
                            Repeats Per Module
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                            <CheckCircle2 size={12} />
                            Project-Level Phase
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tasks List */}
                    <div className="mt-3 pl-3 sm:pl-4 border-l-2 border-gray-300/80 space-y-2.5">
                      {phase.tasks.map((task) => {
                        const roleStyle =
                          ROLE_COLORS[task.role] || {
                            bg: "bg-gray-100",
                            text: "text-gray-700",
                            border: "border-gray-200",
                          };
                        const isClientReview =
                          task.role === "Client Stakeholder" ||
                          task.isMilestone ||
                          task.defaultDays;
                        const hasDynamicRate = Boolean(task.rateKey);

                        return (
                          <div
                            key={task.id}
                            className="bg-white border border-gray-200/80 hover:border-gray-300 rounded-lg p-2.5 px-3 flex flex-col md:flex-row md:items-center justify-between gap-2 transition-shadow duration-150 hover:shadow-2xs"
                          >
                            <div className="flex items-start sm:items-center gap-2 min-w-0">
                              <span className="text-gray-400 font-bold select-none text-base leading-none">
                                •
                              </span>
                              <span className="font-semibold text-xs text-gray-900 leading-snug">
                                {task.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                              {/* Role Badge */}
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                              >
                                {task.role || "Unassigned"}
                              </span>

                              {/* Effort / Turnaround Badge */}
                              {isClientReview ? (
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    <Clock size={11} />
                                    {task.defaultDays || 2}d turnaround
                                  </span>
                                </div>
                              ) : hasDynamicRate ? (
                                <div className="text-right">
                                  <span
                                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                                    title={`Dynamic complexity scaling using rate key: ${task.rateKey}`}
                                  >
                                    <Sparkles size={11} />
                                    Dynamic Scale
                                  </span>
                                </div>
                              ) : (
                                <div className="text-right">
                                  <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                    {task.defaultHours || 7}h default
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
