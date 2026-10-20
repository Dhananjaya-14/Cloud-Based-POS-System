import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import AddBranchWizard from "../../components/admin/AddBranchModal";
import { getBranches, getCompanies, setAuthToken, logout } from "../../services/api";
import { connectSocket, joinBranchUpdatesRoom, SOCKET_EVENTS } from "../../services/socket";
import Spinner from "../../components/super-admin/Spinner";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
import {
  Search,
  Plus,
  GitBranch,
  Check,
  XCircle,
  Store,
  Sparkles,
} from "lucide-react";

// Helper to normalize branch status
const normalizeStatus = (b) => {
  const raw = b.status ?? b.B_status ?? b.branch_status;
  const s = String(raw || "").toLowerCase();
  return s === "active" || s === "true" || raw === true;
};

// Helper to get 2-letter initials
const getInitials = (name) => {
  if (!name) return "BR";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

// Helper for Avatar colors
const getAvatarColor = (initials) => {
  const colors = [
    "#0F766E",
    "#1E293B",
    "#D97706",
    "#475569",
    "#0D9488",
    "#EA580C",
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

const SuperAdminBranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [companyFilter, setCompanyFilter] = useState("All Companies");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);

    const socket = connectSocket();
    joinBranchUpdatesRoom();

    fetchData();

    return () => {
      if (socket) {
        socket.off(SOCKET_EVENTS.BRANCH_CREATED);
        socket.off(SOCKET_EVENTS.BRANCH_UPDATED);
        socket.off(SOCKET_EVENTS.BRANCH_DELETED);
      }
    };
  }, [navigate]);

  // Realtime socket updates
  useEffect(() => {
    const socket = connectSocket();

    const handleCreated = (data) => {
      setBranches((prev) => {
        const exists = prev.some((b) => b.B_id === data.B_id);
        if (exists) return prev;
        return [data, ...prev];
      });
      toast.info(
        "New Branch Added",
        `"${data.B_name}" was added to the system`
      );
    };

    const handleUpdated = (data) => {
      setBranches((prev) =>
        prev.map((x) => (x.B_id === data.B_id ? { ...x, ...data } : x))
      );
      toast.info("Branch Updated", `"${data.B_name}" was updated`);
    };

    const handleDeleted = (payload) => {
      const id = payload?.B_id ?? payload?.b_id ?? null;
      if (id != null) {
        setBranches((prev) => prev.filter((x) => Number(x.B_id) !== Number(id)));
        toast.info(
          "Branch Deleted",
          payload.B_name
            ? `"${payload.B_name}" was removed`
            : `Branch #${id} was removed`
        );
      }
    };

    socket.on(SOCKET_EVENTS.BRANCH_CREATED, handleCreated);
    socket.on(SOCKET_EVENTS.BRANCH_UPDATED, handleUpdated);
    socket.on(SOCKET_EVENTS.BRANCH_DELETED, handleDeleted);

    return () => {
      socket.off(SOCKET_EVENTS.BRANCH_CREATED, handleCreated);
      socket.off(SOCKET_EVENTS.BRANCH_UPDATED, handleUpdated);
      socket.off(SOCKET_EVENTS.BRANCH_DELETED, handleDeleted);
    };
  }, [toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bData, cData] = await Promise.all([getBranches(), getCompanies()]);
      setBranches(Array.isArray(bData) ? bData : []);
      setCompanies(Array.isArray(cData) ? cData : []);
    } catch (err) {
      console.error("fetch error:", err);
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      }
      toast.error("Failed to load data", "Please refresh the page and try again.");
    } finally {
      setLoading(false);
    }
  };

  // CSV Export
  const handleExport = () => {
    if (!branches || branches.length === 0) {
      toast.info("No Data", "There are no branches to export.");
      return;
    }
    const headers = ["Branch Name", "Company", "Email", "Contact", "Address", "Status"];
    const rows = branches.map((b) => [
      `"${b.B_name || ""}"`,
      `"${b.com_name || ""}"`,
      `"${b.B_email || ""}"`,
      `"${b.B_conNo || b.B_phone || b.contact || b.phone || ""}"`,
      `"${b.B_address || ""}"`,
      `"${normalizeStatus(b) ? "Active" : "Inactive"}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `branches_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export Complete", "Branches list downloaded successfully.");
  };

  // Filters
  const filtered = branches.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      (b.B_name || "").toLowerCase().includes(q) ||
      (b.com_name || "").toLowerCase().includes(q) ||
      (b.B_email || "").toLowerCase().includes(q) ||
      (b.B_conNo || "").toLowerCase().includes(q) ||
      (b.B_address || "").toLowerCase().includes(q);

    const isActive = normalizeStatus(b);
    const matchStatus =
      statusFilter === "All Status" ||
      (statusFilter === "Active" && isActive) ||
      (statusFilter === "Inactive" && !isActive);

    const matchCompany =
      companyFilter === "All Companies" || (b.com_name || "") === companyFilter;

    return matchSearch && matchStatus && matchCompany;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalBranchesCount = branches.length;
  const activeBranchesCount = branches.filter(normalizeStatus).length;
  const inactiveBranchesCount = totalBranchesCount - activeBranchesCount;

  if (loading && branches.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F0]">
        <Sidebar />
        <div className="sa-main-content flex-1 ml-[240px] flex flex-col">
          <Header title="Branch Management" />
          <div className="flex-1 flex justify-center items-center min-h-[calc(100vh-70px)]">
            <div className="flex flex-col items-center gap-4">
              <Spinner size={44} />
              <p className="m-0 text-slate-500 font-medium text-sm">
                Loading Branches...
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
        <Header title="Branch Management" />

        <div className="p-6 md:p-8 space-y-6">
          {/* ── Top Header ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 m-0">
                Branch Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 m-0">
                {totalBranchesCount} branch{totalBranchesCount === 1 ? "" : "es"} across{" "}
                {companies.length} compan{companies.length === 1 ? "y" : "ies"}
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="bg-[#0B192C] text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add New Branch</span>
            </button>
          </div>

          {/* ── Summary Stat Cards (3 Cards) ─────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              icon={<GitBranch size={18} strokeWidth={2} />}
              label="Total Branches"
              value={totalBranchesCount}
              iconBg="bg-[#F0F3F6]"
              iconColor="text-[#64748B]"
            />
            <StatCard
              icon={<Check size={18} strokeWidth={2.5} />}
              label="Active Branches"
              value={activeBranchesCount}
              iconBg="bg-[#E8F8F0]"
              iconColor="text-[#16A34A]"
            />
            <StatCard
              icon={<XCircle size={18} strokeWidth={2} />}
              label="Inactive Branches"
              value={inactiveBranchesCount}
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
                  placeholder="Search branches..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
              </div>

              {/* Company Filter */}
              <select
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:border-teal-500 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <option>All Companies</option>
                {companies.map((c) => (
                  <option key={c.com_id} value={c.com_name}>
                    {c.com_name}
                  </option>
                ))}
              </select>

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

          {/* ── Branches Table Card ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      BRANCH
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      COMPANY
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      EMAIL
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      CONTACT
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      ADDRESS
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      STATUS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length > 0 ? (
                    paginated.map((b, i) => {
                      const initials = getInitials(b.B_name);
                      const avatarColor = getAvatarColor(initials);
                      const isActive = normalizeStatus(b);

                      return (
                        <tr
                          key={b.B_id || i}
                          onClick={() => navigate(`/branch_profile/${b.B_id}`)}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors cursor-pointer"
                        >
                          {/* BRANCH (Avatar + Name) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div
                                style={{ backgroundColor: avatarColor }}
                                className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                              >
                                {initials}
                              </div>
                              <span className="text-sm font-bold text-slate-900 leading-tight">
                                {b.B_name || "—"}
                              </span>
                            </div>
                          </td>

                          {/* COMPANY */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-700">
                              {b.com_name || "—"}
                            </span>
                          </td>

                          {/* EMAIL */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600">
                              {b.B_email || "—"}
                            </span>
                          </td>

                          {/* CONTACT */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600">
                              {b.B_conNo || b.B_phone || b.contact || b.phone || "—"}
                            </span>
                          </td>

                          {/* ADDRESS */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600 max-w-xs truncate block">
                              {b.B_address || "—"}
                            </span>
                          </td>

                          {/* STATUS */}
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-0.5 rounded-full text-xs font-semibold inline-block whitespace-nowrap ${
                                isActive
                                  ? "bg-[#DCFCE7] text-[#16A34A]"
                                  : "bg-[#FEE2E2] text-[#EF4444]"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                        No branches found
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
                  {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}
                </b>{" "}
                to{" "}
                <b className="text-slate-700">
                  {Math.min(filtered.length, currentPage * itemsPerPage)}
                </b>{" "}
                of <b className="text-slate-700">{filtered.length}</b> branches
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

      {/* Add Branch Wizard Modal (only rendered when showModal is true) */}
      {showModal && (
        <AddBranchWizard
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            fetchData();
            setShowModal(false);
          }}
          com_id={companies[0]?.com_id}
        />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default SuperAdminBranchManagement;