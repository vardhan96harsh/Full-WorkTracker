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
  Building,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "../../api.js";

const TABS = [
  { id: "overview", label: "Employment Details", icon: User },
  { id: "contact", label: "Contact & Emergency", icon: Phone },
  { id: "address", label: "Residential Address", icon: Home },
  { id: "identity", label: "Identity & Tax", icon: FileBadge2 },
  { id: "banking", label: "Bank Account", icon: CreditCard },
  { id: "documents", label: "Submitted Documents", icon: FileText },
];

export default function MyProfileModal({ isOpen, onClose, auth, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    phone: "",
    alternateEmail: "",
    currentAddress: "",
    permanentAddress: "",
    emergencyName: "",
    emergencyRelation: "",
    emergencyPhone: "",
  });

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

      setSuccessMsg("Changes saved successfully.");
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

  // Prevent awkward duplication like "Super Admin superadmin"
  const isDuplicateRole =
    displayName.toLowerCase().replace(/\s+/g, "").includes(role.toLowerCase()) ||
    (isSuperAdmin && displayName.toLowerCase().includes("admin"));

  const isEditableTab = activeTab === "contact" || activeTab === "address";

  const docs = profile?.personalDetails?.documents || {};
  const aadhaar = docs.aadhaarDoc || {};
  const pan = docs.panDoc || {};
  const prevExp = docs.previousExperienceDoc || {};
  const original = docs.originalDoc || {};
  const cheque = docs.chequeDoc || {};

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-gray-900 overflow-hidden">
      {/* Top Application Bar */}
      <div className="h-16 border-b border-slate-200/90 bg-white px-5 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs">
        {/* Left Side: Back Button + Dynamic Title & Badges */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs group"
            title="Back to Dashboard"
          >
            <ArrowLeft size={14} className="text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>

          <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-2xs shrink-0 ${
                isSuperAdmin
                  ? "bg-purple-50 border-purple-200 text-purple-700"
                  : isAdmin
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              {isSuperAdmin ? (
                <ShieldAlert size={18} className="text-purple-600" />
              ) : isAdmin ? (
                <ShieldCheck size={18} className="text-blue-600" />
              ) : (
                <User size={18} className="text-slate-600" />
              )}
            </div>

            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                  {isSuperAdmin
                    ? "Super Admin Dossier"
                    : isAdmin
                    ? "Administrator Profile"
                    : "My Profile & Records"}
                </h1>
                {isSuperAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wide">
                    Root Access
                  </span>
                )}
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wide">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                {isSuperAdmin
                  ? "Security clearances, master account credentials & official profile"
                  : "Official corporate records, identity & verification documents"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Save Button (if editable tab) + User Profile Pill + Close 'X' Button */}
        <div className="flex items-center gap-2.5">
          {isEditableTab && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer ${
                isSuperAdmin
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          )}

          {/* User Profile Pill in Top-Right Corner */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 ${
                isSuperAdmin
                  ? "bg-gradient-to-br from-purple-600 to-indigo-700 text-white ring-2 ring-purple-100"
                  : isAdmin
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-2 ring-blue-100"
                  : "bg-slate-200 text-slate-700 ring-2 ring-slate-100"
              }`}
            >
              {initials}
            </div>

            <div className="text-left hidden sm:block leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">
                  {displayName}
                </span>
                {!isDuplicateRole ? (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize border ${
                      isSuperAdmin
                        ? "bg-purple-100 text-purple-700 border-purple-200"
                        : isAdmin
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {role}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                )}
              </div>
              {displayEmail && (
                <span className="text-[11px] text-slate-500 font-mono block">
                  {displayEmail}
                </span>
              )}
            </div>
          </div>

          {/* Close 'X' Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
            title="Close profile view (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body: Left Sidebar Menu + Right Content Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Menu */}
        <aside className="w-64 border-r border-slate-200 bg-slate-50/70 p-4 shrink-0 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                    isActive
                      ? isSuperAdmin
                        ? "bg-purple-600 text-white font-bold shadow-xs"
                        : "bg-blue-600 text-white font-bold shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={isActive ? "text-white" : "text-slate-400"} />
                    <span>{t.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick info & Bottom Left Logout */}
          <div className="mt-4 pt-4 border-t border-slate-200/80 px-2 space-y-2.5">
            {typeof onLogout === "function" && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                title="Sign out of WorkTracker"
              >
                <LogOut size={15} className="text-red-500" />
                <span>Logout</span>
              </button>
            )}
            <div className="text-[11px] text-slate-500">
              <span className="block font-semibold text-slate-700 mb-0.5">
                {isSuperAdmin ? "Super Admin Dossier" : "Official Profile"}
              </span>
              <span>
                {isSuperAdmin
                  ? "Root credentials and system-wide verification records."
                  : "Corporate credentials and submission verification records."}
              </span>
            </div>
          </div>
        </aside>

        {/* Right Main Content Pane */}
        <main className="flex-1 overflow-y-auto bg-gray-50/40 p-6 md:p-8">
          <div className="max-w-4xl mx-auto space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle size={14} className="shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md">
              <Check size={14} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-12 text-sm text-gray-500">
              <RefreshCw size={18} className="animate-spin mr-2 text-blue-600" />
              <span>Loading profile details...</span>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-2xs p-6">
              {/* TAB 1: EMPLOYMENT DETAILS */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Employment Information</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Official corporate records and account details.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm border-t border-gray-100 pt-4">
                    <div>
                      <span className="block text-xs font-medium text-gray-500">Full Name</span>
                      <span className="block font-medium text-gray-900 mt-0.5">
                        {profile?.name || auth?.user?.name}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-gray-500">Employee ID</span>
                      <span className="block font-mono font-bold text-slate-800 mt-0.5">
                        {profile?.employeeId || "Not Assigned"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-gray-500">Work Email</span>
                      <span className="block font-medium text-gray-900 mt-0.5">
                        {profile?.email || auth?.user?.email}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-gray-500">Designation</span>
                      <span className="block font-medium text-gray-900 mt-0.5">
                        {profile?.designation || "Not Assigned"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-gray-500">Account Role</span>
                      <span className="block font-medium text-gray-900 capitalize mt-0.5">
                        {role}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-gray-500">Gender</span>
                      <span className="block font-medium text-gray-900 mt-0.5">
                        {profile?.gender || "Not Specified"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-gray-500">Date of Birth</span>
                      <span className="block font-medium text-gray-900 mt-0.5">
                        {profile?.dob ? profile.dob.slice(0, 10) : "Not Recorded"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-gray-500">Date of Joining</span>
                      <span className="block font-semibold text-blue-700 mt-0.5">
                        {profile?.joiningDate ? profile.joiningDate.slice(0, 10) : "Not Recorded"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 text-xs text-gray-500">
                    {isSuperAdmin
                      ? "Master root account credentials and verified administrative records."
                      : "To request updates to official employment details, designation, or joining records, please contact Human Resources."}
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACT & EMERGENCY */}
              {activeTab === "contact" && (
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Contact Information</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Your direct telephone number, personal email, and emergency contact details.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Primary Mobile Phone
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Personal / Alternate Email
                      </label>
                      <input
                        type="email"
                        placeholder="personal.email@gmail.com"
                        value={formData.alternateEmail}
                        onChange={(e) => setFormData({ ...formData, alternateEmail: e.target.value })}
                        className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-5 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                      Emergency Contact Person
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={formData.emergencyName}
                          onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                          className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Relationship
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Spouse, Parent"
                          value={formData.emergencyRelation}
                          onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                          className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Emergency Phone
                        </label>
                        <input
                          type="text"
                          placeholder="+91 98765 00000"
                          value={formData.emergencyPhone}
                          onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                          className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {saving ? "Saving Changes..." : "Save Contact Information"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: RESIDENTIAL ADDRESS */}
              {activeTab === "address" && (
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Residential Addresses</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Your current residence and permanent address records.
                    </p>
                  </div>

                  <div className="space-y-4 border-t border-gray-100 pt-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Current Residential Address
                      </label>
                      <textarea
                        rows={3}
                        placeholder="House / Flat No., Street, City, State, PIN Code"
                        value={formData.currentAddress}
                        onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                        className="w-full p-2.5 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                      />
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Permanent Address
                        </label>
                        <button
                          type="button"
                          onClick={copyCurrentToPermanent}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          <Copy size={12} />
                          <span>Same as Current</span>
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Permanent home address, district, PIN Code"
                        value={formData.permanentAddress}
                        onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                        className="w-full p-2.5 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {saving ? "Saving Changes..." : "Save Addresses"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: IDENTITY & TAX */}
              {activeTab === "identity" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Identity &amp; Tax Documents</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Government tax and identification credentials recorded for payroll compliance.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50/50">
                      <span className="block text-xs font-medium text-gray-500">PAN Card Number</span>
                      <span className="block font-mono font-semibold text-gray-900 text-sm mt-1 uppercase">
                        {profile?.personalDetails?.panNumber || "Not Recorded"}
                      </span>
                    </div>

                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50/50">
                      <span className="block text-xs font-medium text-gray-500">Aadhaar / National ID</span>
                      <span className="block font-mono font-semibold text-gray-900 text-sm mt-1">
                        {profile?.personalDetails?.nationalId || "Not Recorded"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-gray-100 pt-4">
                    <Lock size={12} className="text-gray-400" />
                    <span>Identity numbers are verified and updated by the Super Administrator.</span>
                  </div>
                </div>
              )}

              {/* TAB 5: BANK ACCOUNT */}
              {activeTab === "banking" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Salary Bank Account</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Registered bank account used for monthly payroll disbursements.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50/50">
                      <span className="block text-xs font-medium text-gray-500">Bank Name</span>
                      <span className="block font-medium text-gray-900 text-sm mt-1">
                        {profile?.personalDetails?.bankDetails?.bankName || "Not Recorded"}
                      </span>
                    </div>

                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50/50">
                      <span className="block text-xs font-medium text-gray-500">Account Number</span>
                      <span className="block font-mono font-medium text-gray-900 text-sm mt-1">
                        {profile?.personalDetails?.bankDetails?.accountNumber || "Not Recorded"}
                      </span>
                    </div>

                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50/50">
                      <span className="block text-xs font-medium text-gray-500">IFSC Code</span>
                      <span className="block font-mono font-medium text-gray-900 text-sm mt-1 uppercase">
                        {profile?.personalDetails?.bankDetails?.ifscCode || "Not Recorded"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-gray-100 pt-4">
                    <Lock size={12} className="text-gray-400" />
                    <span>Bank account modifications are handled directly through Super Admin authorization.</span>
                  </div>
                </div>
              )}

              {/* TAB 6: SUBMITTED DOCUMENTS (EMPLOYEE VIEW) */}
              {activeTab === "documents" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Submitted Documents &amp; Verification</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Official records, document numbers, and submission verification status.
                    </p>
                  </div>

                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    {/* 1. Aadhaar Card */}
                    <div className="p-4 rounded-md border border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">Aadhaar Card</span>
                          {aadhaar.isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              <span>{aadhaar.status || "Available"}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} />
                              <span>Pending Submission</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <span>Aadhaar Number:</span>
                          <span className="font-mono font-medium text-gray-900">
                            {aadhaar.number || profile?.personalDetails?.nationalId || "Not Recorded"}
                          </span>
                        </div>
                        {aadhaar.remarks && (
                          <div className="text-[11px] text-gray-500">
                            Remarks: {aadhaar.remarks}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. PAN Card */}
                    <div className="p-4 rounded-md border border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">PAN Card</span>
                          {pan.isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              <span>{pan.status || "Available"}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} />
                              <span>Pending Submission</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <span>PAN Number:</span>
                          <span className="font-mono font-medium text-gray-900 uppercase">
                            {pan.number || profile?.personalDetails?.panNumber || "Not Recorded"}
                          </span>
                        </div>
                        {pan.remarks && (
                          <div className="text-[11px] text-gray-500">
                            Remarks: {pan.remarks}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Previous Experience Document */}
                    <div className="p-4 rounded-md border border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">Previous Experience / Relieving Letter</span>
                          {prevExp.isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              <span>{prevExp.status || "Available"}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} />
                              <span>{prevExp.status || "Pending / Not Provided"}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-4">
                          <div>
                            Company: <span className="font-medium text-gray-900">{prevExp.companyName || "N/A"}</span>
                          </div>
                          <div>
                            Designation: <span className="font-medium text-gray-900">{prevExp.designation || "N/A"}</span>
                          </div>
                        </div>
                        {prevExp.remarks && (
                          <div className="text-[11px] text-gray-500">
                            Remarks: {prevExp.remarks}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Original Document */}
                    <div className="p-4 rounded-md border border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">Original Document / Degree Certificate</span>
                          {original.isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              <span>{original.status || "Available"}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} />
                              <span>Pending Verification</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <span>Document Name:</span>
                          <span className="font-medium text-gray-900">
                            {original.docName || "Educational / Degree Certificates"}
                          </span>
                        </div>
                        {original.remarks && (
                          <div className="text-[11px] text-gray-500">
                            Remarks: {original.remarks}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. Cancelled Cheque */}
                    <div className="p-4 rounded-md border border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">Cancelled Cheque / Bank Proof</span>
                          {cheque.isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              <span>{cheque.status || "Available"}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} />
                              <span>Pending Submission</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-4">
                          <div>
                            Bank: <span className="font-medium text-gray-900">{cheque.bankName || profile?.personalDetails?.bankDetails?.bankName || "Not Recorded"}</span>
                          </div>
                          <div>
                            Cheque / Ref: <span className="font-mono font-medium text-gray-900">{cheque.chequeNumber || "-"}</span>
                          </div>
                        </div>
                        {cheque.remarks && (
                          <div className="text-[11px] text-gray-500">
                            Remarks: {cheque.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-gray-100 pt-4">
                    <Lock size={12} className="text-gray-400" />
                    <span>Document submissions and physical verifications are managed by the Super Administrator.</span>
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
