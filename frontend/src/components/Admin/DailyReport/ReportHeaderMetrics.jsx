// frontend/src/components/Admin/DailyReport/ReportHeaderMetrics.jsx
import React from "react";
import { Clock, Building2, FolderKanban, Users as UsersIcon, Layers, RotateCw, Download } from "lucide-react";
import DateRangePicker from "../../../components/DateRangePicker.jsx";
import { formatHoursAndMins, formatHHMMSS, getLocalDateStr, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "./reportHelpers.js";

export default function ReportHeaderMetrics({
  from,
  to,
  setRange,
  unit,
  setUnit,
  loading,
  loadRaw,
  downloading,
  handleExportCSV,
  kpis,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Daily Work & Hours Report
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Detailed breakdown of company billing hours, project timelines, and employee activities.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Date Range & Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker from={from} to={to} onChange={(r) => setRange(r)} />

          <button
            onClick={() => {
              const t = getLocalDateStr(new Date());
              setRange({ from: t, to: t });
            }}
            className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Today
          </button>

          <button
            onClick={() => {
              const y = new Date();
              y.setDate(y.getDate() - 1);
              const yt = getLocalDateStr(y);
              setRange({ from: yt, to: yt });
            }}
            className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Yesterday
          </button>

          <button
            onClick={() => {
              const s = startOfWeek(new Date());
              const e = endOfWeek(new Date());
              setRange({ from: getLocalDateStr(s), to: getLocalDateStr(e) });
            }}
            className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            This Week
          </button>

          <button
            onClick={() => {
              const s = startOfMonth(new Date());
              const e = endOfMonth(new Date());
              setRange({ from: getLocalDateStr(s), to: getLocalDateStr(e) });
            }}
            className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            This Month
          </button>

          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="hours">Hours (h)</option>
            <option value="minutes">Minutes (m)</option>
          </select>

          <button
            onClick={loadRaw}
            disabled={loading}
            title="Refresh Report Data"
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={downloading}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{downloading ? "Exporting…" : "Export All CSV"}</span>
          </button>
        </div>
      </div>

      {/* 5 Top Summary Metric Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-blue-200/70 bg-blue-50/50 p-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700">
            <span>Total Hours Logged</span>
            <Clock className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-blue-900">
            {formatHoursAndMins(kpis.totalMinutes)}
          </div>
          <div className="text-[11px] font-semibold text-blue-700/80">
            {formatHHMMSS(kpis.totalMinutes)} elapsed
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Active Companies</span>
            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-900">
            {kpis.uniqueCompanies}
          </div>
          <div className="text-[11px] text-emerald-700/80">Client organizations</div>
        </div>

        <div className="rounded-2xl border border-sky-200/70 bg-sky-50/50 p-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-sky-700">
            <span>Active Projects</span>
            <FolderKanban className="h-3.5 w-3.5 text-sky-600" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-sky-900">
            {kpis.uniqueProjects}
          </div>
          <div className="text-[11px] text-sky-700/80">Projects with activity</div>
        </div>

        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700">
            <span>Active Employees</span>
            <UsersIcon className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-amber-900">
            {kpis.uniqueUsers}
          </div>
          <div className="text-[11px] text-amber-700/80">Logged work in range</div>
        </div>

        <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Recorded Sessions</span>
            <Layers className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">
            {kpis.totalSessions}
          </div>
          <div className="text-[11px] text-slate-500">Timer segments</div>
        </div>
      </div>
    </div>
  );
}
