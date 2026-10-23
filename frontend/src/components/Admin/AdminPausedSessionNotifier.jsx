import React, { useEffect, useState, useRef, useCallback } from "react";
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

  // 🚫 Do not render a second popup inside the admin interface.
  // The alert is displayed solely as a single, professional floating desktop popup OUTSIDE the window.
  return null;
}

