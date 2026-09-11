import React, { useEffect, useState, useRef, useCallback } from "react";
import { Clock, Play, X, Bell } from "lucide-react";
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
  const isRunningRef = useRef(false);

  // Helper to sync timer stopped timestamp
  const getStoppedSince = useCallback(() => {
    const val = localStorage.getItem("worktracker:timerStoppedSince");
    if (val && !isNaN(Number(val))) return Number(val);
    const now = Date.now();
    localStorage.setItem("worktracker:timerStoppedSince", String(now));
    return now;
  }, []);

  const resetStoppedSince = useCallback(() => {
    localStorage.setItem("worktracker:timerStoppedSince", String(Date.now()));
  }, []);

  // Check active session on server periodically or when mounted
  const checkServerSession = useCallback(async () => {
    if (!auth?.token) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const list = await api(`/api/work-sessions/my?from=${today}&to=${today}`, {
        token: auth.token,
      });
      const arr = Array.isArray(list) ? list : [];
      const hasActive = arr.some((s) => s.status === "active");

      isRunningRef.current = hasActive;
      localStorage.setItem("worktracker:isTimerRunning", hasActive ? "true" : "false");

      if (hasActive) {
        localStorage.removeItem("worktracker:timerStoppedSince");
        setShowPopup(false);
      } else {
        if (!localStorage.getItem("worktracker:timerStoppedSince")) {
          localStorage.setItem("worktracker:timerStoppedSince", String(Date.now()));
        }
      }
    } catch {
      // offline or network error; rely on local state
    }
  }, [auth?.token]);

  // Handle timer status events from WorkTimer and OverlayWidget
  useEffect(() => {
    const handleStatusChanged = (e) => {
      const isRunning = Boolean(e?.detail?.isRunning);
      isRunningRef.current = isRunning;

      if (isRunning) {
        localStorage.removeItem("worktracker:timerStoppedSince");
        setShowPopup(false);
      } else {
        if (!localStorage.getItem("worktracker:timerStoppedSince")) {
          localStorage.setItem("worktracker:timerStoppedSince", String(Date.now()));
        }
      }
    };

    window.addEventListener("timer:statusChanged", handleStatusChanged);
    return () => window.removeEventListener("timer:statusChanged", handleStatusChanged);
  }, []);

  // Main 5-second interval loop that checks if 10 minutes have elapsed
  useEffect(() => {
    checkServerSession();

    const interval = setInterval(() => {
      // If timer is currently running, nothing to pop up
      if (isRunningRef.current) return;

      const stoppedSince = getStoppedSince();
      const elapsed = Date.now() - stoppedSince;

      if (elapsed >= TEN_MINUTES_MS) {
        const mins = Math.max(10, Math.floor(elapsed / 60000));
        setIdleMinutes(mins);
        setShowPopup((prev) => {
          if (!prev) {
            playChime();
            window.worktracker?.alertTimerReminder?.();
          }
          return true;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [checkServerSession, getStoppedSince]);

  // When user dismisses the popup (remind in 10 minutes)
  const handleDismiss = () => {
    setShowPopup(false);
    resetStoppedSince();
  };

  // When user clicks "Start Timer Now"
  const handleStartNow = () => {
    setShowPopup(false);
    if (typeof onStartTimer === "function") {
      onStartTimer();
    }
    window.dispatchEvent(new CustomEvent("timer:focusStart"));
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border-2 border-amber-300 bg-white p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          title="Dismiss (Remind in 10 minutes)"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Top Header Badge */}
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-900 shadow-xs">
          <Bell className="h-3.5 w-3.5 text-amber-600 animate-bounce" />
          <span>Timer Inactivity Alert</span>
        </div>

        {/* Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 text-2xl shadow-xs">
            ⏰
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Work Timer is Not Running!
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Your tracker has been stopped for{" "}
              <strong className="text-amber-700 font-bold">{idleMinutes}+ minutes</strong>.
            </p>
          </div>
        </div>

        {/* Explanation Message */}
        <p className="mt-4 text-sm font-normal text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
          Please start your work timer so that your activity and work hours are accurately captured and credited to your projects.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleStartNow}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Start Timer Now</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-[0.99]"
          >
            Dismiss (Remind me in 10 minutes)
          </button>
        </div>
      </div>
    </div>
  );
}
