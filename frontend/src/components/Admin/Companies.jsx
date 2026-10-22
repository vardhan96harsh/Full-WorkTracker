import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Plus,
  Search,
  X,
  Check,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { api } from "../../api.js";
import ConfirmModal from "./ConfirmModal.jsx";

function getInitials(name) {
  if (!name) return "CO";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Companies({ auth }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // In-app non-blocking confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ================= LOAD ================= */
  async function load() {
    setLoading(true);
    setErrorMsg("");
    try {
      const rows = await api("/api/companies", {
        token: auth.token,
      });
      const sorted = (rows || []).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
      setItems(sorted);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to load companies. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* ================= ADD ================= */
  async function add(e) {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    // Check duplicate locally
    const exists = items.some(
      (it) => it.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setErrorMsg(`A company with the name "${trimmed}" already exists.`);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const created = await api("/api/companies", {
        method: "POST",
        body: { name: trimmed },
        token: auth.token,
      });

      setItems((prev) =>
        [...prev, created].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        )
      );
      setName("");
      setSuccessMsg(`Company "${created.name}" created successfully.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to create company.");
    } finally {
      setLoading(false);
    }
  }

  /* ================= UPDATE ================= */
  async function update(id) {
    const trimmed = editName.trim();
    if (!trimmed || savingEdit) return;

    // Check duplicate
    const exists = items.some(
      (it) => it._id !== id && it.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setErrorMsg(`A company with the name "${trimmed}" already exists.`);
      return;
    }

    setSavingEdit(true);
    setErrorMsg("");
    try {
      await api(`/api/companies/${id}`, {
        method: "PUT",
        body: { name: trimmed },
        token: auth.token,
      });

      setItems((prev) =>
        prev
          .map((it) =>
            it._id === id ? { ...it, name: trimmed } : it
          )
          .sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
          )
      );

      setEditId(null);
      setEditName("");
      setSuccessMsg("Company updated successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to update company.");
    } finally {
      setSavingEdit(false);
    }
  }

  /* ================= DELETE ================= */
  function del(company) {
    setDeleteTarget(company);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setErrorMsg("");

    // If currently editing this company, reset edit state
    if (editId === deleteTarget._id) {
      setEditId(null);
      setEditName("");
    }

    try {
      await api(`/api/companies/${deleteTarget._id}`, {
        method: "DELETE",
        token: auth.token,
      });

      setItems((prev) => prev.filter((it) => it._id !== deleteTarget._id));
      setSuccessMsg(`Company "${deleteTarget.name}" deleted.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to delete company.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const search = q.toLowerCase().trim();
    return items
      .filter((it) => (it.name || "").toLowerCase().includes(search))
      .sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
  }, [items, q]);

  return (
    <div className="space-y-4">
      {/* ── COMPACT HEADER BANNER ── */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100 shadow-2xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-slate-900">
                  Companies
                </h3>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                  {items.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage clients and parent organizations for projects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg("")}
              className="ml-auto text-red-500 hover:text-red-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-700">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
            <button
              onClick={() => setSuccessMsg("")}
              className="ml-auto text-emerald-500 hover:text-emerald-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── UNIFIED TABLE & ACTION TOOLBAR CARD ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        {/* Integrated Action Toolbar (Add + Search in single compact bar) */}
        <div className="border-b border-slate-100 bg-slate-50/60 p-3 sm:px-4 sm:py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Add Company Inline Form */}
          <form onSubmit={add} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter company or organization name..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-bold text-white shadow-2xs transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </form>

          {/* Search Filter */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search companies..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-7 text-xs outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline-block whitespace-nowrap">
              {filtered.length} of {items.length}
            </span>
          </div>
        </div>

        {/* Companies Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="w-14 px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Company Name</th>
                <th className="w-44 px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="mt-2.5 text-xs font-bold text-slate-800">
                      No companies found
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {q
                        ? "No companies match your search query."
                        : "No companies added yet. Register your first company above."}
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((it, i) => {
                const isEditing = editId === it._id;

                return (
                  <tr
                    key={it._id}
                    className={`transition hover:bg-slate-50/80 ${
                      isEditing ? "bg-blue-50/30" : ""
                    }`}
                  >
                    {/* Index */}
                    <td className="px-4 py-3 text-xs font-semibold text-slate-400">
                      {i + 1}
                    </td>

                    {/* Company Name / Edit Input */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2 max-w-md">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") update(it._id);
                              if (e.key === "Escape") {
                                setEditId(null);
                                setEditName("");
                              }
                            }}
                            className="h-8.5 w-full rounded-xl border border-blue-500 bg-white px-3 text-xs font-medium text-slate-900 outline-none ring-2 ring-blue-500/20"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 text-xs font-bold">
                            {getInitials(it.name)}
                          </div>
                          <span className="font-bold text-xs text-slate-900">
                            {it.name}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => update(it._id)}
                              disabled={savingEdit || !editName.trim()}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="h-3 w-3" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditId(null);
                                setEditName("");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                              <span>Cancel</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditId(it._id);
                                setEditName(it.name);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200/60 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 cursor-pointer"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => del(it)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200/60 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-app non-blocking confirmation dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Company"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?\n\nWarning: Any projects associated with this company may be affected.`}
        confirmText="Delete Company"
        cancelText="Cancel"
        isDanger={true}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
