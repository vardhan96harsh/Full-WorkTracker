/**
 * projectCodeGenerator.js
 * Utility for generating standardized project codes based on company name
 * and existing company projects (e.g. TCS-001, GOOG-002, PRJ-001).
 */

export function getCompanyPrefix(companyName) {
  if (!companyName || typeof companyName !== "string") return "PRJ";

  const clean = companyName.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  if (!clean) return "PRJ";

  const stopWords = new Set([
    "pvt", "ltd", "inc", "corp", "corporation", "llc", "co", "company", "limited", "private"
  ]);
  const allWords = clean.split(/\s+/).filter(Boolean);
  const significantWords = allWords.filter((w) => !stopWords.has(w.toLowerCase()));
  const targetWords = significantWords.length > 0 ? significantWords : allWords;

  if (targetWords.length === 1) {
    return targetWords[0].slice(0, 4).toUpperCase();
  }

  if (targetWords.length >= 2) {
    const initials = targetWords.map((w) => w[0]).join("").toUpperCase();
    if (initials.length >= 2 && initials.length <= 4) {
      return initials;
    }
    return initials.slice(0, 4);
  }

  return clean.slice(0, 4).toUpperCase() || "PRJ";
}

export function getNextProjectCode(companyName, projectList = []) {
  const prefix = getCompanyPrefix(companyName);
  const regex = new RegExp(`^${prefix}-(\\d+)`, "i");

  let maxNum = 0;
  for (const p of (projectList || [])) {
    const codeStr = p?.code || "";
    const m = codeStr.match(regex);
    if (m && m[1]) {
      const val = parseInt(m[1], 10);
      if (val > maxNum) maxNum = val;
    }
  }

  return `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
}
