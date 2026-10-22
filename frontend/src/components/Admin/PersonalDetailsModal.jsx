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
  FileText,
  Wallet,
  ShieldAlert,
  Calendar,
  Lock,
  Building,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
  Plus,
  Trash2,
  Edit3,
  History,
} from "lucide-react";
import { api } from "../../api.js";

const TABS = [
  { id: "overview", label: "Employment Details", icon: User },
  { id: "contact", label: "Contact & Emergency", icon: Phone },
  { id: "address", label: "Residential Address", icon: Home },
  { id: "identity", label: "Identity & Tax", icon: FileBadge2 },
  { id: "banking", label: "Bank Account", icon: CreditCard },
  { id: "documents", label: "Document Verification", icon: FileText },
  { id: "salary", label: "Salary & Increments", icon: Wallet },
];

export default function PersonalDetailsModal({
  isOpen,
  onClose,
  user,
  authToken,
  onSaved,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    // Joining Date
    joiningDate: "",

    // Contact & Emergency
    phone: "",
    alternateEmail: "",
    emergencyName: "",
    emergencyRelation: "",
    emergencyPhone: "",

    // Address
    currentAddress: "",
    permanentAddress: "",

    // Identity & Banking
    panNumber: "",
    nationalId: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",

    // Documents (Super Admin Audit)
    // 1. Offer Letter (Super Admin Exclusive)
    docOfferLetterAvailable: false,
    docOfferLetterStatus: "Pending",
    docOfferLetterRemarks: "",

    // 2. 2 Photos (Super Admin Exclusive)
    docTwoPhotosAvailable: false,
    docTwoPhotosStatus: "Pending",
    docTwoPhotosRemarks: "",

    // 3. Aadhaar Doc (Self + Super Admin)
    docAadhaarNumber: "",
    docAadhaarAvailable: false,
    docAadhaarStatus: "Pending",
    docAadhaarRemarks: "",

    // 4. PAN Doc (Self + Super Admin)
    docPanNumber: "",
    docPanAvailable: false,
    docPanStatus: "Pending",
    docPanRemarks: "",

    // 5. Previous Experience Doc (Self + Super Admin)
    docExpCompanyName: "",
    docExpDesignation: "",
    docExpAvailable: false,
    docExpStatus: "Pending",
    docExpRemarks: "",

    // 6. Original Documents (Self + Super Admin)
    docOriginalName: "",
    docOriginalAvailable: false,
    docOriginalStatus: "Pending",
    docOriginalRemarks: "",

    // 7. Cancelled Cheque (Self + Super Admin)
    docChequeBankName: "",
    docChequeNumber: "",
    docChequeAvailable: false,
    docChequeStatus: "Pending",
    docChequeRemarks: "",

    // Salary & Increments (Strictly Super Admin Only)
    salaryStartDate: "",
    salaryCurrentSalary: "",
    salaryLastSalary: "",
    salaryLastIncrementDate: "",
    salaryIncrementDetails: "",
    salaryAccount: "",
    salaryRemarks: "",
    increments: [],
  });

  // State for adding or editing an increment entry
  const [incDraft, setIncDraft] = useState({
    incrementDate: "",
    previousSalary: "",
    newSalary: "",
    hikePercentage: "",
    reason: "",
    remarks: "",
  });
  const [editingIncIndex, setEditingIncIndex] = useState(-1);

  useEffect(() => {
    if (user && isOpen) {
      const p = user.personalDetails || {};
      const em = p.emergencyContact || {};
      const b = p.bankDetails || {};
      const docs = p.documents || {};
      const sal = p.salaryDetails || {};

      const offer = docs.offerLetter || {};
      const photos = docs.twoPhotos || {};
      const aadh = docs.aadhaarDoc || {};
      const pan = docs.panDoc || {};
      const exp = docs.previousExperienceDoc || {};
      const orig = docs.originalDoc || {};
      const chq = docs.chequeDoc || {};

      const safeDateSlice = (val) => {
        if (!val) return "";
        if (typeof val === "string") return val.slice(0, 10);
        if (val instanceof Date && !isNaN(val.getTime())) {
          return val.toISOString().slice(0, 10);
        }
        return "";
      };

      const existingIncrements = Array.isArray(sal.increments)
        ? sal.increments.map((inc) => ({
            incrementDate: safeDateSlice(inc.incrementDate),
            previousSalary: inc.previousSalary || "",
            newSalary: inc.newSalary || "",
            hikePercentage: inc.hikePercentage || "",
            reason: inc.reason || "",
            remarks: inc.remarks || "",
          }))
        : [];

      setFormData({
        joiningDate: safeDateSlice(user.joiningDate),

        phone: p.phone || "",
        alternateEmail: p.alternateEmail || "",
        emergencyName: em.name || "",
        emergencyRelation: em.relation || "",
        emergencyPhone: em.phone || "",
        currentAddress: p.currentAddress || "",
        permanentAddress: p.permanentAddress || "",
        panNumber: p.panNumber || "",
        nationalId: p.nationalId || "",
        bankName: b.bankName || "",
        accountNumber: b.accountNumber || "",
        ifscCode: b.ifscCode || "",

        // Documents
        docOfferLetterAvailable: Boolean(offer.isAvailable),
        docOfferLetterStatus: offer.status || "Pending",
        docOfferLetterRemarks: offer.remarks || "",

        docTwoPhotosAvailable: Boolean(photos.isAvailable),
        docTwoPhotosStatus: photos.status || "Pending",
        docTwoPhotosRemarks: photos.remarks || "",

        docAadhaarNumber: aadh.number || p.nationalId || "",
        docAadhaarAvailable: Boolean(aadh.isAvailable),
        docAadhaarStatus: aadh.status || "Pending",
        docAadhaarRemarks: aadh.remarks || "",

        docPanNumber: pan.number || p.panNumber || "",
        docPanAvailable: Boolean(pan.isAvailable),
        docPanStatus: pan.status || "Pending",
        docPanRemarks: pan.remarks || "",

        docExpCompanyName: exp.companyName || "",
        docExpDesignation: exp.designation || "",
        docExpAvailable: Boolean(exp.isAvailable),
        docExpStatus: exp.status || "Pending",
        docExpRemarks: exp.remarks || "",

        docOriginalName: orig.docName || "",
        docOriginalAvailable: Boolean(orig.isAvailable),
        docOriginalStatus: orig.status || "Pending",
        docOriginalRemarks: orig.remarks || "",

        docChequeBankName: chq.bankName || b.bankName || "",
        docChequeNumber: chq.chequeNumber || "",
        docChequeAvailable: Boolean(chq.isAvailable),
        docChequeStatus: chq.status || "Pending",
        docChequeRemarks: chq.remarks || "",

        // Salary
        salaryStartDate: safeDateSlice(sal.salaryStartDate),
        salaryCurrentSalary: sal.currentSalary || "",
        salaryLastSalary: sal.lastSalary || "",
        salaryLastIncrementDate: safeDateSlice(sal.lastIncrementDate),
        salaryIncrementDetails: sal.incrementDetails || "",
        salaryAccount: sal.salaryAccount || b.accountNumber || "",
        salaryRemarks: sal.remarks || "",
        increments: existingIncrements,
      });

      setIncDraft({
        incrementDate: "",
        previousSalary: "",
        newSalary: "",
        hikePercentage: "",
        reason: "",
        remarks: "",
      });
      setEditingIncIndex(-1);
      setActiveTab("overview");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  function handleSaveIncrementDraft(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!incDraft.incrementDate && !incDraft.newSalary) {
      setErrorMsg("Please enter at least the Increment Date or Revised Salary.");
      return;
    }
    setErrorMsg("");

    const updatedInc = {
      incrementDate: incDraft.incrementDate,
      previousSalary: incDraft.previousSalary.trim(),
      newSalary: incDraft.newSalary.trim(),
      hikePercentage: incDraft.hikePercentage.trim(),
      reason: incDraft.reason.trim(),
      remarks: incDraft.remarks.trim(),
    };

    let newIncrements = [...(formData.increments || [])];
    if (editingIncIndex >= 0) {
      newIncrements[editingIncIndex] = updatedInc;
    } else {
      newIncrements.push(updatedInc);
    }

    // Sort increments chronologically by date if available
    newIncrements.sort((a, b) => {
      if (!a.incrementDate) return 1;
      if (!b.incrementDate) return -1;
      return new Date(a.incrementDate) - new Date(b.incrementDate);
    });

    // Auto-update latest summary fields with most recent increment if applicable
    const latest = newIncrements[newIncrements.length - 1];
    setFormData((prev) => ({
      ...prev,
      increments: newIncrements,
      salaryCurrentSalary: latest?.newSalary || prev.salaryCurrentSalary,
      salaryLastSalary: latest?.previousSalary || prev.salaryLastSalary,
      salaryLastIncrementDate: latest?.incrementDate || prev.salaryLastIncrementDate,
      salaryIncrementDetails: latest?.hikePercentage
        ? `${latest.hikePercentage}${latest.reason ? " - " + latest.reason : ""}`
        : (latest?.reason || prev.salaryIncrementDetails),
    }));

    setIncDraft({
      incrementDate: "",
      previousSalary: "",
      newSalary: "",
      hikePercentage: "",
      reason: "",
      remarks: "",
    });
    setEditingIncIndex(-1);
  }

  function handleEditIncrement(index) {
    const target = formData.increments[index];
    if (target) {
      setIncDraft({
        incrementDate: target.incrementDate || "",
        previousSalary: target.previousSalary || "",
        newSalary: target.newSalary || "",
        hikePercentage: target.hikePercentage || "",
        reason: target.reason || "",
        remarks: target.remarks || "",
      });
      setEditingIncIndex(index);
    }
  }

  function handleDeleteIncrement(index) {
    const updated = (formData.increments || []).filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      increments: updated,
    }));
    if (editingIncIndex === index) {
      setIncDraft({
        incrementDate: "",
        previousSalary: "",
        newSalary: "",
        hikePercentage: "",
        reason: "",
        remarks: "",
      });
      setEditingIncIndex(-1);
    } else if (editingIncIndex > index) {
      setEditingIncIndex((prev) => prev - 1);
    }
  }

  function handleCancelEditIncrement() {
    setIncDraft({
      incrementDate: "",
      previousSalary: "",
      newSalary: "",
      hikePercentage: "",
      reason: "",
      remarks: "",
    });
    setEditingIncIndex(-1);
  }

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const userId = user._id || user.id;

    const payload = {
      joiningDate: formData.joiningDate || null,
      personalDetails: {
        phone: formData.phone.trim(),
        alternateEmail: formData.alternateEmail.trim(),
        emergencyContact: {
          name: formData.emergencyName.trim(),
          relation: formData.emergencyRelation.trim(),
          phone: formData.emergencyPhone.trim(),
        },
        currentAddress: formData.currentAddress.trim(),
        permanentAddress: formData.permanentAddress.trim(),
        panNumber: formData.panNumber.trim().toUpperCase(),
        nationalId: formData.nationalId.trim(),
        bankDetails: {
          bankName: formData.bankName.trim(),
          accountNumber: formData.accountNumber.trim(),
          ifscCode: formData.ifscCode.trim().toUpperCase(),
        },
        documents: {
          offerLetter: {
            isAvailable: Boolean(formData.docOfferLetterAvailable),
            status: formData.docOfferLetterStatus,
            remarks: formData.docOfferLetterRemarks.trim(),
          },
          twoPhotos: {
            isAvailable: Boolean(formData.docTwoPhotosAvailable),
            status: formData.docTwoPhotosStatus,
            remarks: formData.docTwoPhotosRemarks.trim(),
          },
          aadhaarDoc: {
            number: formData.docAadhaarNumber.trim(),
            isAvailable: Boolean(formData.docAadhaarAvailable),
            status: formData.docAadhaarStatus,
            remarks: formData.docAadhaarRemarks.trim(),
          },
          panDoc: {
            number: formData.docPanNumber.trim().toUpperCase(),
            isAvailable: Boolean(formData.docPanAvailable),
            status: formData.docPanStatus,
            remarks: formData.docPanRemarks.trim(),
          },
          previousExperienceDoc: {
            companyName: formData.docExpCompanyName.trim(),
            designation: formData.docExpDesignation.trim(),
            isAvailable: Boolean(formData.docExpAvailable),
            status: formData.docExpStatus,
            remarks: formData.docExpRemarks.trim(),
          },
          originalDoc: {
            docName: formData.docOriginalName.trim(),
            isAvailable: Boolean(formData.docOriginalAvailable),
            status: formData.docOriginalStatus,
            remarks: formData.docOriginalRemarks.trim(),
          },
          chequeDoc: {
            bankName: formData.docChequeBankName.trim(),
            chequeNumber: formData.docChequeNumber.trim(),
            isAvailable: Boolean(formData.docChequeAvailable),
            status: formData.docChequeStatus,
            remarks: formData.docChequeRemarks.trim(),
          },
        },
        salaryDetails: {
          salaryStartDate: formData.salaryStartDate || null,
          currentSalary: formData.salaryCurrentSalary.trim(),
          lastSalary: formData.salaryLastSalary.trim(),
          lastIncrementDate: formData.salaryLastIncrementDate || null,
          incrementDetails: formData.salaryIncrementDetails.trim(),
          salaryAccount: formData.salaryAccount.trim(),
          remarks: formData.salaryRemarks.trim(),
          increments: (formData.increments || []).map((inc) => ({
            incrementDate: inc.incrementDate ? new Date(inc.incrementDate) : null,
            previousSalary: (inc.previousSalary || "").trim(),
            newSalary: (inc.newSalary || "").trim(),
            hikePercentage: (inc.hikePercentage || "").trim(),
            reason: (inc.reason || "").trim(),
            remarks: (inc.remarks || "").trim(),
          })),
        },
      },
    };

    try {
      const updated = await api(`/api/users/${userId}`, {
        method: "PUT",
        token: authToken,
        body: payload,
      });

      setSuccessMsg(`User records for "${user.name}" saved successfully.`);
      if (typeof onSaved === "function") {
        onSaved(updated);
      }
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error("Failed to update user details:", err);
      setErrorMsg(err?.message || "Failed to save details.");
    } finally {
      setLoading(false);
    }
  }

  function copyCurrentToPermanent() {
    setFormData((prev) => ({
      ...prev,
      permanentAddress: prev.currentAddress,
    }));
  }

  const role = user.role || "employee";
  const initials = (user.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isEditableTab = activeTab !== "overview";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-gray-900 overflow-hidden">
      {/* Top Application Bar */}
      <div className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Users</span>
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <span className="text-sm font-semibold text-gray-900">User Management</span>
          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">
            Super Admin Access
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-700 text-white text-xs font-medium rounded-md hover:bg-purple-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {loading ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={13} />
                <span>Save All Changes</span>
              </>
            )}
          </button>

          {/* User Name & Avatar in Top-Right Corner */}
          <div className="flex items-center gap-2.5 px-2.5 py-1 rounded-md bg-purple-50/60 border border-purple-200/80">
            <div className="w-7 h-7 rounded-full bg-purple-100 border border-purple-200 text-purple-800 font-semibold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="text-left hidden sm:block leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-900">{user.name}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200 capitalize">
                  {role}
                </span>
              </div>
              <span className="text-[11px] text-gray-500 block">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body: Left Sidebar Menu + Right Content Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Menu */}
        <aside className="w-64 border-r border-gray-200 bg-gray-50/70 p-4 shrink-0 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                    isActive
                      ? "bg-purple-700 text-white font-semibold shadow-xs"
                      : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={isActive ? "text-white" : "text-gray-400"} />
                    <span>{t.label}</span>
                  </div>
                  {t.id === "salary" && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                        isActive
                          ? "bg-purple-800 text-purple-100 border border-purple-600"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      Confidential
                    </span>
                  )}
                  {t.id === "documents" && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                        isActive
                          ? "bg-purple-800 text-purple-100 border border-purple-600"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      Audit
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick info chip at bottom of sidebar */}
          <div className="mt-4 pt-4 border-t border-gray-200/80 px-2 text-[11px] text-gray-500">
            <span className="block font-semibold text-gray-700 mb-0.5">Confidential Records</span>
            <span>All modifications are logged under Super Admin credentials.</span>
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

          <div className="bg-white border border-gray-200 rounded-lg shadow-2xs p-6">
            {/* TAB 1: EMPLOYMENT DETAILS */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Employment Information</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Official employment records, designation, joining date, and corporate credentials.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm border-t border-gray-100 pt-4">
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Employee Name</span>
                    <span className="block font-medium text-gray-900 mt-0.5">{user.name}</span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-gray-500">Employee ID</span>
                    <span className="block font-mono font-bold text-slate-800 mt-0.5">
                      {user.employeeId || "Not Assigned"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-gray-500">Work Email</span>
                    <span className="block font-medium text-gray-900 mt-0.5">{user.email}</span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-gray-500">Designation</span>
                    <span className="block font-medium text-gray-900 mt-0.5">
                      {user.designation || "Not Assigned"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-gray-500">System Role</span>
                    <span className="block font-medium text-gray-900 capitalize mt-0.5">{role}</span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-gray-500">Gender</span>
                    <span className="block font-medium text-gray-900 mt-0.5">
                      {user.gender || "Not Specified"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-gray-500">Date of Birth</span>
                    <span className="block font-medium text-gray-900 mt-0.5">
                      {user.dob ? user.dob.slice(0, 10) : "Not Recorded"}
                    </span>
                  </div>

                  <div className="col-span-full md:col-span-1 border-t md:border-t-0 pt-3 md:pt-0">
                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      Joining Date (User &amp; Admin Visible)
                    </label>
                    <input
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                      className="w-full h-9 px-3 rounded-md border border-purple-300 text-sm font-medium text-gray-900 bg-purple-50/20 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                    />
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Editable by Super Admin; visible to both User and Admins.
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-700 text-white text-xs font-medium rounded-md hover:bg-purple-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? "Saving..." : "Save Joining Date"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: CONTACT & EMERGENCY */}
            {activeTab === "contact" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Contact &amp; Emergency Details</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Direct communication phone, alternate personal email, and emergency contact person.
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
                      className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
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
                      className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
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
                        className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
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
                        className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
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
                        className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-purple-700 text-white text-xs font-medium rounded-md hover:bg-purple-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? "Saving Changes..." : "Save Contact Details"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: RESIDENTIAL ADDRESS */}
            {activeTab === "address" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Residential Addresses</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Employee's current living residence and permanent home address.
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
                      className="w-full p-2.5 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 resize-y"
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
                        className="inline-flex items-center gap-1 text-xs text-purple-700 hover:text-purple-800 font-medium cursor-pointer"
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
                      className="w-full p-2.5 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 resize-y"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-purple-700 text-white text-xs font-medium rounded-md hover:bg-purple-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? "Saving Changes..." : "Save Addresses"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: IDENTITY & TAX */}
            {activeTab === "identity" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Government Identity &amp; Tax Documents</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Official PAN number and Aadhaar / National ID credentials.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      PAN Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ABCDE1234F"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                      className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm font-mono font-medium text-gray-900 uppercase focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Aadhaar / National ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1234-5678-9012"
                      value={formData.nationalId}
                      onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                      className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm font-mono font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-purple-700 text-white text-xs font-medium rounded-md hover:bg-purple-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? "Saving Changes..." : "Save Identity & Tax"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 5: BANK ACCOUNT */}
            {activeTab === "banking" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Salary Bank Account</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Registered bank account details for monthly salary disbursements.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, SBI"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5010023456789"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      IFSC / Branch Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm font-mono font-medium text-gray-900 uppercase focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-purple-700 text-white text-xs font-medium rounded-md hover:bg-purple-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? "Saving Changes..." : "Save Bank Details"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 6: DOCUMENT VERIFICATION CHECKLIST (SUPER ADMIN) */}
            {activeTab === "documents" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Document Verification &amp; Audit Checklist</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Track submission and verification status for all mandatory joining documents.
                  </p>
                </div>

                {/* Section A: Super Admin Exclusive (Hidden from User) */}
                <div className="p-4 rounded-lg bg-purple-50/50 border border-purple-200/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} className="text-purple-700" />
                    <span className="text-xs font-semibold text-purple-900 uppercase tracking-wide">
                      Super Admin Exclusive Verification (Strictly Hidden from User)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Offer Letter */}
                    <div className="bg-white p-3.5 rounded-md border border-gray-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-900">1. Offer Letter</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.docOfferLetterAvailable}
                            onChange={(e) => {
                              const avail = e.target.checked;
                              setFormData({
                                ...formData,
                                docOfferLetterAvailable: avail,
                                docOfferLetterStatus: avail ? "Available" : "Pending",
                              });
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Available</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Status</label>
                          <select
                            value={formData.docOfferLetterStatus}
                            onChange={(e) => setFormData({ ...formData, docOfferLetterStatus: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          >
                            <option value="Available">Available</option>
                            <option value="Pending">Pending</option>
                            <option value="Not Required">Not Required</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Remarks</label>
                          <input
                            type="text"
                            placeholder="Signed copy received..."
                            value={formData.docOfferLetterRemarks}
                            onChange={(e) => setFormData({ ...formData, docOfferLetterRemarks: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. Two Photos */}
                    <div className="bg-white p-3.5 rounded-md border border-gray-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-900">2. Passport Photos (2 Photos)</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.docTwoPhotosAvailable}
                            onChange={(e) => {
                              const avail = e.target.checked;
                              setFormData({
                                ...formData,
                                docTwoPhotosAvailable: avail,
                                docTwoPhotosStatus: avail ? "Available" : "Pending",
                              });
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>2 Photos Available</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Status</label>
                          <select
                            value={formData.docTwoPhotosStatus}
                            onChange={(e) => setFormData({ ...formData, docTwoPhotosStatus: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          >
                            <option value="Available">Available</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Remarks</label>
                          <input
                            type="text"
                            placeholder="Physical copies submitted..."
                            value={formData.docTwoPhotosRemarks}
                            onChange={(e) => setFormData({ ...formData, docTwoPhotosRemarks: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Standard Documents (User can view own data) */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                      Identity &amp; Background Documents (Employee can view their own document status &amp; numbers)
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* 3. Aadhaar Document */}
                    <div className="p-3.5 rounded-md border border-gray-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">3. Aadhaar Card</span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.docAadhaarAvailable}
                            onChange={(e) => {
                              const avail = e.target.checked;
                              setFormData({
                                ...formData,
                                docAadhaarAvailable: avail,
                                docAadhaarStatus: avail ? "Available" : "Pending",
                              });
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Available</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Aadhaar Number</label>
                          <input
                            type="text"
                            placeholder="1234-5678-9012"
                            value={formData.docAadhaarNumber}
                            onChange={(e) => setFormData({ ...formData, docAadhaarNumber: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Status</label>
                          <select
                            value={formData.docAadhaarStatus}
                            onChange={(e) => setFormData({ ...formData, docAadhaarStatus: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          >
                            <option value="Available">Available</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Remarks</label>
                          <input
                            type="text"
                            placeholder="Verified with original..."
                            value={formData.docAadhaarRemarks}
                            onChange={(e) => setFormData({ ...formData, docAadhaarRemarks: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4. PAN Document */}
                    <div className="p-3.5 rounded-md border border-gray-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">4. PAN Card</span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.docPanAvailable}
                            onChange={(e) => {
                              const avail = e.target.checked;
                              setFormData({
                                ...formData,
                                docPanAvailable: avail,
                                docPanStatus: avail ? "Available" : "Pending",
                              });
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Available</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">PAN Number</label>
                          <input
                            type="text"
                            placeholder="ABCDE1234F"
                            value={formData.docPanNumber}
                            onChange={(e) => setFormData({ ...formData, docPanNumber: e.target.value.toUpperCase() })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 uppercase focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Status</label>
                          <select
                            value={formData.docPanStatus}
                            onChange={(e) => setFormData({ ...formData, docPanStatus: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          >
                            <option value="Available">Available</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Remarks</label>
                          <input
                            type="text"
                            placeholder="e-PAN copy..."
                            value={formData.docPanRemarks}
                            onChange={(e) => setFormData({ ...formData, docPanRemarks: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 5. Previous Experience Document */}
                    <div className="p-3.5 rounded-md border border-gray-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">5. Previous Experience / Relieving Letter</span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.docExpAvailable}
                            onChange={(e) => {
                              const avail = e.target.checked;
                              setFormData({
                                ...formData,
                                docExpAvailable: avail,
                                docExpStatus: avail ? "Available" : "Pending",
                              });
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Available</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Previous Company Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Infosys Ltd"
                            value={formData.docExpCompanyName}
                            onChange={(e) => setFormData({ ...formData, docExpCompanyName: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Designation</label>
                          <input
                            type="text"
                            placeholder="e.g. Senior Associate"
                            value={formData.docExpDesignation}
                            onChange={(e) => setFormData({ ...formData, docExpDesignation: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Status</label>
                          <select
                            value={formData.docExpStatus}
                            onChange={(e) => setFormData({ ...formData, docExpStatus: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          >
                            <option value="Available">Available</option>
                            <option value="Pending">Pending</option>
                            <option value="Fresher / N/A">Fresher / N/A</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Remarks</label>
                          <input
                            type="text"
                            placeholder="Relieving &amp; Service letter verified..."
                            value={formData.docExpRemarks}
                            onChange={(e) => setFormData({ ...formData, docExpRemarks: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 6. Original Documents */}
                    <div className="p-3.5 rounded-md border border-gray-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">6. Original Document / Educational Certificate</span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.docOriginalAvailable}
                            onChange={(e) => {
                              const avail = e.target.checked;
                              setFormData({
                                ...formData,
                                docOriginalAvailable: avail,
                                docOriginalStatus: avail ? "Available" : "Pending",
                              });
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Available</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Document Name / Type</label>
                          <input
                            type="text"
                            placeholder="e.g. Degree Certificate, 10th Marksheet"
                            value={formData.docOriginalName}
                            onChange={(e) => setFormData({ ...formData, docOriginalName: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Status</label>
                          <select
                            value={formData.docOriginalStatus}
                            onChange={(e) => setFormData({ ...formData, docOriginalStatus: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          >
                            <option value="Available">Available</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Remarks</label>
                          <input
                            type="text"
                            placeholder="Physical verified on joining day..."
                            value={formData.docOriginalRemarks}
                            onChange={(e) => setFormData({ ...formData, docOriginalRemarks: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 7. Cancelled Cheque */}
                    <div className="p-3.5 rounded-md border border-gray-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">7. Cancelled Cheque / Bank Proof</span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.docChequeAvailable}
                            onChange={(e) => {
                              const avail = e.target.checked;
                              setFormData({
                                ...formData,
                                docChequeAvailable: avail,
                                docChequeStatus: avail ? "Available" : "Pending",
                              });
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Available</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Bank Name</label>
                          <input
                            type="text"
                            placeholder="e.g. HDFC Bank"
                            value={formData.docChequeBankName}
                            onChange={(e) => setFormData({ ...formData, docChequeBankName: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Cheque / Account Number</label>
                          <input
                            type="text"
                            placeholder="e.g. 000123 / 50100..."
                            value={formData.docChequeNumber}
                            onChange={(e) => setFormData({ ...formData, docChequeNumber: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Status</label>
                          <select
                            value={formData.docChequeStatus}
                            onChange={(e) => setFormData({ ...formData, docChequeStatus: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          >
                            <option value="Available">Available</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">Remarks</label>
                          <input
                            type="text"
                            placeholder="Cheque leaf submitted..."
                            value={formData.docChequeRemarks}
                            onChange={(e) => setFormData({ ...formData, docChequeRemarks: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-purple-700 text-white text-xs font-medium rounded-md hover:bg-purple-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? "Saving Changes..." : "Save Document Checklist"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 7: SALARY & INCREMENTS (STRICTLY SUPER ADMIN ONLY) */}
            {activeTab === "salary" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Compensation &amp; Salary Increment History</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Confidential salary structures, historical increment logs, revision details, and payout accounts.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    <Lock size={13} />
                    <span>User Strictly Cannot View</span>
                  </div>
                </div>

                {/* Section 1: Current Compensation Summary */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Salary Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.salaryStartDate}
                        onChange={(e) => setFormData({ ...formData, salaryStartDate: e.target.value })}
                        className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Current Active Salary
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ₹55,000 / month or 6.6 LPA"
                        value={formData.salaryCurrentSalary}
                        onChange={(e) => setFormData({ ...formData, salaryCurrentSalary: e.target.value })}
                        className="w-full h-9 px-3 rounded-md border border-purple-300 text-sm font-bold text-purple-900 bg-purple-50/20 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Salary Disbursement Account
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC Bank - A/C 5010023456789"
                        value={formData.salaryAccount}
                        onChange={(e) => setFormData({ ...formData, salaryAccount: e.target.value })}
                        className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                      />
                    </div>
                  </div>

                  {/* Section 2: Multiple Increment History Logs */}
                  <div className="pt-3 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-purple-700" />
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Multiple Increment Records &amp; History
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          {formData.increments?.length || 0} Records
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500">
                        Tracks 5-6+ past increments with exact revision dates and amounts.
                      </span>
                    </div>

                    {/* Increments Table / List */}
                    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                      {(!formData.increments || formData.increments.length === 0) ? (
                        <div className="p-6 text-center text-xs text-gray-500">
                          <History size={24} className="mx-auto text-gray-400 mb-1.5 opacity-60" />
                          <span>No past increments recorded yet. Add the employee's past increments using the form below.</span>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left text-xs divide-y divide-gray-200">
                            <thead className="bg-gray-50 text-[11px] font-semibold text-gray-600">
                              <tr>
                                <th className="px-3 py-2">#</th>
                                <th className="px-3 py-2">Increment Date</th>
                                <th className="px-3 py-2">Previous Salary</th>
                                <th className="px-3 py-2">Revised New Salary</th>
                                <th className="px-3 py-2">Hike % / Amount</th>
                                <th className="px-3 py-2">Revision Reason / Appraisal</th>
                                <th className="px-3 py-2">Remarks</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium">
                              {formData.increments.map((inc, idx) => (
                                <tr key={idx} className="hover:bg-purple-50/30 transition">
                                  <td className="px-3 py-2.5 text-gray-400 font-mono">
                                    {idx + 1}
                                  </td>
                                  <td className="px-3 py-2.5 text-gray-900 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 font-semibold text-purple-900">
                                      <Calendar size={12} className="text-purple-600" />
                                      {inc.incrementDate || "Not Specified"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-gray-600">
                                    {inc.previousSalary || "-"}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {inc.newSalary || "-"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold text-purple-700">
                                    {inc.hikePercentage || "-"}
                                  </td>
                                  <td className="px-3 py-2.5 text-gray-800">
                                    {inc.reason || "-"}
                                  </td>
                                  <td className="px-3 py-2.5 text-gray-500 max-w-xs truncate">
                                    {inc.remarks || "-"}
                                  </td>
                                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleEditIncrement(idx)}
                                        className="p-1 rounded text-gray-500 hover:text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                                        title="Edit this increment"
                                      >
                                        <Edit3 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteIncrement(idx)}
                                        className="p-1 rounded text-gray-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                                        title="Delete this increment"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Inline Form to Add / Edit an Increment Entry */}
                    <div className="bg-purple-50/40 border border-purple-200/70 rounded-md p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                          <Plus size={14} className="text-purple-700" />
                          {editingIncIndex >= 0 ? `Edit Increment Record #${editingIncIndex + 1}` : "Log An Increment Entry"}
                        </span>
                        {editingIncIndex >= 0 && (
                          <button
                            type="button"
                            onClick={handleCancelEditIncrement}
                            className="text-[11px] text-gray-500 hover:text-gray-700 underline cursor-pointer"
                          >
                            Cancel Editing
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                            Date of Increment *
                          </label>
                          <input
                            type="date"
                            value={incDraft.incrementDate}
                            onChange={(e) => setIncDraft({ ...incDraft, incrementDate: e.target.value })}
                            className="w-full h-8 px-2.5 rounded border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                            Salary Before Increment
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. ₹35,000 / month"
                            value={incDraft.previousSalary}
                            onChange={(e) => setIncDraft({ ...incDraft, previousSalary: e.target.value })}
                            className="w-full h-8 px-2.5 rounded border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                            Revised New Salary *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. ₹42,000 / month"
                            value={incDraft.newSalary}
                            onChange={(e) => setIncDraft({ ...incDraft, newSalary: e.target.value })}
                            className="w-full h-8 px-2.5 rounded border border-gray-300 text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                            Hike % or Amount
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. +20% or +₹7,000"
                            value={incDraft.hikePercentage}
                            onChange={(e) => setIncDraft({ ...incDraft, hikePercentage: e.target.value })}
                            className="w-full h-8 px-2.5 rounded border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                            Appraisal / Revision Reason
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Annual Appraisal 2024, Senior Promotion"
                            value={incDraft.reason}
                            onChange={(e) => setIncDraft({ ...incDraft, reason: e.target.value })}
                            className="w-full h-8 px-2.5 rounded border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                            HR / Appraisal Remarks
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Top performance rating"
                            value={incDraft.remarks}
                            onChange={(e) => setIncDraft({ ...incDraft, remarks: e.target.value })}
                            className="w-full h-8 px-2.5 rounded border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleSaveIncrementDraft}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 text-white text-xs font-medium rounded hover:bg-purple-800 transition cursor-pointer shadow-xs"
                        >
                          <Plus size={13} />
                          <span>{editingIncIndex >= 0 ? "Update Increment in List" : "Add Increment to History"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Confidential Remarks */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      General Confidential Compensation Remarks
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Special bonuses, variable pay, retention notes, or confidential remarks..."
                      value={formData.salaryRemarks}
                      onChange={(e) => setFormData({ ...formData, salaryRemarks: e.target.value })}
                      className="w-full p-2.5 rounded-md border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 resize-y"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-purple-700 text-white text-xs font-medium rounded-md hover:bg-purple-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? "Saving Changes..." : "Save Salary & Increment Details"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  </div>
);
}
