import React, { useEffect, useMemo, useState } from "react";
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Filter,
  X,
  Check,
  Edit2,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Briefcase,
  Calendar,
  Key,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Lock,
  FileBadge2,
  Phone,
  Sparkles,
} from "lucide-react";
import { api } from "../../api.js";
import ConfirmModal from "./ConfirmModal.jsx";
import PersonalDetailsModal from "./PersonalDetailsModal.jsx";

const DESIGNATIONS = [
  "Instructional Designer",
  "Quality Analyst",
  "Storyline Developer",
  "Graphic Designer",
  "Animator",
  "Manager",
  "Software Developer",
];

function formatDob(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr.slice(0, 10);
  }
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Users({ auth }) {
  const isSuperAdmin = (auth?.user?.role || "").toLowerCase() === "superadmin";
  const [personalModalUser, setPersonalModalUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    employeeId: "",
    password: "",
    role: "employee",
    status: "active",
    gender: "",
    designation: "",
    dob: "",
    joiningDate: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(true);

  // Edit modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    employeeId: "",
    role: "employee",
    status: "active",
    gender: "",
    designation: "",
    dob: "",
    joiningDate: "",
    password: "",
  });
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState("");

  // In-app non-blocking confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");

  async function load() {
    setLoading(true);
    setErrorMsg("");
    try {
      const rows = await api("/api/users", { token: auth.token });
      const sorted = (rows || []).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
      setItems(sorted);
    } catch (err) {
      console.error("Failed to load users:", err);
      setErrorMsg(err?.message || "Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Validation helpers
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || "");
  const canAdd =
    form.name.trim() &&
    emailOk &&
    form.password.length >= 6 &&
    form.role &&
    form.status &&
    !loading;

  const editEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email || "");
  const canSaveEdit =
    editForm.name.trim() &&
    editEmailOk &&
    editForm.role &&
    editForm.status &&
    !savingEdit;

  /* ---------- create user ---------- */
  async function add(e) {
    if (e) e.preventDefault();
    if (!canAdd) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api("/api/users", {
        method: "POST",
        token: auth.token,
        body: {
          ...form,
          name: form.name.trim(),
          email: form.email.trim(),
          employeeId: form.employeeId ? form.employeeId.trim() : null,
          gender: form.gender || null,
          designation: form.designation || null,
          dob: form.dob || null,
          joiningDate: form.joiningDate || null,
        },
      });
      setForm({
        name: "",
        email: "",
        employeeId: "",
        password: "",
        role: "employee",
        status: "active",
        gender: "",
        designation: "",
        dob: "",
        joiningDate: "",
      });
      setSuccessMsg("User account created successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
      await load();
    } catch (err) {
      console.error("Failed to add user:", err);
      setErrorMsg(err?.message || "Failed to create user. Please verify input.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- delete user ---------- */
  function del(user) {
    if (user.role === "superadmin") {
      setErrorMsg("Super Admin accounts cannot be deleted.");
      return;
    }
    if (user.role === "admin" && !isSuperAdmin) {
      setErrorMsg("Only Super Admin can delete Administrator accounts.");
      return;
    }
    setDeleteTarget(user);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget._id || deleteTarget.id;

    setDeleting(true);
    setErrorMsg("");
    try {
      await api(`/api/users/${id}`, {
        method: "DELETE",
        token: auth.token,
      });
      setSuccessMsg(`User "${deleteTarget.name}" deleted.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error("Failed to delete user:", err);
      setErrorMsg(err?.message || "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------- edit modal handlers ---------- */
  function startEdit(user) {
    if (user.role === "superadmin" && !isSuperAdmin) {
      setErrorMsg("Only Super Admin can modify Super Admin accounts.");
      return;
    }
    setEditingUser(user);
    setEditErrorMsg("");
    setShowEditPwd(false);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      employeeId: user.employeeId || "",
      role: user.role || "employee",
      status: user.status || "active",
      gender: user.gender || "",
      designation: user.designation || "",
      dob: user.dob ? user.dob.slice(0, 10) : "",
      joiningDate: user.joiningDate ? user.joiningDate.slice(0, 10) : "",
      password: "", // blank = keep existing password
    });
  }

  function cancelEdit() {
    setEditingUser(null);
    setEditErrorMsg("");
  }

  async function saveEdit() {
    if (!editingUser || !canSaveEdit) return;
    setSavingEdit(true);
    setEditErrorMsg("");

    const id = editingUser._id || editingUser.id;
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        employeeId: editForm.employeeId ? editForm.employeeId.trim() : null,
        role: editForm.role,
        status: editForm.status,
        gender: editForm.gender || null,
        designation: editForm.designation || null,
        dob: editForm.dob || null,
        joiningDate: editForm.joiningDate || null,
      };
      if (editForm.password && editForm.password.length >= 6) {
        payload.password = editForm.password;
      }

      const updated = await api(`/api/users/${id}`, {
        method: "PUT",
        token: auth.token,
        body: payload,
      });

      // Update local items state
      setItems((prev) =>
        (prev || []).map((u) => {
          const uId = u._id || u.id;
          if (uId === id) {
            return {
              ...u,
              id: updated.id,
              name: updated.name,
              email: updated.email,
              employeeId: updated.employeeId,
              role: updated.role,
              status: updated.status,
              gender: updated.gender,
              designation: updated.designation,
              dob: updated.dob,
              joiningDate: updated.joiningDate,
            };
          }
          return u;
        })
      );

      setSuccessMsg(`User "${updated.name}" updated successfully.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      cancelEdit();
    } catch (err) {
      console.error("Failed to update user:", err);
      setEditErrorMsg(err?.message || "Failed to update user account.");
    } finally {
      setSavingEdit(false);
    }
  }

  /* ---------- filtered users list ---------- */
  const filtered = useMemo(() => {
    return (items || [])
      .filter((it) => {
        const byRole = roleFilter ? it.role === roleFilter : true;
        const byStatus = statusFilter ? it.status === statusFilter : true;
        const byDesignation = designationFilter
          ? it.designation === designationFilter
          : true;
        const s = q.toLowerCase().trim();
        const byQuery = s
          ? (it.name || "").toLowerCase().includes(s) ||
            (it.email || "").toLowerCase().includes(s) ||
            (it.employeeId || "").toLowerCase().includes(s)
          : true;
        return byRole && byStatus && byDesignation && byQuery;
      })
      .sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
  }, [items, q, roleFilter, statusFilter, designationFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    const active = items.filter((u) => u.status === "active").length;
    const inactive = total - active;
    const superAdmins = items.filter((u) => u.role === "superadmin").length;
    const admins = items.filter((u) => u.role === "admin").length;
    const employees = items.filter((u) => u.role === "employee").length;
    return { total, active, inactive, superAdmins, admins, employees };
  }, [items]);

  const hasActiveFilters = Boolean(q || roleFilter || statusFilter || designationFilter);

  return (
    <div className="space-y-3.5">
      {/* ── COMPACT HEADER BANNER ── */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100 shadow-2xs">
              <UsersIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-slate-900">
                  Users Management
                </h3>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {metrics.total} Total
                </span>
                {isSuperAdmin && (
                  <span className="rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-extrabold text-purple-700">
                    SUPER ADMIN ACCESS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Provision new accounts, assign roles, designations, and manage access.
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
          <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-700">
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
          <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs font-medium text-emerald-700">
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

        {/* Compact Metric Tiles */}
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Total</span>
            <span className="text-base font-bold text-slate-900">{metrics.total}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-1.5">
            <span className="text-[11px] font-semibold text-emerald-700">Active</span>
            <span className="text-base font-bold text-emerald-800">{metrics.active}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-1.5">
            <span className="text-[11px] font-semibold text-amber-700">Inactive</span>
            <span className="text-base font-bold text-amber-800">{metrics.inactive}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50/50 px-3 py-1.5">
            <span className="text-[11px] font-semibold text-purple-700">Super Admins</span>
            <span className="text-base font-bold text-purple-800">{metrics.superAdmins}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-1.5">
            <span className="text-[11px] font-semibold text-blue-700">Admins</span>
            <span className="text-base font-bold text-blue-800">{metrics.admins}</span>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-1.5 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500">Employees</span>
            <span className="text-base font-bold text-slate-800">{metrics.employees}</span>
          </div>
        </div>
      </div>

      {/* ── COMPACT ADD NEW USER CARD ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white shrink-0">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Add New User</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 hidden sm:inline">* Required fields</span>
            <button
              type="button"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer px-2 py-0.5 rounded-lg hover:bg-slate-100"
            >
              <span>{isFormOpen ? "Collapse" : "Expand"}</span>
              {isFormOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {isFormOpen && (
          <form onSubmit={add} className="pt-1">
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Full Name */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  Full Name *
                </label>
                <input
                  placeholder="e.g. Jane Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. user@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`h-9 w-full rounded-xl border bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs ${
                    !form.email || emailOk ? "border-slate-200" : "border-red-300 bg-red-50/20"
                  }`}
                />
              </div>

              {/* Employee ID */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  Employee ID
                </label>
                <input
                  placeholder="e.g. EMP-101"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs font-mono"
                />
              </div>

              {/* Initial Password */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  Password * (min 6 chars)
                </label>
                <div className="relative">
                  <input
                    placeholder="At least 6 characters"
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={`h-9 w-full rounded-xl border bg-slate-50/70 pl-3 pr-8 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs ${
                      !form.password || form.password.length >= 6
                        ? "border-slate-200"
                        : "border-red-300 bg-red-50/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                />
              </div>

              {/* Date of Joining */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  Date of Joining
                </label>
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                />
              </div>

              {/* Role */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  System Role *
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Administrator</option>
                  {isSuperAdmin && (
                    <option value="superadmin">Super Administrator</option>
                  )}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  Account Status *
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* Designation */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  Designation
                </label>
                <select
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                >
                  <option value="">Select Designation</option>
                  {DESIGNATIONS.map((des) => (
                    <option key={des} value={des}>
                      {des}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <button
                type="submit"
                disabled={!canAdd}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add User</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── COMPACT FILTERS & SEARCH ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:px-3 sm:py-2 shadow-2xs">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email address…"
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
          >
            <option value="">All Roles</option>
            <option value="superadmin">Super Administrator</option>
            <option value="admin">Administrator</option>
            <option value="employee">Employee</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Designation Filter */}
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
          >
            <option value="">All Designations</option>
            {DESIGNATIONS.map((des) => (
              <option key={des} value={des}>
                {des}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setQ("");
                setRoleFilter("");
                setStatusFilter("");
                setDesignationFilter("");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer shadow-2xs"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900">User Directory</h4>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              {filtered.length} {filtered.length === 1 ? "user" : "users"}
            </span>
          </div>

          {filtered.length !== items.length && (
            <span className="text-xs text-slate-400">
              Filtered from {items.length} total
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Emp ID</th>
                <th className="px-4 py-2.5">Designation</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Date of Birth</th>
                <th className="px-4 py-2.5">Joining Date</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <UsersIcon className="h-5 w-5" />
                    </div>
                    <div className="mt-2.5 text-sm font-semibold text-slate-900">
                      No users found
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {hasActiveFilters
                        ? "Try clearing or adjusting your search filters above."
                        : "No users exist in the system yet. Add the first one above."}
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((it, i) => {
                const key = it._id || it.id;
                const isAdmin = it.role === "admin";
                const isActive = it.status === "active";

                return (
                  <tr
                    key={key}
                    className="transition hover:bg-slate-50/80"
                  >
                    {/* Index */}
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-400">
                      {i + 1}
                    </td>

                    {/* User Avatar + Name + Email */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                          {getInitials(it.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900 text-xs">
                            {it.name}
                          </div>
                          <div className="truncate text-[11px] text-slate-500">
                            {it.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Emp ID */}
                    <td className="px-4 py-2.5">
                      {it.employeeId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {it.employeeId}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    {/* Designation */}
                    <td className="px-4 py-2.5">
                      {it.designation ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          {it.designation}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-2.5">
                      {it.role === "superadmin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200/80 bg-purple-50 px-2 py-0.5 text-[11px] font-extrabold text-purple-700 shadow-2xs">
                          <ShieldAlert className="h-3 w-3 text-purple-600" />
                          Super Admin
                        </span>
                      ) : isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          Employee
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Date of Birth */}
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-600">
                      {it.dob ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {formatDob(it.dob)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Joining Date */}
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-600">
                      {it.joiningDate ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Calendar className="h-3 w-3 text-blue-500" />
                          {formatDob(it.joiningDate)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Personal Details Modal Trigger (Super Admin Exclusive) */}
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => setPersonalModalUser(it)}
                            title="View / Edit confidential personal details (Super Admin Exclusive)"
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200/80 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 cursor-pointer shadow-2xs"
                          >
                            <Lock className="h-3 w-3 text-purple-600" />
                            <span>Personal Info</span>
                          </button>
                        )}

                        <button
                          onClick={() => startEdit(it)}
                          disabled={it.role === "superadmin" && !isSuperAdmin}
                          title={
                            it.role === "superadmin" && !isSuperAdmin
                              ? "Super Admin accounts can only be edited by Super Admin"
                              : "Edit user details"
                          }
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                            it.role === "superadmin" && !isSuperAdmin
                              ? "border border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                              : "border border-blue-200/60 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          }`}
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => del(it)}
                          disabled={it.role === "superadmin" || (it.role === "admin" && !isSuperAdmin)}
                          title={
                            it.role === "superadmin"
                              ? "Super Admin accounts cannot be deleted"
                              : it.role === "admin" && !isSuperAdmin
                              ? "Only Super Admin can delete Administrator accounts"
                              : "Delete user account"
                          }
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                            it.role === "superadmin" || (it.role === "admin" && !isSuperAdmin)
                              ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 opacity-60"
                              : "border border-red-200/60 bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal Dialog */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingEdit) {
              cancelEdit();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit User Account
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update profile, role permissions, or reset account password.
                  </p>
                </div>
              </div>

              <button
                onClick={cancelEdit}
                disabled={savingEdit}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Error */}
            {editErrorMsg && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            {/* Modal Form */}
            <div className="mt-3.5 space-y-3">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {/* Name */}
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                    Full Name *
                  </label>
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className={`h-9 w-full rounded-xl border bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs ${
                      editEmailOk ? "border-slate-200" : "border-red-300 bg-red-50/20"
                    }`}
                  />
                </div>

                {/* Employee ID */}
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                    Employee ID
                  </label>
                  <input
                    placeholder="e.g. EMP-101"
                    value={editForm.employeeId}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, employeeId: e.target.value }))
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {/* Role */}
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                    System Role *
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, role: e.target.value }))
                    }
                    disabled={editingUser?.role === "superadmin" && !isSuperAdmin}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Administrator</option>
                    {isSuperAdmin && (
                      <option value="superadmin">Super Administrator</option>
                    )}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                    Account Status *
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, status: e.target.value }))
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {/* Gender */}
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                    Gender
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, gender: e.target.value }))
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                {/* Designation */}
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                    Designation
                  </label>
                  <select
                    value={editForm.designation}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        designation: e.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                  >
                    <option value="">Select Designation</option>
                    {DESIGNATIONS.map((des) => (
                      <option key={des} value={des}>
                        {des}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {/* DOB */}
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, dob: e.target.value }))
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                  />
                </div>

                {/* Joining Date */}
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    value={editForm.joiningDate}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, joiningDate: e.target.value }))
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Reset */}
              <div>
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                  Reset Password (optional)
                </label>
                <div className="relative">
                  <input
                    type={showEditPwd ? "text" : "password"}
                    placeholder="Leave blank to keep current"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, password: e.target.value }))
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs outline-none transition focus:border-blue-500 focus:bg-white shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPwd((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showEditPwd ? "Hide password" : "Show password"}
                  >
                    {showEditPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <span className="mt-0.5 block text-[10px] text-slate-400">
                  Leave blank to keep current password unchanged.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={savingEdit}
                className="h-8.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveEdit}
                disabled={!canSaveEdit}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app non-blocking confirmation dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete User Account"
        message={`Are you sure you want to delete user "${deleteTarget?.name}"?\n\nThis action cannot be undone.`}
        confirmText="Delete User"
        cancelText="Cancel"
        isDanger={true}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 🔒 Super Admin Exclusive: Personal & Banking Details Modal */}
      <PersonalDetailsModal
        isOpen={Boolean(personalModalUser)}
        onClose={() => setPersonalModalUser(null)}
        user={personalModalUser}
        authToken={auth.token}
        onSaved={(updated) => {
          setPersonalModalUser((prev) => (prev ? { ...prev, ...updated } : prev));
          setItems((prev) =>
            (prev || []).map((u) => {
              const uId = u._id || u.id;
              const upId = updated._id || updated.id;
              if (uId === upId) {
                return { ...u, ...updated };
              }
              return u;
            })
          );
        }}
      />
    </div>
  );
}
