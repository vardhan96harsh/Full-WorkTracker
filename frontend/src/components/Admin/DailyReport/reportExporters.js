// frontend/src/components/Admin/DailyReport/reportExporters.js
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { api } from "../../../api.js";
import { formatHHMMSS } from "./reportHelpers.js";

export function exportCompanyExcel({ companiesTree, unit, from, to, showToast }) {
  if (!companiesTree || companiesTree.length === 0) {
    showToast?.("No company data available to export.");
    return;
  }

  const exportRows = [];
  exportRows.push([
    "Company Name",
    "Project Name",
    "Team Contributors (Hours)",
    `Total (${unit === "hours" ? "Hours" : "Minutes"})`,
    "Formatted Time (HH:MM:SS)",
  ]);

  companiesTree.forEach((comp) => {
    // Company Summary Row
    exportRows.push([
      comp.companyName,
      `[ALL PROJECTS - ${comp.projects.length} Total]`,
      comp.projects.flatMap((p) => p.users.map((u) => u.userName)).filter((v, i, a) => a.indexOf(v) === i).join(", "),
      unit === "hours"
        ? Math.round((comp.totalMinutes / 60) * 100) / 100
        : Math.round(comp.totalMinutes),
      formatHHMMSS(comp.totalMinutes),
    ]);

    // Individual Projects
    comp.projects.forEach((proj) => {
      const teamStr = proj.users
        .map((u) => `${u.userName} (${formatHHMMSS(u.totalMinutes)})`)
        .join("; ");

      exportRows.push([
        `  ${comp.companyName}`,
        proj.projectName,
        teamStr,
        unit === "hours"
          ? Math.round((proj.totalMinutes / 60) * 100) / 100
          : Math.round(proj.totalMinutes),
        formatHHMMSS(proj.totalMinutes),
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(exportRows);
  ws["!cols"] = [{ wch: 28 }, { wch: 34 }, { wch: 55 }, { wch: 20 }, { wch: 25 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Company Work Hours");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([wbout], { type: "application/octet-stream" }),
    `company_work_hours_${from}_to_${to}.xlsx`
  );
}

export function exportByUserCSV({ byUserWithProjects, unit, from, to, showToast }) {
  if (!byUserWithProjects || byUserWithProjects.length === 0) {
    showToast?.("No user data available to export.");
    return;
  }

  const lines = [];
  lines.push(`"Employee","Projects","Total ${unit === "hours" ? "Hours" : "Minutes"}","Formatted Time"`);

  byUserWithProjects.forEach((u) => {
    const value =
      unit === "hours"
        ? Math.round((u.totalMinutes / 60) * 100) / 100
        : Math.round(u.totalMinutes);
    const projList = u.projects.map((p) => p.projectName).join("; ");
    lines.push(`"${u.userName}","${projList}",${value},"${formatHHMMSS(u.totalMinutes)}"`);
  });

  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `by-user_${from}_to_${to}_${unit}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportRawCSV({ from, to, unit, filters, token, showToast, setDownloading }) {
  try {
    setDownloading(true);

    const qs = new URLSearchParams({
      from,
      to,
      group: "compact",
      unit,
      ...(filters.company ? { company: filters.company } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.project ? { project: filters.project } : {}),
      ...(filters.user ? { user: filters.user } : {}),
      ...(filters.machine ? { machine: filters.machine } : {}),
    }).toString();

    const csvText = await api(`/api/work-sessions/export?${qs}`, { token });
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-sessions_${from}_to_${to}_${unit}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export raw CSV error:", err);
    showToast?.("Export failed. Please check connection.");
  } finally {
    setDownloading(false);
  }
}
