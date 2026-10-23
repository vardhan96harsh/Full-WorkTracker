import React, { useEffect, useState, useRef } from "react";
import { X, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import logoImg from "../../assets/logo.png";

// Soft executive chime
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(440, now); // A4
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(554.37, now + 0.1); // C#5
    gain2.gain.setValueAtTime(0.12, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch {}
}

export default function PauseAlertPopup() {
  const [alerts, setAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem("wt_latest_pause_alerts");
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
    return [
      {
        sessionId: "sample-1",
        employeeName: "Rishabh Thakur",
        employeeId: "EMP-104",
        designation: "Frontend Engineer",
        projectName: "Work Tracker Desktop",
        taskTitle: "Live Status Sync & Alerts",
        pausedMinutes: 95,
        lunchDeductedMinutes: 0,
        pausedAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
      },
    ];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("wt_admin_pause_alerts_sound");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  // Listen for data from Electron main process
  useEffect(() => {
    const off = window.worktracker?.onPausePopupData?.((data) => {
      if (data && Array.isArray(data.alerts) && data.alerts.length > 0) {
        setAlerts(data.alerts);
        setCurrentIndex(0);
        if (soundEnabled) {
          playChime();
        }
      }
    });
    return () => typeof off === "function" && off();
  }, [soundEnabled]);

  // Initial gentle chime on appearance
  useEffect(() => {
    if (soundEnabled) {
      playChime();
    }
  }, [soundEnabled]);

  // 20-second auto-dismiss with hover pause
  useEffect(() => {
    if (isHovered) return;
    timerRef.current = setTimeout(() => {
      window.worktracker?.closePausePopup?.();
    }, 20000);
    return () => clearTimeout(timerRef.current);
  }, [isHovered]);

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    window.worktracker?.closePausePopup?.();
  };

  const handleOpenApp = (e) => {
    if (e) e.stopPropagation();
    window.worktracker?.openMainAndTab?.("dailyReport");
  };

  const currentAlert = alerts[currentIndex] || alerts[0];
  const totalAlerts = alerts.length;

  const formattedTime = currentAlert?.pausedAt
    ? new Date(currentAlert.pausedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const initials = currentAlert?.employeeName
    ? currentAlert.employeeName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "EM";

  return (
    <div
      className="w-full h-full p-2 select-none flex items-center justify-center font-sans antialiased bg-transparent"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ WebkitAppRegion: "no-drag" }}
    >
      {/* 💼 ULTRA-CLEAN, PROFESSIONAL & SPACIOUS NOTIFICATION CARD */}
      <div className="w-full h-full bg-white rounded-xl border border-slate-200/90 shadow-none overflow-hidden flex flex-col justify-between p-3.5 relative text-slate-800">
        
        {/* ── TOP BAR: BRAND + CLOSE ── */}
        <div className="flex items-center justify-between" style={{ WebkitAppRegion: "drag" }}>
          <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: "no-drag" }}>
            <img
              src={logoImg}
              alt="Logo"
              className="w-4 h-4 rounded object-contain shrink-0"
            />
            <span className="text-xs font-semibold text-slate-800">
              Work Tracker
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Session Paused
            </span>
          </div>

          <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" }}>
            {totalAlerts > 1 && (
              <div className="flex items-center gap-0.5 text-[11px] text-slate-500 mr-1">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalAlerts - 1))}
                  className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                >
                  <ChevronLeft size={11} />
                </button>
                <span>{currentIndex + 1}/{totalAlerts}</span>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => (prev < totalAlerts - 1 ? prev + 1 : 0))}
                  className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                >
                  <ChevronRight size={11} />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── BODY: CLEAN, CRYSTAL CLEAR HIERARCHY ── */}
        <div className="flex items-start gap-3 my-auto py-1">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 mt-0.5">
            {initials}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1.5">
              <span className="text-sm font-bold text-slate-900 truncate">
                {currentAlert?.employeeName || "Employee"}
              </span>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/90 px-1.5 py-0.2 rounded-full shrink-0">
                {currentAlert?.pausedMinutes || 10}m paused
              </span>
            </div>

            <p className="text-xs text-slate-600 truncate mt-0.5">
              {currentAlert?.projectName ? (
                <span>Project: <strong className="font-semibold text-slate-800">{currentAlert.projectName}</strong></span>
              ) : (
                "Work session is currently paused"
              )}
            </p>

            {formattedTime && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Paused since {formattedTime} {currentAlert?.lunchDeductedMinutes > 0 ? "(excl. lunch)" : ""}
              </p>
            )}
          </div>
        </div>

        {/* ── FOOTER: CLEAN ACTION BUTTONS ── */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleOpenApp}
            className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer flex items-center gap-1 shadow-none"
          >
            <span>Open Dashboard</span>
            <ExternalLink size={10} strokeWidth={2.2} />
          </button>
        </div>

      </div>
    </div>
  );
}
