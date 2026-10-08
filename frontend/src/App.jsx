import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import Login from "./components/Login.jsx";
import Admin from "./components/Admin/Admin.jsx";
import Employee from "./components/Employee/Employee.jsx";
import OverlayWidget from "./components/Employee/OverlayWidget.jsx";
import GlobalHeartbeat from "./components/GlobalHeartbeat";


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem("auth");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-800">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-slate-900">Application Error</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              An unexpected error occurred while displaying your dashboard.
            </p>
            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-100 text-left text-xs font-mono text-red-600 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="pt-2 flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition"
              >
                Clear Cache &amp; Re-login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("auth") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");

    const isLoggedIn = !!auth && !!auth.token;
    const role = (auth?.user?.role || "").toLowerCase() || null;
    window.worktracker?.setOverlayEnabled?.(isLoggedIn, role);
  }, [auth]);

  // 🔄 Sync auth state whenever tokens are silently refreshed
  useEffect(() => {
    const handleRefreshed = (e) => {
      if (e.detail) setAuth(e.detail);
    };
    const handleExpired = () => {
      setAuth(null);
    };

    window.addEventListener("auth:refreshed", handleRefreshed);
    window.addEventListener("auth:expired", handleExpired);

    return () => {
      window.removeEventListener("auth:refreshed", handleRefreshed);
      window.removeEventListener("auth:expired", handleExpired);
    };
  }, []);

  // 🚪 Global App Close handler: Ensures window always closes smoothly across all screens
  useEffect(() => {
    const off = window.worktracker?.onAppClosing?.(() => {
      window.worktracker?.confirmAppClose?.();
    });
    return () => typeof off === "function" && off();
  }, []);

  async function handleLogout() {
    try {
      await api("/api/work-sessions/stop", {
        method: "POST",
        token: auth?.token,
        body: { remarks: "Stopped on logout" },
      });
    } catch {
      // ignore if no session
    } finally {
      setAuth(null);
    }
  }

  const isOverlay =
    typeof window !== "undefined" &&
    window.location.hash.includes("/overlay");

  if (isOverlay)
    return (
      <ErrorBoundary>
        <GlobalHeartbeat auth={auth} />
        <OverlayWidget />
      </ErrorBoundary>
    );

  if (!auth) return <Login onLogin={setAuth} />;

  const userRole = (auth?.user?.role || "").toLowerCase();

  return (
    <ErrorBoundary>
      {userRole === "admin" ? (
        <Admin auth={auth} onLogout={handleLogout} />
      ) : (
        <>
          <GlobalHeartbeat auth={auth} />
          <Employee auth={auth} onLogout={handleLogout} />
        </>
      )}
    </ErrorBoundary>
  );
}
