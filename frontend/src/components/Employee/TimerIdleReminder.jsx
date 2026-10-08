import React, { useEffect, useState, useRef, useCallback } from "react";
import { X, Pause, Clock } from "lucide-react";
import { api } from "../../api.js";

const TEN_MINUTES_MS = 10 * 60 * 1000; // 10 minutes

function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(783.99, now + 0.18); // G5
    gain2.gain.setValueAtTime(0.25, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.8);
  } catch {
    // Ignore audio permission or browser restriction
  }
}

export default function TimerIdleReminder({ auth, onStartTimer }) {
  const [showPopup, setShowPopup] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(10);
  const [timerStatus, setTimerStatus] = useState("stopped"); // "stopped" | "paused"

  const isRunningRef = useRef(false);
  const timerStatusRef = useRef("stopped");

  // Helper to get or initialize the timestamp from which the 10-minute countdown runs
  const getLastAlertTime = useCallback(() => {
    const val = localStorage.getItem("worktracker:lastAlertTime") || localStorage.getItem("worktracker:timerStoppedSince");
    if (val && !isNaN(Number(val))) return Number(val);
    const now = Date.now();
    localStorage.setItem("worktracker:lastAlertTime", String(now));
    return now;
  }, []);

  const resetAlertTime = useCallback(() => {
    const now = Date.now();
    localStorage.setItem("worktracker:lastAlertTime", String(now));
    localStorage.setItem("worktracker:timerStoppedSince", String(now));
  }, []);

  // Check active session on server periodically or when mounted
  const checkServerSession = useCallback(async () => {
    if (!auth?.token) return;
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const today = `${y}-${m}-${d}`;
      const list = await api(`/api/work-sessions/my?from=${today}&to=${today}`, {
        token: auth.token,
      });
      const arr = Array.isArray(list) ? list : [];
      const hasActive = arr.some((s) => s.status === "active");
      const pausedSession = arr.find((s) => s.status === "paused");
      const status = hasActive ? "active" : (pausedSession ? "paused" : "stopped");

      isRunningRef.current = hasActive;
      timerStatusRef.current = status;
      setTimerStatus(status);
      localStorage.setItem("worktracker:isTimerRunning", hasActive ? "true" : "false");

      if (hasActive) {
        localStorage.removeItem("worktracker:lastAlertTime");
        localStorage.removeItem("worktracker:timerStoppedSince");
        setShowPopup(false);
      } else {
        if (!localStorage.getItem("worktracker:lastAlertTime") && !localStorage.getItem("worktracker:timerStoppedSince")) {
          resetAlertTime();
        }
      }
    } catch {
      // offline or network error; rely on local state
    }
  }, [auth?.token, resetAlertTime]);

  // Handle timer status events from WorkTimer and OverlayWidget
  useEffect(() => {
    const handleStatusChanged = (e) => {
      const isRunning = Boolean(e?.detail?.isRunning);
      const status = e?.detail?.status || (isRunning ? "active" : "stopped");
      isRunningRef.current = isRunning;
      timerStatusRef.current = status;
      setTimerStatus(status);

      if (isRunning) {
        localStorage.removeItem("worktracker:lastAlertTime");
        localStorage.removeItem("worktracker:timerStoppedSince");
        setShowPopup(false);
      } else {
        resetAlertTime();
      }
    };

    window.addEventListener("timer:statusChanged", handleStatusChanged);
    return () => window.removeEventListener("timer:statusChanged", handleStatusChanged);
  }, [resetAlertTime]);

  // Main 5-second interval loop:
  // Triggers alert every 10 minutes whether timer is stopped OR paused!
  useEffect(() => {
    checkServerSession();

    const interval = setInterval(() => {
      // If timer is currently actively running, nothing to pop up
      if (isRunningRef.current) return;

      const lastAlert = getLastAlertTime();
      const elapsed = Date.now() - lastAlert;

      if (elapsed >= TEN_MINUTES_MS) {
        const mins = Math.max(10, Math.floor(elapsed / 60000));
        setIdleMinutes(mins);

        // Reset the alert benchmark timestamp to now so the next alert will fire in 10 minutes
        resetAlertTime();

        // Show popup, play chime, and bring window to front / flash taskbar
        setShowPopup(true);
        playChime();
        window.worktracker?.alertTimerReminder?.();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [checkServerSession, getLastAlertTime, resetAlertTime]);

  // Dismiss handler (clicking X icon, backdrop, or Escape)
  const handleDismiss = useCallback(() => {
    setShowPopup(false);
    resetAlertTime();
  }, [resetAlertTime]);

  // Handle Escape key to dismiss
  useEffect(() => {
    if (!showPopup) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPopup, handleDismiss]);

  if (!showPopup) return null;

  const isPaused = timerStatus === "paused";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-[380px] rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Cross ("X") Icon to Close */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none"
          aria-label="Close"
          title="Close"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3.5 pr-6">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isPaused
                ? "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
            }`}
          >
            {isPaused ? <Pause className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  isPaused
                    ? "bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
                    : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isPaused ? "bg-amber-500" : "bg-blue-500"
                  } animate-pulse`}
                />
                {isPaused ? `Paused • ${idleMinutes}m` : `Inactive • ${idleMinutes}m`}
              </span>
            </div>

            <h3 className="mt-1.5 text-base font-bold text-slate-900 dark:text-white leading-snug">
              {isPaused ? "Work Timer is Paused" : "Work Tracker is Inactive"}
            </h3>

            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isPaused ? (
                <>Your timer has been paused for <strong>{idleMinutes} minutes</strong>. Please remember to resume your tracker.</>
              ) : (
                <>Your tracker is currently not running. Please start your session to record your work hours.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
