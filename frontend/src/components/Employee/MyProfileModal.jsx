import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  User,
  Phone,
  Home,
  FileBadge2,
  CreditCard,
  Check,
  RefreshCw,
  AlertCircle,
  Copy,
  Lock,
  FileText,
  CheckCircle2,
  Clock,
  Building2,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Shield,
  X,
  Mail,
  Calendar,
  Briefcase,
  MapPin,
  Sparkles,
  Award,
  BadgeCheck,
  HeartHandshake,
  CheckCheck
} from "lucide-react";
import { api } from "../../api.js";

const TABS = [
  { id: "overview", label: "Employment Details", subtitle: "Role, ID & joining details", icon: User },
  { id: "contact", label: "Contact & Emergency", subtitle: "Phone, email & emergency", icon: Phone },
  { id: "address", label: "Residential Address", subtitle: "Current & permanent residences", icon: Home },
  { id: "identity", label: "Identity & Tax", subtitle: "PAN & Aadhaar credentials", icon: FileBadge2 },
  { id: "banking", label: "Bank Account", subtitle: "Direct deposit & IFSC details", icon: CreditCard },
  { id: "documents", label: "Submitted Documents", subtitle: "Verification & certificate records", icon: FileText },
];

export default function MyProfileModal({ isOpen, onClose, auth, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedField, setCopiedField] = useState("");

  const [formData, setFormData] = useState({
    phone: "",
    alternateEmail: "",
    currentAddress: "",
    permanentAddress: "",
    emergencyName: "",
    emergencyRelation: "",
    emergencyPhone: "",
  });

  function copyToClipboard(text, fieldName) {
    if (!text || text === "Not Recorded" || text === "Not Assigned") return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(""), 2000);
  }

  async function loadProfile() {
    if (!auth?.token) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await api("/api/users/me/profile", { token: auth.token });
      setProfile(data);
      const p = data.personalDetails || {};
      const em = p.emergencyContact || {};
      setFormData({
        phone: p.phone || "",
        alternateEmail: p.alternateEmail || "",
        currentAddress: p.currentAddress || "",
        permanentAddress: p.permanentAddress || "",
        emergencyName: em.name || "",
        emergencyRelation: em.relation || "",
        emergencyPhone: em.phone || "",
      });
    } catch (err) {
      console.error("Failed to load profile:", err);
      setErrorMsg(err?.message || "Failed to load personal profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadProfile();
      setActiveTab("overview");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSave(e) {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await api("/api/users/me/profile", {
        method: "PUT",
        token: auth.token,
        body: {
          phone: formData.phone.trim(),
          alternateEmail: formData.alternateEmail.trim(),
          currentAddress: formData.currentAddress.trim(),
          permanentAddress: formData.permanentAddress.trim(),
          emergencyContact: {
            name: formData.emergencyName.trim(),
            relation: formData.emergencyRelation.trim(),
            phone: formData.emergencyPhone.trim(),
          },
        },
      });

      setSuccessMsg("Changes saved successfully to your official profile.");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setErrorMsg(err?.message || "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function copyCurrentToPermanent() {
    setFormData((prev) => ({
      ...prev,
      permanentAddress: prev.currentAddress,
    }));
  }

  const role = profile?.role || auth?.user?.role || "employee";
  const isSuperAdmin = role === "superadmin";
  const isAdmin = role === "admin";
  const displayName = profile?.name || auth?.user?.name || (isSuperAdmin ? "Super Admin" : "User");
  const displayEmail = profile?.email || auth?.user?.email || "";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  const isEditableTab = activeTab === "contact" || activeTab === "address";

  const docs = profile?.personalDetails?.documents || {};
  const aadhaar = docs.aadhaarDoc || {};
  const pan = docs.panDoc || {};
  const prevExp = docs.previousExperienceDoc || {};
  const original = docs.originalDoc || {};
  const cheque = docs.chequeDoc || {};

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100/80 backdrop-blur-sm text-slate-900 overflow-hidden animate-in fade-in duration-200">
      {/* ---------------- TOP APPLICATION BAR ---------------- */}
      <header className="h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-5 sm:px-8 flex items-center justify-between shrink-0 shadow-2xs z-30">
        {/* Left Side: Back Button + Dynamic User Info */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs group"
            title="Back to Dashboard"
          >
            <ArrowLeft size={14} className="text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-2xs text-white ${
                isSuperAdmin
                  ? "bg-gradient-to-br from-purple-600 to-indigo-700"
                  : isAdmin
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600"
                  : "bg-gradient-to-br from-blue-600 to-teal-600"
              }`}
            >
              {initials}
            </div>

            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  {displayName}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isSuperAdmin
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : isAdmin
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {isSuperAdmin ? "Root Access" : role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                {isSuperAdmin
                  ? "Master security clearance & administrative records"
                  : "Official enterprise records, credentials & document dossier"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Save Button + Verified Pill + Close Button */}
        <div className="flex items-center gap-3">
          {isEditableTab && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-white text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Verified Record</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* ---------------- BODY PANE ---------------- */}
      <div className="flex-1 flex overflow-hidden bg-slate-50">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="w-72 border-r border-slate-200 bg-white p-4 shrink-0 flex flex-col justify-between overflow-y-auto shadow-2xs">
          <div className="space-y-4">
            {/* User Identity Mini Card */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-xl font-black shadow-md border-2 border-white mb-2">
                  {initials}
                </div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight truncate max-w-full">
                  {displayName}
                </h2>
                <span className="text-[11px] font-semibold text-blue-600 truncate max-w-full block">
                  {profile?.designation || (isSuperAdmin ? "Root Administrator" : isAdmin ? "System Administrator" : "Employee")}
                </span>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap justify-center">
                  <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                    {profile?.employeeId || "EMP-OFFICIAL"}
                  </span>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 capitalize">
                    {role}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Sections Menu */}
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Profile Sections
              </div>
              {TABS.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={16} className={isActive ? "text-blue-400" : "text-slate-400"} />
                      <span className="truncate">{t.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Logout & Compliance Footer */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            {typeof onLogout === "function" && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
              >
                <LogOut size={16} className="text-rose-500" />
                <span>Sign Out</span>
              </button>
            )}
            <div className="px-2 text-[10px] text-slate-400 leading-normal">
              Official enterprise profile records are protected and audited under organizational compliance.
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-xs font-semibold text-rose-800 shadow-xs">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-xs">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="flex-1">{successMsg}</span>
              </div>
            )}

            {/* HERO EXECUTIVE CARD */}
            <div className="relative rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 shadow-xl overflow-hidden">
              {/* Glow accents */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white/20 shrink-0">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-white tracking-tight">
                        {displayName}
                      </h2>
                      <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[11px] font-bold text-blue-300 capitalize">
                        {role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      {profile?.designation || "Corporate Employee"} • <span className="font-mono text-slate-400">{displayEmail}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 px-3.5 py-2 text-left">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee ID</span>
                    <span className="font-mono font-bold text-xs text-white">{profile?.employeeId || "EMP-PENDING"}</span>
                  </div>
                  <div className="rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 px-3.5 py-2 text-left">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Joining Date</span>
                    <span className="font-bold text-xs text-white">{profile?.joiningDate ? profile.joiningDate.slice(0, 10) : "Recorded"}</span>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-blue-600" />
                <span className="text-xs font-bold text-slate-700">Loading personal profile dossier...</span>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
                {/* ---------------- TAB 1: EMPLOYMENT DETAILS ---------------- */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Employment Information</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Official corporate designation, identity and joining records.
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 border border-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <BadgeCheck size={14} className="text-blue-600" />
                        <span>Corporate Record</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* Full Name */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <User size={13} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Full Legal Name</span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm truncate" title={profile?.name || auth?.user?.name}>
                          {profile?.name || auth?.user?.name}
                        </div>
                      </div>

                      {/* Employee ID */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 relative group">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                            <BadgeCheck size={13} />
                            Employee ID
                          </span>
                          {profile?.employeeId && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(profile.employeeId, "empId")}
                              className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                              title="Copy Employee ID"
                            >
                              {copiedField === "empId" ? <CheckCheck size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {profile?.employeeId || "Not Assigned"}
                        </div>
                      </div>

                      {/* Work Email */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Mail size={13} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Work Email</span>
                        </div>
                        <div className="font-mono text-xs font-bold text-slate-900 truncate" title={profile?.email || auth?.user?.email}>
                          {profile?.email || auth?.user?.email}
                        </div>
                      </div>

                      {/* Designation */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Briefcase size={13} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Designation</span>
                        </div>
                        <div className="font-bold text-blue-700 text-sm truncate" title={profile?.designation}>
                          {profile?.designation || "Not Assigned"}
                        </div>
                      </div>

                      {/* Account Role */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <ShieldCheck size={13} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">System Role</span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm capitalize">
                          {role}
                        </div>
                      </div>

                      {/* Gender */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <User size={13} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Gender</span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm capitalize">
                          {profile?.gender || "Not Specified"}
                        </div>
                      </div>

                      {/* Date of Birth */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Calendar size={13} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Date of Birth</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {profile?.dob ? profile.dob.slice(0, 10) : "Not Recorded"}
                        </div>
                      </div>

                      {/* Date of Joining */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Award size={13} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Joining Date</span>
                        </div>
                        <div className="font-mono font-bold text-emerald-700 text-sm">
                          {profile?.joiningDate ? profile.joiningDate.slice(0, 10) : "Not Recorded"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-500">
                      <Lock size={14} className="text-slate-400 shrink-0" />
                      <span>
                        Official employment records, designations, and joining dates are managed directly by Human Resources and Administrator operations.
                      </span>
                    </div>
                  </div>
                )}

                {/* ---------------- TAB 2: CONTACT & EMERGENCY (EDITABLE) ---------------- */}
                {activeTab === "contact" && (
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Contact &amp; Emergency Details</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Keep your direct phone number, personal email, and emergency contact up to date.
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                        Editable by You
                      </span>
                    </div>

                    {/* Primary Contact Details */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        Primary Contact Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <Phone size={12} className="text-slate-400" />
                            <span>Primary Mobile Phone</span>
                          </label>
                          <input
                            type="text"
                            placeholder="+91 98765 43210"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <Mail size={12} className="text-slate-400" />
                            <span>Personal / Alternate Email</span>
                          </label>
                          <input
                            type="email"
                            placeholder="personal.email@gmail.com"
                            value={formData.alternateEmail}
                            onChange={(e) => setFormData({ ...formData, alternateEmail: e.target.value })}
                            className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact Person */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <HeartHandshake size={15} className="text-rose-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Emergency Contact Person
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Full Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Jane Doe"
                            value={formData.emergencyName}
                            onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                            className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Relationship
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Spouse, Parent, Sibling"
                            value={formData.emergencyRelation}
                            onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                            className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Emergency Phone
                          </label>
                          <input
                            type="text"
                            placeholder="+91 98765 00000"
                            value={formData.emergencyPhone}
                            onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                            className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                      >
                        {saving ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Save Contact Information</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* ---------------- TAB 3: RESIDENTIAL ADDRESS (EDITABLE) ---------------- */}
                {activeTab === "address" && (
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Residential Address Records</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Provide your current and permanent residential addresses for official dispatches.
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                        Editable by You
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Current Address */}
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <MapPin size={12} className="text-blue-600" />
                          <span>Current Residential Address</span>
                        </label>
                        <textarea
                          rows={3}
                          placeholder="House/Flat No., Building, Street, City, State, PIN Code"
                          value={formData.currentAddress}
                          onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white p-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
                        />
                      </div>

                      {/* Permanent Address */}
                      <div className="flex flex-col gap-1.5 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <Home size={12} className="text-slate-400" />
                            <span>Permanent Home Address</span>
                          </label>
                          <button
                            type="button"
                            onClick={copyCurrentToPermanent}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            <Copy size={11} />
                            <span>Same as Current Address</span>
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          placeholder="Permanent ancestral/home address, district, state, PIN Code"
                          value={formData.permanentAddress}
                          onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white p-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                      >
                        {saving ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Saving Addresses...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Save Addresses</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* ---------------- TAB 4: IDENTITY & TAX (VERIFIED) ---------------- */}
                {activeTab === "identity" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Identity &amp; Tax Compliance</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Verified government credentials recorded for regulatory and payroll compliance.
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                        <ShieldCheck size={14} />
                        <span>Verified &amp; Locked</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* PAN Card */}
                      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-5 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <FileBadge2 size={15} className="text-blue-600" />
                              <span>Permanent Account Number (PAN)</span>
                            </span>
                            <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              Income Tax
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <span className="font-mono text-xl font-black text-slate-900 uppercase tracking-widest">
                              {profile?.personalDetails?.panNumber || "Not Recorded"}
                            </span>
                            {profile?.personalDetails?.panNumber && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(profile.personalDetails.panNumber, "pan")}
                                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                                title="Copy PAN Number"
                              >
                                {copiedField === "pan" ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>TDS &amp; Form 16 Tax Filing Enabled</span>
                        </div>
                      </div>

                      {/* Aadhaar / National ID */}
                      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-5 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <Shield size={15} className="text-emerald-600" />
                              <span>Aadhaar / National ID</span>
                            </span>
                            <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              UIDAI / National
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <span className="font-mono text-xl font-black text-slate-900 tracking-wider">
                              {profile?.personalDetails?.nationalId || "Not Recorded"}
                            </span>
                            {profile?.personalDetails?.nationalId && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(profile.personalDetails.nationalId, "aadhaar")}
                                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                                title="Copy Aadhaar Number"
                              >
                                {copiedField === "aadhaar" ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Identity Verified for Enterprise Records</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-500">
                      <Lock size={14} className="text-slate-400 shrink-0" />
                      <span>
                        Identity credentials are encrypted and locked. Any changes or re-verifications must be processed through the Super Administrator.
                      </span>
                    </div>
                  </div>
                )}

                {/* ---------------- TAB 5: BANK ACCOUNT (PAYROLL) ---------------- */}
                {activeTab === "banking" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Salary Disbursement Account</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Registered bank account for monthly salary credits and reimbursement disbursements.
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                        <CreditCard size={14} />
                        <span>Direct Deposit Active</span>
                      </span>
                    </div>

                    {/* Digital Passbook / Debit Style Card */}
                    <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

                      <div className="relative z-10 flex flex-col justify-between min-h-[170px]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 size={20} className="text-blue-400" />
                            <span className="text-base font-bold tracking-tight text-white">
                              {profile?.personalDetails?.bankDetails?.bankName || "Corporate Salary Bank"}
                            </span>
                          </div>
                          <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
                            Salary Direct Deposit
                          </span>
                        </div>

                        <div className="my-4">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                            Account Number
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-white">
                              {profile?.personalDetails?.bankDetails?.accountNumber || "•••• •••• ••••"}
                            </span>
                            {profile?.personalDetails?.bankDetails?.accountNumber && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(profile.personalDetails.bankDetails.accountNumber, "bankAcc")}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                                title="Copy Account Number"
                              >
                                {copiedField === "bankAcc" ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">IFSC Code</span>
                            <span className="font-mono font-bold text-white uppercase tracking-wider">
                              {profile?.personalDetails?.bankDetails?.ifscCode || "Not Recorded"}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Beneficiary</span>
                            <span className="font-bold text-white">{displayName}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-500">
                      <Lock size={14} className="text-slate-400 shrink-0" />
                      <span>
                        Bank account updates require verification against a cancelled cheque and must be approved by the Super Administrator.
                      </span>
                    </div>
                  </div>
                )}

                {/* ---------------- TAB 6: SUBMITTED DOCUMENTS ---------------- */}
                {activeTab === "documents" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Submitted Documents &amp; Verification</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Verification status of identity proof, educational certificates, and employment history.
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                        Official Dossier
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {/* 1. Aadhaar Card */}
                      <div className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/50 transition shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">Aadhaar Card Copy</span>
                            {aadhaar.isAvailable ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} />
                                <span>{aadhaar.status || "Verified & Available"}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={12} />
                                <span>Pending Submission</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>Aadhaar Number:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {aadhaar.number || profile?.personalDetails?.nationalId || "Not Recorded"}
                            </span>
                          </div>
                          {aadhaar.remarks && (
                            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 mt-1 border border-slate-100">
                              Remarks: {aadhaar.remarks}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. PAN Card */}
                      <div className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/50 transition shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">PAN Card Copy</span>
                            {pan.isAvailable ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} />
                                <span>{pan.status || "Verified & Available"}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={12} />
                                <span>Pending Submission</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>PAN Number:</span>
                            <span className="font-mono font-bold text-slate-800 uppercase">
                              {pan.number || profile?.personalDetails?.panNumber || "Not Recorded"}
                            </span>
                          </div>
                          {pan.remarks && (
                            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 mt-1 border border-slate-100">
                              Remarks: {pan.remarks}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Previous Experience Document */}
                      <div className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/50 transition shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">Relieving &amp; Experience Certificate</span>
                            {prevExp.isAvailable ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} />
                                <span>{prevExp.status || "Verified & Available"}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={12} />
                                <span>{prevExp.status || "Pending / Not Provided"}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-4">
                            <div>
                              Previous Employer: <span className="font-bold text-slate-800">{prevExp.companyName || "N/A"}</span>
                            </div>
                            <div>
                              Designation: <span className="font-bold text-slate-800">{prevExp.designation || "N/A"}</span>
                            </div>
                          </div>
                          {prevExp.remarks && (
                            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 mt-1 border border-slate-100">
                              Remarks: {prevExp.remarks}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. Original Document / Educational Certificate */}
                      <div className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/50 transition shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">Educational Degree / Degree Certificates</span>
                            {original.isAvailable ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} />
                                <span>{original.status || "Verified & Available"}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={12} />
                                <span>Pending Verification</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>Document Title:</span>
                            <span className="font-bold text-slate-800">
                              {original.docName || "Degree / Professional Qualification"}
                            </span>
                          </div>
                          {original.remarks && (
                            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 mt-1 border border-slate-100">
                              Remarks: {original.remarks}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 5. Cancelled Cheque */}
                      <div className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/50 transition shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">Cancelled Cheque / Bank Passbook Proof</span>
                            {cheque.isAvailable ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} />
                                <span>{cheque.status || "Verified & Available"}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={12} />
                                <span>Pending Submission</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-4">
                            <div>
                              Bank: <span className="font-bold text-slate-800">{cheque.bankName || profile?.personalDetails?.bankDetails?.bankName || "Not Recorded"}</span>
                            </div>
                            <div>
                              Cheque Ref: <span className="font-mono font-bold text-slate-800">{cheque.chequeNumber || "-"}</span>
                            </div>
                          </div>
                          {cheque.remarks && (
                            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 mt-1 border border-slate-100">
                              Remarks: {cheque.remarks}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-500">
                      <Lock size={14} className="text-slate-400 shrink-0" />
                      <span>
                        Document submissions and physical verification statuses are maintained by the Super Administrator.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
