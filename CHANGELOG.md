# WorkTracker — Developer Changelog & Release History

> **Note for Developers**: This file tracks internal release versions, build numbers, and implementation details for both Desktop (Electron/Frontend) and Server (Backend) codebases.

---

## [Version 2026.10.4] — 8 October 2026 (Offline Sync & Timer Fix)

### 🚀 Highlights & Problem Fixes
1. **Offline Timer Runaway Duration & Deduplication Fix**:
   - **Problem**: When working offline and reconnecting to the internet, background sync intervals repeatedly pushed duplicate overlapping time segments into the database. Each cycle compounded the duration in an arithmetic progression, causing astronomical inflated durations (e.g., adding ~1,140 hours).
   - **Root Cause**:
     - `offlineManager.js` (`syncWithServer`) was pushing open-ended segments into `segments` and retaining the offline session in `localStorage` upon sync success.
     - `routes/workSessions.js` (`/sync-offline`) blindly appended segments and added their durations together without deduplicating identical or overlapping timestamps.
   - **Fix & Enhancements**:
     - **Interval Deduplication & Strict Idempotency**: `/sync-offline` now deduplicates segments by start time within a 3s window and reconciles premature heartbeat auto-pause segments.
     - **Unique Duration Recalculation**: `session.accumulatedMinutes` is strictly recomputed from unique non-overlapping segments; repeated sync calls produce 0 extra minutes.
     - **Database Self-Healing**: Added automatic self-healing logic in `/my` and `/admin/list` that automatically caps and repairs historical corrupted records (>1,440 min/day) to their true segment duration.
     - **Frontend Queue Cleanup**: `offlineManager.js` now immediately calls `clearOfflineSession()` and `clearQueue()` upon a successful sync, terminating the sync loop.
     - **Assets Sync**: Rebuilt production frontend bundle and synchronized with `electron/frontend-dist`.

---

## [Version 2026.10.1] — 1 October 2026 (October Release #1)

### 🚀 Highlights & Architectural Improvements
1. **Live WorkSession Reporting & Obsolete Code Removal**:
   - Replaced legacy `Timesheet` data dependency in `backend/routes/reports.js` with live `WorkSession` data.
   - Accurately computes active timer elapsed durations in `/api/reports/summary`, `/api/reports/user-breakdown`, and `/api/reports/export`.
   - Fixed potential `ERR_HTTP_HEADERS_SENT` double-send on `/api/work-sessions/status` in `routes/workSessions.js`.

2. **Modularized Admin Daily Report**:
   - Decomposed monolithic `AdminDailyReport.jsx` (1,765 lines) into focused, maintainable subcomponents under `Admin/DailyReport/` (`reportHelpers.js`, `reportExporters.js`, `ReportHeaderMetrics.jsx`, `ReportFilterToolbar.jsx`, `RawSessionTable.jsx`, `CompanyHoursTable.jsx`, `ProjectHoursTable.jsx`, `UserHoursTable.jsx`).
   - Retained 100% feature and style parity with zero breaking changes.

3. **Desktop Release Packaging**:
   - Generated new Windows Desktop Installer: `Work Tracker Setup 2026.10.1.exe`.
   - Updated electron configuration and production frontend assets.

---

## [Version 2026.9.8] — 24 September 2026 (September Release #8)

---

## [Version 2026.9.7] — 20 September 2026 (September Release #7)

---

## [Version 2026.9.6] — 17 September 2026 (September Release #6)

### 🚀 Highlights & Problem Fixes
1. **Overlay Widget & Background Timer Synchronization Fix**:
   - **Problem**: In `OverlayWidget.jsx`, `loadSessions()` had a fallback `running || paused || prevActive`, which caused stale active session objects to persist in the overlay even after the timer was stopped on the backend or main window. Consequently, the overlay timer kept displaying/running while background tracking was stopped, and the 10-minute idle reminder popup never triggered.
   - **Fix**:
     - Fixed `OverlayWidget.jsx` session resolution: if no active or paused session exists on the server, `activeSession` strictly resets to `null`, clears ticker, and resets elapsed to `0`.
     - Added periodic auto-sync loops in both `OverlayWidget.jsx` (every 10s) and `WorkTimer.jsx` (every 15s) to guarantee both widgets stay 100% in sync with the backend.
     - Enhanced `GlobalHeartbeat.jsx` to broadcast session change notifications if the server returns 0 updated active sessions.
     - Updated `stop()` handlers in both `WorkTimer.jsx` and `OverlayWidget.jsx` to immediately clear tickers and reset states cleanly before network reconciliation.
     - Ensured that when the timer stops anywhere, the 10-minute idle reminder popup countdown engages immediately and alerts reliably.

---

## [Version 2026.9.5] — 17 September 2026 (September Release #5)

### 🚀 Highlights & Problem Fixes
1. **Simplified Reminder Modal**:
   - Removed the extra "Start Tracker" button inside [`TimerIdleReminder.jsx`](file:///d:/workTracker/projecttrack/frontend/src/components/Employee/TimerIdleReminder.jsx).
   - Retained the clean, single "Dismiss" button and top-right "✕" close button without altering any other logic or timer functionality.

---

## [Version 2026.9.4] — 15 September 2026 (September Release #4)

### 🚀 Highlights & Problem Fixes
1. **Recurring 10-Minute Inactivity Alert Fix**:
   - **Problem**: Previously, if the 10-minute "Work Tracker is Off" popup appeared and the user minimized or ignored the window without explicitly clicking "Dismiss" or "✕", the popup state remained `true` and the 10-minute cycle never re-engaged.
   - **Fix**:
     - Reset the reminder benchmark timer on every alert trigger.
     - Automatically re-triggers the alert every 10 minutes whether the popup was dismissed, closed, minimized, or left open in the background.
     - Added direct "Start Tracker" play button to instantly launch work tracking directly from the reminder modal.
     - Restores minimized desktop window, flashes taskbar, and plays chime every 10 minutes as long as the timer remains stopped.

---

## [Version 2026.9.3] — 15 September 2026 (September Release #3)

### 🚀 Highlights & Problem Fixes
1. **New Release Build & Desktop Executable**:
   - Packaged new Windows Desktop Installer: [`Work Tracker Setup 2026.9.3.exe`](file:///d:/workTracker/projecttrack/electron/dist/Work%20Tracker%20Setup%202026.9.3.exe).
   - Rebuilt production frontend assets with latest Vite bundle and synchronised with Electron `frontend-dist`.
   - Updated NSIS installer packaging configuration and blockmap.

---

## [Version 2026.9.2] — 11 September 2026 (September Release #2)

### 🚀 Highlights & Problem Fixes
1. **10-Minute Inactive Timer Screen Alert Popup**:
   - **Feature**: If an employee's work timer is OFF or NOT RUNNING (stopped or paused), an on-screen alert modal (`TimerIdleReminder.jsx`) appears over the entire application after 10 minutes of inactivity.
   - **Behavior**:
     - The modal remains visible until the user starts the timer or chooses to dismiss/close it.
     - Includes a prominent "Start Timer Now" button that instantly switches to the timer dashboard and highlights the Start/Resume button.
     - If dismissed ("Remind me in 10 minutes" or close button "✕"), the popup dismisses cleanly and triggers again after another 10 minutes if the timer is still not running.
     - If the user starts the timer, the popup immediately disappears and will NOT appear while the timer is running. Only when the timer is stopped or paused does the 10-minute idle cycle re-engage.
     - Emits a gentle two-tone chime and calls Electron IPC `timer:alertReminder` to restore/focus the desktop application and flash the Windows taskbar icon if minimized or hidden.
     - Fully isolated; zero impact on existing timer tracking, offline sync, or manual time requests.

---

## [Version 2026.9.1] — 11 September 2026 (September Release #1)

### 🚀 Highlights & Problem Fixes
1. **Work Overview Height & Date Range Picker Visibility Fix**:
   - **Problem**: When no task was running or the session list was empty, the Work Overview card was too short (~200px) and had `overflow-hidden`, which clipped and completely hid the Date Range Picker calendar popup (~360px) from being visible.
   - **Fix**:
     - Increased minimum height of the Work Overview card to `min-h-[580px] flex flex-col`.
     - Removed `overflow-hidden` from the outer card to guarantee floating popups are never clipped.
     - Added `min-h-[360px]` to the table container and spacious `py-24` empty state styling with icon and guidance text.
     - Elevated `DateRangePicker` z-index to `z-40` with `z-50` and `shadow-2xl` on the DayPicker popup.

2. **Custom / General Task Name Support**:
   - **Problem**: In manual time requests, choosing "General Task" had no task name field, and the request table hardcoded the literal badge `"General Task"`, never showing the employee's actual task name.
   - **Fix**:
     - Added dedicated `customTaskName` input field in `ManualRemarksPage.jsx` when "General / Internal Task" mode is selected.
     - Updated table column to show the specific task name with briefcase icon and "General" badge, or the project name with folder icon.
     - Updated admin table (`AdminManualTasks.jsx`) to display the particular task name instead of `(Custom Task)`.
     - Fixed `backend/routes/manualRemarks.js` and `backend/routes/workSessions.js` to store, return, and aggregate `customTask` names without falling back to hardcoded `"(Custom Task)"` strings.

3. **Release Packaging & Setup**:
   - Added versioning convention `YEAR.MONTH.BUILD` (e.g. `2026.9.1`).
   - Configured `artifactName` in `electron/package.json`.

---

## [Version 1.0.0] — Initial Production Release

### 🚀 Initial Features
- **Core Time Tracking**:
  - Start, Pause, Resume, Stop live timer for assigned tasks and projects.
  - Offline tracking support with automatic local storage and sync when back online.
  - Machine heartbeat and automatic idle session detection/auto-stop.
- **Project & Task Management**:
  - Admin project, company, and category CRUD.
  - Task assignment to team members with priority and task types (Alpha, Beta, CR, Rework, Analysis, QA).
- **Manual Time Requests**:
  - Employee submission of offline/missed hours for projects or general tasks.
  - Admin review, approval, rejection, and time adjustment workflow.
  - Automatic injection of approved manual hours into project work sessions.
- **Reporting & Exporting**:
  - Daily reports, user breakdowns, and detailed CSV/Excel exports.
- **Desktop Electron Application**:
  - Packaged Windows installer with NSIS setup, system tray integration, and custom widget overlay.

---

## 📌 Versioning Guidelines for Developers

We follow a **Calendar-based Build Versioning (CalVer)** convention:
```
<YEAR>.<MONTH>.<BUILD_NUMBER>
```
* **Example for September 2026**:
  - 1st release: `2026.9.1` → `Work Tracker Setup 2026.9.1.exe`
  - 2nd release: `2026.9.2` → `Work Tracker Setup 2026.9.2.exe`
* **Example for October 2026**:
  - 1st release: `2026.10.1` → `Work Tracker Setup 2026.10.1.exe`

### How to Release a New Version:
1. Update `"version": "2026.9.X"` in `electron/package.json`.
2. Add a new section at the top of this `CHANGELOG.md` file listing the changes.
3. Run `npm run build` in `frontend/`.
4. Run `npm run dist` in `electron/` to produce the new setup executable.
5. Commit and push changes to `main`.
