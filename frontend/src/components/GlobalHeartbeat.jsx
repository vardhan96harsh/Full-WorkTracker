import { useEffect } from "react";
import { api } from "../api";

export default function GlobalHeartbeat({ auth }) {
  useEffect(() => {
    if (!auth?.token) return;

    const sendHeartbeat = async () => {
      try {
        await api("/api/work-sessions/heartbeat", {
          method: "POST",
          token: auth.token,
        });
      } catch (err) {
        // 401 means token expired / invalid.
        // Do not logout from heartbeat component.
        // Let your main auth logic handle logout.
        if (err?.status === 401 || err?.response?.status === 401) {
          console.warn("Heartbeat skipped: token expired or unauthorized");
          return;
        }

        console.error("Heartbeat failed:", err.message);
      }
    };

    // Send immediately after component starts
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [auth?.token]);

  return null;
}