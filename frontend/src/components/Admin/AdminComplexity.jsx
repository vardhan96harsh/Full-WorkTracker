import React, { useState, useEffect } from "react";
import {
  Sliders,
  CheckCircle2,
  RotateCcw,
  Clock,
  Sparkles,
  Layers,
  Save,
  HelpCircle,
} from "lucide-react";
import { api } from "../../api.js";
import {
  DEFAULT_COMPLEXITY_CONFIG,
  PROJECT_TYPE_COMPLEXITIES,
} from "../../plannerEngine/complexityConfig.js";

const PROJECT_TYPE_TABS = [
  { key: "storyline-360", label: "Storyline 360 Course" },
  { key: "rise-360", label: "Rise 360 Course" },
  { key: "mp4-video", label: "MP4 Video Output" },
  { key: "pdf-graphic", label: "PDF/Graphic Output" },
];

export default function AdminComplexity({ auth }) {
  const [activeType, setActiveType] = useState("storyline-360");
  const [config, setConfig] = useState(DEFAULT_COMPLEXITY_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  // Load saved complexity configuration from server
  useEffect(() => {
    async function loadConfig() {
      if (!auth?.token) return;
      setLoading(true);
      try {
        const res = await api("/api/project-plans/config/complexity", {
          token: auth.token,
        });
        if (res && res.config) {
          const mergedComplexities = {};
          const defaultMap = DEFAULT_COMPLEXITY_CONFIG.projectTypeComplexities || {};
          const serverMap = res.config.projectTypeComplexities || {};

          for (const key of Object.keys(defaultMap)) {
            const defLevels = defaultMap[key] || [];
            const srvLevels = serverMap[key] || [];
            const merged = [...srvLevels];
            defLevels.forEach((defLvl, idx) => {
              const exists = merged.some((sl) => sl.id === defLvl.id || sl.name === defLvl.name);
              if (!exists) {
                merged.splice(idx, 0, defLvl);
              }
            });
            mergedComplexities[key] = merged;
          }

          setConfig({
            ...DEFAULT_COMPLEXITY_CONFIG,
            ...res.config,
            projectTypeComplexities: mergedComplexities,
          });
        }
      } catch (err) {
        console.warn("Could not load complexity config from server, using defaults:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [auth?.token]);

  // Update rates
  const handleRateChange = (field, val) => {
    const num = Math.max(0.1, Number(val) || 0);
    setConfig((prev) => ({
      ...prev,
      rates: {
        ...prev.rates,
        [field]: num,
      },
    }));
  };

  // Update complexity level
  const handleLevelChange = (typeKey, levelIndex, field, val) => {
    setConfig((prev) => {
      const typeList = [...(prev.projectTypeComplexities[typeKey] || [])];
      if (!typeList[levelIndex]) return prev;

      typeList[levelIndex] = {
        ...typeList[levelIndex],
        [field]: field === "effortMultiplier" ? Number(val) || 1 : val,
      };

      return {
        ...prev,
        projectTypeComplexities: {
          ...prev.projectTypeComplexities,
          [typeKey]: typeList,
        },
      };
    });
  };

  // Save to backend
  const handleSave = async () => {
    if (!auth?.token) return;
    setError("");
    setSaveSuccess(false);

    try {
      const res = await api("/api/project-plans/config/complexity", {
        method: "PUT",
        token: auth.token,
        body: { config },
      });

      if (res?.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Save complexity error:", err);
      setError("Failed to save complexity rules to server.");
    }
  };

  // Reset to system defaults
  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all complexity rates and multipliers to system defaults?")) {
      setConfig(DEFAULT_COMPLEXITY_CONFIG);
    }
  };

  const currentLevels = config.projectTypeComplexities[activeType] || [];

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Sliders size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Project Complexity & Productivity Rules
            </h2>
            <p className="text-xs text-gray-500">
              Configure 7-hour workday standards, role production speeds, and effort multipliers per workflow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-500 transition cursor-pointer"
          >
            <Save size={14} />
            <span>Save Rules</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xs">
          <CheckCircle2 size={16} />
          <span>Complexity rules and productivity rates saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 shadow-xs">
          {error}
        </div>
      )}

      {/* WORKFLOW TYPE TABS */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {PROJECT_TYPE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveType(t.key)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeType === t.key
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TWO COLUMN GRID: GLOBAL PRODUCTIVITY SPEEDS & DYNAMIC COMPLEXITY LEVELS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: GLOBAL PRODUCTIVITY SPEEDS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5 lg:col-span-1">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
              Global Productivity Rates
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Effort standard per minute or unit of course output
            </p>
          </div>

          <div className="space-y-4">
            {/* Working hours per day */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Working Hours per Day
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="4"
                  max="12"
                  step="0.5"
                  value={config.hoursPerWorkingDay || 7}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hoursPerWorkingDay: Number(e.target.value) || 7,
                    }))
                  }
                  className="h-9 w-24 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-gray-500">Hours / Day (Mon-Fri)</span>
              </div>
            </div>

            {/* ID Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Instructional Design Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.05"
                  value={config.rates?.idRateHoursPerMin || 0.4}
                  onChange={(e) => handleRateChange("idRateHoursPerMin", e.target.value)}
                  className="h-9 w-24 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-gray-500">h / min (4h for 10m)</span>
              </div>
            </div>

            {/* Animator Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                2D Animator / Motion Designer Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={config.rates?.animatorHoursPerMin || 3.5}
                  onChange={(e) => handleRateChange("animatorHoursPerMin", e.target.value)}
                  className="h-9 w-24 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-gray-500">h / min (7h for 2m)</span>
              </div>
            </div>

            {/* Developer Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Course Developer Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={Number((config.rates?.developerHoursPerMin || 2.333).toFixed(2))}
                  onChange={(e) => handleRateChange("developerHoursPerMin", e.target.value)}
                  className="h-9 w-24 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-gray-500">h / min (7h for 3m)</span>
              </div>
            </div>

            {/* QA Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Quality Assurance Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.05"
                  max="5"
                  step="0.05"
                  value={Number((config.rates?.qaHoursPerMin || 0.923).toFixed(3))}
                  onChange={(e) => handleRateChange("qaHoursPerMin", e.target.value)}
                  className="h-9 w-24 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-gray-500">h / min (~9.2h for 10m)</span>
              </div>
            </div>

            {/* Visual Designer Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Visual Designer Asset Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.05"
                  max="5"
                  step="0.05"
                  value={config.rates?.visualDesignHoursPerMin || 0.2}
                  onChange={(e) => handleRateChange("visualDesignHoursPerMin", e.target.value)}
                  className="h-9 w-24 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-gray-500">h / min (2h for 10m)</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DYNAMIC COMPLEXITY LEVELS FOR ACTIVE TYPE */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4 lg:col-span-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
              Complexity Levels for {PROJECT_TYPE_TABS.find((t) => t.key === activeType)?.label}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Customize effort multipliers and motion animation splits
            </p>
          </div>

          <div className="space-y-4">
            {currentLevels.map((lvl, idx) => (
              <div
                key={lvl.id || idx}
                className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                      {lvl.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-600">
                      Multiplier: {lvl.effortMultiplier}x
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-gray-500">Multiplier:</label>
                    <input
                      type="number"
                      min="0.5"
                      max="3.0"
                      step="0.05"
                      value={lvl.effortMultiplier || 1.0}
                      onChange={(e) =>
                        handleLevelChange(activeType, idx, "effortMultiplier", e.target.value)
                      }
                      className="h-8 w-20 rounded-xl border border-gray-300 bg-white px-2.5 text-xs font-bold text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-500">Description:</label>
                  <input
                    type="text"
                    value={lvl.description || ""}
                    onChange={(e) =>
                      handleLevelChange(activeType, idx, "description", e.target.value)
                    }
                    className="h-8 w-full rounded-xl border border-gray-300 bg-white px-3 text-xs text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
