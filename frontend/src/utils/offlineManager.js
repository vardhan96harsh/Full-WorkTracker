// frontend/src/utils/offlineManager.js
import { api } from "../api";

const WT_OFFLINE_SESSION_KEY = "wt_offline_session";
const WT_OFFLINE_QUEUE_KEY = "wt_offline_queue";

let listeners = new Set();
let isCurrentlyOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
let isSyncing = false;

function notifyListeners(event, data) {
  listeners.forEach((fn) => {
    try {
      fn(event, data);
    } catch (e) {
      console.warn("offlineManager listener error:", e);
    }
  });
}

export const offlineManager = {
  isOffline() {
    return isCurrentlyOffline || (typeof navigator !== "undefined" && !navigator.onLine);
  },

  setOffline(status) {
    const changed = isCurrentlyOffline !== status;
    isCurrentlyOffline = status;
    if (changed) {
      notifyListeners("networkStatus", { isOffline: status });
    }
  },

  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  getOfflineSession() {
    try {
      const raw = localStorage.getItem(WT_OFFLINE_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.accumulatedMinutes > 1440 || parsed.totalMinutes > 1440)) {
        let segMs = 0;
        if (Array.isArray(parsed.segments)) {
          for (const seg of parsed.segments) {
            if (seg.start && seg.end) {
              const st = new Date(seg.start).getTime();
              const et = new Date(seg.end).getTime();
              if (et > st) segMs += (et - st);
            }
          }
        }
        parsed.accumulatedMinutes = Math.min(1440, Math.round((segMs / 60000) * 100) / 100);
        parsed.totalMinutes = parsed.accumulatedMinutes;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  saveOfflineSession(session) {
    if (!session) {
      localStorage.removeItem(WT_OFFLINE_SESSION_KEY);
    } else {
      localStorage.setItem(WT_OFFLINE_SESSION_KEY, JSON.stringify(session));
    }
    notifyListeners("sessionUpdated", session);
  },

  clearOfflineSession() {
    localStorage.removeItem(WT_OFFLINE_SESSION_KEY);
    notifyListeners("sessionCleared", null);
  },

  getQueue() {
    try {
      const raw = localStorage.getItem(WT_OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  enqueue(action) {
    const queue = this.getQueue();
    queue.push({
      id: "act_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      time: new Date().toISOString(),
      ...action,
    });
    localStorage.setItem(WT_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  },

  clearQueue() {
    localStorage.removeItem(WT_OFFLINE_QUEUE_KEY);
  },

  // ── Actions when Offline ──
  startOfflineSession({ projectId, projectName, companyName, categoryName, customTask, taskType, taskId, taskTitle, remarks }) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const session = {
      _id: "offline_" + Date.now(),
      date: todayStr,
      status: "active",
      projectId: projectId || null,
      projectName: projectName || (customTask ? "(Custom Task)" : "—"),
      companyName: companyName || "—",
      categoryName: categoryName || "—",
      customTask: customTask || null,
      taskId: taskId || null,
      taskTitle: taskTitle || customTask || null,
      taskType: taskType || "Alpha",
      currentStart: now.toISOString(),
      accumulatedMinutes: 0,
      totalMinutes: 0,
      segments: [],
      remarks: remarks || "",
      isOffline: true,
      createdAt: now.toISOString(),
    };

    this.saveOfflineSession(session);
    this.enqueue({ type: "start", payload: { ...session } });
    this.setOffline(true);
    return session;
  },

  pauseOfflineSession(fallbackSession = null) {
    const session = this.getOfflineSession() || (fallbackSession ? { ...fallbackSession } : null);
    if (!session) return null;

    const now = new Date();
    const segs = Array.isArray(session.segments) ? [...session.segments] : [];

    if (session.status === "active" && session.currentStart) {
      segs.push({
        start: session.currentStart,
        end: now.toISOString(),
        manual: false,
        source: "offline",
      });

      const ms = now.getTime() - new Date(session.currentStart).getTime();
      const mins = ms > 0 ? ms / 60000 : 0;
      session.accumulatedMinutes = Math.round(((session.accumulatedMinutes || 0) + mins) * 100) / 100;
      session.totalMinutes = session.accumulatedMinutes;
    }

    session.status = "paused";
    session.currentStart = null;
    session.segments = segs;
    session.isOffline = true;

    this.saveOfflineSession(session);
    this.enqueue({ type: "pause", time: now.toISOString() });
    this.setOffline(true);
    return session;
  },

  resumeOfflineSession(fallbackSession = null) {
    const session = this.getOfflineSession() || (fallbackSession ? { ...fallbackSession } : null);
    if (!session) return null;

    const now = new Date();
    session.status = "active";
    session.currentStart = now.toISOString();
    session.isOffline = true;

    this.saveOfflineSession(session);
    this.enqueue({ type: "resume", time: now.toISOString() });
    this.setOffline(true);
    return session;
  },

  stopOfflineSession(remarks = "", fallbackSession = null) {
    const session = this.getOfflineSession() || (fallbackSession ? { ...fallbackSession } : null);
    if (!session) return null;

    const now = new Date();
    const segs = Array.isArray(session.segments) ? [...session.segments] : [];

    if (session.status === "active" && session.currentStart) {
      segs.push({
        start: session.currentStart,
        end: now.toISOString(),
        manual: false,
        source: "offline",
      });

      const ms = now.getTime() - new Date(session.currentStart).getTime();
      const mins = ms > 0 ? ms / 60000 : 0;
      session.accumulatedMinutes = Math.round(((session.accumulatedMinutes || 0) + mins) * 100) / 100;
      session.totalMinutes = session.accumulatedMinutes;
    }

    session.status = "stopped";
    session.currentStart = null;
    session.segments = segs;
    if (remarks) session.remarks = remarks;
    session.isOffline = true;

    this.saveOfflineSession(session);
    this.enqueue({ type: "stop", time: now.toISOString(), remarks });
    this.setOffline(true);
    return session;
  },

  // ── Sync Engine ──
  async syncWithServer(token) {
    if (!token || isSyncing) return null;

    const offlineSession = this.getOfflineSession();
    const queue = this.getQueue();

    if (!offlineSession && queue.length === 0) {
      this.setOffline(false);
      return null;
    }

    isSyncing = true;
    notifyListeners("syncing", true);

    try {
      const payloadSession = offlineSession ? { ...offlineSession } : null;

      const res = await api("/api/work-sessions/sync-offline", {
        method: "POST",
        token,
        body: { offlineSession: payloadSession, queue },
      });

      if (res?.ok && res?.session) {
        this.clearQueue();
        this.clearOfflineSession();
        this.setOffline(false);

        notifyListeners("syncSuccess", res.session);
        return res.session;
      }
    } catch (err) {
      console.warn("Offline sync attempt failed (still offline):", err.message);
      this.setOffline(true);
      return null;
    } finally {
      isSyncing = false;
      notifyListeners("syncing", false);
    }
  },
};

// Global network listener to auto-trigger sync when connection returns
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("🌐 Internet restored -> triggering offline sync");
    offlineManager.setOffline(false);
    try {
      const auth = JSON.parse(localStorage.getItem("auth") || "null");
      if (auth?.token) {
        offlineManager.syncWithServer(auth.token);
      }
    } catch {}
  });

  window.addEventListener("offline", () => {
    console.log("⚠️ Internet lost -> entering offline tracking mode");
    offlineManager.setOffline(true);
  });
}
