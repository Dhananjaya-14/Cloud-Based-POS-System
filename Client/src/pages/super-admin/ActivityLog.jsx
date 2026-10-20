import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "../../layout/slidebar";
import AdminHeader from "../../layout/header";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import Spinner from "../../components/super-admin/Spinner";
import { connectSocket, SOCKET_EVENTS } from "../../services/socket";
import {
  getActivityLogs,
  getActivityLogSummary,
  purgeActivityLogs,
  setAuthToken,
  logout,
} from "../../services/api";
import {
  Filter,
  Check,
  PlusCircle,
  XCircle,
  Search,
  RotateCw,
  Trash2,
  Calendar,
  AlertTriangle,
  Info,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTION_TYPES = [
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "LOGOUT_FAILED",
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
];

const MODULE_NAMES = [
  "AUTH",
  "USER",
  "ROLE",
  "COMPANY",
  "BRANCH",
  "CUSTOMER",
  "TABLE",
  "TABLE_ASSIGNMENT",
  "RESERVATION",
  "WAITER",
  "CATEGORY",
  "PRODUCT",
  "BRANCH_PRODUCT",
  "RECIPE",
  "RAW_MATERIAL",
  "WASTE",
  "SUPPLIER",
  "PURCHASE_ORDER",
  "PURCHASE_ITEM",
  "SUPPLIER_PAYMENT",
  "ORDER",
  "ORDER_ITEM",
  "PAYMENT",
  "DISCOUNT",
  "DELIVERY",
  "TERMINAL",
  "DASHBOARD",
  "STATS",
  "REPORT",
  "PAYHERE",
  "ACTIVITY_LOG",
];

// ─── Action Badge Styling ──────────────────────────────────────────────────────
const getActionBadge = (action) => {
  const a = (action || "").toUpperCase();
  if (a === "LOGIN") {
    return "bg-[#E8F8F0] text-[#16A34A]";
  }
  if (a === "CREATE") {
    return "bg-[#E6F7F5] text-[#0D9488]";
  }
  if (a === "UPDATE") {
    return "bg-[#FEF3E8] text-[#D97706]";
  }
  if (a === "DELETE" || a.includes("FAIL")) {
    return "bg-[#FEE2E2] text-[#EF4444]";
  }
  return "bg-slate-100 text-slate-600";
};

// ─── Stat Card Component ───────────────────────────────────────────────────────
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

// ─── Purge Modal ───────────────────────────────────────────────────────────────
const PurgeModal = ({ onConfirm, onCancel, isDeleting }) => {
  const [before, setBefore] = useState("");
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 text-center m-0 mb-1.5">
          Bulk Purge Logs
        </h3>
        <p className="text-xs text-slate-500 text-center m-0 mb-5 leading-relaxed">
          Permanently delete activity logs created <strong>before</strong> the selected date. This action cannot be undone.
        </p>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Delete all logs before:
          </label>
          <input
            type="date"
            value={before}
            onChange={(e) => setBefore(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => before && onConfirm(before)}
            disabled={!before || isDeleting}
            className="flex-1 h-10 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting && <Spinner size={14} color="#fff" />}
            <span>Purge Logs</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN ACTIVITY LOG COMPONENT ───────────────────────────────────────────────
const ActivityLog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentRoleId = Number(user?.role_id ?? storedUser?.role_id);
  const isSuperAdmin = currentRoleId === 6;
  const canManageLogs = isSuperAdmin;
  const ShellSidebar = isSuperAdmin ? Sidebar : AdminSidebar;
  const ShellHeader = isSuperAdmin ? Header : AdminHeader;

  // Data
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isMockData, setIsMockData] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    action_type: "",
    module_name: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  // UI state
  const [showPurge, setShowPurge] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = "info") => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filters.search) params.search = filters.search;
      if (filters.action_type) params.action_type = filters.action_type;
      if (filters.module_name) params.module_name = filters.module_name;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const data = await getActivityLogs(params);
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setIsMockData(data._mock || false);
    } catch (err) {
      console.error("Failed to fetch activity logs:", err);
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const data = await getActivityLogSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
      setSummary({ byAction: [], byModule: [], recent: [] });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);
    fetchLogs();
    fetchSummary();
  }, [navigate, fetchLogs, fetchSummary]);

  // Socket listener
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const socket = connectSocket();
    const handleActivityLogChanged = () => {
      fetchLogs();
      fetchSummary();
    };

    socket.on(SOCKET_EVENTS.ACTIVITY_LOG_CHANGED, handleActivityLogChanged);
    return () => {
      socket.off(SOCKET_EVENTS.ACTIVITY_LOG_CHANGED, handleActivityLogChanged);
    };
  }, [fetchLogs, fetchSummary]);

  // Purge logs
  const handlePurge = async (before) => {
    setDeleting(true);
    try {
      const result = await purgeActivityLogs({ before });
      const deletedCount = result.deleted ?? 0;
      showToast(`Purged ${deletedCount} log entries`, "success");
      setShowPurge(false);
      fetchLogs();
      fetchSummary();
    } catch (err) {
      showToast("Failed to purge logs", "error");
    } finally {
      setDeleting(false);
    }
  };

  const onFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Summary counters
  const totalActions =
    summary?.byAction?.reduce((s, a) => s + parseInt(a.count, 10), 0) ?? total ?? 0;
  const loginCount =
    summary?.byAction?.find((a) => a.action_type === "LOGIN")?.count ?? 0;
  const createCount =
    summary?.byAction?.find((a) => a.action_type === "CREATE")?.count ?? 0;
  const deleteCount =
    summary?.byAction?.find((a) => a.action_type === "DELETE")?.count ?? 0;

  return (
    <div className="flex min-h-screen bg-[#F8F6F0]">
      <ShellSidebar />

      <div className="sa-main-content flex-1 ml-[240px] flex flex-col min-w-0">
        <ShellHeader title="Activity Log" />

        <div className="p-6 md:p-8 space-y-6">
          {/* ── Summary Stat Cards (4 Cards) ─────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              icon={<Filter size={18} strokeWidth={2} />}
              label="Total Events"
              value={totalActions.toLocaleString()}
              iconBg="bg-[#F0F3F6]"
              iconColor="text-[#64748B]"
            />
            <StatCard
              icon={<Check size={18} strokeWidth={2.5} />}
              label="Logins"
              value={parseInt(loginCount, 10).toLocaleString()}
              iconBg="bg-[#E8F8F0]"
              iconColor="text-[#16A34A]"
            />
            <StatCard
              icon={<PlusCircle size={18} strokeWidth={2} />}
              label="Creates"
              value={parseInt(createCount, 10).toLocaleString()}
              iconBg="bg-[#E6F7F5]"
              iconColor="text-[#0D9488]"
            />
            <StatCard
              icon={<XCircle size={18} strokeWidth={2} />}
              label="Deletes"
              value={parseInt(deleteCount, 10).toLocaleString()}
              iconBg="bg-[#FEE2E2]"
              iconColor="text-[#EF4444]"
            />
          </div>

          {/* ── Filter / Action Toolbar Card ─────────────────────────── */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Description Input */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search description..."
                  value={filters.search}
                  onChange={(e) => onFilterChange("search", e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
              </div>

              {/* Actions Dropdown */}
              <select
                value={filters.action_type}
                onChange={(e) => onFilterChange("action_type", e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:border-teal-500 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <option value="">All Actions</option>
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              {/* Modules Dropdown */}
              <select
                value={filters.module_name}
                onChange={(e) => onFilterChange("module_name", e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:border-teal-500 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <option value="">All Modules</option>
                {MODULE_NAMES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Start Date */}
              <input
                type="date"
                value={filters.from}
                onChange={(e) => onFilterChange("from", e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:border-teal-500 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />

              {/* End Date */}
              <input
                type="date"
                value={filters.to}
                onChange={(e) => onFilterChange("to", e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:border-teal-500 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />

              {/* Refresh Button */}
              <button
                onClick={() => {
                  fetchLogs();
                  fetchSummary();
                }}
                className="border border-slate-200 bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition-colors"
              >
                <RotateCw size={13} strokeWidth={2} />
                <span>Refresh</span>
              </button>

              {/* Bulk Purge Button */}
              {canManageLogs && (
                <button
                  onClick={() => setShowPurge(true)}
                  className="border border-red-200 bg-white text-red-500 hover:bg-red-50 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition-colors"
                >
                  <Trash2 size={13} strokeWidth={2} />
                  <span>Bulk Purge</span>
                </button>
              )}
            </div>
          </div>

          {/* Mock data notice if active */}
          {isMockData && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 flex items-center gap-2">
              <Info size={15} className="text-amber-600 shrink-0" />
              <span>Activity logs are running in mock mode. Real logs will appear as actions occur.</span>
            </div>
          )}

          {/* ── Activity Logs Table Card ─────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      USER
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      COMPANY / BRANCH
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      ACTION
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      MODULE
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      DESCRIPTION
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      TIMESTAMP
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Spinner size={36} />
                          <span className="text-xs text-slate-500 font-medium">Loading activity logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length > 0 ? (
                    logs.map((log, idx) => {
                      let userName = "—";
                      if (log.u_fname || log.u_lname) {
                        userName = [log.u_fname, log.u_lname].filter(Boolean).join(" ");
                      } else if (log.u_email) {
                        userName = log.u_email;
                      } else if (log.user_name) {
                        userName = log.user_name;
                      } else if (log.user_email) {
                        userName = log.user_email;
                      }

                      const contextLabel =
                        [log.com_name, log.branch_name].filter(Boolean).join(" / ") || "—";

                      return (
                        <tr
                          key={log.log_id || idx}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                        >
                          {/* USER */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 leading-tight">
                                {userName}
                              </span>
                              <span className="text-xs text-slate-400 mt-0.5 leading-tight">
                                {log.u_email || log.user_email || "super@admin.com"}
                              </span>
                            </div>
                          </td>

                          {/* COMPANY / BRANCH */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-700">
                              {contextLabel}
                            </span>
                          </td>

                          {/* ACTION */}
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider inline-block ${getActionBadge(
                                log.action_type
                              )}`}
                            >
                              {log.action_type || "UNKNOWN"}
                            </span>
                          </td>

                          {/* MODULE */}
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold text-[#4F46E5] uppercase tracking-wider">
                              {log.module_name || "AUTH"}
                            </span>
                          </td>

                          {/* DESCRIPTION */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-700 max-w-sm line-clamp-2">
                              {log.description || "—"}
                            </span>
                          </td>

                          {/* TIMESTAMP */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-500 whitespace-nowrap">
                              {formatDate(log.created_at)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                        No activity logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
              <span className="text-xs text-slate-500">
                Page <b className="text-slate-700">{page}</b> of{" "}
                <b className="text-slate-700">{totalPages}</b> ·{" "}
                <b className="text-slate-700">{total}</b> records
              </span>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors cursor-pointer mr-1"
                >
                  Prev
                </button>

                {/* Page number buttons matching screenshot */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) {
                    p = i + 1;
                  } else if (page <= 3) {
                    p = i + 1;
                  } else if (page >= totalPages - 2) {
                    p = totalPages - 4 + i;
                  } else {
                    p = page - 2 + i;
                  }

                  const isActive = p === page;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
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
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors cursor-pointer ml-1"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Purge Modal */}
      {showPurge && (
        <PurgeModal
          onConfirm={handlePurge}
          onCancel={() => setShowPurge(false)}
          isDeleting={deleting}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <span>{toastMessage.message}</span>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;