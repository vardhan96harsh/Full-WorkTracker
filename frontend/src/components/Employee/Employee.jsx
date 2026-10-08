import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileClock,
  CalendarDays,
  LogOut,
} from "lucide-react";
import { api } from "../../api.js";

import WorkTimer from "./WorkTimer.jsx";
import ManualRemarksPage from "./ManualRemarksPage.jsx";
import UserCalendar from "./UserCalendar.jsx";
import BirthdayBanner from "./Worktimer/BirthdayBanner.jsx";
import TimerIdleReminder from "./TimerIdleReminder.jsx";
import logoImg from "../../assets/logo.png";

const TABS = [
  {
    key: "timer",
    label: "Dashboard",
    icon: LayoutDashboard,
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
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gray-100 border border-gray-200 text-gray-700 rounded-full flex items-center justify-center font-semibold">
                  {auth.user.name[0].toUpperCase()}
                </div>

                <span className="font-medium text-sm text-gray-800">
                  {auth.user.name}
                </span>
              </div>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors duration-200"
            >
              <LogOut size={17} strokeWidth={2} />

              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-56 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-3 space-y-1">
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
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-3">
          {tab === "timer" && (
            <WorkTimer auth={auth} />
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
    </div>
  );
}