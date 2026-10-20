import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getPackages,
  setAuthToken,
  logout,
} from "../../services/api";
import ToggleSwitch from "../../components/super-admin/ToggleSwitch";
import Spinner from "../../components/super-admin/Spinner";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
import { connectSocket, subscribeToCompanyUpdates } from "../../services/socket";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Check,
  XCircle,
  Sparkles,
  X,
} from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^07[0-9]{8}$/;

// Helper to get 2-letter initials
const getInitials = (name) => {
  if (!name) return "CO";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

// Helper for Avatar colors
const getAvatarColor = (initials) => {
  const colors = [
    "#1E293B",
    "#0F766E",
    "#D97706",
    "#475569",
    "#EA580C",
    "#0D9488",
    "#0F172A",
    "#64748B",
  ];
  const charCode = (initials.charCodeAt(0) || 0) + (initials.charCodeAt(1) || 0);
  return colors[charCode % colors.length];
};

// Summary Card
const StatCard = ({ icon, label, value, iconBg, iconColor }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-all">
    <div
      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
    >
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="text-xs font-medium text-slate-500 mb-0.5">{label}</span>
      <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
    </div>
  </div>
);

const HotelManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [togglingId, setTogglingId] = useState(null);
  const { toasts, removeToast, toast } = useToast();
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const defaultFormData = () => ({
    id: null,
    name: "",
    location: "",
    email: "",
    phone: "",
    date: new Date().toISOString().slice(0, 10),
    status: true,
    package_id: "",
    language_code: "en",
  });

  const [formData, setFormData] = useState(defaultFormData());
  const navigate = useNavigate();
  const location = useLocation();

  // WebSocket subscription
  useEffect(() => {
    connectSocket();

    const unsubscribe = subscribeToCompanyUpdates({
      onCompanyCreated: (newCompany) => {
        setCompanies((prev) => [...prev, newCompany]);
      },
      onCompanyUpdated: (updatedCompany) => {
        setCompanies((prev) =>
          prev.map((c) =>
            c.com_id === updatedCompany.com_id ? updatedCompany : c
          )
        );
      },
      onCompanyDeleted: (deletedCompany) => {
        setCompanies((prev) =>
          prev.filter((c) => c.com_id !== deletedCompany.com_id)
        );
      },
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [companiesData, packagesData] = await Promise.all([
        getCompanies(),
        getPackages(),
      ]);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setPackages(Array.isArray(packagesData) ? packagesData : []);
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);
    fetchData();

    if (location.state?.openAddModal) {
      openAddModal();
      window.history.replaceState({}, document.title);
    }
  }, [navigate, location.state]);

  const handleToggleStatus = async (companyId, currentStatus) => {
    setTogglingId(companyId);
    try {
      const statusStr = String(currentStatus || "").toLowerCase();
      const isActive =
        statusStr === "active" || statusStr === "true" || currentStatus === true;
      const nextStatus = !isActive;

      setCompanies((prev) =>
        prev.map((c) =>
          c.com_id === companyId ? { ...c, c_status: nextStatus } : c
        )
      );

      await updateCompany(companyId, { c_status: nextStatus });
      toast.success(
        "Status Updated",
        `Company status changed to ${nextStatus ? "Active" : "Inactive"}`
      );
    } catch (err) {
      console.error("Error toggling company status:", err);
      fetchData();
      toast.error(
        "Update Failed",
        err.response?.data?.message || err.message || "Failed to update status"
      );
    } finally {
      setTogglingId(null);
    }
  };

  const openAddModal = () => {
    setFormData(defaultFormData());
    setModalMode("add");
    setModalError("");
    setEmailError("");
    setPhoneError("");
    setIsModalOpen(true);
  };

  const openEditModal = (company) => {
    setFormData({
      id: company.com_id,
      name: company.com_name || "",
      location: company.location || "",
      email: company.c_email || "",
      phone: company.phone || "",
      date: company.reg_date
        ? new Date(company.reg_date).toISOString().slice(0, 10)
        : "",
      status:
        company.c_status === true ||
        String(company.c_status).toLowerCase() === "active",
      package_id: company.package_id || "",
      language_code: company.language_code || "en",
    });
    setModalMode("edit");
    setModalError("");
    setEmailError("");
    setPhoneError("");
    setIsModalOpen(true);
  };

  const openDeleteModal = (company) => {
    setCompanyToDelete(company);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async () => {
    setEmailError("");
    setPhoneError("");

    if (!formData.name.trim()) {
      setModalError("Please fill in company name.");
      return;
    }

    if (!formData.location.trim()) {
      setModalError("Please fill in company location.");
      return;
    }

    if (!formData.email.trim()) {
      setEmailError("Please enter a contact email address.");
      return;
    }

    if (!EMAIL_RE.test(formData.email.trim())) {
      setEmailError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    if (!formData.phone.trim()) {
      setPhoneError("Please enter a phone number.");
      return;
    }

    if (!PHONE_RE.test(formData.phone.trim())) {
      setPhoneError(
        "Phone number must be 10 digits and start with 07 (e.g. 0771234567)."
      );
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (modalMode === "add" && formData.date < today) {
      setModalError("Registered date cannot be in the past.");
      return;
    }

    setIsSaving(true);
    setModalError("");
    try {
      const payload = {
        com_name: formData.name,
        location: formData.location,
        phone: formData.phone,
        c_status: !!formData.status,
        c_email: formData.email,
        reg_date: formData.date || new Date().toISOString().slice(0, 10),
        package_id: formData.package_id ? parseInt(formData.package_id, 10) : null,
        language_code: formData.language_code || "en",
      };

      if (modalMode === "add") {
        const response = await createCompany(payload);
        toast.success("Company Created", `"${formData.name}" was successfully added.`);
        setCompanies((prev) => [...prev, response]);
      } else {
        const response = await updateCompany(formData.id, payload);
        toast.success("Company Updated", `"${formData.name}" details were saved.`);
        setCompanies((prev) =>
          prev.map((c) => (c.com_id === formData.id ? response : c))
        );
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error saving company:", err);
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to save company.";
      setModalError(errorMsg);
      toast.error("Save Failed", errorMsg);
      fetchData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!companyToDelete?.com_id) return;
    setIsDeleting(true);
    try {
      await deleteCompany(companyToDelete.com_id);
      setIsDeleteModalOpen(false);
      toast.success("Company Deleted", `"${companyToDelete?.com_name}" was removed.`);
      setCompanies((prev) =>
        prev.filter((c) => c.com_id !== companyToDelete.com_id)
      );
      fetchData();
    } catch (err) {
      console.error("Error deleting company:", err);
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to delete company.";
      toast.error("Delete Failed", errorMsg);
      fetchData();
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export
  const handleExport = () => {
    if (!companies || companies.length === 0) {
      toast.info("No Data", "There are no companies to export.");
      return;
    }
    const headers = ["Company Name", "Location", "Email", "Phone", "Package", "Status"];
    const rows = companies.map((c) => [
      `"${c.com_name || ""}"`,
      `"${c.location || ""}"`,
      `"${c.c_email || ""}"`,
      `"${c.phone || ""}"`,
      `"${packages.find((p) => p.package_id === c.package_id)?.package_name || "—"}"`,
      `"${
        String(c.c_status).toLowerCase() === "active" ||
        String(c.c_status).toLowerCase() === "true" ||
        c.c_status === true
          ? "Active"
          : "Inactive"
      }"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `companies_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export Complete", "Companies list downloaded successfully.");
  };

  // Filters and pagination
  const filteredCompanies = companies.filter((c) => {
    const q = searchQuery.toLowerCase();
    const searchMatch =
      !q ||
      (c.com_name || "").toLowerCase().includes(q) ||
      (c.location || "").toLowerCase().includes(q) ||
      (c.c_email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q);

    const s = String(c.c_status || "").toLowerCase();
    const isActive = s === "active" || s === "true" || c.c_status === true;

    const statusMatch =
      statusFilter === "All Status" ||
      (statusFilter === "Active" && isActive) ||
      (statusFilter === "Inactive" && !isActive);

    return searchMatch && statusMatch;
  });

  const itemsPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / itemsPerPage));
  const currentCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalCompaniesCount = companies.length;
  const activeCompaniesCount = companies.filter(
    (c) =>
      String(c.c_status).toLowerCase() === "active" ||
      String(c.c_status).toLowerCase() === "true" ||
      c.c_status === true
  ).length;
  const inactiveCompaniesCount = totalCompaniesCount - activeCompaniesCount;

  if (loading && companies.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F0]">
        <Sidebar />
        <div className="sa-main-content flex-1 ml-[240px] flex flex-col">
          <Header title="Company Management" />
          <div className="flex-1 flex justify-center items-center min-h-[calc(100vh-70px)]">
            <div className="flex flex-col items-center gap-4">
              <Spinner size={44} />
              <p className="m-0 text-slate-500 font-medium text-sm">
                Loading Companies...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F6F0]">
      <Sidebar />

      <div className="sa-main-content flex-1 ml-[240px] flex flex-col min-w-0">
        <Header title="Company Management" />

        <div className="p-6 md:p-8 space-y-6">
          {/* ── Top Header ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 m-0">
                Company Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 m-0">
                {totalCompaniesCount} compan{totalCompaniesCount === 1 ? "y" : "ies"}{" "}
                registered on the platform
              </p>
            </div>

            <button
              onClick={openAddModal}
              className="bg-[#0B192C] text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add New Company</span>
            </button>
          </div>

          {/* ── Summary Stat Cards (3 Cards) ─────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              icon={<Building2 size={18} strokeWidth={2} />}
              label="Total Companies"
              value={totalCompaniesCount}
              iconBg="bg-[#F0F3F6]"
              iconColor="text-[#64748B]"
            />
            <StatCard
              icon={<Check size={18} strokeWidth={2.5} />}
              label="Active Companies"
              value={activeCompaniesCount}
              iconBg="bg-[#E8F8F0]"
              iconColor="text-[#16A34A]"
            />
            <StatCard
              icon={<XCircle size={18} strokeWidth={2} />}
              label="Inactive Companies"
              value={inactiveCompaniesCount}
              iconBg="bg-[#FEE2E2]"
              iconColor="text-[#EF4444]"
            />
          </div>

          {/* ── Search & Filter Toolbar ─────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[280px] flex-wrap">
              {/* Search */}
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:border-teal-500 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="border border-slate-200/90 bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition-colors"
            >
              <Sparkles size={14} className="text-slate-500" />
              <span>Export</span>
            </button>
          </div>

          {/* ── Companies Table Card ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      COMPANY
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      LOCATION
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      CONTACT
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      PACKAGE
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      REGISTERED DATE
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      STATUS
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentCompanies.length > 0 ? (
                    currentCompanies.map((company, i) => {
                      const initials = getInitials(company.com_name);
                      const avatarColor = getAvatarColor(initials);
                      const pkg = packages.find(
                        (p) => p.package_id === company.package_id
                      );
                      const s = String(company.c_status || "").toLowerCase();
                      const isActive =
                        s === "active" || s === "true" || company.c_status === true;

                      return (
                        <tr
                          key={company.com_id || i}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                        >
                          {/* COMPANY (Avatar + Name) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div
                                style={{ backgroundColor: avatarColor }}
                                className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                              >
                                {initials}
                              </div>
                              <span className="text-sm font-bold text-slate-900 leading-tight">
                                {company.com_name || "—"}
                              </span>
                            </div>
                          </td>

                          {/* LOCATION */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-700">
                              {company.location || "—"}
                            </span>
                          </td>

                          {/* CONTACT */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-700">
                                {company.c_email || "—"}
                              </span>
                              <span className="text-xs text-slate-400 mt-0.5">
                                {company.phone || "—"}
                              </span>
                            </div>
                          </td>

                          {/* PACKAGE */}
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] inline-block whitespace-nowrap">
                              {pkg?.package_name || "Basic"}
                            </span>
                          </td>

                          {/* REGISTERED DATE */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600 whitespace-nowrap">
                              {company.reg_date
                                ? new Date(company.reg_date)
                                    .toISOString()
                                    .slice(0, 10)
                                    .split("-")
                                    .reverse()
                                    .join("-")
                                : "—"}
                            </span>
                          </td>

                          {/* STATUS (ToggleSwitch) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <ToggleSwitch
                                checked={isActive}
                                onChange={() =>
                                  handleToggleStatus(company.com_id, company.c_status)
                                }
                                disabled={togglingId === company.com_id}
                              />
                              {togglingId === company.com_id && (
                                <Spinner size={14} />
                              )}
                            </div>
                          </td>

                          {/* ACTIONS */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(company)}
                                title="Edit Company"
                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
                              >
                                <Pencil size={13} strokeWidth={2} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(company)}
                                title="Delete Company"
                                className="w-7 h-7 rounded-lg border border-red-200/80 flex items-center justify-center text-red-500 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-colors bg-white cursor-pointer"
                              >
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                        No companies found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <span className="text-xs text-slate-500">
                Showing{" "}
                <b className="text-slate-700">
                  {Math.min(
                    filteredCompanies.length,
                    (currentPage - 1) * itemsPerPage + 1
                  )}
                </b>{" "}
                to{" "}
                <b className="text-slate-700">
                  {Math.min(filteredCompanies.length, currentPage * itemsPerPage)}
                </b>{" "}
                of <b className="text-slate-700">{filteredCompanies.length}</b>{" "}
                companies
              </span>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors cursor-pointer mr-1"
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) {
                    p = i + 1;
                  } else if (currentPage <= 3) {
                    p = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    p = totalPages - 4 + i;
                  } else {
                    p = currentPage - 2 + i;
                  }
                  const isActive = p === currentPage;
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#0B192C] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors cursor-pointer ml-1"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Company Modal ─────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 m-0 mb-1">
              {modalMode === "add" ? "Add New Company" : "Edit Company"}
            </h2>
            <p className="text-xs text-slate-500 m-0 mb-5">
              Enter company profile, registration, and subscription details.
            </p>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs mb-4">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="Enter company name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Enter city or district"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setEmailError("");
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 focus:outline-none transition-all ${
                      emailError
                        ? "border-red-500 focus:border-red-500"
                        : "border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    }`}
                  />
                  {emailError && (
                    <p className="text-red-500 text-[11px] mt-1 m-0">{emailError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="07XXXXXXXX"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, phone: digitsOnly });
                      setPhoneError("");
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 focus:outline-none transition-all ${
                      phoneError
                        ? "border-red-500 focus:border-red-500"
                        : "border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    }`}
                  />
                  {phoneError && (
                    <p className="text-red-500 text-[11px] mt-1 m-0">{phoneError}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    SaaS Package
                  </label>
                  <select
                    value={formData.package_id}
                    onChange={(e) =>
                      setFormData({ ...formData, package_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all cursor-pointer bg-white"
                  >
                    <option value="">— Select a Package —</option>
                    {packages.map((p) => (
                      <option key={p.package_id} value={p.package_id}>
                        {p.package_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default Language
                </label>
                <select
                  value={formData.language_code}
                  onChange={(e) =>
                    setFormData({ ...formData, language_code: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all cursor-pointer bg-white"
                >
                  <option value="en">English</option>
                  <option value="si">Sinhala</option>
                  <option value="ta">Tamil</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                disabled={isSaving}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="h-10 px-5 rounded-xl bg-[#0D9488] text-white text-xs font-semibold hover:bg-teal-700 cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving && <Spinner size={14} color="#fff" />}
                <span>
                  {isSaving
                    ? "Saving..."
                    : modalMode === "add"
                    ? "Save Company"
                    : "Save Changes"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 m-0 mb-1.5">
              Delete Company?
            </h3>
            <p className="text-xs text-slate-500 m-0 mb-6 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-slate-700 font-semibold">
                "{companyToDelete?.com_name}"
              </strong>
              ? All associated branches and company data will be affected.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDeleting && <Spinner size={14} color="#fff" />}
                <span>{isDeleting ? "Deleting..." : "Delete Company"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default HotelManagement;