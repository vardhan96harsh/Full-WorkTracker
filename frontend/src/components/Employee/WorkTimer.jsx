import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { api } from "../../api.js";
import DateRangePicker from "../../components/DateRangePicker";
import { offlineManager } from "../../utils/offlineManager.js";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  FolderKanban,
  Play,
  Pause,
  Square,
  Clock,
  Building2,
  Tag,
  Calendar,
  Download,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Activity,
  Laptop,
  Sparkles,
  ArrowRight,
  TrendingUp,
  History,
  FileSpreadsheet
} from "lucide-react";

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
    <div className="space-y-4 max-w-[1500px] mx-auto pb-10">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-xs font-semibold text-rose-800 shadow-xs">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-bold text-xs">
            !
          </div>
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* ---------------- SESSION CONFIGURATION CARD ---------------- */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        {/* Header: Title + Mode Toggle + Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FolderKanban size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Session Configuration
              </h3>
              <p className="text-xs text-slate-500">
                {mode === "project" ? "Select company, category & project to track" : "Enter a custom ad-hoc task to track"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMode("project");
                  setCustomTask("");
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  mode === "project"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FolderKanban size={13} />
                <span>Project Mode</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("custom");
                  setCompanyId("");
                  setCategoryId("");
                  setProjectId("");
                  setProjects([]);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  mode === "custom"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Briefcase size={13} />
                <span>Custom Task</span>
              </button>
            </div>

            {/* Refresh Sessions */}
            <button
              type="button"
              onClick={loadSessionsAndTick}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition cursor-pointer"
              title="Reload work sessions & status"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Planned Task Banner (if preselected from My Tasks) */}
        {assignedTaskInfo && (
          <div className="flex items-center justify-between rounded-xl bg-blue-50/80 border border-blue-200 px-4 py-2.5 text-xs text-blue-900 mb-4 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-[10px]">
                ✓
              </span>
              <span className="font-bold text-blue-950">Planned Task:</span>
              <span className="font-semibold text-blue-800">{assignedTaskInfo.title}</span>
              <span className="rounded-full bg-blue-100/90 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
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
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer ml-2"
            >
              Clear
            </button>
          </div>
        )}

        {/* Form Fields: Project Mode */}
        {mode === "project" && (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Company */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Building2 size={12} className="text-slate-400" />
                <span>Company</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setCategoryId("");
                  setProjectId("");
                  setProjects([]);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Layers size={12} className="text-slate-400" />
                <span>Category</span>
              </label>
              <select
                value={categoryId}
                disabled={!companyId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setProjectId("");
                }}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100/70 disabled:text-slate-400 cursor-pointer"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1">
                  <FolderKanban size={12} className="text-slate-400" />
                  <span>Project</span>
                </span>
                {projects.length > 0 && (
                  <span className="text-[10px] text-blue-600 font-semibold lowercase">
                    {projects.length} available
                  </span>
                )}
              </label>
              <select
                value={projectId}
                disabled={!companyId || !categoryId || !projects.length}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (e.target.value) localStorage.setItem("lastProjectId", e.target.value);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100/70 disabled:text-slate-400 cursor-pointer"
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Work Type */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Tag size={12} className="text-slate-400" />
                <span>Work Type</span>
              </label>
              <select
                value={workType}
                disabled={!projectId}
                onChange={(e) => setWorkType(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100/70 disabled:text-slate-400 cursor-pointer"
              >
                {workTypes.map((wt) => (
                  <option key={wt} value={wt}>
                    {wt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Form Fields: Custom Mode */}
        {mode === "custom" && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Briefcase size={12} className="text-slate-400" />
                <span>Custom Task Description</span>
              </label>
              <input
                type="text"
                value={customTask}
                onChange={(e) => setCustomTask(e.target.value)}
                placeholder="e.g., Code review, Design review, Client call"
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Tag size={12} className="text-slate-400" />
                <span>Work Type</span>
              </label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                {workTypes.map((wt) => (
                  <option key={wt} value={wt}>
                    {wt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- TIMER COMMAND CENTER & SHIFT SUMMARY ---------------- */}
      <div className="grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
        {/* Live Timer Deck */}
        <div className="relative rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 shadow-xl overflow-hidden flex flex-col justify-between">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                {hasRunning && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span>Running Session</span>
                  </span>
                )}

                {hasPaused && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
                    <Pause size={12} className="fill-current" />
                    <span>Session Paused</span>
                  </span>
                )}

                {!hasRunning && !hasPaused && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                    <span>Ready to Start</span>
                  </span>
                )}

                {isOffline && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 animate-pulse">
                    <WifiOff size={11} />
                    <span>Offline Mode</span>
                  </span>
                )}

                {isSyncing && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-500/40 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">
                    <RefreshCw size={11} className="animate-spin" />
                    <span>Syncing…</span>
                  </span>
                )}
              </div>

              {/* Work type pill */}
              {workType && (
                <span className="rounded-lg bg-slate-800/90 border border-slate-700/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                  {workType}
                </span>
              )}
            </div>

            {/* Active Project / Task Title */}
            <div className="min-w-0 mb-4">
              <h2
                className="text-lg sm:text-xl font-black text-white truncate tracking-tight"
                title={
                  anyCurrent
                    ? (activeSession.customTask || activeSession.projectName || activeSession.project?.name || "No Project")
                    : (mode === "project" && selectedProj ? selectedProj.name : "Select a project or task")
                }
              >
                {anyCurrent
                  ? (activeSession.customTask || activeSession.projectName || activeSession.project?.name || "No Project")
                  : (mode === "project" && selectedProj ? selectedProj.name : "No active session")}
              </h2>

              {/* Switching Context notification */}
              {anyCurrent && !isSameContext && selectedProj && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
                  <span className="text-blue-300 font-medium">Switch target:</span>
                  <strong className="font-bold text-white truncate max-w-[220px]">{selectedProj.name}</strong>
                </div>
              )}
            </div>

            {/* Clock Display */}
            <div className="my-2">
              <div className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-md select-all">
                {formatTime(elapsed)}
              </div>
              <p className="mt-1 text-xs text-slate-400 font-medium">
                {hasRunning ? "Tracking live activity in current session" : hasPaused ? "Session timer is currently paused" : "Hit Start to begin logging time"}
              </p>
            </div>
          </div>

          {/* Controls Row */}
          <div className="relative z-10 pt-4 mt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
            {hasRunning ? (
              <button
                type="button"
                onClick={pause}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 font-bold px-7 py-3 text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
              >
                <Pause size={16} className="fill-current" />
                <span>Pause Session</span>
              </button>
            ) : hasPaused && isSameContext ? (
              <button
                type="button"
                id="work-timer-start-btn"
                onClick={resume}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-slate-950 font-bold px-7 py-3 text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <Play size={16} className="fill-current" />
                <span>Resume Session</span>
              </button>
            ) : (
              <button
                type="button"
                id="work-timer-start-btn"
                onClick={start}
                disabled={
                  (mode === "project" && (!projectId || !workType)) ||
                  (mode === "custom" && !customTask.trim())
                }
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed text-slate-950 font-bold px-7 py-3 text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <Play size={16} className="fill-current" />
                <span>{hasPaused && !isSameContext ? "Switch & Start" : "Start Session"}</span>
              </button>
            )}

            {/* Stop Session Button */}
            <button
              type="button"
              onClick={stop}
              disabled={!anyCurrent}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] disabled:border-slate-800 disabled:bg-slate-800/40 disabled:text-slate-600 disabled:cursor-not-allowed text-rose-300 font-bold px-6 py-3 text-xs transition-all cursor-pointer"
            >
              <Square size={14} className="fill-current" />
              <span>Stop Session</span>
            </button>
          </div>
        </div>

        {/* Shift & Productivity Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock size={16} className="text-blue-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Today's Shift
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Standard 8h Shift
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs font-semibold text-slate-400 block">Total Logged Time</span>
              <div className="mt-1 font-mono text-4xl font-black tracking-tight text-slate-900">
                {formatTime(todaysTotalMs)}
              </div>
            </div>

            {/* 8-Hour Goal Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Daily Goal Progress</span>
                <span className="font-bold text-slate-800">
                  {Math.min(100, Math.round((todaysTotalMs / (8 * 3600 * 1000)) * 100))}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((todaysTotalMs / (8 * 3600 * 1000)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Metric chips */}
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Shift Status</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                  hasRunning
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : hasPaused
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-50 text-slate-600 border-slate-200"
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
                {hasRunning ? "Actively Working" : hasPaused ? "On Pause / Break" : "Idle"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Logged Sessions</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/90 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-900">
                <Layers size={11} className="text-slate-400" />
                <span>{todaysSessionsCount} {todaysSessionsCount === 1 ? "Session" : "Sessions"}</span>
              </span>
            </div>

            {auth?.user?.machineName && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Laptop size={12} />
                  Workstation
                </span>
                <span className="font-mono text-slate-600 truncate max-w-[140px]">
                  {auth.user.machineName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* ---------------- WORK OVERVIEW / SESSIONS TABLE ---------------- */}
        <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs min-h-[540px] flex flex-col overflow-hidden">
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                  Work Overview
                </p>
              </div>
              <h3 className="mt-0.5 text-lg font-bold text-slate-900">
                {range.from && range.to
                  ? `Custom Range (${range.from} → ${range.to})`
                  : dateFilter === "today"
                  ? "Today’s Work Sessions"
                  : dateFilter === "week"
                  ? "This Week’s Work Sessions"
                  : "This Month’s Work Sessions"}
              </h3>
            </div>

            {loading && (
              <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 animate-pulse flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" />
                <span>Loading records…</span>
              </span>
            )}
          </div>

          {/* Filter & Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-100 bg-white">
            {/* Left: Date controls */}
            <div className="flex flex-wrap items-center gap-2 relative z-30">
              <DateRangePicker
                from={range.from}
                to={range.to}
                onChange={(r) => {
                  setRange(r);
                }}
              />

              {["today", "week", "month"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setRange({ from: null, to: null });
                    setDateFilter(f);
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    dateFilter === f && !range.from
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Right: View Toggle & Export */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Switcher */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-100/90 p-1">
                <button
                  type="button"
                  onClick={() => setView("work")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    view === "work"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Activity size={13} />
                  <span>Work Sessions</span>
                </button>

                <button
                  type="button"
                  onClick={() => setView("project")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    view === "project"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FolderKanban size={13} />
                  <span>Project Summary</span>
                </button>
              </div>

              {/* Export CSV */}
              <button
                type="button"
                onClick={() => exportCSV(filteredGroupedSessions)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition cursor-pointer"
                title="Download CSV report"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* VIEW: Work Sessions */}
          {view === "work" && (
            <div className="bg-slate-50/40 p-4 flex-1 flex flex-col">
              <div className="flex-1 max-h-[56vh] min-h-[360px] overflow-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col">
                <table className="w-full text-sm table-fixed border-separate border-spacing-0 flex-1">
                  <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left w-[140px] sm:w-[160px]">
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

                  <tbody className="divide-y divide-slate-100">
                    {(!filteredGroupedSessions || filteredGroupedSessions.length === 0) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-24 text-center">
                          <div className="inline-flex flex-col items-center gap-2.5 text-slate-500">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                              <Clock size={28} />
                            </div>
                            <span className="text-base font-bold text-slate-800">
                              No sessions found for this period
                            </span>
                            <span className="text-xs text-slate-400 max-w-sm">
                              Choose another date range using the picker above or start a new work session to see your activity logs here.
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
                          <tr
                            className={`transition-colors ${
                              isRowActive
                                ? "bg-emerald-50/50 hover:bg-emerald-50/80"
                                : isRowPaused
                                ? "bg-amber-50/40 hover:bg-amber-50/70"
                                : "hover:bg-slate-50/80"
                            }`}
                          >
                            {/* Company & Category */}
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-slate-900 truncate text-xs" title={p.companyName}>
                                {p.companyName || "—"}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5" title={p.categoryName}>
                                {p.categoryName || "—"}
                              </div>
                            </td>

                            {/* Project & Task */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-slate-400 shrink-0">
                                  {p.customTask ? <Briefcase size={14} className="text-purple-600" /> : <FolderKanban size={14} className="text-blue-600" />}
                                </span>
                                <span className="font-bold text-slate-900 truncate text-xs" title={p.projectName || p.customTask}>
                                  {p.projectName || p.customTask || "—"}
                                </span>
                                {p.customTask && (
                                  <span className="shrink-0 inline-flex items-center rounded-md bg-purple-50 border border-purple-200/80 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">
                                    Custom
                                  </span>
                                )}
                              </div>
                              {p.taskTitle && p.taskTitle !== (p.projectName || p.customTask) && (
                                <div
                                  className="mt-1 inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 truncate max-w-full"
                                  title={p.taskTitle}
                                >
                                  <span>🎯</span>
                                  <span className="truncate">{p.taskTitle}</span>
                                </div>
                              )}
                            </td>

                            {/* Work Type */}
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                {p.taskType || "—"}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5">
                              {isRowActive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-800 animate-pulse">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                                  Running
                                </span>
                              ) : isRowPaused ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 border border-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                                  <Pause size={10} className="fill-current" />
                                  Paused
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                  <CheckCircle2 size={11} className="text-slate-400" />
                                  Stopped
                                </span>
                              )}
                            </td>

                            {/* Live Total Time */}
                            <td className="px-4 py-3.5">
                              <div className={`font-mono text-sm font-extrabold tracking-tight ${
                                isRowActive ? "text-emerald-700" : "text-slate-900"
                              }`}>
                                {minutesToHHMM(rowLiveMinutes)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {Math.round(rowLiveMinutes || 0)}m total
                              </div>
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                              {p.date}
                            </td>

                            {/* Logs Button */}
                            <td className="px-4 py-3.5">
                              {p.segments && p.segments.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpanded((prev) => ({
                                      ...prev,
                                      [p.key]: !prev[p.key],
                                    }))
                                  }
                                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    expanded[p.key]
                                      ? "bg-blue-600 text-white shadow-2xs"
                                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
                                  }`}
                                >
                                  <span>{p.segments.length} {p.segments.length === 1 ? "log" : "logs"}</span>
                                  {expanded[p.key] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Logs Timeline Expansion Drawer */}
                          {expanded[p.key] && (
                            <tr className="bg-slate-50/90 border-t border-slate-200/80">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                      <History size={14} className="text-blue-600" />
                                      <span>Session Segments Timeline for {p.projectName || p.customTask}</span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      {p.segments.length} recorded intervals
                                    </span>
                                  </div>

                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {p.segments.map((seg, i) => {
                                      const segStart = new Date(seg.start);
                                      const segEnd = seg.end ? new Date(seg.end) : null;
                                      const segDurMs = segEnd ? segEnd.getTime() - segStart.getTime() : Date.now() - segStart.getTime();

                                      return (
                                        <div
                                          key={i}
                                          className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs flex items-center justify-between"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                                            <div className="font-mono text-slate-700 truncate">
                                              <span className="font-semibold">{segStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                                              <span className="mx-1 text-slate-400">→</span>
                                              <span className="text-slate-600">
                                                {segEnd ? segEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Running now..."}
                                              </span>
                                            </div>
                                          </div>
                                          <span className="font-mono font-bold text-slate-900 shrink-0 ml-2">
                                            {minutesToHHMM(segDurMs / 60000)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
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

          {/* VIEW: Project Summary */}
          {view === "project" && (
            <div className="bg-slate-50/40 p-4 flex-1 flex flex-col">
              <div className="flex-1 min-h-[360px] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Project – Cumulative Summary
                    </h3>
                    <p className="text-xs text-slate-400">
                      Aggregated work hours grouped by project and work type
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {projectSummary.length} Projects
                  </span>
                </div>

                {projectSummary.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-20 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-slate-500">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                        <FolderKanban size={28} />
                      </div>
                      <span className="text-base font-bold text-slate-800">No project work found</span>
                      <span className="text-xs text-slate-400">
                        Logged project sessions will be summarized here once completed.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm table-fixed border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left">Project</th>
                          <th className="px-4 py-3 text-left">Work Type</th>
                          <th className="px-4 py-3 text-left">Total Hours</th>
                          <th className="px-4 py-3 text-left">Breakdown</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {projectSummary.map((p) => {
                          const rowKey = `${p.projectName}|${p.taskType}`;
                          const isExpanded = expandedProject === rowKey;

                          return (
                            <React.Fragment key={rowKey}>
                              <tr className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3.5 font-bold text-slate-900 text-xs flex items-center gap-2">
                                  <FolderKanban size={14} className="text-blue-600 shrink-0" />
                                  <span className="truncate">{p.projectName}</span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                    {p.taskType}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-mono font-extrabold text-slate-900 text-sm">
                                  {minutesToHHMM(p.totalMinutes)}
                                </td>
                                <td className="px-4 py-3.5">
                                  <button
                                    type="button"
                                    className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                      isExpanded
                                        ? "bg-blue-600 text-white shadow-2xs"
                                        : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
                                    }`}
                                    onClick={() =>
                                      setExpandedProject(isExpanded ? null : rowKey)
                                    }
                                  >
                                    <span>{isExpanded ? "Hide breakdown" : "View breakdown"}</span>
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>
                                </td>
                              </tr>

                              {/* Day-wise breakdown */}
                              {isExpanded && (
                                <tr className="bg-slate-50/90 border-t border-slate-200">
                                  <td colSpan={4} className="px-6 py-4">
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                                      <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                        <Calendar size={13} className="text-blue-600" />
                                        <span>Day-wise Work Breakdown: {p.projectName} ({p.taskType})</span>
                                      </div>

                                      <table className="w-full text-xs overflow-hidden rounded-xl border border-slate-200">
                                        <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold">
                                          <tr>
                                            <th className="px-3 py-2 text-left">Date</th>
                                            <th className="px-3 py-2 text-left">Total Hours</th>
                                          </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100">
                                          {projectDailyBreakdown
                                            .filter(
                                              (d) =>
                                                d.projectName === p.projectName &&
                                                d.taskType === p.taskType,
                                            )
                                            .map((d, idx) => (
                                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-3 py-2 font-medium text-slate-700">{d.date}</td>
                                                <td className="px-3 py-2 font-mono font-bold text-slate-900">
                                                  {minutesToHHMM(d.totalMinutes)}
                                                </td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
