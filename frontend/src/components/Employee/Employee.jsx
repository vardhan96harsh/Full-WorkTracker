import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ListTodo,
  FileClock,
  CalendarDays,
  LogOut,
  User,
} from "lucide-react";
import { api } from "../../api.js";

import WorkTimer from "./WorkTimer.jsx";
import MyTasks from "./MyTasks.jsx";
import ManualRemarksPage from "./ManualRemarksPage.jsx";
import UserCalendar from "./UserCalendar.jsx";
import BirthdayBanner from "./Worktimer/BirthdayBanner.jsx";
import TimerIdleReminder from "./TimerIdleReminder.jsx";
import MyProfileModal from "./MyProfileModal.jsx";
import logoImg from "../../assets/logo.png";

const TABS = [
  {
    key: "timer",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "tasks",
    label: "My Tasks",
    icon: ListTodo,
  },
  {
    key: "manual",
    label: "Manual Requests",
    icon: FileClock,
  },
  {
    key: "calendar",
    label: "Calendar",
    icon: CalendarDays,
  },
];

export default function Employee({ auth, onLogout }) {
  const [tab, setTab] = useState("timer");
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [preselectedTask, setPreselectedTask] = useState(null);
  const [taskCount, setTaskCount] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    // Ensure employee side is always presented in clean, professional light theme
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    if (!auth?.token) return;
    let isMounted = true;

    async function loadTaskCount() {
      try {
        const res = await api("/api/tasks/my/count", { token: auth.token });
        if (isMounted && typeof res?.count === "number") {
          setTaskCount(res.count);
        }
      } catch (err) {
        console.log("Task count load error:", err);
      }
    }

    loadTaskCount();

    const refreshHandler = () => loadTaskCount();
    window.addEventListener("taskCount:refresh", refreshHandler);

    return () => {
      isMounted = false;
      window.removeEventListener("taskCount:refresh", refreshHandler);
    };
  }, [auth?.token]);

  useEffect(() => {
    if (!auth?.token) return;
    let isMounted = true;

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

    loadBirthdays();

    return () => {
      isMounted = false;
    };
  }, [auth?.token]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden text-gray-800">
      {/* HEADER */}
      <header className="h-16 flex-shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs z-30">
        <div className="h-full flex items-center justify-between px-6">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="WorkTracker"
              className="w-9 h-9 rounded-xl object-contain shadow-2xs border border-slate-100 bg-white p-0.5"
            />
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                WorkTracker
              </h1>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                Employee Portal
              </span>
            </div>
          </div>

          {/* Center Date & Status Chip */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Workspace Active</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">
              {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>

          {/* User Info + Profile Modal Trigger */}
          <div className="flex items-center gap-3">
            {auth?.user?.name && (
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300 hover:shadow-xs transition cursor-pointer text-left shadow-2xs group"
                title="View your personal details and official records"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform">
                  {auth.user.name[0].toUpperCase()}
                </div>
                <div className="min-w-0 pr-1">
                  <span className="font-bold text-xs text-slate-900 block truncate max-w-[130px]">
                    {auth.user.name}
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold block">
                    My Profile
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between overflow-hidden shadow-2xs">
          <div className="p-3 space-y-1.5 overflow-y-auto flex-1">
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu
            </div>
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = tab === key;

              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className={active ? "text-blue-400" : "text-slate-400"}
                    />
                    <span>{label}</span>
                  </div>

                  {key === "tasks" && taskCount > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      active ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}>
                      {taskCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* BOTTOM LEFT LOGOUT */}
          <div className="p-3 border-t border-slate-100 bg-white shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
              title="Sign out of WorkTracker"
            >
              <LogOut size={16} strokeWidth={2} className="text-red-500" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-3">
          {tab === "timer" && (
            <WorkTimer auth={auth} initialSelectedTask={preselectedTask} />
          )}

          {tab === "tasks" && (
            <MyTasks
              auth={auth}
              onStartTaskTimer={(task) => {
                setPreselectedTask(task);
                setTab("timer");
              }}
            />
          )}

          {tab === "manual" && (
            <ManualRemarksPage auth={auth} />
          )}

          {tab === "calendar" && (
            <UserCalendar auth={auth} />
          )}
        </main>
      </div>

      {/* FLOATING BIRTHDAY CELEBRATION CARD */}
      <BirthdayBanner todayBirthdays={todayBirthdays} />

      {/* ⏱️ 10-MINUTE TIMER INACTIVITY ALERT MODAL OVER ENTIRE APP */}
      <TimerIdleReminder
        auth={auth}
        onStartTimer={() => setTab("timer")}
      />

      {/* 👤 EMPLOYEE PERSONAL PROFILE MODAL */}
      <MyProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        auth={auth}
        onLogout={onLogout}
      />
    </div>
  );
}