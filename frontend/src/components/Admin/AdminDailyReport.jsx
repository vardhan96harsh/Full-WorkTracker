// frontend/src/components/Admin/AdminDailyReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { api } from "../../api.js";

// Modularized Subcomponents & Utilities
import { getLocalDateStr } from "./DailyReport/reportHelpers.js";
import {
  exportCompanyExcel as exportCompanyExcelUtil,
  exportByUserCSV as exportByUserCSVUtil,
  exportRawCSV as exportRawCSVUtil,
} from "./DailyReport/reportExporters.js";
import ReportHeaderMetrics from "./DailyReport/ReportHeaderMetrics.jsx";
import ReportFilterToolbar from "./DailyReport/ReportFilterToolbar.jsx";
import RawSessionTable from "./DailyReport/RawSessionTable.jsx";
import CompanyHoursTable from "./DailyReport/CompanyHoursTable.jsx";
import ProjectHoursTable from "./DailyReport/ProjectHoursTable.jsx";
import UserHoursTable from "./DailyReport/UserHoursTable.jsx";

export default function AdminDailyReport({ auth }) {
  /* ---------- state ---------- */
  const [{ from, to }, setRange] = useState(() => {
    const today = getLocalDateStr(new Date());
    return { from: today, to: today };
  });

  const [unit, setUnit] = useState("hours"); // default hours for management clarity

  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [machines, setMachines] = useState([]);

  const [filters, setFilters] = useState({
    company: "",
    category: "",
    project: "",
    user: "",
    machine: "",
  });

  // Tabs: "raw" | "company" | "project" | "user"
  const [tab, setTab] = useState("raw");
  const [tableSearch, setTableSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [downloading, setDownloading] = useState(false);

  const [expandedCompany, setExpandedCompany] = useState({});
  const [expandedUser, setExpandedUser] = useState({});
  const [expandedProject, setExpandedProject] = useState({});
  const [expandedProjectUser, setExpandedProjectUser] = useState({});
  const [toastMsg, setToastMsg] = useState("");

  function showToast(text) {
    setToastMsg(text);
    setTimeout(() => setToastMsg(""), 4000);
  }

  /* ---------- masters ---------- */
  async function loadMasters() {
    const [c, g, u] = await Promise.all([
      api("/api/companies", { token: auth.token }),
      api("/api/categories", { token: auth.token }),
      api("/api/users", { token: auth.token }),
    ]);
    setCompanies(c || []);
    setCategories(g || []);
    setUsers(
      (u || [])
        .filter((x) => x.role !== "admin")
        .map((x) => ({ ...x, _id: x._id ?? x.id }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  async function loadMachines() {
    try {
      const list = await api("/api/machines/options", { token: auth.token });
      setMachines(list || []);
    } catch {
      setMachines([]);
    }
  }

  async function loadProjects() {
    try {
      const qs = new URLSearchParams({
        ...(filters.company ? { company: filters.company } : {}),
        ...(filters.category ? { category: filters.category } : {}),
      }).toString();
      const list = await api(
        `/api/projects${qs ? `?${qs}` : ""}`,
        { token: auth.token }
      );
      setProjects(list || []);
    } catch {
      setProjects([]);
    }
  }

  /* ---------- data ---------- */
  async function loadRaw() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        from,
        to,
        ...(filters.company ? { company: filters.company } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.project ? { project: filters.project } : {}),
        ...(filters.user ? { user: filters.user } : {}),
        ...(filters.machine ? { machine: filters.machine } : {}),
      }).toString();

      const data = await api(`/api/work-sessions/admin/list?${qs}`, { token: auth.token });
      setRows(data || []);
      setExpanded({});
    } finally {
      setLoading(false);
    }
  }

  /* ---------- effects ---------- */
  useEffect(() => {
    loadMasters();
    loadMachines();
    loadProjects();
  }, []);

  useEffect(() => {
    loadProjects();
  }, [filters.company, filters.category]);

  useEffect(() => {
    loadRaw();
  }, [from, to, filters.company, filters.category, filters.project, filters.user, filters.machine]);

  /* ---------- KPI METRICS ---------- */
  const kpis = useMemo(() => {
    const totalMinutes = (rows || []).reduce((acc, r) => acc + (r.totalMinutes || 0), 0);
    const uniqueCompanies = new Set(
      (rows || []).map((r) => r.companyName).filter((c) => c && c !== "—")
    ).size;
    const uniqueProjects = new Set(
      (rows || []).map((r) => r.projectName).filter((p) => p && p !== "—")
    ).size;
    const uniqueUsers = new Set(
      (rows || []).map((r) => r.userId).filter(Boolean)
    ).size;
    const totalSessions = (rows || []).length;

    return {
      totalMinutes,
      uniqueCompanies,
      uniqueProjects,
      uniqueUsers,
      totalSessions,
    };
  }, [rows]);

  /* ---------- grouping for RAW ---------- */
  const grouped = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      const key = [r.date || "", r.userId || ""].join("|");

      if (!map.has(key)) {
        map.set(key, {
          key,
          date: r.date,
          userName: r.userName || "",
          companyName: r.companyName || "—",
          categoryName: r.categoryName || "—",
          totalMinutes: 0,
          reason: r.reason || "",
          pcs: new Set(),
          hostnameStr: "—",
          projects: {},
        });
      }

      const g = map.get(key);
      g.totalMinutes += r.totalMinutes || 0;

      const pc = r.machineInfo?.hostname || r.machineId || r.hostname || "";
      if (pc) {
        g.pcs.add(pc);
      }

      const pid = r.projectId || "unknown";
      const projKey = `${pid}_${r.taskId || r.taskTitle || "none"}`;

      if (!g.projects[projKey]) {
        g.projects[projKey] = {
          projectName: r.projectName || (r.customTask ? "(Custom Task)" : "—"),
          taskTitle: r.taskTitle || (r.customTask ? r.customTask : null),
          totalMinutes: 0,
          sessions: [],
        };
      }

      g.projects[projKey].totalMinutes += r.totalMinutes || 0;

      g.projects[projKey].sessions.push({
        status: r.status,
        taskTitle: r.taskTitle,
        remarks: r.remarks || "",
        manualRemarks: r.manualRemarks || [],
        segments: r.segments || [],
      });
    }

    for (const g of map.values()) {
      g.hostnameStr = g.pcs.size > 0 ? Array.from(g.pcs).join(", ") : "—";
    }

    let list = Array.from(map.values()).sort((a, b) => (a.date > b.date ? -1 : 1));

    if (tableSearch.trim()) {
      const s = tableSearch.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.userName.toLowerCase().includes(s) ||
          g.companyName.toLowerCase().includes(s) ||
          g.categoryName.toLowerCase().includes(s) ||
          Object.values(g.projects).some((p) => p.projectName.toLowerCase().includes(s))
      );
    }

    return list;
  }, [rows, tableSearch]);

  /* ---------- BY COMPANY TREE ---------- */
  const companiesTree = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      const cname = r.companyName && r.companyName !== "—" ? r.companyName : "General / Internal";
      const pid = r.projectId || "custom";
      const pname = r.projectName || (r.customTask ? "(Custom Task)" : "General Project");
      const uid = r.userId || r.userName || "unknown";
      const uname = r.userName || "Unknown";

      if (!map.has(cname)) {
        map.set(cname, {
          companyName: cname,
          totalMinutes: 0,
          projects: new Map(),
        });
      }

      const comp = map.get(cname);
      comp.totalMinutes += r.totalMinutes || 0;

      if (!comp.projects.has(pid)) {
        comp.projects.set(pid, {
          projectId: pid,
          projectName: pname,
          totalMinutes: 0,
          users: new Map(),
        });
      }

      const proj = comp.projects.get(pid);
      proj.totalMinutes += r.totalMinutes || 0;

      if (!proj.users.has(uid)) {
        proj.users.set(uid, {
          userId: uid,
          userName: uname,
          totalMinutes: 0,
        });
      }

      proj.users.get(uid).totalMinutes += r.totalMinutes || 0;
    }

    let list = Array.from(map.values())
      .map((c) => ({
        ...c,
        projects: Array.from(c.projects.values()).map((p) => ({
          ...p,
          users: Array.from(p.users.values()).sort((a, b) => b.totalMinutes - a.totalMinutes),
        })).sort((a, b) => b.totalMinutes - a.totalMinutes),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    if (tableSearch.trim()) {
      const s = tableSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.companyName.toLowerCase().includes(s) ||
          c.projects.some((p) => p.projectName.toLowerCase().includes(s))
      );
    }

    return list;
  }, [rows, tableSearch]);

  /* ---------- BY USER WITH PROJECTS ---------- */
  const byUserWithProjects = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      if (!r.userId) continue;

      if (!map.has(r.userId)) {
        map.set(r.userId, {
          userId: r.userId,
          userName: r.userName || "—",
          companyName: r.companyName || "—",
          totalMinutes: 0,
          projects: new Map(),
        });
      }

      const user = map.get(r.userId);
      user.totalMinutes += r.totalMinutes || 0;

      const pid = r.projectId || "custom";
      const pname = r.projectName || "(Custom Task)";

      if (!user.projects.has(pid)) {
        user.projects.set(pid, {
          projectId: pid,
          projectName: pname,
          totalMinutes: 0,
        });
      }

      user.projects.get(pid).totalMinutes += r.totalMinutes || 0;
    }

    let list = Array.from(map.values()).map((u) => ({
      ...u,
      projects: Array.from(u.projects.values()).sort((a, b) => b.totalMinutes - a.totalMinutes),
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);

    if (tableSearch.trim()) {
      const s = tableSearch.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.userName.toLowerCase().includes(s) ||
          u.projects.some((p) => p.projectName.toLowerCase().includes(s))
      );
    }

    return list;
  }, [rows, tableSearch]);

  /* ---------- PROJECTS TREE ---------- */
  const projectsTree = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      const pid = r.projectId || "custom";
      const pname = r.projectName || "(Custom Task)";
      const cname = r.companyName || "—";
      const uid = r.userId || r.userName;
      const uname = r.userName || "—";

      if (!map.has(pid)) {
        map.set(pid, {
          projectId: pid,
          projectName: pname,
          companyName: cname,
          totalMinutes: 0,
          users: new Map(),
        });
      }

      const proj = map.get(pid);
      proj.totalMinutes += r.totalMinutes || 0;

      if (!proj.users.has(uid)) {
        proj.users.set(uid, {
          userId: uid,
          userName: uname,
          totalMinutes: 0,
          dates: [],
        });
      }

      const user = proj.users.get(uid);
      user.totalMinutes += r.totalMinutes || 0;

      user.dates.push({
        date: r.date,
        minutes: r.totalMinutes || 0,
      });
    }

    let list = Array.from(map.values())
      .map((p) => ({
        ...p,
        users: Array.from(p.users.values()).sort((a, b) => b.totalMinutes - a.totalMinutes),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    if (tableSearch.trim()) {
      const s = tableSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.projectName.toLowerCase().includes(s) ||
          p.companyName.toLowerCase().includes(s) ||
          p.users.some((u) => u.userName.toLowerCase().includes(s))
      );
    }

    return list;
  }, [rows, tableSearch]);

  // Export handlers
  const handleExportCSV = () =>
    exportRawCSVUtil({ from, to, unit, filters, token: auth.token, showToast, setDownloading });

  const exportCompanyExcel = () =>
    exportCompanyExcelUtil({ companiesTree, unit, from, to, showToast });

  const exportByUserCSV = () =>
    exportByUserCSVUtil({ byUserWithProjects, unit, from, to, showToast });

  const tabCounts = {
    raw: grouped.length,
    company: companiesTree.length,
    project: projectsTree.length,
    user: byUserWithProjects.length,
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card & Metrics */}
      <ReportHeaderMetrics
        from={from}
        to={to}
        setRange={setRange}
        unit={unit}
        setUnit={setUnit}
        loading={loading}
        loadRaw={loadRaw}
        downloading={downloading}
        handleExportCSV={handleExportCSV}
        kpis={kpis}
      />

      {/* Filter Control Box & Tab Switcher */}
      <ReportFilterToolbar
        filters={filters}
        setFilters={setFilters}
        companies={companies}
        categories={categories}
        projects={projects}
        users={users}
        machines={machines}
        tableSearch={tableSearch}
        setTableSearch={setTableSearch}
        tab={tab}
        setTab={setTab}
        tabCounts={tabCounts}
      />

      {/* TAB 1: RAW SESSIONS */}
      {tab === "raw" && (
        <RawSessionTable
          grouped={grouped}
          loading={loading}
          unit={unit}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      )}

      {/* TAB 2: BY COMPANY */}
      {tab === "company" && (
        <CompanyHoursTable
          companiesTree={companiesTree}
          loading={loading}
          unit={unit}
          expandedCompany={expandedCompany}
          setExpandedCompany={setExpandedCompany}
          exportCompanyExcel={exportCompanyExcel}
        />
      )}

      {/* TAB 3: BY PROJECT */}
      {tab === "project" && (
        <ProjectHoursTable
          projectsTree={projectsTree}
          loading={loading}
          unit={unit}
          from={from}
          to={to}
          expandedProject={expandedProject}
          setExpandedProject={setExpandedProject}
          expandedProjectUser={expandedProjectUser}
          setExpandedProjectUser={setExpandedProjectUser}
        />
      )}

      {/* TAB 4: BY USER */}
      {tab === "user" && (
        <UserHoursTable
          byUserWithProjects={byUserWithProjects}
          loading={loading}
          unit={unit}
          expandedUser={expandedUser}
          setExpandedUser={setExpandedUser}
          exportByUserCSV={exportByUserCSV}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 border border-slate-700 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <AlertCircle size={15} className="text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg("")}
            className="ml-2 text-slate-400 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
