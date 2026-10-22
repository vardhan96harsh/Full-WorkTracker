import React, { useEffect, useState } from "react";
import {
  Building2,
  Tags,
  FolderKanban,
  CalendarRange,
  Sliders,
  Users as UsersIcon,
  BarChart3,
  FileClock,
  CalendarDays,
  LogOut,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Bell,
  BellOff,
  CheckCircle2,
} from "lucide-react";
import { api } from "../../api.js";
import Companies from "./Companies.jsx";
import Categories from "./Categories.jsx";
import Projects from "./Projects.jsx";
import ProjectPlanner from "./ProjectPlanner/ProjectPlanner.jsx";
import AdminComplexity from "./AdminComplexity.jsx";
import AdminTemplates from "./AdminTemplates.jsx";
import Users from "./Users.jsx";
import AdminDailyReport from "./AdminDailyReport.jsx";
import AdminManualTasks from "./AdminManualTasks.jsx";
import AdminCalendar from "./AdminSidebarCalendar.jsx";
import BirthdayBanner from "../Employee/Worktimer/BirthdayBanner.jsx";
import MyProfileModal from "../Employee/MyProfileModal.jsx";
import AdminPausedSessionNotifier from "./AdminPausedSessionNotifier.jsx";
import logoImg from "../../assets/logo.png";

const TABS = [
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "categories", label: "Categories", icon: Tags },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "planner", label: "Project Plan", icon: CalendarRange },
  { key: "complexity", label: "Complexity", icon: Sliders },
  { key: "templates", label: "Project Templates", icon: Layers },
  { key: "users", label: "Users", icon: UsersIcon },
  { key: "dailyReport", label: "Daily Report", icon: BarChart3 },
  { key: "manualTasks", label: "Manual Time Requests", icon: FileClock },
  { key: "calendar", label: "Holiday Calendar", icon: CalendarDays },
];

export default function Admin({ auth, onLogout }) {
  const [tab, setTab] = useState("companies");
  const [pendingManualCount, setPendingManualCount] = useState(0);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [pauseAlertsEnabled, setPauseAlertsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("wt_admin_pause_alerts_enabled");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const [pausedAlertsCount, setPausedAlertsCount] = useState(0);
  const [isAlertsMenuOpen, setIsAlertsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAlertsMenuOpen) return;
    const handleOutsideClick = () => setIsAlertsMenuOpen(false);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isAlertsMenuOpen]);

  const togglePauseAlerts = () => {
    setPauseAlertsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("wt_admin_pause_alerts_enabled", String(next));
      } catch {}
      window.dispatchEvent(
        new CustomEvent("wt:adminPauseAlertsChanged", { detail: { enabled: next } })
      );
      return next;
    });
  };

  useEffect(() => {
    const handleAlertsToggle = (e) => {
      if (typeof e?.detail?.enabled === "boolean") {
        setPauseAlertsEnabled(e.detail.enabled);
      }
    };
    window.addEventListener("wt:adminPauseAlertsChanged", handleAlertsToggle);
    return () => window.removeEventListener("wt:adminPauseAlertsChanged", handleAlertsToggle);
  }, []);

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("wt_theme") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    if (!auth?.token) return;
    let isMounted = true;

    async function loadPendingCount() {
      try {
        const res = await api("/api/manual-remarks/admin/pending-count", {
          token: auth.token,
        });
        if (isMounted && typeof res?.count === "number") {
          setPendingManualCount(res.count);
        }
      } catch (err) {
        console.error("Failed to load pending manual count:", err);
      }
    }

    async function loadBirthdays() {
      try {
        const res = await api("/api/users/birthdays/today", { token: auth.token });
        if (isMounted && Array.isArray(res)) {
          setTodayBirthdays(res);
        }
      } catch (err) {
        console.log("Birthday load error:", err);
      }
    }

    loadPendingCount();
    loadBirthdays();
    const interval = setInterval(loadPendingCount, 25000);
    const handleRefresh = () => loadPendingCount();
    window.addEventListener("manualRemarks:refresh", handleRefresh);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("manualRemarks:refresh", handleRefresh);
    };
  }, [auth?.token]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("wt_theme", theme);
    } catch {}
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden text-gray-800">

      {/* HEADER - MATCHING USER SIDE */}
      <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-full flex items-center justify-between px-6">

          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="WorkTracker"
              className="w-9 h-9 rounded-xl object-contain shadow-xs border border-gray-100 bg-white"
            />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              WorkTracker
            </h1>
          </div>

          {/* User Info + Logout */}
          {/* Header Actions: Notification Bell + User Profile Dossier */}
          <div className="flex items-center gap-3">
            {/* 🔔 Notification Bell Button with Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAlertsMenuOpen((prev) => !prev);
                }}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center relative transition-all cursor-pointer shadow-2xs ${
                  pausedAlertsCount > 0
                    ? "bg-rose-50 border-rose-300 text-rose-600 hover:bg-rose-100/80"
                    : pauseAlertsEnabled
                    ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900"
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                }`}
                title={
                  pauseAlertsEnabled
                    ? `Session Alerts: ON (${pausedAlertsCount} paused >=10m). Click to manage.`
                    : "Session Alerts: OFF. Click to manage."
                }
              >
                {pauseAlertsEnabled ? (
                  <Bell size={17} strokeWidth={2.2} />
                ) : (
                  <BellOff size={17} strokeWidth={2} />
                )}

                {/* Glowing Red Badge when sessions are paused >= 10m */}
                {pauseAlertsEnabled && pausedAlertsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-extrabold text-[10px] border-2 border-white shadow-xs animate-bounce">
                    {pausedAlertsCount}
                  </span>
                )}

                {/* Subtle emerald active pip when alerts are enabled and 0 paused */}
                {pauseAlertsEnabled && pausedAlertsCount === 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                )}
              </button>

              {/* Quick Settings & Alerts Popover Dropdown */}
              {isAlertsMenuOpen && (
                <div
                  className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none ring-1 ring-slate-900/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                        <Bell size={14} />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block leading-tight">
                          Session Alerts
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Paused &ge; 10 minutes
                        </span>
                      </div>
                    </div>

                    {/* Quick ON / OFF Toggle */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={togglePauseAlerts}
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
                          pauseAlertsEnabled ? "bg-blue-600" : "bg-slate-300"
                        }`}
                        title={pauseAlertsEnabled ? "Turn OFF alerts" : "Turn ON alerts"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            pauseAlertsEnabled ? "translate-x-3" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-[10px] font-bold text-slate-700 w-6">
                        {pauseAlertsEnabled ? "ON" : "OFF"}
                      </span>
                    </div>
                  </div>

                  <div className="py-2.5 text-xs">
                    {!pauseAlertsEnabled ? (
                      <div className="text-center py-2 text-slate-400 text-xs">
                        Alert notifications are turned OFF.
                      </div>
                    ) : pausedAlertsCount > 0 ? (
                      <div className="text-rose-600 font-semibold text-xs flex items-center gap-2 py-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                        <span>
                          {pausedAlertsCount} employee session{pausedAlertsCount > 1 ? "s" : ""} paused &ge; 10m
                        </span>
                      </div>
                    ) : (
                      <div className="text-emerald-600 font-medium text-xs flex items-center gap-2 py-1">
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        <span>All active sessions running smoothly.</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 text-[10px]">Bottom-right popup alert</span>
                    <button
                      type="button"
                      onClick={() => setIsAlertsMenuOpen(false)}
                      className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer text-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 👤 Super Admin / Admin Profile Button */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-left shadow-2xs ${
                auth?.user?.role === "superadmin"
                  ? "bg-purple-50/70 border-purple-200 hover:bg-purple-100/70 text-purple-900 hover:border-purple-300"
                  : "bg-blue-50/70 border-blue-200 hover:bg-blue-100/70 text-blue-900 hover:border-blue-300"
              }`}
              title="View your personal dossier and official records in full screen"
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border ${
                  auth?.user?.role === "superadmin"
                    ? "bg-purple-100 border-purple-200 text-purple-700"
                    : "bg-blue-100 border-blue-200 text-blue-700"
                }`}
              >
                {auth?.user?.role === "superadmin" ? (
                  <ShieldAlert size={14} className="text-purple-600" />
                ) : (
                  <ShieldCheck size={14} className="text-blue-600" />
                )}
              </div>

              <span className="font-bold text-xs tracking-tight">
                {auth?.user?.role === "superadmin" ? "Super Admin" : "Admin"}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR - MATCHING USER SIDE */}
        <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col justify-between overflow-hidden">
          <div className="p-3 space-y-1 overflow-y-auto flex-1">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = tab === key;

              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-blue-50 text-blue-700 shadow-sm font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {Icon && (
                      <Icon
                        size={18}
                        strokeWidth={2}
                        className={active ? "text-blue-600" : "text-gray-500"}
                      />
                    )}
                    <span className="truncate">{label}</span>
                  </div>

                  {key === "manualTasks" && pendingManualCount > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-800"
                      } shadow-sm shrink-0 ml-1.5`}
                      title={`${pendingManualCount} pending requests`}
                    >
                      {pendingManualCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* BOTTOM LEFT LOGOUT */}
          <div className="p-3 border-t border-gray-200 bg-white shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 cursor-pointer"
              title="Sign out of WorkTracker"
            >
              <LogOut size={18} strokeWidth={2} className="text-red-500" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-3">

          <div className="mx-auto space-y-3">

            {tab === "companies" && (
              <Companies auth={auth} />
            )}

            {tab === "categories" && (
              <Categories auth={auth} />
            )}

            {tab === "projects" && (
              <Projects auth={auth} />
            )}

            {tab === "planner" && (
              <ProjectPlanner
                auth={auth}
                onOpenComplexityTab={() => setTab("complexity")}
              />
            )}

            {tab === "complexity" && (
              <AdminComplexity auth={auth} />
            )}

            {tab === "templates" && (
              <AdminTemplates auth={auth} />
            )}

            {tab === "users" && (
              <Users auth={auth} />
            )}

            {tab === "dailyReport" && (
              <AdminDailyReport auth={auth} />
            )}

            {tab === "manualTasks" && (
              <AdminManualTasks auth={auth} />
            )}

            {tab === "calendar" && (
              <AdminCalendar auth={auth} />
            )}

          </div>
        </main>

      </div>

      {/* FLOATING BIRTHDAY CELEBRATION CARD */}
      <BirthdayBanner todayBirthdays={todayBirthdays} />

      {/* 🔔 FLOATING PAUSED SESSIONS NOTIFIER (LEFT POPUP >= 10m) */}
      <AdminPausedSessionNotifier
        auth={auth}
        onAlertCountChange={setPausedAlertsCount}
      />

      {/* 🌟 FULL-SCREEN PROFILE DOSSIER */}
      <MyProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        auth={auth}
        onLogout={onLogout}
      />
    </div>
  );
}