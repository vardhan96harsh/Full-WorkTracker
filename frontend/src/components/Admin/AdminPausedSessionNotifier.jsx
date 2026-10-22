import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Pause,
  Clock,
  X,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  FolderKanban,
} from "lucide-react";
import { api } from "../../api.js";

// Audio chime using Web Audio API (gentle harmonious double tone)
function playPauseAlertChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(493.88, now); // B4
    gain1.gain.setValueAtTime(0.14, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Ignore audio permission or browser restriction
  }
}

export default function AdminPausedSessionNotifier({ auth, onAlertCountChange }) {
  // Persistent toggle for Pause Notifications (default: true)
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("wt_admin_pause_alerts_enabled");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  // Persistent sound alert toggle (default: true)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("wt_admin_pause_alerts_sound");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [alerts, setAlerts] = useState([]);
  const [dismissedSessionIds, setDismissedSessionIds] = useState(new Set());
  const [isMinimized, setIsMinimized] = useState(false);
  const prevAlertCountRef = useRef(0);

  // Sync state to localStorage & broadcast event
  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("wt_admin_pause_alerts_enabled", String(next));
      } catch {}
      window.dispatchEvent(
        new CustomEvent("wt:adminPauseAlertsChanged", { detail: { enabled: next } })
      );
      return next;
    });
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("wt_admin_pause_alerts_sound", String(next));
      } catch {}
      return next;
    });
  };

  // Listen to external toggle events (e.g. from Admin header toggle)
  useEffect(() => {
    const handleExternalToggle = (e) => {
      if (typeof e?.detail?.enabled === "boolean") {
        setIsEnabled(e.detail.enabled);
      }
    };
    window.addEventListener("wt:adminPauseAlertsChanged", handleExternalToggle);
    return () => window.removeEventListener("wt:adminPauseAlertsChanged", handleExternalToggle);
  }, []);

  // Fetch paused session alerts from backend
  const fetchAlerts = useCallback(async () => {
    if (!auth?.token || !isEnabled) {
      setAlerts([]);
      if (onAlertCountChange) onAlertCountChange(0);
      return;
    }

    try {
      // Query sessions paused >= 10 minutes
      const res = await api("/api/work-sessions/admin/paused-alerts?minMinutes=10", {
        token: auth.token,
      });

      if (res && Array.isArray(res.alerts)) {
        setAlerts(res.alerts);

        // Filter out dismissed
        const visibleAlerts = res.alerts.filter((a) => !dismissedSessionIds.has(String(a.sessionId)));
        if (onAlertCountChange) {
          onAlertCountChange(visibleAlerts.length);
        }

        // Play chime if new paused session detected
        if (visibleAlerts.length > prevAlertCountRef.current) {
          if (soundEnabled) {
            playPauseAlertChime();
          }

          // Native OS / Browser notification if permitted
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              const newest = visibleAlerts[0];
              new Notification("WorkTracker - Session Paused", {
                body: newest?.message || "An employee session has been paused for 10+ minutes.",
                icon: "/favicon.png",
                tag: `wt-pause-${newest?.sessionId || "alert"}`,
              });
            } catch {}
          }
        }
        prevAlertCountRef.current = visibleAlerts.length;
      }
    } catch (err) {
      console.warn("Failed to fetch paused session alerts:", err?.message || err);
    }
  }, [auth?.token, isEnabled, soundEnabled, dismissedSessionIds, onAlertCountChange]);

  // Request browser notification permission once if supported and pending
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      try {
        Notification.requestPermission();
      } catch {}
    }
  }, []);

  // Polling every 25 seconds
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 25000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter((a) => !dismissedSessionIds.has(String(a.sessionId)));

  const handleDismiss = (sessionId, e) => {
    if (e) e.stopPropagation();
    setDismissedSessionIds((prev) => {
      const next = new Set(prev);
      next.add(String(sessionId));
      return next;
    });
  };

  const handleDismissAll = (e) => {
    if (e) e.stopPropagation();
    setDismissedSessionIds((prev) => {
      const next = new Set(prev);
      visibleAlerts.forEach((a) => next.add(String(a.sessionId)));
      return next;
    });
  };

  // If notifications are turned OFF or there are no active alerts, don't show the popup
  if (!isEnabled || visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end select-none transition-all duration-300 ease-out"
      style={{ width: "330px", maxWidth: "calc(100vw - 32px)" }}
    >
      {/* CARD CONTAINER - CLEAN LIGHT MODERN TOAST */}
      <div className="w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_36px_rgba(15,23,42,0.14)] border border-slate-200/90 overflow-hidden flex flex-col ring-1 ring-slate-900/5">
        {/* HEADER BAR - CLEAN SLATE HEADER */}
        <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <Pause size={11} className="fill-amber-600/30" />
            </div>

            <span className="text-xs font-bold text-slate-800 truncate">
              Session Alert
            </span>

            <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full leading-tight shrink-0 border border-amber-200">
              {visibleAlerts.length}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {/* Sound Mute Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-1 rounded-md transition cursor-pointer ${
                soundEnabled
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/70"
              }`}
              title={soundEnabled ? "Mute alert chime" : "Enable alert chime"}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>

            {/* Minimize / Expand Toggle */}
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
              title={isMinimized ? "Expand alerts" : "Minimize alerts"}
            >
              {isMinimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Dismiss All */}
            <button
              type="button"
              onClick={handleDismissAll}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Dismiss all"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* BODY - CLEAN NOTIFICATION CARDS */}
        {!isMinimized ? (
          <div className="p-2.5 space-y-2 max-h-[260px] overflow-y-auto bg-slate-50/40">
            {visibleAlerts.map((alert) => {
              const formattedTime = alert.pausedAt
                ? new Date(alert.pausedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <div
                  key={alert.sessionId}
                  className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-amber-300 transition-colors relative"
                >
                  {/* Row 1: Avatar + Name + Emp ID + Time Pill + Dismiss */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {alert.employeeName ? alert.employeeName[0].toUpperCase() : "U"}
                      </div>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {alert.employeeName}
                      </span>
                      {alert.employeeId && alert.employeeId !== "—" && (
                        <span className="text-[9px] font-mono font-medium text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 shrink-0">
                          {alert.employeeId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                        title={alert.lunchDeductedMinutes > 0 ? `${alert.lunchDeductedMinutes}m lunch break (2 PM - 3 PM) excluded` : undefined}
                      >
                        <Clock size={10} className="text-amber-600" />
                        {alert.pausedMinutes}m
                      </span>
                      {alert.lunchDeductedMinutes > 0 && (
                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                          excl. lunch
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDismiss(alert.sessionId, e)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-100 transition cursor-pointer"
                        title="Dismiss"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Clean Message / Project line */}
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600 gap-1.5">
                    <div className="flex items-center gap-1 truncate">
                      <FolderKanban size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        <span className="text-slate-400">Project:</span>{" "}
                        <span className="font-semibold text-slate-800">{alert.projectName}</span>
                      </span>
                    </div>
                    {formattedTime && (
                      <span className="text-[9px] text-slate-400 font-mono shrink-0">
                        {formattedTime}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-3.5 py-2 bg-amber-50/60 flex items-center justify-between text-xs text-amber-900 font-medium">
            <span>
              {visibleAlerts.length} session{visibleAlerts.length > 1 ? "s" : ""} paused &ge; 10m
            </span>
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="text-amber-700 font-bold hover:underline cursor-pointer text-[11px]"
            >
              Show details
            </button>
          </div>
        )}

        {/* FOOTER BAR WITH NOTIFICATION ON/OFF SWITCH */}
        <div className="px-3.5 py-2 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[11px] text-slate-600">Session Alerts:</span>
            <button
              type="button"
              onClick={toggleEnabled}
              className={`relative inline-flex h-3.5 w-6.5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isEnabled ? "bg-blue-600" : "bg-slate-300"
              }`}
              title={isEnabled ? "Turn OFF pause alerts" : "Turn ON pause alerts"}
            >
              <span
                className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? "translate-x-3" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="font-bold text-blue-700 text-[10px]">
              {isEnabled ? "ON" : "OFF"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismissAll}
            className="text-[11px] text-slate-400 hover:text-slate-700 font-semibold transition cursor-pointer"
          >
            Dismiss All
          </button>
        </div>
      </div>
    </div>
  );
}
