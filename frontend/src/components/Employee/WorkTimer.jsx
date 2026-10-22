import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { api } from "../../api.js";
import DateRangePicker from "../../components/DateRangePicker";
import { offlineManager } from "../../utils/offlineManager.js";
import { Wifi, WifiOff, RefreshCw, FolderKanban } from "lucide-react";

export default function WorkTimer({ auth, initialSelectedTask }) {
  // ---------------- STATES ----------------
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);

  // NEW: Toggle Mode
  const [mode, setMode] = useState("project"); // project | custom

  // Work Type (Project Mode Only)
  const [workTypes, setWorkTypes] = useState([]);
  const [workType, setWorkType] = useState("");

  // Filters
  const [companyId, setCompanyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [projectId, setProjectId] = useState("");

  // Custom Task (shown only in custom mode)
  const [customTask, setCustomTask] = useState("");
  const [assignedTaskInfo, setAssignedTaskInfo] = useState(initialSelectedTask || null);

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  // today | week | month
  // 🔹 View toggle (NEW)
  const [view, setView] = useState("work"); // work | project

  const [expandedProject, setExpandedProject] = useState(null);

  const [projectTotals, setProjectTotals] = useState([]);
  const [projectLoading, setProjectLoading] = useState(false);

  // Stopwatch
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const activeSessionRef = useRef(null);
  const autoPausedRef = useRef(false);

  const resumeInProgressRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const pauseCooldownRef = useRef(0);
  const actionLockRef = useRef(null);
  const opChainRef = useRef(Promise.resolve());
  const enqueueSessionOp = useCallback((opFn) => {
    const next = opChainRef.current.then(opFn, opFn);
    opChainRef.current = next;
    return next;
  }, []);

  // 🔒 Refs that mirror state for use in async callbacks (avoids stale closures)
  const sessionsRef = useRef([]);
  const elapsedRef = useRef(0);

  // 🌐 Offline State
  const [isOffline, setIsOffline] = useState(offlineManager.isOffline());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = offlineManager.subscribe((event, data) => {
      if (event === "networkStatus") setIsOffline(data.isOffline);
      if (event === "syncing") setIsSyncing(data);
      if (event === "syncSuccess") {
        setIsOffline(false);
        loadSessionsAndTick();
      }
    });
    return unsub;
  }, []);

  // 🧹 Clean up ticker interval on unmount to prevent memory leaks
  useEffect(() => {
    return () => clearTicker();
  }, []);

  const loadingSessionsRef = useRef(false);

  // ✅ DATE RANGE STATE (ADD THIS)
  const [range, setRange] = useState({
    from: null,
    to: null,
  });

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  // Machine Info
  const [machine, setMachine] = useState(null);
  useEffect(() => {
    window.worktracker
      ?.getConfig?.()
      .then((cfg) => setMachine(cfg))
      .catch(() => {});
  }, []);

  // ---- helpers ----
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return (
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0")
    );
  }

  function minutesToHHMM(mins) {
    const totalSeconds = Math.max(0, Math.round((mins || 0) * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function clearTicker() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function getLocalDateStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // ---- loaders ----
async function loadMaster() {
  setError("");

  try {
    const [c, g] = await Promise.all([
      api("/api/companies", { token: auth.token }),
      api("/api/categories", { token: auth.token }),
    ]);

    // Company names in alphabetical order A-Z
    setCompanies(
      [...(c || [])].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        }),
      ),
    );

    setCategories(g || []);
  } catch (e) {
    setError("Could not load master data. Please retry.");
  }
}

  async function loadProjects() {
    setError("");
    if (!companyId || !categoryId) {
      setProjects([]);
      return;
    }
    try {
      const list = await api(
        `/api/projects?company=${companyId}&category=${categoryId}`,
        { token: auth.token },
      );
      setProjects(
        (list || []).sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        )
      );
    } catch (e) {
      setError("Could not load projects.");
    }
  }

  function startLocalTicker(session) {
    clearTicker();
    if (session?.status === "active") {
      const baseMs = Math.max(0, (session.accumulatedMinutes || 0) * 60000);
      const start = new Date(
        session.currentStart || session.createdAt || Date.now()
      ).getTime();

      const update = () => {
        setElapsed(baseMs + Math.max(0, Date.now() - start));
      };

      update();
      // ⚡ 500ms cadence ensures smooth second transitions without CPU/render overhead
      timerRef.current = setInterval(update, 500);
    } else if (session?.status === "paused") {
      setElapsed(Math.max(0, (session.totalMinutes || session.accumulatedMinutes || 0) * 60000));
    } else {
      setElapsed(0);
    }
  }

  async function loadSessionsAndTick(options = {}) {
    const isBackground = !!options.isBackground;
    if (loadingSessionsRef.current) return;
    loadingSessionsRef.current = true;
    if (!isBackground) setLoading(true);

    const prevSessions = sessionsRef.current;
    const prevActiveSession = activeSessionRef.current;
    const prevElapsed = elapsedRef.current;

    try {
      // 🌐 First, if online and there are queued offline sessions, reconcile with server
      if (!offlineManager.isOffline() && auth?.token) {
        await offlineManager.syncWithServer(auth.token);
      }

      let fromDate = range.from;
      let toDate = range.to;

      const now = new Date();
      if (!fromDate || !toDate) {
        if (dateFilter === "week") {
          const start = new Date(now);
          const day = start.getDay();
          const diff = start.getDate() - day + (day === 0 ? -6 : 1);
          start.setDate(diff);
          fromDate = getLocalDateStr(start);
          toDate = getLocalDateStr(now);
        } else if (dateFilter === "month") {
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          fromDate = getLocalDateStr(start);
          toDate = getLocalDateStr(now);
        } else {
          // "today"
          const todayStr = getLocalDateStr(now);
          fromDate = todayStr;
          toDate = todayStr;
        }
      }

      const sess = await api(
        `/api/work-sessions/my?from=${fromDate}&to=${toDate}`,
        { token: auth.token },
      );

      offlineManager.setOffline(false);
      setIsOffline(false);

      let arr = Array.isArray(sess) ? [...sess] : [];

      // 🛡️ RECONCILIATION LOCK: Ensure ongoing optimistic actions (start, pause, resume, stop) are not overwritten by stale server GET responses
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

      const todayStr = getLocalDateStr(new Date());

      // 🛡️ Filter strictly for today's active/paused session.
      // Sessions from previous days (even if viewed in 'week' or 'month' range) must NEVER be treated as the active session today!
      const running = arr.find((x) => x.status === "active" && x.date === todayStr);
      const paused = arr.find((x) => x.status === "paused" && x.date === todayStr);
      let current = running || paused || null;

      if (lock && lock.type === "stop") {
        current = null;
      }

      // If current session is from a previous day, disregard it as active
      if (current && current.date && current.date !== todayStr) {
        current = null;
      }

      // 🛡️ Smoothness check: if the active session is ALREADY running and ticking, do NOT recreate or wipe out the interval
      const prevActive = activeSessionRef.current;
      const isAlreadyRunning =
        prevActive?.status === "active" &&
        current?.status === "active" &&
        (String(prevActive?._id) === String(current?._id) || String(prevActive?._id).startsWith("temp-")) &&
        timerRef.current !== null;

      const isTodayIncluded = !range.from || (range.from <= todayStr && (!range.to || range.to >= todayStr));
      if (isTodayIncluded || current) {
        setActiveSession(current);
        activeSessionRef.current = current;
        if (!isAlreadyRunning) {
          startLocalTicker(current);
        }
      }
      setError("");
    } catch (e) {
      console.error("LOAD SESSION ERROR 👉", e);

      // 🌐 Check if this is an offline error
      const offlineDetected = e?.isOffline || !navigator.onLine || e?.status === 0;
      if (offlineDetected) {
        offlineManager.setOffline(true);
        setIsOffline(true);

        const todayStr = getLocalDateStr(new Date());
        const offSess = offlineManager.getOfflineSession();
        if (offSess && offSess.date === todayStr && (offSess.status === "active" || offSess.status === "paused")) {
          const prevActive = activeSessionRef.current;
          const isAlreadyRunning =
            prevActive?.status === "active" &&
            offSess?.status === "active" &&
            (String(prevActive?._id) === String(offSess?._id) || String(prevActive?._id).startsWith("temp-")) &&
            timerRef.current !== null;

          setActiveSession(offSess);
          activeSessionRef.current = offSess;
          setSessions((prev) => {
            const exists = prev.some((s) => s._id === offSess._id);
            return exists ? prev.map((s) => (s._id === offSess._id ? offSess : s)) : [offSess, ...prev];
          });
          if (!isAlreadyRunning) {
            startLocalTicker(offSess);
          }
        } else {
          setActiveSession(null);
          activeSessionRef.current = null;
          clearTicker();
          setElapsed(0);
        }
        setError(""); // Smooth fallback, no red error alert
      } else {
        setSessions(prevSessions);
        setActiveSession(prevActiveSession);
        activeSessionRef.current = prevActiveSession;
        setElapsed(prevElapsed);

        const status = e?.status || e?.response?.status;
        if (status === 401) {
          setError(
            "Session sync failed because login token expired. Please login again.",
          );
        } else {
          setError("Could not sync sessions. Showing last known session data.");
        }
      }
    } finally {
      setLoading(false);
      loadingSessionsRef.current = false;
    }
  }

  async function loadWorkTypes() {
    try {
      const list = await api("/api/work-sessions/work-types", {
        token: auth.token,
      });
      const arr =
        Array.isArray(list) && list.length
          ? list
          : [
              "Alpha",
              "Beta",
              "CR",
              "Rework",
              "poc",
              "Analysis",
              "Storyboard QA",
              "Output QA",
            ];
      setWorkTypes(arr);
      if (!workType && arr.length) setWorkType(arr[0]);
    } catch (e) {
      const fallback = [
        "Alpha",
        "Beta",
        "CR",
        "Rework",
        "poc",
        "Analysis",
        "Storyboard QA",
        "Output QA",
      ];
      setWorkTypes(fallback);
      if (!workType) setWorkType(fallback[0]);
    }
  }

  async function safeAutoResume(flagKey) {
    if (resumeInProgressRef.current) return;

    const flag = localStorage.getItem(flagKey);
    if (flag !== "1") return;

    const todayStr = getLocalDateStr(new Date());
    const cur = activeSessionRef.current;
    if (!cur || cur.status !== "paused" || cur.date !== todayStr) {
      localStorage.removeItem(flagKey);
      return;
    }

    resumeInProgressRef.current = true;
    try {
      await resume();
      localStorage.removeItem(flagKey);
    } finally {
      resumeInProgressRef.current = false;
    }
  }

  // Initial load
  useEffect(() => {
    (async () => {
      await loadMaster();
      await loadWorkTypes();
      await loadSessionsAndTick();
    })();
    return () => clearTicker();
  }, []);

  const selectAssignedTask = useCallback(
    async (task) => {
      if (!task) return;
      try {
        const proj = task.project;
        const pId = proj?._id || proj;
        const cId = proj?.company?._id || proj?.company || "";
        const catId = proj?.category?._id || proj?.category || "";

        setAssignedTaskInfo(task);

        if (pId) {
          setMode("project");
          if (cId) setCompanyId(String(cId));
          if (catId) setCategoryId(String(catId));
          setProjectId(String(pId));
          localStorage.setItem("lastProjectId", String(pId));

          if (cId && catId) {
            try {
              const list = await api(
                `/api/projects?company=${cId}&category=${catId}`,
                { token: auth.token }
              );
              if (Array.isArray(list)) {
                setProjects(
                  [...list].sort((a, b) =>
                    (a.name || "").localeCompare(b.name || "", undefined, {
                      sensitivity: "base",
                    })
                  )
                );
              }
            } catch (_) {}
          }

          if (task.taskType) {
            setWorkType(task.taskType);
          }
        } else {
          setMode("custom");
          setCustomTask(task.title || "");
        }

        // Smoothly focus the Start Timer button
        setTimeout(() => {
          const btn = document.getElementById("work-timer-start-btn");
          if (btn) {
            btn.scrollIntoView({ behavior: "smooth", block: "center" });
            btn.focus();
            btn.classList.add("ring-4", "ring-emerald-400", "scale-105");
            setTimeout(() => {
              btn?.classList.remove("ring-4", "ring-emerald-400", "scale-105");
            }, 1800);
          }
        }, 150);
      } catch (err) {
        console.error("Failed to select assigned task in timer:", err);
      }
    },
    [auth?.token]
  );

  useEffect(() => {
    if (initialSelectedTask) {
      selectAssignedTask(initialSelectedTask);
    }
  }, [initialSelectedTask, selectAssignedTask]);


  useEffect(() => {
    loadProjects();

    if (!companyId || !categoryId) return;

    const interval = setInterval(() => {
      loadProjects(); // 🔥 refresh project list gently
    }, 60000); // every 60 seconds (prevents constant network and CPU churn)

    return () => clearInterval(interval);
  }, [companyId, categoryId]);

  // Refresh from other windows
  useEffect(() => {
    const off = window.worktracker?.onSessionsChanged?.(() => {
      loadSessionsAndTick({ isBackground: true });
    });
    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  // 🔄 Periodic auto-sync (every 15s) in background to guarantee WorkTimer and Overlay never desync
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!offlineManager.isOffline() && !loadingSessionsRef.current) {
        loadSessionsAndTick({ isBackground: true });
      }
    }, 15000);

    return () => clearInterval(syncInterval);
  }, [dateFilter, range.from, range.to]);

  // System sleep/idle handlers
  useEffect(() => {
    const handler = () => {
      const cur = activeSessionRef.current;
      if (!cur || cur.status !== "active") return;

      autoPausedRef.current = true;
      localStorage.setItem("wt_auto_paused", "1");

      clearTicker();
      setElapsed((prev) => prev);

      pause();
    };

    const off = window.worktracker?.onSystemSleep?.(handler);
    return () => typeof off === "function" && off();
  }, []);

  useEffect(() => {
    const handler = () => {
      const todayStr = getLocalDateStr(new Date());
      const cur = activeSessionRef.current;
      if (!cur || cur.status !== "paused") return;

      // Do not auto-resume sessions from previous days!
      if (cur.date && cur.date !== todayStr) {
        setActiveSession(null);
        activeSessionRef.current = null;
        clearTicker();
        setElapsed(0);
        return;
      }

      autoPausedRef.current = false;
      autoResumeOnActivity("system:wake");
    };

    const off = window.worktracker?.onSystemWake?.(handler);
    return () => typeof off === "function" && off();
  }, []);

  useEffect(() => {
    const handler = () => {
      const cur = activeSessionRef.current;
      if (!cur || cur.status !== "active") return;

      localStorage.setItem("wt_idle_paused", "1");

      clearTicker();
      setElapsed((prev) => prev);

      pause(true); // isAuto = true (0s cooldown)
    };

    const off = window.worktracker?.onSystemIdle?.(handler);
    return () => typeof off === "function" && off();
  }, []);

  // 🖱️ Automatic resume on user activity (mouse movement, keypress, click, scroll) when paused
  const autoResumeOnActivity = useCallback((source = "user") => {
    const todayStr = getLocalDateStr(new Date());
    let cur = activeSessionRef.current || activeSession;
    if (cur?.date && cur.date !== todayStr) {
      setActiveSession(null);
      activeSessionRef.current = null;
      clearTicker();
      setElapsed(0);
      cur = null;
    }

    if (!cur || cur.status !== "paused") {
      const pausedInList = (sessionsRef.current || []).find((s) => s.status === "paused" && s.date === todayStr);
      if (pausedInList) {
        cur = pausedInList;
        activeSessionRef.current = pausedInList;
        setActiveSession(pausedInList);
      }
    }

    const isPaused = cur?.status === "paused" && cur?.date === todayStr;
    if (!isPaused) return;

    // Grace period right after manual pausing (prevent click release from instantly un-pausing)
    if (Date.now() < pauseCooldownRef.current) return;

    if (resumeInProgressRef.current) return;

    localStorage.removeItem("wt_auto_paused");
    localStorage.removeItem("wt_idle_paused");
    autoPausedRef.current = false;

    resumeInProgressRef.current = true;
    // Watchdog timer: ensure lock is never permanently stuck if network hangs
    const watchdog = setTimeout(() => {
      resumeInProgressRef.current = false;
    }, 4000);

    resume().finally(() => {
      clearTimeout(watchdog);
      resumeInProgressRef.current = false;
    });
  }, [activeSession]);

  useEffect(() => {
    let lastCheck = 0;
    let anchorPos = null;

    const activityHandler = (e) => {
      const cur = activeSessionRef.current || activeSession;
      const isPaused = cur?.status === "paused" || (sessionsRef.current || []).some((s) => s.status === "paused");
      if (!isPaused) return;

      if (Date.now() < pauseCooldownRef.current) return;

      // For mouse move, require real movement of at least 5px from anchor to filter optical sensor micro-jitter
      if (e && e.type === "mousemove") {
        if (!anchorPos) {
          anchorPos = { x: e.clientX, y: e.clientY };
          return;
        }
        const dist = Math.hypot(e.clientX - anchorPos.x, e.clientY - anchorPos.y);
        if (dist < 5) return;
        anchorPos = { x: e.clientX, y: e.clientY };
      }

      const now = Date.now();
      if (now - lastCheck < 400) return;
      lastCheck = now;

      autoResumeOnActivity(e?.type || "user");
    };

    window.addEventListener("mousemove", activityHandler, { passive: true });
    window.addEventListener("keydown", activityHandler, { passive: true });
    window.addEventListener("mousedown", activityHandler, { passive: true });
    window.addEventListener("wheel", activityHandler, { passive: true });
    window.addEventListener("focus", () => autoResumeOnActivity("window:focus"));

    const handleVisChange = () => {
      if (document.visibilityState === "visible") {
        autoResumeOnActivity("window:visible");
      }
    };
    document.addEventListener("visibilitychange", handleVisChange);

    // Also listen to system-level active, wake, and user-activity from Electron
    const offActive = window.worktracker?.onSystemActive?.(() => autoResumeOnActivity("system:active"));
    const offActivity = window.worktracker?.onUserActivity?.(() => autoResumeOnActivity("system:user-activity"));
    const offWake = window.worktracker?.onSystemWake?.(() => autoResumeOnActivity("system:wake"));

    return () => {
      window.removeEventListener("mousemove", activityHandler);
      window.removeEventListener("keydown", activityHandler);
      window.removeEventListener("mousedown", activityHandler);
      window.removeEventListener("wheel", activityHandler);
      window.removeEventListener("focus", () => autoResumeOnActivity("window:focus"));
      document.removeEventListener("visibilitychange", handleVisChange);
      if (typeof offActive === "function") offActive();
      if (typeof offActivity === "function") offActivity();
      if (typeof offWake === "function") offWake();
    };
  }, [autoResumeOnActivity, activeSession]);

  useEffect(() => {
    const off = window.worktracker?.onAppClosing?.(() => {
      // ❌ DO NOT auto-stop session here
      // Only confirm close
      window.worktracker?.confirmAppClose?.();
    });

    return () => typeof off === "function" && off();
  }, []);

  // ⏱️ Synchronize timer running state with Electron and idle alert
  useEffect(() => {
    const isRunning = Boolean(
      activeSession && (activeSession.status === "active" || activeSession.status === "paused")
    );
    window.worktracker?.setTimerRunning?.(isRunning);

    // Actively running (ticking) vs stopped/paused
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

  // 🎯 Highlight and focus start button when reminder "Start Timer Now" is clicked
  useEffect(() => {
    const handleFocusStart = () => {
      const btn = document.getElementById("work-timer-start-btn");
      if (btn) {
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        btn.focus();
        btn.classList.add("ring-4", "ring-emerald-400", "scale-105");
        setTimeout(() => {
          btn.classList.remove("ring-4", "ring-emerald-400", "scale-105");
        }, 1800);
      }
    };
    window.addEventListener("timer:focusStart", handleFocusStart);
    return () => window.removeEventListener("timer:focusStart", handleFocusStart);
  }, []);

  // 🔥 LOAD SESSIONS WHEN DATE RANGE CHANGES
  useEffect(() => {
    if (range.from && range.to) {
      loadSessionsAndTick();
    }
  }, [range.from, range.to]);

  // 🔥 RELOAD DATA WHEN TODAY / WEEK / MONTH CHANGES
  useEffect(() => {
    // If custom range is active, don't auto reload
    if (range.from && range.to) return;

    loadSessionsAndTick();
  }, [dateFilter]);

  const todayStr = getLocalDateStr(new Date());
  const isTodaySession = activeSession?.date === todayStr;
  const hasRunning = activeSession?.status === "active" && isTodaySession;
  const hasPaused = activeSession?.status === "paused" && isTodaySession;
  const anyCurrent = Boolean(activeSession && isTodaySession);

  const activeProjId = activeSession?.projectId || (typeof activeSession?.project === "object" ? activeSession?.project?._id : activeSession?.project);
  const activeCustom = activeSession?.customTask || "";

  const isSameContext = anyCurrent && (
    mode === "project"
      ? (String(activeProjId || "") === String(projectId || "") && !!projectId)
      : (mode === "custom" && activeCustom === customTask.trim())
  );

  const selectedProj = projects.find((p) => p._id === projectId);

  // ---- actions ----
  async function start() {
    setError("");

    // NEW VALIDATION
    if (mode === "project" && !projectId) {
      return setError("Please select a project.");
    }

    if (mode === "custom" && !customTask.trim()) {
      return setError("Please enter a custom task.");
    }

    if (mode === "project" && projectId) {
      localStorage.setItem("lastProjectId", projectId);
    }

    const selectedProj = projects.find((p) => p._id === projectId);

    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const tempId = "temp-" + Date.now();

    // ⚡ INSTANT OPTIMISTIC START (0ms UI latency)
    const optimisticSession = {
      _id: tempId,
      status: "active",
      currentStart: now.toISOString(),
      createdAt: now.toISOString(),
      date: todayStr,
      projectId: mode === "project" ? projectId : null,
      projectName: mode === "project" ? (selectedProj?.name || "—") : "(Custom Task)",
      companyName: mode === "project" ? (selectedProj?.company?.name || "—") : "—",
      categoryName: mode === "project" ? (selectedProj?.category?.name || "—") : "—",
      customTask: mode === "custom" ? customTask.trim() : null,
      taskTitle: mode === "custom" ? customTask.trim() : null,
      taskType: mode === "project" ? workType : "Alpha",
      accumulatedMinutes: 0,
      totalMinutes: 0,
      segments: [],
      remarks: "",
    };

    actionLockRef.current = { type: "start", tempId, session: optimisticSession };
    setActiveSession(optimisticSession);
    activeSessionRef.current = optimisticSession;
    startLocalTicker(optimisticSession);
    setSessions((prev) => [optimisticSession, ...prev.filter((s) => s._id !== tempId)]);

    try {
      const body = {
        taskType: mode === "project" ? workType : undefined,
        projectId: mode === "project" ? projectId : null,
        taskId: mode === "project" && assignedTaskInfo ? (assignedTaskInfo._id || assignedTaskInfo.id) : undefined,
        taskTitle: mode === "project" && assignedTaskInfo ? assignedTaskInfo.title : undefined,
        customTask: mode === "custom" ? customTask.trim() : null,
        remarks: assignedTaskInfo?.title ? `Task: ${assignedTaskInfo.title}` : "",
      };

      // Automatically move open planned task to in_progress
      if (assignedTaskInfo && (assignedTaskInfo.status === "open" || assignedTaskInfo.status === "not_started")) {
        api(`/api/tasks/${assignedTaskInfo._id || assignedTaskInfo.id}/status`, {
          method: "PATCH",
          token: auth.token,
          body: { status: "in_progress" },
        })
          .then(() => {
            window.dispatchEvent(new CustomEvent("taskCount:refresh"));
          })
          .catch((e) => console.warn("Auto task status transition warning:", e.message));
      }

      const res = await api("/api/work-sessions/start", {
        method: "POST",
        token: auth.token,
        body,
      });

      offlineManager.setOffline(false);
      setIsOffline(false);

      if (res && res._id) {
        actionLockRef.current = null;
        setActiveSession((prev) => {
          if (prev && (prev._id === tempId || prev._id === res._id)) {
            return { ...res, currentStart: prev.currentStart || res.currentStart };
          }
          return prev;
        });
        activeSessionRef.current = res;
        setSessions((prev) => [res, ...prev.filter((s) => s._id !== tempId && s._id !== res._id)]);
      }

      window.worktracker?.notifySessionsChanged?.();
      loadSessionsAndTick({ isBackground: true });
    } catch (e) {
      // 🌐 OFFLINE FALLBACK: Start session in local cache seamlessly
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        console.log("🌐 Network offline -> starting session in local cache");
        const offSess = offlineManager.startOfflineSession({
          projectId: mode === "project" ? projectId : null,
          projectName: mode === "project" ? selectedProj?.name : "(Custom Task)",
          companyName: selectedProj?.company?.name || "—",
          categoryName: selectedProj?.category?.name || "—",
          customTask: mode === "custom" ? customTask.trim() : null,
          taskType: mode === "project" ? workType : "Alpha",
          remarks: "",
        });

        actionLockRef.current = null;
        setActiveSession(offSess);
        activeSessionRef.current = offSess;
        setSessions((prev) => [offSess, ...prev.filter((s) => s._id !== tempId && s._id !== offSess._id)]);
        setIsOffline(true);
        window.worktracker?.notifySessionsChanged?.();
      } else {
        clearTicker();
        setActiveSession(null);
        activeSessionRef.current = null;
        setSessions((prev) => prev.filter((s) => s._id !== tempId));
        setError(e.message || "Failed to start session.");
      }
    } finally {
      actionLockRef.current = null;
    }
  }

  async function pause(isAuto = false) {
    return enqueueSessionOp(async () => {
      setError("");
      // Cooldown is only needed for manual mouse click on Pause button (1s), 0s for auto-pause
      pauseCooldownRef.current = isAuto ? 0 : Date.now() + 1000;

      const cur = activeSessionRef.current || activeSession;
      if (!cur) return;

      // ⚡ INSTANT OPTIMISTIC PAUSE (0ms UI latency)
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
      setSessions((prev) => prev.map((s) => (s._id === cur._id ? pausedSess : s)));

      try {
        await api("/api/work-sessions/pause", {
          method: "POST",
          token: auth.token,
          body: {
            sessionId: cur._id && !String(cur._id).startsWith("temp-") && !String(cur._id).startsWith("offline-")
              ? cur._id
              : undefined,
          },
        });

        offlineManager.setOffline(false);
        setIsOffline(false);
        window.worktracker?.notifySessionsChanged?.();
        loadSessionsAndTick({ isBackground: true });
      } catch (e) {
        // 🌐 OFFLINE FALLBACK: Pause session in local cache
        if (e?.isOffline || !navigator.onLine || e?.status === 0) {
          console.log("🌐 Network offline -> pausing session in local cache");
          const pausedSess = offlineManager.pauseOfflineSession(cur);
          if (pausedSess) {
            setActiveSession(pausedSess);
            activeSessionRef.current = pausedSess;
            setSessions((prev) => prev.map((s) => (s._id === cur._id ? pausedSess : s)));
            setIsOffline(true);
            window.worktracker?.notifySessionsChanged?.();
          }
        } else {
          console.error("Pause failed:", e);
          setError(e?.message || "Failed to pause session.");
        }
      } finally {
        actionLockRef.current = null;
      }
    });
  }

  async function resume() {
    return enqueueSessionOp(async () => {
      setError("");
      pauseCooldownRef.current = 0;
      const todayStr = getLocalDateStr(new Date());
      let cur = activeSessionRef.current || activeSession || (sessionsRef.current || []).find((s) => s.status === "paused" && s.date === todayStr);

      // ⚡ INSTANT OPTIMISTIC RESUME (0ms UI latency)
      if (cur) {
        const resumedSess = {
          ...cur,
          status: "active",
          currentStart: new Date().toISOString(),
        };

        actionLockRef.current = { type: "resume", sessionId: cur._id, session: resumedSess };
        setActiveSession(resumedSess);
        activeSessionRef.current = resumedSess;
        startLocalTicker(resumedSess);
        setSessions((prev) => prev.map((s) => (s._id === cur._id ? resumedSess : s)));
      }

      const targetSessionId = cur?._id;
      try {
        const res = await api("/api/work-sessions/resume", {
          method: "POST",
          token: auth.token,
          body: {
            sessionId: targetSessionId && !String(targetSessionId).startsWith("temp-") && !String(targetSessionId).startsWith("offline-")
              ? targetSessionId
              : undefined,
          },
        });

        if (res && res._id) {
          setActiveSession(res);
          activeSessionRef.current = res;
          startLocalTicker(res);
          setSessions((prev) => [res, ...prev.filter((s) => s._id !== res._id)]);
        }

        offlineManager.setOffline(false);
        setIsOffline(false);
        window.worktracker?.notifySessionsChanged?.();
        loadSessionsAndTick({ isBackground: true });
      } catch (e) {
        // 🌐 OFFLINE FALLBACK: Resume session in local cache
        if (e?.isOffline || !navigator.onLine || e?.status === 0) {
          console.log("🌐 Network offline -> resuming session in local cache");
          const resumedSess = offlineManager.resumeOfflineSession(cur);
          if (resumedSess) {
            setActiveSession(resumedSess);
            activeSessionRef.current = resumedSess;
            setSessions((prev) => [resumedSess, ...prev.filter((s) => s._id !== resumedSess._id)]);
            startLocalTicker(resumedSess);
            setIsOffline(true);
            window.worktracker?.notifySessionsChanged?.();
          }
        } else {
          console.error("Resume failed:", e);
          setError(e?.message || "Failed to resume session.");
        }
      } finally {
        actionLockRef.current = null;
      }
    });
  }

  async function stop() {
    setError("");
    const cur = activeSessionRef.current || activeSession;
    const targetSessionId = cur?._id;

    // ⚡ INSTANT OPTIMISTIC STOP (0ms UI latency)
    actionLockRef.current = { type: "stop", sessionId: targetSessionId };
    clearTicker();
    setActiveSession(null);
    activeSessionRef.current = null;
    setElapsed(0);

    if (cur) {
      const additionalMins = cur.currentStart
        ? Math.max(0, (Date.now() - new Date(cur.currentStart).getTime()) / 60000)
        : 0;
      const finalMins = (cur.accumulatedMinutes || 0) + additionalMins;
      const stoppedSess = {
        ...cur,
        status: "stopped",
        accumulatedMinutes: finalMins,
        totalMinutes: finalMins,
        currentStart: null,
      };
      setSessions((prev) => prev.map((s) => (s._id === cur._id ? stoppedSess : s)));
    }

    try {
      await api("/api/work-sessions/stop", {
        method: "POST",
        token: auth.token,
        body: {},
      });

      offlineManager.setOffline(false);
      setIsOffline(false);
      window.worktracker?.notifySessionsChanged?.();
      loadSessionsAndTick({ isBackground: true });
    } catch (e) {
      // 🌐 OFFLINE FALLBACK: Stop session in local cache
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        console.log("🌐 Network offline -> stopping session in local cache");
        const stoppedSess = offlineManager.stopOfflineSession(stopRemarks.trim(), cur);
        if (stoppedSess) {
          clearTicker();
          setActiveSession(null);
          activeSessionRef.current = null;
          setElapsed(0);
          setSessions((prev) => [stoppedSess, ...prev.filter((s) => s._id !== stoppedSess._id)]);
          setIsOffline(true);
          window.worktracker?.notifySessionsChanged?.();
        }
      } else {
        console.error("Stop failed:", e);
        setError(e?.message || "Failed to stop session.");
      }
    } finally {
      actionLockRef.current = null;
    }
  }

  // ---- derived UI state ----

  function getTodayMs(s, now = Date.now()) {
    let ms = (s.accumulatedMinutes || 0) * 60000;

    if (s.status === "active" && s.currentStart) {
      ms += now - new Date(s.currentStart).getTime();
    }

    return Math.max(0, ms);
  }

  const todaysCompletedMs = useMemo(() => {
    const todayStr = getLocalDateStr(new Date());
    let sum = 0;
    for (const s of sessions) {
      if (s.date !== todayStr) continue;
      // Do not count the active session here (it is counted via activeSessionLiveMs)
      if (activeSession && String(s._id) === String(activeSession._id)) continue;
      sum += (s.totalMinutes || s.accumulatedMinutes || 0) * 60000;
    }
    return sum;
  }, [sessions, activeSession?._id]);

  const activeSessionLiveMs = activeSession && activeSession.status === "active"
    ? elapsed
    : (activeSession ? (activeSession.totalMinutes || activeSession.accumulatedMinutes || 0) * 60000 : 0);

  const todaysTotalMs = todaysCompletedMs + (isTodaySession ? activeSessionLiveMs : 0);

  const todaysSessionsCount = useMemo(() => {
    const todayStr = getLocalDateStr(new Date());
    return sessions.filter((s) => s.date === todayStr).length;
  }, [sessions]);

  const employeeName = auth?.user?.name || "Employee";
  const [expanded, setExpanded] = useState({});

  const groupedSessions = useMemo(() => {
    const map = new Map();

    for (const s of sessions) {
      const taskKey = s.taskId || s.taskTitle || (s.customTask ? `custom-${s.customTask}` : "none");
      const key = s.projectId
        ? `${s.date}|project|${s.projectId}|${s.taskType || "none"}|${taskKey}`
        : `${s.date}|custom|${s.customTask ? `custom-${s.customTask}` : s._id}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          date: s.date,
          companyName: s.companyName || "—",
          categoryName: s.categoryName || "—",
          projectName: s.projectName || (s.customTask ? "(Custom Task)" : "—"),
          taskTitle: s.taskTitle || (s.customTask ? s.customTask : null),
          customTask: s.customTask || null,
          taskType: s.taskType || "—",
          status: s.status,
          totalMinutes: 0,
          totalMs: 0,
          segments: [],
        });
      }

      const g = map.get(key);
      const sessMs = (s.totalMinutes || s.accumulatedMinutes || 0) * 60000;
      g.totalMs += sessMs;
      g.totalMinutes = g.totalMs / 60000;

      if (Array.isArray(s.segments)) {
        g.segments.push(...s.segments.filter((seg) => seg.start && seg.end));
      }

      if (s.status === "active") {
        g.status = "active";
      } else if (g.status !== "active" && s.status === "paused") {
        g.status = "paused";
      }
    }

    return Array.from(map.values());
  }, [sessions]);

  const filteredGroupedSessions = useMemo(() => {
    // ✅ IF DATE RANGE IS SELECTED, SHOW EVERYTHING RETURNED BY API
    if (range.from && range.to) {
      return groupedSessions;
    }

    const now = new Date();
    const todayStr = getLocalDateStr(now);

    return groupedSessions.filter((p) => {
      if (!p.date) return false;

      if (dateFilter === "today") {
        return p.date === todayStr;
      }

      const [y, m, day] = p.date.split("-").map(Number);
      const d = new Date(y, m - 1, day);

      if (dateFilter === "week") {
        const startOfWeek = new Date(now);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        return d >= startOfWeek;
      }

      if (dateFilter === "month") {
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [groupedSessions, dateFilter, range.from, range.to]);

  function exportCSV(rows) {
    const headers = [
      "Company",
      "Category",
      "Project",
      "Task",
      "Work Type",
      "Status",
      "Total Minutes",
      "Total Time (HH:MM:SS)",
      "Date",
    ];

    const lines = [headers.join(",")];

    for (const p of rows) {
      // ✅ IMPORTANT: we do NOT include segments/logs at all
      const row = [
        p.companyName ?? "—",
        p.categoryName ?? "—",
        p.projectName ?? "—",
        p.taskTitle ?? "—",
        p.taskType ?? "—",
        p.status ?? "—",
        Math.round(p.totalMinutes || 0),
        minutesToHHMM(p.totalMinutes || 0),
        p.date ?? "",
      ];

      lines.push(
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      );
    }

    const csv = lines.join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download =
      range.from && range.to
        ? `work-logs-${range.from}-to-${range.to}.csv`
        : `work-logs-${dateFilter}.csv`;

    a.click();

    URL.revokeObjectURL(url);
  }

  const projectSummary = useMemo(() => {
    const map = new Map();

    for (const g of filteredGroupedSessions) {
      if (!g.projectName || g.projectName === "—") continue;

      const key = `${g.projectName}|${g.taskType}`;

      if (!map.has(key)) {
        map.set(key, {
          projectName: g.projectName,
          taskType: g.taskType,
          totalMs: 0,
          totalMinutes: 0,
        });
      }

      const item = map.get(key);
      item.totalMs += g.totalMs || 0;
      item.totalMinutes = item.totalMs / 60000;
    }

    return Array.from(map.values());
  }, [filteredGroupedSessions]);

  const projectDailyBreakdown = useMemo(() => {
    const map = new Map();

    for (const g of filteredGroupedSessions) {
      if (!g.projectName || g.projectName === "—") continue;

      const key = `${g.projectName}|${g.taskType}|${g.date}`;

      if (!map.has(key)) {
        map.set(key, {
          projectName: g.projectName,
          taskType: g.taskType,
          date: g.date,
          totalMs: 0,
          totalMinutes: 0,
        });
      }

      const item = map.get(key);
      item.totalMs += g.totalMs || 0;
      item.totalMinutes = item.totalMs / 60000;
    }

    return Array.from(map.values());
  }, [filteredGroupedSessions]);

  // ---- UI ----
  return (
    <div className="space-y-4 max-w-[1500px] mx-auto pb-8">
      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 shadow-xs">
          {error}
        </div>
      )}

      {/* ---------------- MODE TOGGLE ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl">
          <button
            onClick={() => {
              setMode("project");
              setCustomTask("");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              mode === "project"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Project Mode</span>
          </button>

          <button
            onClick={() => {
              setMode("custom");
              setCompanyId("");
              setCategoryId("");
              setProjectId("");
              setProjects([]);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              mode === "custom"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Custom Task</span>
          </button>
        </div>

        <button
          onClick={loadSessionsAndTick}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
        >
          <span className={loading ? "animate-spin text-blue-600 inline-block" : "text-slate-500"}>↻</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* ---------------- SELECT CONTEXT (PROJECT MODE ONLY) ---------------- */}
      {mode === "project" && (
        <div className="space-y-4">
          {/* Project & Category Dropdowns */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            {assignedTaskInfo && (
              <div className="flex items-center justify-between rounded-2xl bg-blue-50 border border-blue-200 px-4 py-2.5 text-xs text-blue-900 mb-4 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-blue-900">Planned Task:</span>
                  <span className="font-semibold text-blue-700">{assignedTaskInfo.title}</span>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                    {assignedTaskInfo.taskType || workType || "Alpha"}
                  </span>
                  {assignedTaskInfo.estimatedMinutes && (
                    <span className="text-[11px] text-blue-600">
                      • Est: {Math.round(assignedTaskInfo.estimatedMinutes / 60)}h
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAssignedTaskInfo(null)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-2"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Project Work Details
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select company, category, and project
                </p>
              </div>

              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {projects.length ? `${projects.length} Projects` : "No Projects"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                {
                  label: "Company",
                  value: companyId,
                  disabled: false,
                  options: companies,
                  placeholder: "Select company",
                  onChange: (value) => {
                    setCompanyId(value);
                    setCategoryId("");
                    setProjectId("");
                    setProjects([]);
                  },
                },
                {
                  label: "Category",
                  value: categoryId,
                  disabled: !companyId,
                  options: categories,
                  placeholder: "Select category",
                  onChange: (value) => {
                    setCategoryId(value);
                    setProjectId("");
                  },
                },
                {
                  label: "Project",
                  value: projectId,
                  disabled: !companyId || !categoryId || !projects.length,
                  options: projects,
                  placeholder: "Select project",
                  onChange: (value) => {
                    setProjectId(value);
                    if (value) localStorage.setItem("lastProjectId", value);
                  },
                },
              ].map((field) => (
                <div key={field.label} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {field.label}
                  </label>

                  <select
                    value={field.value}
                    disabled={field.disabled}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100/70 disabled:text-slate-400"
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Work Type
                </label>

                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  disabled={!projectId}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100/70 disabled:text-slate-400"
                >
                  {workTypes.map((wt) => (
                    <option key={wt} value={wt}>
                      {wt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

{mode === "custom" && (
  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
    <div className="mb-4">
      <h3 className="text-sm font-bold text-slate-900">
        Custom Task Details
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Add your custom work manually
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Custom Task
        </label>

        <input
          type="text"
          value={customTask}
          onChange={(e) => setCustomTask(e.target.value)}
          placeholder="e.g. Team meeting, code review"
          className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Work Type
        </label>

        <select
          value={workType}
          onChange={(e) => setWorkType(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {workTypes.map((wt) => (
            <option key={wt} value={wt}>
              {wt}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
)}

        {/* ---------------- Premium Timer + Today Summary ---------------- */}
        <div className="grid gap-3.5 lg:grid-cols-[1.4fr_0.8fr]">
          {/* Timer Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Current Session
                  </p>

                  {hasRunning && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                      ● Running
                    </span>
                  )}

                  {hasPaused && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200/60">
                      Paused
                    </span>
                  )}

                  {isOffline && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
                      <WifiOff size={11} className="text-amber-600" />
                      Offline
                    </span>
                  )}

                  {isSyncing && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      <RefreshCw size={11} className="animate-spin text-blue-600" />
                      Syncing…
                    </span>
                  )}
                </div>

                <h2
                  className="mt-1 max-w-[420px] truncate text-base font-bold text-slate-900"
                  title={
                    anyCurrent
                      ? (activeSession.customTask || activeSession.projectName || activeSession.project?.name || "No Project")
                      : (mode === "project" && selectedProj ? selectedProj.name : "No active session")
                  }
                >
                  {anyCurrent
                    ? (activeSession.customTask || activeSession.projectName || activeSession.project?.name || "No Project")
                    : (mode === "project" && selectedProj ? selectedProj.name : "No active session")}
                </h2>

                {/* Show context switch badge if a different project is selected */}
                {anyCurrent && !isSameContext && selectedProj && (
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-900 font-medium">
                    <span className="text-blue-600">Switching to:</span>
                    <strong className="font-bold text-blue-950 truncate max-w-[200px]">{selectedProj.name}</strong>
                  </div>
                )}

                <div className="mt-1 font-mono text-4xl font-extrabold tracking-tight text-slate-950">
                  {formatTime(elapsed)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 md:flex-col md:items-stretch shrink-0">
                {/* 1. FIRST BUTTON: Start Session (idle) / Pause (running) / Resume (paused) */}
                {hasRunning ? (
                  <button
                    onClick={pause}
                    className="group inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-orange-500 bg-white px-7 py-2.5 text-xs font-bold text-slate-800 shadow-[0_6px_18px_rgba(249,115,22,0.16)] transition-all duration-200 hover:bg-orange-50 hover:shadow-[0_8px_24px_rgba(249,115,22,0.24)] active:scale-[0.98] cursor-pointer"
                  >
                    <span className="text-lg font-bold leading-none text-orange-500">
                      ❚❚
                    </span>
                    <span>Pause</span>
                  </button>
                ) : (hasPaused && isSameContext) ? (
                  <button
                    id="work-timer-start-btn"
                    onClick={resume}
                    className="group inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-green-600 bg-white px-7 py-2.5 text-xs font-bold text-slate-800 shadow-[0_6px_18px_rgba(22,163,74,0.14)] transition-all duration-200 hover:bg-green-50 hover:shadow-[0_8px_24px_rgba(22,163,74,0.22)] active:scale-[0.98] cursor-pointer"
                  >
                    <span className="inline-flex items-center text-green-600">
                      <svg
                        className="h-4 w-4 fill-green-600"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    id="work-timer-start-btn"
                    onClick={start}
                    disabled={
                      (mode === "project" && (!projectId || !workType)) ||
                      (mode === "custom" && !customTask.trim())
                    }
                    className="inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-green-600 bg-white px-7 py-2.5 text-xs font-bold text-slate-800 shadow-[0_6px_18px_rgba(22,163,74,0.14)] transition-all duration-200 hover:bg-green-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                  >
                    <span className="inline-flex items-center text-green-600">
                      <svg
                        className="h-4 w-4 fill-green-600"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    <span>{hasPaused && !isSameContext ? "Switch & Start" : "Start Session"}</span>
                  </button>
                )}

                {/* 2. SECOND BUTTON: Stop Session */}
                <button
                  onClick={stop}
                  disabled={!anyCurrent}
                  className="inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-red-500 bg-white px-7 py-2.5 text-xs font-bold text-slate-800 shadow-[0_6px_18px_rgba(239,68,68,0.14)] transition-all duration-200 hover:bg-red-50 hover:shadow-[0_8px_24px_rgba(239,68,68,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-red-500 text-red-500 text-[10px]">
                    ■
                  </span>
                  <span>Stop Session</span>
                </button>
              </div>
            </div>
          </div>

          {/* Today Summary Card (Soft Slate & Pill Chips) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Today Total
                </p>
                <span className="text-[10px] font-medium text-slate-400">
                  Logged Time
                </span>
              </div>

              <div className="mt-1.5 font-mono text-3xl font-extrabold tracking-tight text-slate-900">
                {formatTime(todaysTotalMs)}
              </div>
            </div>

            {/* Pill chips directly below the timer */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Status Pill Chip */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                  hasRunning
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    : hasPaused
                    ? "bg-amber-50 text-amber-700 border-amber-200/80"
                    : "bg-slate-50 text-slate-600 border-slate-200/70"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    hasRunning
                      ? "bg-emerald-500 animate-pulse"
                      : hasPaused
                      ? "bg-amber-500"
                      : "bg-slate-400"
                  }`}
                />
                {hasRunning ? "Working" : hasPaused ? "Paused" : "Idle"}
              </span>

              {/* Sessions Count Pill Chip */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/80 border border-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <span className="text-slate-400 font-normal">Sessions:</span>
                <span className="font-bold text-slate-900">{todaysSessionsCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sessions table */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs min-h-[540px] flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                Work Overview
              </p>

              <h3 className="mt-0.5 text-lg font-bold text-slate-900">
                {range.from && range.to
                  ? "Custom Date Range"
                  : dateFilter === "today"
                    ? "Today’s Work Sessions"
                    : dateFilter === "week"
                      ? "This Week’s Work Sessions"
                      : "This Month’s Work Sessions"}
              </h3>
            </div>

            {loading && (
              <span className="rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-semibold text-blue-600 animate-pulse">
                Loading…
              </span>
            )}
          </div>

          <div className="mt-1">
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5">
              {/* Left Section: Date Range Picker + Date Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2 relative z-30">
                <DateRangePicker
                  from={range.from}
                  to={range.to}
                  onChange={(r) => {
                    setRange(r); // Save selected dates and reload sessions
                  }}
                />

                {["today", "week", "month"].map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setRange({ from: null, to: null }); // Clear custom range
                      setDateFilter(f);
                    }}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      dateFilter === f
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Right Section: View Toggle + Export Button */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View Toggle Buttons */}
                <div className="flex items-center gap-1 rounded-xl bg-slate-100/90 p-1">
                  <button
                    onClick={() => setView("work")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      view === "work"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Work Sessions
                  </button>

                  <button
                    onClick={() => setView("project")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      view === "project"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Project
                  </button>
                </div>

                {/* Export CSV Button */}
                <button
                  onClick={() => exportCSV(filteredGroupedSessions)}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  ⬇ Export CSV
                </button>
              </div>
            </div>

            {/* 🔹 VIEW TOGGLE */}
            {view === "work" && (
              <div className="border-t border-slate-100 bg-slate-50/40 p-4 flex-1 flex flex-col rounded-b-2xl">
                <div className="flex-1 max-h-[56vh] min-h-[360px] overflow-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col">
          <table className="w-full text-sm table-fixed border-separate border-spacing-0 flex-1">
            <thead className="sticky top-0 z-20 bg-white border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left w-[130px] sm:w-[150px]">
                  Company / Category
                </th>
                <th className="px-4 py-3 text-left w-[220px] sm:w-[260px]">
                  Project & Task
                </th>
                <th className="px-4 py-3 text-left w-[90px] sm:w-[100px]">
                  Work Type
                </th>
                <th className="px-4 py-3 text-left w-[100px] sm:w-[110px]">
                  Status
                </th>
                <th className="px-4 py-3 text-left w-[110px] sm:w-[120px]">
                  Total Time
                </th>
                <th className="px-4 py-3 text-left w-[90px] sm:w-[100px]">
                  Date
                </th>
                <th className="px-4 py-3 text-left w-[90px] sm:w-[100px]">
                  Logs
                </th>
              </tr>
            </thead>

            <tbody className="[&_tr]:border-t">
              {(!filteredGroupedSessions || filteredGroupedSessions.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-24 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-500">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl shadow-xs">
                        🗓️
                      </div>
                      <span className="text-base font-bold text-slate-800">No sessions found for this period</span>
                      <span className="text-xs text-slate-400 max-w-sm">
                        Choose a date range using the picker above or start a session to see your activity logs here.
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {filteredGroupedSessions.map((p) => {
                const isRowActive = p.status === "active";
                const isRowPaused = p.status === "paused";
                const rowLiveMinutes = isRowActive && activeSession
                  ? Math.max(p.totalMinutes, elapsed / 60000)
                  : p.totalMinutes;

                return (
                  <React.Fragment key={p.key}>
                    <tr className={`transition ${
                      isRowActive 
                        ? "bg-emerald-50/40 hover:bg-emerald-50/70" 
                        : isRowPaused 
                        ? "bg-amber-50/30 hover:bg-amber-50/50" 
                        : "even:bg-gray-50/60 hover:bg-blue-50/40"
                    }`}>
                      {/* Company & Category */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 truncate" title={p.companyName}>
                          {p.companyName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate" title={p.categoryName}>
                          {p.categoryName}
                        </div>
                      </td>

                      {/* Project & Task Title */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{p.customTask ? "💼" : "📁"}</span>
                          <span className="font-bold text-slate-900 truncate" title={p.projectName || p.customTask}>
                            {p.projectName || p.customTask || "—"}
                          </span>
                          {p.customTask && (
                            <span className="shrink-0 inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-1.5 py-0.2 text-[9px] font-bold text-purple-700">
                              Custom
                            </span>
                          )}
                        </div>
                        {p.taskTitle && p.taskTitle !== (p.projectName || p.customTask) && (
                          <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 truncate max-w-full" title={p.taskTitle}>
                            <span>🎯</span>
                            <span className="truncate">{p.taskTitle}</span>
                          </div>
                        )}
                      </td>

                      {/* Work Type */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {p.taskType}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isRowActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 animate-pulse shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                            Running
                          </span>
                        ) : isRowPaused ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-xs">
                            ❚❚ Paused
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            ✓ Stopped
                          </span>
                        )}
                      </td>

                      {/* Live Total Time */}
                      <td className="px-4 py-3">
                        <div className={`font-mono text-sm font-bold tracking-tight ${
                          isRowActive ? "text-emerald-700" : "text-slate-900"
                        }`}>
                          {minutesToHHMM(rowLiveMinutes)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {Math.round(rowLiveMinutes || 0)}m total
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-slate-600">{p.date}</td>

                      {/* Logs */}
                      <td className="px-4 py-3">
                        {p.segments.length > 0 && (
                          <button
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [p.key]: !prev[p.key],
                              }))
                            }
                            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                          >
                            {expanded[p.key]
                              ? "Hide"
                              : `Logs (${p.segments.length})`}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Logs Details */}
                    {expanded[p.key] && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-6 py-3">
                          <div className="text-xs font-semibold text-gray-600 mb-1">
                            Time Logs for {p.projectName}
                          </div>
                          <ul className="space-y-1 text-xs font-mono text-gray-700">
                            {p.segments.map((seg, i) => (
                              <li key={i}>
                                • {new Date(seg.start).toLocaleTimeString()} →{" "}
                                {seg.end ? new Date(seg.end).toLocaleTimeString() : "Running now..."}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {view === "project" && (
      <div className="border-t border-slate-100 bg-slate-50/60 p-4 flex-1 flex flex-col rounded-b-3xl">
        <div className="flex-1 min-h-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-3">
            Project – Work Summary
          </h3>

          {projectSummary.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20 text-center">
              <div className="inline-flex flex-col items-center gap-2 text-gray-500">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl shadow-xs">
                  📁
                </div>
                <span className="text-base font-bold text-slate-800">No project work found</span>
                <span className="text-xs text-slate-400">
                  Logged project sessions will be summarized here once completed.
                </span>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm table-fixed border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-left">Work Type</th>
                  <th className="px-3 py-2 text-left">Total Hours</th>
                  <th className="px-3 py-2 text-left">Details</th>
                </tr>
              </thead>

              <tbody>
                {projectSummary.map((p) => {
                  const rowKey = `${p.projectName}|${p.taskType}`;
                  const isExpanded = expandedProject === rowKey;

                  return (
                    <React.Fragment key={rowKey}>
                      <tr className="border-t hover:bg-blue-50/40 transition">
                        <td className="px-3 py-2 font-medium">
                          {p.projectName}
                        </td>
                        <td className="px-3 py-2">{p.taskType}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {minutesToHHMM(p.totalMinutes)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 cursor-pointer"
                            onClick={() =>
                              setExpandedProject(isExpanded ? null : rowKey)
                            }
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </button>
                        </td>
                      </tr>

                      {/* Day-wise details */}
                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={4} className="px-4 py-3">
                            <div className="text-sm font-medium mb-2">
                              Day-wise work – {p.projectName} ({p.taskType})
                            </div>

                            <table className="w-full text-xs overflow-hidden rounded-xl border">
                              <thead className="bg-slate-100">
                                <tr>
                                  <th className="px-2 py-1 text-left">Date</th>
                                  <th className="px-2 py-1 text-left">
                                    Total Hours
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {projectDailyBreakdown
                                  .filter(
                                    (d) =>
                                      d.projectName === p.projectName &&
                                      d.taskType === p.taskType,
                                  )
                                  .map((d, idx) => (
                                    <tr key={idx} className="border-t">
                                      <td className="px-2 py-1">{d.date}</td>
                                      <td className="px-2 py-1">
                                        {minutesToHHMM(d.totalMinutes)}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )}
  </div>
</div>
    </div>
  );
}
