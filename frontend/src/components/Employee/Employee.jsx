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
          <div className="flex items-center gap-4">
            {auth?.user?.name && (
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer text-left shadow-2xs"
                title="View your personal details and official records"
              >
                <div className="w-8 h-8 bg-blue-100 border border-blue-200 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs">
                  {auth.user.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-gray-900 block truncate">
                    {auth.user.name}
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold block">
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
        <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col justify-between overflow-hidden">
          <div className="p-3 space-y-1 overflow-y-auto flex-1">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = tab === key;

              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-blue-50 text-blue-700 shadow-sm font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={20}
                      strokeWidth={2}
                      className={
                        active
                          ? "text-blue-600"
                          : "text-gray-500"
                      }
                    />

                    <span>{label}</span>
                  </div>

                  {key === "tasks" && taskCount > 0 && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                      {taskCount}
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