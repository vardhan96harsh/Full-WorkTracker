import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Clock,
  X,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  FolderKanban,
  ExternalLink,
  AlertTriangle,
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
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
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

  // Trigger rich popup (Desktop window in Electron or rich browser notification)
  const triggerPopupNotification = useCallback(
    (activeAlerts) => {
      if (!activeAlerts || activeAlerts.length === 0) return;

      // 1. Save latest alerts in localStorage so any window can access immediately
      try {
        localStorage.setItem("wt_latest_pause_alerts", JSON.stringify(activeAlerts));
      } catch {}

      // 2. If running inside Electron: trigger the custom desktop popup window!
      if (typeof window !== "undefined" && window.worktracker?.showPausePopup) {
        try {
          window.worktracker.showPausePopup({ alerts: activeAlerts });
          return; // Avoid duplicate OS toast since the desktop popup card is already showing
        } catch (err) {
          console.warn("Failed to open desktop pause popup window:", err);
        }
      }

      // 3. Fallback for standard web browser: Native Notification with rich details
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const newest = activeAlerts[0];
          const notif = new Notification(`⚠️ Session Paused • ${newest.employeeName}`, {
            body: `⏱️ Paused: ${newest.pausedMinutes}m\n📁 Project: ${newest.projectName || "General"}`,
            icon: "/favicon.png",
            tag: `wt-pause-${newest?.sessionId || "alert"}`,
          });
          notif.onclick = () => {
            window.focus();
            window.dispatchEvent(
              new CustomEvent("wt:adminNavigateTab", { detail: { tab: "dailyReport" } })
            );
          };
        } catch {}
      }
    },
    []
  );

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

        // Play chime and trigger attractive popup if new paused session detected
        if (visibleAlerts.length > prevAlertCountRef.current) {
          if (soundEnabled) {
            playPauseAlertChime();
          }
          triggerPopupNotification(visibleAlerts);
        }
        prevAlertCountRef.current = visibleAlerts.length;
      }
    } catch (err) {
      console.warn("Failed to fetch paused session alerts:", err?.message || err);
    }
  }, [auth?.token, isEnabled, soundEnabled, dismissedSessionIds, onAlertCountChange, triggerPopupNotification]);

  // Request browser notification permission once if supported and pending
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      try {
        Notification.requestPermission();
      } catch {}
    }
  }, []);

  // Listen for manual Test Alert event (e.g. from Preview button)
  useEffect(() => {
    const handleTestTrigger = () => {
      const sampleAlert = {
        sessionId: "test-alert-" + Date.now(),
        employeeName: "Rishabh Thakur",
        employeeId: "EMP-104",
        designation: "Frontend Engineer",
        projectName: "Work Tracker Desktop",
        taskTitle: "Live Status Sync & Alerts",
        pausedMinutes: 95,
        lunchDeductedMinutes: 0,
        pausedAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
      };
      setAlerts((prev) => [sampleAlert, ...prev.filter((p) => !String(p.sessionId).startsWith("test-alert-"))]);
      if (soundEnabled) {
        playPauseAlertChime();
      }
      triggerPopupNotification([sampleAlert]);
    };

    window.addEventListener("wt:triggerTestAlert", handleTestTrigger);
    return () => window.removeEventListener("wt:triggerTestAlert", handleTestTrigger);
  }, [soundEnabled, triggerPopupNotification]);

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

  const handleViewLiveReport = (e) => {
    if (e) e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("wt:adminNavigateTab", { detail: { tab: "dailyReport" } })
    );
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] select-none font-sans antialiased animate-in fade-in slide-in-from-bottom-5 duration-200"
      style={{ filter: "drop-shadow(0 10px 25px rgba(15, 23, 42, 0.15))" }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-xl">
        {/* TOP BAR */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle size={13} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-slate-900 truncate">
              Session Alert
            </span>
            <span className="bg-amber-500 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full leading-tight shrink-0">
              {visibleAlerts.length}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Sound Mute Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-1 rounded-md transition cursor-pointer ${
                soundEnabled
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/80"
              }`}
              title={soundEnabled ? "Mute alert chime" : "Enable alert chime"}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>

            {/* Minimize / Expand Toggle */}
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white/80 transition cursor-pointer"
              title={isMinimized ? "Expand alerts" : "Minimize alerts"}
            >
              {isMinimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Dismiss All */}
            <button
              type="button"
              onClick={handleDismissAll}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white/80 transition cursor-pointer"
              title="Dismiss all"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* BODY - CLEAN NOTIFICATION CARDS */}
        {!isMinimized ? (
          <div className="p-2.5 space-y-2 max-h-64 overflow-y-auto bg-slate-50/50">
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
                  className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-amber-300 transition-colors relative"
                >
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
                        title={
                          alert.lunchDeductedMinutes > 0
                            ? `${alert.lunchDeductedMinutes}m lunch break excluded`
                            : undefined
                        }
                      >
                        <Clock size={10} className="text-amber-600" />
                        {alert.pausedMinutes}m
                      </span>
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

        {/* FOOTER BAR */}
        <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <button
            type="button"
            onClick={handleViewLiveReport}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
          >
            <span>View Live Report</span>
            <ExternalLink size={10} />
          </button>

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

