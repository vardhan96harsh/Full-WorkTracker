import React, { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { offlineManager } from "../../utils/offlineManager";

function getTodayYMD() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function AdminOverlay({ auth }) {
  const [metrics, setMetrics] = useState({
    activeCount: 0,
    totalHours: "0.0",
    pendingCount: 0,
    loading: true,
  });

  async function loadMetrics() {
    if (!auth?.token) return;
    try {
      const today = getTodayYMD();
      const [sessions, pendingRes] = await Promise.all([
        api(`/api/work-sessions/admin/list?from=${today}&to=${today}`, { token: auth.token }),
        api("/api/manual-remarks/admin/pending-count", { token: auth.token }),
      ]);

      const rows = Array.isArray(sessions) ? sessions : [];

      // Unique active employees currently working right now
      const activeUserIds = new Set();
      for (const r of rows) {
        if (r.status === "active") {
          const uid = r.userId || r.user?._id || (typeof r.user === "string" ? r.user : r._id);
          if (uid) activeUserIds.add(String(uid));
        }
      }

      // Total hours today across all employee work sessions
      const totalMins = rows.reduce((acc, r) => acc + (Number(r.totalMinutes) || 0), 0);
      const hours = (totalMins / 60).toFixed(1);

      setMetrics({
        activeCount: activeUserIds.size,
        totalHours: hours,
        pendingCount: Number(pendingRes?.count) || 0,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to load admin overlay metrics:", err);
    }
  }

  useEffect(() => {
    // Elegant inline width for Admin overlay pill to comfortably fit all metrics
    window.worktracker?.resizeOverlay?.({
      width: 305,
      height: 30,
    });

    loadMetrics();

    // Auto-refresh metrics every 15 seconds
    const interval = setInterval(loadMetrics, 15000);

    // Refresh immediately whenever any employee starts, pauses, or stops work
    const offSessions = window.worktracker?.onSessionsChanged?.(() => loadMetrics());

    return () => {
      clearInterval(interval);
      if (typeof offSessions === "function") offSessions();
    };
  }, [auth?.token]);

  return (
    <div
      className="group flex items-center justify-between overflow-hidden select-none px-2.5 transition-all cursor-pointer rounded-full border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
      style={{
        WebkitAppRegion: "drag",
        height: "30px",
        boxShadow: "0 2px 6px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.04)",
      }}
      onClick={() => window.worktracker?.openMain?.()}
      title="Click to open Admin Dashboard"
    >
      <div
        className="flex items-center gap-2 text-[11px] leading-none w-full justify-between"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        {/* Metric 1: Active Employees */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          title={`${metrics.activeCount} employee${metrics.activeCount === 1 ? "" : "s"} currently active`}
        >
          <span className="relative flex h-2 w-2 items-center justify-center">
            {metrics.activeCount > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                metrics.activeCount > 0 ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          </span>
          <span className="font-bold text-slate-900 font-mono text-[12px]">{metrics.activeCount}</span>
          <span className="text-slate-500 text-[11px] font-medium">Active</span>
        </div>

        {/* Hairline Divider */}
        <div className="w-px h-3.5 bg-slate-200 shrink-0" />

        {/* Metric 2: Today's Total Hours */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          title={`Total ${metrics.totalHours} team work hours logged today`}
        >
          <svg
            className="w-3.5 h-3.5 text-blue-500 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-bold text-slate-900 font-mono text-[12px]">{metrics.totalHours}h</span>
          <span className="text-slate-500 text-[11px] font-medium">Today</span>
        </div>

        {/* Hairline Divider */}
        <div className="w-px h-3.5 bg-slate-200 shrink-0" />

        {/* Metric 3: Pending Time Requests */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          title={`${metrics.pendingCount} pending manual time request${metrics.pendingCount === 1 ? "" : "s"}`}
        >
          <svg
            className={`w-3.5 h-3.5 shrink-0 ${metrics.pendingCount > 0 ? "text-amber-500" : "text-slate-400"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {metrics.pendingCount > 0 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 leading-none">
              {metrics.pendingCount} Req
            </span>
          ) : (
            <span className="text-slate-400 font-mono text-[11px]">0 Req</span>
          )}
        </div>

        {/* Hairline Divider */}
        <div className="w-px h-3.5 bg-slate-200 shrink-0" />

        {/* Reopen Action Icon */}
        <div
          className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors shrink-0"
          title="Open Admin Dashboard"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function OverlayWidget() {
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("auth") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        setAuth(JSON.parse(localStorage.getItem("auth") || "null"));
      } catch {
        setAuth(null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  if (!auth) return null;

  if (auth?.user?.role === "admin") {
    return <AdminOverlay auth={auth} />;
  }

  if (auth?.user?.role !== "employee") return null;

  return <EmployeeOverlayWidget auth={auth} />;
}

function EmployeeOverlayWidget({ auth }) {

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(offlineManager.isOffline());

  const timerRef = useRef(null);
  const cardRef = useRef(null);
  const activeSessionRef = useRef(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const pauseCooldownRef = useRef(0);
  const resumeInProgressRef = useRef(false);
  const actionLockRef = useRef(null);

  // Sync state with Electron main process and other windows
  useEffect(() => {
    activeSessionRef.current = activeSession;
    const isRunning = Boolean(
      activeSession && (activeSession.status === "active" || activeSession.status === "paused")
    );
    window.worktracker?.setTimerRunning?.(isRunning);

    const isTimerActive = Boolean(activeSession && activeSession.status === "active");
    window.dispatchEvent(
      new CustomEvent("timer:statusChanged", {
        detail: {
          isRunning: isTimerActive,
          status: activeSession?.status || "stopped",
        },
      })
    );
  }, [activeSession]);

  useEffect(() => {
    const unsub = offlineManager.subscribe((event, data) => {
      if (event === "networkStatus") setIsOffline(data.isOffline);
      if (event === "syncSuccess") loadSessions();
    });
    return unsub;
  }, []);

  // ---------- helpers ----------
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(ss).padStart(2, "0")}`;
  };

  function clearTicker() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function loadSessions(retryCount = 0) {
    setError("");

    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const today = `${y}-${m}-${d}`;

      const list = await api(`/api/work-sessions/my?from=${today}&to=${today}`, { token: auth.token });
      offlineManager.setOffline(false);
      setIsOffline(false);

      let arr = Array.isArray(list) ? [...list] : [];

      const lock = actionLockRef.current;
      if (lock) {
        if (lock.type === "start" && lock.session) {
          const hasServerActive = arr.some((s) => s.status === "active" && String(s._id) !== String(lock.tempId));
          if (!hasServerActive) {
            arr = [lock.session, ...arr.filter((s) => String(s._id) !== String(lock.tempId))];
          }
        } else if (lock.type === "stop" && lock.sessionId) {
          arr = arr.map((s) => (String(s._id) === String(lock.sessionId) || String(s._id).startsWith("temp-") ? { ...s, status: "stopped" } : s));
        } else if (lock.type === "pause" && lock.sessionId) {
          arr = arr.map((s) => (String(s._id) === String(lock.sessionId) ? { ...s, status: "paused" } : s));
        } else if (lock.type === "resume" && lock.sessionId) {
          arr = arr.map((s) => (String(s._id) === String(lock.sessionId) ? { ...s, status: "active" } : s));
        }
      } else if (activeSessionRef.current?._id && String(activeSessionRef.current._id).startsWith("temp-")) {
        const hasServerActive = arr.some((s) => s.status === "active");
        if (!hasServerActive) {
          arr = [activeSessionRef.current, ...arr.filter((s) => String(s._id) !== String(activeSessionRef.current._id))];
        }
      }

      setSessions(arr);

      const running = arr.find((x) => x.status === "active");
      const paused = arr.find((x) => x.status === "paused");

      // Strictly resolve to running/paused or null (never keep stale active session when stopped)
      let cur = running || paused || null;
      if (lock && lock.type === "stop") {
        cur = null;
      }
      const prevActive = activeSessionRef.current;
      const isAlreadyRunning =
        prevActive?.status === "active" &&
        cur?.status === "active" &&
        (String(prevActive?._id) === String(cur?._id) || String(prevActive?._id).startsWith("temp-")) &&
        timerRef.current !== null;

      setActiveSession(cur);
      activeSessionRef.current = cur;

      if (!isAlreadyRunning) {
        clearTicker();

        if (running) {
          const baseMs = Math.max(0, (running.accumulatedMinutes || 0) * 60000);
          const start = new Date(running.currentStart || running.createdAt).getTime();
          const tick = () => setElapsed(baseMs + Math.max(0, Date.now() - start));
          tick();
          // ⚡ 500ms cadence ensures smooth second increments without skipping or heavy CPU load
          timerRef.current = setInterval(tick, 500);
        } else if (paused) {
          setElapsed(Math.max(0, (paused.totalMinutes || 0) * 60000));
        } else {
          setElapsed(0);
        }
      }
    } catch (e) {
      console.error("Overlay: error loading sessions", e);

      // Check if offline
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        offlineManager.setOffline(true);
        setIsOffline(true);

        const offSess = offlineManager.getOfflineSession();
        if (offSess && (offSess.status === "active" || offSess.status === "paused")) {
          const prevActive = activeSessionRef.current;
          const isAlreadyRunning =
            prevActive?.status === "active" &&
            offSess?.status === "active" &&
            (String(prevActive?._id) === String(offSess?._id) || String(prevActive?._id).startsWith("temp-")) &&
            timerRef.current !== null;

          setActiveSession(offSess);
          activeSessionRef.current = offSess;

          if (!isAlreadyRunning) {
            clearTicker();
            if (offSess.status === "active") {
              const baseMs = Math.max(0, (offSess.accumulatedMinutes || 0) * 60000);
              const start = new Date(offSess.currentStart || offSess.createdAt).getTime();
              const tick = () => setElapsed(baseMs + Math.max(0, Date.now() - start));
              tick();
              timerRef.current = setInterval(tick, 500);
            } else if (offSess.status === "paused") {
              setElapsed(Math.max(0, (offSess.totalMinutes || offSess.accumulatedMinutes || 0) * 60000));
            }
          }
          return;
        } else {
          setActiveSession(null);
          activeSessionRef.current = null;
          clearTicker();
          setElapsed(0);
          return;
        }
      }

      if (e.status === 401) {
        localStorage.removeItem("auth");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:expired"));
        }
        return;
      }

      if (retryCount < 2 && !offlineManager.isOffline()) {
        setTimeout(() => loadSessions(retryCount + 1), 2000);
      }
    }
  }

  // ---------- mount / unmount ----------
  useEffect(() => {
    loadSessions();
    return () => clearTicker();
  }, []);

  // 🔄 Periodic auto-sync every 10 seconds to ensure overlay never desyncs from backend
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!offlineManager.isOffline()) {
        loadSessions();
      }
    }, 10000);

    return () => clearInterval(syncInterval);
  }, []);

  // ---------- respond to sessions:changed from WorkTimer / main window ----------
  useEffect(() => {
    const off = window.worktracker?.onSessionsChanged?.(() => {
      loadSessions();
    });

    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  useEffect(() => {
    window.worktracker?.resizeOverlay?.({
      width: 148,
      height: 30,
    });
  }, []);

  // 🖱️ Automatic resume on user activity (mouse move, keypress, click) when paused
  const handleUserActivity = (e) => {
    const cur = activeSessionRef.current;
    if (!cur || cur.status !== "paused") return;
    if (Date.now() < pauseCooldownRef.current) return;

    if (e && e.type === "mousemove") {
      const dx = Math.abs(e.clientX - lastMousePosRef.current.x);
      const dy = Math.abs(e.clientY - lastMousePosRef.current.y);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      if (dx < 4 && dy < 4) return;
    }

    if (resumeInProgressRef.current) return;
    resumeInProgressRef.current = true;
    doResume().finally(() => {
      resumeInProgressRef.current = false;
    });
  };

  useEffect(() => {
    const onMove = (e) => handleUserActivity(e);
    const onKey = (e) => handleUserActivity(e);
    const onClick = (e) => handleUserActivity(e);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("keydown", onKey, { passive: true });
    window.addEventListener("mousedown", onClick, { passive: true });

    const offActive = window.worktracker?.onSystemActive?.(handleUserActivity);
    const offActivity = window.worktracker?.onUserActivity?.(handleUserActivity);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      if (typeof offActive === "function") offActive();
      if (typeof offActivity === "function") offActivity();
    };
  }, []);

  // ---------- actions (manual buttons) with offline fallbacks ----------
  async function doStart() {
    const lastProjectId = localStorage.getItem("lastProjectId");
    if (!lastProjectId) {
      setError("Choose project in main app first");
      setTimeout(() => setError(""), 4000);
      return;
    }

    const now = new Date();
    const tempId = "temp-" + Date.now();
    const optimisticSession = {
      _id: tempId,
      status: "active",
      currentStart: now.toISOString(),
      createdAt: now.toISOString(),
      projectId: lastProjectId,
      projectName: "Project",
      accumulatedMinutes: 0,
      totalMinutes: 0,
    };

    actionLockRef.current = { type: "start", tempId, session: optimisticSession };
    setActiveSession(optimisticSession);
    activeSessionRef.current = optimisticSession;
    clearTicker();
    const tick = () => setElapsed(Math.max(0, Date.now() - now.getTime()));
    tick();
    timerRef.current = setInterval(tick, 500);

    try {
      const res = await api("/api/work-sessions/start", {
        method: "POST",
        token: auth.token,
        body: { projectId: lastProjectId },
      });
      offlineManager.setOffline(false);
      setIsOffline(false);
      if (res && res._id) {
        actionLockRef.current = null;
        setActiveSession(res);
        activeSessionRef.current = res;
      }
    } catch (e) {
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        const offSess = offlineManager.startOfflineSession({
          projectId: lastProjectId,
          projectName: "Project",
        });
        actionLockRef.current = null;
        setActiveSession(offSess);
        activeSessionRef.current = offSess;
        setIsOffline(true);
      } else {
        clearTicker();
        setActiveSession(null);
        activeSessionRef.current = null;
        setElapsed(0);
        setError(e?.message || "Failed to start");
      }
    } finally {
      actionLockRef.current = null;
      window.worktracker?.notifySessionsChanged?.();
      loadSessions();
    }
  }

  async function doPause() {
    pauseCooldownRef.current = Date.now() + 2000; // 2s cooldown so clicking pause doesn't immediately auto-resume
    const cur = activeSessionRef.current || activeSession;
    if (cur) {
      const additionalMins = cur.currentStart
        ? Math.max(0, (Date.now() - new Date(cur.currentStart).getTime()) / 60000)
        : 0;
      const newAccumulated = (cur.accumulatedMinutes || 0) + additionalMins;
      const pausedSess = {
        ...cur,
        status: "paused",
        accumulatedMinutes: newAccumulated,
        totalMinutes: newAccumulated,
        currentStart: null,
      };
      actionLockRef.current = { type: "pause", sessionId: cur._id, session: pausedSess };
      clearTicker();
      setElapsed(Math.max(0, newAccumulated * 60000));
      setActiveSession(pausedSess);
      activeSessionRef.current = pausedSess;
    }

    try {
      await api("/api/work-sessions/pause", {
        method: "POST",
        token: auth.token,
      });
      offlineManager.setOffline(false);
      setIsOffline(false);
    } catch (e) {
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        offlineManager.pauseOfflineSession(cur);
        setIsOffline(true);
      }
    } finally {
      actionLockRef.current = null;
      window.worktracker?.notifySessionsChanged?.();
      loadSessions();
    }
  }

  async function doResume() {
    pauseCooldownRef.current = 0;
    const cur = activeSessionRef.current || activeSession;
    if (cur) {
      const resumedSess = {
        ...cur,
        status: "active",
        currentStart: new Date().toISOString(),
      };
      actionLockRef.current = { type: "resume", sessionId: cur._id, session: resumedSess };
      setActiveSession(resumedSess);
      activeSessionRef.current = resumedSess;
      clearTicker();
      const baseMs = Math.max(0, (cur.accumulatedMinutes || 0) * 60000);
      const start = Date.now();
      const tick = () => setElapsed(baseMs + Math.max(0, Date.now() - start));
      tick();
      timerRef.current = setInterval(tick, 500);
    }

    try {
      await api("/api/work-sessions/resume", {
        method: "POST",
        token: auth.token,
      });
      offlineManager.setOffline(false);
      setIsOffline(false);
    } catch (e) {
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        offlineManager.resumeOfflineSession(cur);
        setIsOffline(true);
      }
    } finally {
      actionLockRef.current = null;
      window.worktracker?.notifySessionsChanged?.();
      loadSessions();
    }
  }

  async function doStop() {
    const cur = activeSessionRef.current || activeSession;
    actionLockRef.current = { type: "stop", sessionId: cur?._id };
    clearTicker();
    setActiveSession(null);
    activeSessionRef.current = null;
    setElapsed(0);

    try {
      await api("/api/work-sessions/stop", {
        method: "POST",
        token: auth.token,
      });
      offlineManager.setOffline(false);
      setIsOffline(false);
    } catch (e) {
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        offlineManager.stopOfflineSession("", cur);
        setIsOffline(true);
      }
    } finally {
      actionLockRef.current = null;
      window.worktracker?.notifySessionsChanged?.();
      loadSessions();
    }
  }

  // ---------- state flags / primary button ----------
  const hasRunning = activeSession?.status === "active";
  const hasPaused = activeSession?.status === "paused";
  const anyCurrent = Boolean(activeSession);
  const lastProjectId = localStorage.getItem("lastProjectId");

  const primaryDisabled = !hasRunning && !hasPaused && !lastProjectId;
  const primaryAction = hasRunning ? doPause : hasPaused ? doResume : doStart;

  return (
    <div
      ref={cardRef}
      className="group flex items-center justify-between select-none px-2 transition-all rounded-full border border-slate-700/60 bg-slate-900/95 text-white shadow-lg hover:border-slate-600/80"
      style={{
        WebkitAppRegion: "drag",
        height: "30px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="flex items-center gap-1.5 w-full justify-between"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        {/* Status indicator & Timer (click opens main app) */}
        <div
          className="flex items-center gap-1.5 cursor-pointer shrink-0"
          onClick={() => window.worktracker?.openMain?.()}
          title={
            isOffline
              ? "Offline Mode - Saved Locally"
              : hasRunning
              ? "Session Active - Click to open Work Tracker"
              : hasPaused
              ? "Session Paused - Click to open Work Tracker"
              : "Work Tracker - Click to open"
          }
        >
          {/* Live status dot */}
          <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
            {hasRunning && !isOffline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isOffline
                  ? "bg-amber-400 animate-pulse"
                  : hasRunning
                  ? "bg-emerald-400"
                  : hasPaused
                  ? "bg-amber-400"
                  : "bg-slate-500"
              }`}
            />
          </span>

          {/* Digital Timer */}
          <span
            className={`font-mono text-[12.5px] font-semibold tracking-tight transition-colors ${
              isOffline
                ? "text-amber-400"
                : hasRunning
                ? "text-white group-hover:text-emerald-300"
                : hasPaused
                ? "text-amber-300"
                : "text-slate-400"
            }`}
          >
            {fmt(elapsed)}
          </span>
        </div>

        {/* Hairline Divider */}
        <div className="w-px h-3 bg-slate-700/80 shrink-0" />

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Play / Pause / Resume */}
          <button
            type="button"
            className={`w-[20px] h-[20px] flex items-center justify-center rounded-full transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${
              hasRunning
                ? "bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/30"
                : hasPaused
                ? "bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
            }`}
            disabled={primaryDisabled}
            onClick={primaryAction}
            title={hasRunning ? "Pause timer" : hasPaused ? "Resume timer" : "Start timer"}
          >
            {hasRunning ? (
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5 translate-x-0.2" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            )}
          </button>

          {/* Stop Button */}
          <button
            type="button"
            className="w-[20px] h-[20px] flex items-center justify-center rounded-full bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/30 transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            disabled={!anyCurrent}
            onClick={doStop}
            title="Stop timer"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
