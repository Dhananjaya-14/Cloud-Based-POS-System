import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "../../layout/slidebar";
import AdminHeader from "../../layout/header";
import Spinner from "../../components/super-admin/Spinner";
import { connectSocket, SOCKET_EVENTS } from "../../services/socket";
import { getActivityLogs, getActivityLogSummary, setAuthToken } from "../../services/api";
import {
  FaSearch,
  FaFilter,
  FaSync,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

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
  "AUTH", "USER", "ROLE", "COMPANY", "BRANCH", "CUSTOMER", "TABLE",
  "TABLE_ASSIGNMENT", "RESERVATION", "WAITER", "CATEGORY", "PRODUCT",
  "BRANCH_PRODUCT", "RECIPE", "RAW_MATERIAL", "WASTE", "SUPPLIER",
  "PURCHASE_ORDER", "PURCHASE_ITEM", "SUPPLIER_PAYMENT", "ORDER",
  "ORDER_ITEM", "PAYMENT", "DISCOUNT", "DELIVERY", "TERMINAL",
  "DASHBOARD", "STATS", "REPORT", "PAYHERE", "ACTIVITY_LOG",
];

const ACTION_COLORS = {
  LOGIN: { bg: "#DCFCE7", color: "#16A34A" },
  LOGIN_FAILED: { bg: "#FEE2E2", color: "#DC2626" },
  LOGOUT: { bg: "#E0E7FF", color: "#4338CA" },
  LOGOUT_FAILED: { bg: "#FEE2E2", color: "#DC2626" },
  CREATE: { bg: "#DBEAFE", color: "#1D4ED8" },
  READ: { bg: "#F3F4F6", color: "#6B7280" },
  UPDATE: { bg: "#FEF9C3", color: "#CA8A04" },
  DELETE: { bg: "#FEE2E2", color: "#DC2626" },
};

const getActionStyle = (action) =>
  ACTION_COLORS[action] ?? { bg: "#F3F4F6", color: "#374151" };

const Badge = ({ text, bg, color }) => (
  <span
    style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.03em",
      background: bg,
      color,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </span>
);

const SummaryCard = ({ icon, label, value, bg, iconColor }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 14,
      padding: "18px 22px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      flex: 1,
      minWidth: 140,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: iconColor,
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <div
        style={{
          fontSize: 12,
          color: "#9CA3AF",
          fontWeight: 600,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
        {value}
      </div>
    </div>
  </div>
);

const Toast = ({ message, type, onClose }) => {
  const colors = {
    success: { bg: "#DCFCE7", color: "#16A34A", border: "#BBF7D0" },
    error: { bg: "#FEE2E2", color: "#DC2626", border: "#FECACA" },
    info: { bg: "#DBEAFE", color: "#1D4ED8", border: "#BFDBFE" },
  };
  const c = colors[type] || colors.info;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: "14px 20px",
        fontWeight: 600,
        fontSize: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 360,
      }}
    >
      {type === "success" && <FaCheckCircle />}
      {type === "error" && <FaTimesCircle />}
      {type === "info" && <FaInfoCircle />}
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: c.color,
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
};

/* ===== Design components (Activity Log redesign) ===== */
const AL_INPUT = "rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white px-3.5 py-[11px] text-[13px] font-normal text-[#111827] outline-none focus:border-[#14A6E0]";
const AL_TD = "whitespace-nowrap px-5 py-3 text-[13px]";
const AL_PAGER = "rounded-lg border-[1.5px] border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold text-[#111827] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40";
const AL_STAT_TONES = {
  navy: "bg-[#E7ECF2] text-[#071E38]",
  green: "bg-[#EAF9EC] text-[#3CAE49]",
  blue: "bg-[#EAF6FD] text-[#14A6E0]",
  red: "bg-[#FDECEC] text-[#EF4444]"
};
const AlFilterIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4H20L14 12.5V19L10 21V12.5L4 4Z" /></svg>;
const AlCheckIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>;
const AlClockIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8V12L15 14" /></svg>;
const AlCrossIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M15 9L9 15M9 9L15 15" /></svg>;

// Action pill colours from the design
const actionTone = (action) => {
  const value = String(action || "").toUpperCase();
  if (value.includes("FAILED")) return "bg-[#FDECEC] text-[#B91C1C]";
  if (value === "LOGIN") return "bg-[#EAF9EC] text-[#15803D]";
  if (value === "CREATE") return "bg-[#EAF6FD] text-[#0E6FA8]";
  if (value === "DELETE") return "bg-[#FDECEC] text-[#B91C1C]";
  if (value === "UPDATE") return "bg-[#FFF6E6] text-[#B45309]";
  return "bg-[#F3F4F6] text-[#374151]";
};

const getInitials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

function AlStatCard({ icon, tone, value, label }) {
  return (
    <div className="flex items-center gap-[15px] rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-[18px] shadow-[0_2px_10px_rgba(7,30,56,0.03)]">
      <div className={`flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl ${AL_STAT_TONES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="truncate font-space text-[22px] font-bold leading-tight text-[#071E38]">{value}</div>
        <div className="text-xs font-semibold text-[#6B7280]">{label}</div>
      </div>
    </div>
  );
}
/* ===== End of design components ===== */

const ActivityLog = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const companyId = Number(user?.com_id ?? storedUser?.com_id);

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isMockData, setIsMockData] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    action_type: "",
    module_name: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const LIMIT = 20;

  // State for aggregated summary stats (fallback when API summary is unavailable)
  const [summaryStats, setSummaryStats] = useState({
    totalEvents: 0,
    logins: 0,
    creates: 0,
    deletes: 0,
  });

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Build the params object from current filters
  const buildFilterParams = useCallback(
    (extra = {}) => {
      const params = { ...extra };
      if (filters.search) params.search = filters.search;
      if (filters.action_type) params.action_type = filters.action_type;
      if (filters.module_name) params.module_name = filters.module_name;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (companyId) params.com_id = companyId;
      return params;
    },
    [filters, companyId]
  );

  // Fallback: compute summary stats by paging through all filtered logs
  const fetchSummaryFromLogs = useCallback(async () => {
    const params = buildFilterParams({ page: 1, limit: LIMIT });
    const firstPage = await getActivityLogs(params);
    const collectedLogs = [...(firstPage.logs ?? [])];
    const totalPagesToFetch = Math.max(1, firstPage.totalPages ?? 1);

    for (let nextPage = 2; nextPage <= totalPagesToFetch; nextPage += 1) {
      const pageData = await getActivityLogs({
        ...params,
        page: nextPage,
        limit: LIMIT,
      });
      collectedLogs.push(...(pageData.logs ?? []));
    }

    const counts = collectedLogs.reduce(
      (acc, log) => {
        const actionType = String(log?.action_type || "").toUpperCase();
        acc.totalEvents += 1;
        if (actionType === "LOGIN") acc.logins += 1;
        if (actionType === "CREATE") acc.creates += 1;
        if (actionType === "DELETE") acc.deletes += 1;
        return acc;
      },
      { totalEvents: 0, logins: 0, creates: 0, deletes: 0 }
    );

    setSummaryStats(counts);
  }, [buildFilterParams]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildFilterParams({ page, limit: LIMIT });
      const data = await getActivityLogs(params);
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setIsMockData(data._mock || false);
      if (data._mock && data.message) {
        showToast(data.message, "info");
      }
    } catch (err) {
      console.error("Failed to fetch activity logs:", err);
      showToast("Failed to load activity logs", "error");
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, buildFilterParams]);

  const fetchSummary = useCallback(async () => {
    try {
      const params = companyId ? { com_id: companyId } : {};
      const data = await getActivityLogSummary(params);
      setSummary(data);

      // If the API returned useful byAction data, use it
      if (data && Array.isArray(data.byAction) && data.byAction.length > 0) {
        const totalEvents = data.byAction.reduce(
          (sum, action) => sum + parseInt(action.count, 10),
          0
        );
        const logins =
          data.byAction.find((a) => a.action_type === "LOGIN")?.count || 0;
        const creates =
          data.byAction.find((a) => a.action_type === "CREATE")?.count || 0;
        const deletes =
          data.byAction.find((a) => a.action_type === "DELETE")?.count || 0;

        setSummaryStats({
          totalEvents,
          logins: parseInt(logins, 10),
          creates: parseInt(creates, 10),
          deletes: parseInt(deletes, 10),
        });
      } else {
        // Otherwise fall back to computing from logs
        await fetchSummaryFromLogs();
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
      setSummary({ byAction: [], byModule: [], recent: [] });
      try {
        await fetchSummaryFromLogs();
      } catch (fallbackErr) {
        console.error("Fallback summary computation failed:", fallbackErr);
        setSummaryStats({ totalEvents: 0, logins: 0, creates: 0, deletes: 0 });
      }
    }
  }, [companyId, fetchSummaryFromLogs]);

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

  const onFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tableHeaders = [
    "#",
    t("table_headers.user", "User"),
    t("table_headers.company_branch", "Company / Branch"),
    t("table_headers.action", "Action"),
    t("table_headers.module", "Module"),
    t("table_headers.description", "Description"),
    t("table_headers.timestamp", "Timestamp"),
  ];

  const hasActiveFilters = filters.search || filters.action_type || filters.module_name || filters.from || filters.to;

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] text-[#111827]">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col" style={{ marginLeft: 240 }}>
        <AdminHeader title={t("company_admin.activity_log", "Activity Log")} />

        <main className="flex-1 px-8 pb-10 pt-7">
          {/* Page heading */}
          <div className="mb-[22px]">
            <h2 className="mb-1 font-space text-2xl font-bold text-[#111827]">{t("company_admin.activity_log", "Activity Log")}</h2>
            <p className="text-[13px] text-[#6B7280]">{t("company_admin.activity_log_subtitle", "Track every login, create, update, and delete action across the system")}</p>
          </div>

          {/* Summary cards */}
          <div className="mb-[22px] grid grid-cols-2 gap-4 xl:grid-cols-4">
            <AlStatCard tone="navy" icon={<AlFilterIcon />} value={summaryStats.totalEvents.toLocaleString()} label={t("company_admin.total_events", "Total Events")} />
            <AlStatCard tone="green" icon={<AlCheckIcon />} value={summaryStats.logins.toLocaleString()} label={t("company_admin.logins", "Logins")} />
            <AlStatCard tone="blue" icon={<AlClockIcon />} value={summaryStats.creates.toLocaleString()} label={t("company_admin.creates", "Creates")} />
            <AlStatCard tone="red" icon={<AlCrossIcon />} value={summaryStats.deletes.toLocaleString()} label={t("company_admin.deletes", "Deletes")} />
          </div>

          {/* Search + filters panel */}
          <div className="mb-[18px] rounded-[14px] border border-[#E5E7EB] bg-white px-[22px] py-[18px] shadow-[0_2px_10px_rgba(7,30,56,0.03)]">
            <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <svg className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                <input
                  id="log-search"
                  value={filters.search}
                  onChange={(e) => onFilterChange("search", e.target.value)}
                  placeholder={t("company_admin.search_description", "Search description…")}
                  className="w-full rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white py-3 pl-[42px] pr-4 text-[13.5px] outline-none focus:border-[#14A6E0]"
                />
              </div>
              <button
                id="btn-refresh-logs"
                type="button"
                onClick={() => {
                  fetchLogs();
                  fetchSummary();
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white px-[18px] py-3 text-[13px] font-bold text-[#111827] hover:bg-[#F9FAFB]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12A9 9 0 103.5 16.5M21 12V6M21 12H15" /></svg>
                {t("company_admin.refresh", "Refresh")}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select id="filter-action-type" value={filters.action_type} onChange={(e) => onFilterChange("action_type", e.target.value)} className={`${AL_INPUT} min-w-[170px]`}>
                <option value="">{t("company_admin.all_actions", "All Actions")}</option>
                {ACTION_TYPES.map((action) => <option key={action} value={action}>{action}</option>)}
              </select>
              <select id="filter-module-name" value={filters.module_name} onChange={(e) => onFilterChange("module_name", e.target.value)} className={`${AL_INPUT} min-w-[170px]`}>
                <option value="">{t("company_admin.all_modules", "All Modules")}</option>
                {MODULE_NAMES.map((moduleName) => <option key={moduleName} value={moduleName}>{moduleName}</option>)}
              </select>
              <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280]">
                {t("company_admin.from", "From:")}
                <input id="filter-from-date" type="date" value={filters.from} onChange={(e) => onFilterChange("from", e.target.value)} className={AL_INPUT} />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280]">
                {t("company_admin.to", "To:")}
                <input id="filter-to-date" type="date" value={filters.to} onChange={(e) => onFilterChange("to", e.target.value)} className={AL_INPUT} />
              </label>
              {hasActiveFilters && (
                <button
                  id="btn-clear-filters"
                  type="button"
                  onClick={() => {
                    setFilters({ search: "", action_type: "", module_name: "", from: "", to: "" });
                    setPage(1);
                  }}
                  className="rounded-[10px] border-[1.5px] border-[#EF4444]/40 bg-white px-3.5 py-[11px] text-[13px] font-bold text-[#EF4444] hover:bg-[#FDECEC]"
                >
                  {t("company_admin.clear_filters", "Clear Filters")}
                </button>
              )}
            </div>
          </div>

          {isMockData && (
            <div className="mb-[18px] flex items-center gap-2 rounded-[10px] border border-[#F59E0B]/40 bg-[#FFF6E6] px-4 py-3 text-[13px] font-semibold text-[#B45309]">
              <FaInfoCircle />
              <span>{t("company_admin.activity_logs_are_not_yet_implemented_on", "Activity logs are not yet implemented on the backend. Showing mock data.")}</span>
            </div>
          )}

          {/* Logs heading */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-space text-[15px] font-bold text-[#071E38]">{t("company_admin.activity_logs", "Activity Logs")}</h3>
            <span className="text-xs font-semibold text-[#6B7280]">
              <b className="text-[#071E38]">{total.toLocaleString()}</b> {t("company_admin.total_records", "total records")}
            </span>
          </div>

          {/* Logs table */}
          <div className="overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(7,30,56,0.04)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Spinner size={40} />
                <p className="text-sm text-[#6B7280]">{t("company_admin.loading_logs", "Loading logs…")}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mb-3 text-4xl">📭</div>
                <p className="text-sm text-[#9CA3AF]">{t("company_admin.no_activity_logs_found", "No activity logs found")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {tableHeaders.map((header) => (
                        <th key={header} className="whitespace-nowrap border-b border-[#E5E7EB] bg-[#FAFAFB] px-5 py-3.5 text-left text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#9CA3AF]">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => {
                      let userName = "—";
                      if (log.u_fname || log.u_lname) {
                        userName = [log.u_fname, log.u_lname].filter(Boolean).join(" ");
                      } else if (log.u_email) {
                        userName = log.u_email;
                      } else if (log.user_name) {
                        userName = log.user_name;
                      } else if (log.user_email) {
                        userName = log.user_email;
                      } else if (log.u_id) {
                        userName = `User #${log.u_id}`;
                      } else if (log.user_id) {
                        userName = `User #${log.user_id}`;
                      }
                      if (userName === "—" || userName === "" || userName === "undefined" || userName === "null") {
                        userName = log.action_type === "LOGIN" || log.action_type === "LOGIN_FAILED" ? "System" : "Unknown User";
                      }
                      const contextLabel = [log.com_name, log.branch_name].filter(Boolean).join(" / ") || "—";

                      return (
                        <tr key={log.log_id || idx} className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#FAFBFC]">
                          <td className={`${AL_TD} font-semibold text-[#9CA3AF]`}>{idx + 1 + (page - 1) * LIMIT}</td>
                          <td className={AL_TD}>
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#14A6E0] to-[#3CAE49] font-space text-[10px] font-bold text-white">{getInitials(userName)}</span>
                              <span className="font-bold text-[#071E38]">{userName}</span>
                            </div>
                          </td>
                          <td className={`${AL_TD} text-[#6B7280]`}>{contextLabel}</td>
                          <td className={AL_TD}>
                            <span className={`inline-block rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-[0.03em] ${actionTone(log.action_type)}`}>{log.action_type || "—"}</span>
                          </td>
                          <td className={AL_TD}>
                            <span className="inline-block rounded-full bg-[#F3EDFE] px-2.5 py-1 text-[10.5px] font-bold text-[#6D28D9]">{log.module_name || "—"}</span>
                          </td>
                          <td className={`${AL_TD} max-w-[340px] overflow-hidden text-ellipsis text-[#6B7280]`} title={log.description}>{log.description || "—"}</td>
                          <td className={`${AL_TD} tabular-nums text-[#9CA3AF]`}>{formatDate(log.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-end gap-2 border-t border-[#E5E7EB] px-[22px] py-4">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className={AL_PAGER}>
                {t("company_admin.previous", "Previous")}
              </button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className={AL_PAGER}>
                {t("company_admin.next", "Next")}
              </button>
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
export default ActivityLog;