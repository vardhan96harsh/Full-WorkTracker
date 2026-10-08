// frontend/src/components/Admin/DailyReport/ReportFilterToolbar.jsx
import React from "react";
import { X, Search } from "lucide-react";

export default function ReportFilterToolbar({
  filters,
  setFilters,
  companies,
  categories,
  projects,
  users,
  machines,
  tableSearch,
  setTableSearch,
  tab,
  setTab,
  tabCounts,
}) {
  const hasActiveFilters = Boolean(
    filters.company || filters.category || filters.project || filters.user || filters.machine
  );

  return (
    <>
      {/* Filter Control Box */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Filter Records</h3>
            {hasActiveFilters && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                Filters Active
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilters({
                  company: "",
                  category: "",
                  project: "",
                  user: "",
                  machine: "",
                });
                setTableSearch("");
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Company */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Company
            </label>
            <select
              value={filters.company}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  company: e.target.value,
                  category: "",
                  project: "",
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Companies ({companies.length})</option>
              {companies.map((c) => (
                <option key={c._id ?? c.id ?? c.name} value={c._id ?? c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value, project: "" })
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((g) => (
                <option key={g._id ?? g.id ?? g.name} value={g._id ?? g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Project
            </label>
            <select
              value={filters.project}
              onChange={(e) =>
                setFilters({ ...filters, project: e.target.value })
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p._id ?? p.id ?? p.name} value={p._id ?? p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Employee
            </label>
            <select
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Employees ({users.length})</option>
              {users.map((u) => {
                const key = u._id ?? u.id ?? u.email ?? u.name;
                const value = u._id ?? u.id ?? u.email;
                return (
                  <option key={String(key)} value={value}>
                    {u.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Machine */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Machine / PC
            </label>
            <select
              value={filters.machine}
              onChange={(e) =>
                setFilters({ ...filters, machine: e.target.value })
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Machines ({machines.length})</option>
              {machines.map((m) => (
                <option key={String(m.value)} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs + Search Box */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap rounded-2xl bg-slate-100 p-1.5">
          {[
            { id: "raw", label: "Raw Sessions", count: tabCounts.raw },
            { id: "company", label: "By Company", count: tabCounts.company },
            { id: "project", label: "By Project", count: tabCounts.project },
            { id: "user", label: "By User", count: tabCounts.user },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                tab === item.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  tab === item.id
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {/* In-report instant search box */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search in visible records…"
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500"
          />
          {tableSearch && (
            <button
              onClick={() => setTableSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
