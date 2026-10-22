// frontend/src/components/Admin/ProjectPlanner/ExportPlanDropdown.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  ListTodo,
  CalendarRange,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  exportCompleteProjectPlanExcel,
  exportTaskBreakdownCSV,
  exportGanttTimelineCSV,
  exportProductionKpisCSV,
} from "../../../plannerEngine/projectPlanExporter.js";

export default function ExportPlanDropdown({
  plan,
  variant = "outline", // 'outline' | 'primary' | 'icon' | 'compact'
  label = "Download Plan",
  align = "right", // 'right' | 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!plan) return null;

  const handleExport = (type) => {
    try {
      if (type === "all-excel") {
        exportCompleteProjectPlanExcel(plan);
        setDownloadSuccess("Complete Excel Plan downloaded");
      } else if (type === "wbs-csv") {
        exportTaskBreakdownCSV(plan);
        setDownloadSuccess("Task Breakdown CSV downloaded");
      } else if (type === "gantt-csv") {
        exportGanttTimelineCSV(plan);
        setDownloadSuccess("Gantt Timeline CSV downloaded");
      } else if (type === "kpi-csv") {
        exportProductionKpisCSV(plan);
        setDownloadSuccess("Production KPIs CSV downloaded");
      }
      setTimeout(() => setDownloadSuccess(""), 3000);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export file. Please verify plan data.");
    } finally {
      setIsOpen(false);
    }
  };

  // Button styling based on variant
  let buttonClasses = "";
  if (variant === "primary") {
    buttonClasses =
      "flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition cursor-pointer whitespace-nowrap";
  } else if (variant === "icon") {
    buttonClasses =
      "rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer shadow-2xs";
  } else if (variant === "compact") {
    buttonClasses =
      "flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer shadow-2xs whitespace-nowrap";
  } else {
    // Standard outline
    buttonClasses =
      "flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer shadow-xs whitespace-nowrap";
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={buttonClasses}
        title="Download Project Plan (Excel / CSV)"
      >
        <Download size={variant === "icon" ? 13 : 14} className={variant === "primary" ? "text-emerald-100" : "text-emerald-600"} />
        {variant !== "icon" && <span>{downloadSuccess || label}</span>}
        {variant !== "icon" && <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-fade-in ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Header */}
          <div className="border-b border-gray-100 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Download Project Deliverables
            </span>
            <span className="text-xs font-bold text-gray-800 truncate block mt-0.5">
              {plan.project?.name || plan.projectName || "Course Plan"}
            </span>
          </div>

          <div className="py-1 space-y-1">
            {/* 1. Complete Excel Workbook */}
            <button
              onClick={() => handleExport("all-excel")}
              className="w-full flex items-start gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-emerald-50 transition cursor-pointer group"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200">
                <FileSpreadsheet size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-900">
                    Complete Plan (Excel)
                  </span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                    .XLSX
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-1">
                  KPIs, Task Breakdown Grid (WBS) & Gantt Timeline
                </p>
              </div>
            </button>

            {/* 2. Task Breakdown Grid (WBS) CSV */}
            <button
              onClick={() => handleExport("wbs-csv")}
              className="w-full flex items-start gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-blue-50 transition cursor-pointer group"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-200">
                <ListTodo size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900 group-hover:text-blue-900">
                    Task Breakdown Grid (WBS)
                  </span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-800">
                    .CSV
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-1">
                  All module tasks, roles, hours & dependencies
                </p>
              </div>
            </button>

            {/* 3. Gantt Timeline Schedule CSV */}
            <button
              onClick={() => handleExport("gantt-csv")}
              className="w-full flex items-start gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-purple-50 transition cursor-pointer group"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-200">
                <CalendarRange size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900 group-hover:text-purple-900">
                    Gantt Timeline Schedule
                  </span>
                  <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-800">
                    .CSV
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-1">
                  Sequential timeline dates, duration & critical path
                </p>
              </div>
            </button>

            {/* 4. Production KPIs & Pipelining CSV */}
            <button
              onClick={() => handleExport("kpi-csv")}
              className="w-full flex items-start gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-indigo-50 transition cursor-pointer group"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200">
                <BarChart3 size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-900">
                    Production KPIs & Pipelining
                  </span>
                  <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[9px] font-bold text-indigo-800">
                    .CSV
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-1">
                  Effort variance, role capacity & stage progress
                </p>
              </div>
            </button>
          </div>

          <div className="border-t border-gray-100 pt-2 px-3 pb-1 text-[10px] text-gray-400">
            Compatible with MS Excel, Google Sheets, MS Project, Jira & Asana
          </div>
        </div>
      )}
    </div>
  );
}
