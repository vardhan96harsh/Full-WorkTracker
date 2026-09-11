# WorkTracker — Developer Changelog & Release History

> **Note for Developers**: This file tracks internal release versions, build numbers, and implementation details for both Desktop (Electron/Frontend) and Server (Backend) codebases.

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
