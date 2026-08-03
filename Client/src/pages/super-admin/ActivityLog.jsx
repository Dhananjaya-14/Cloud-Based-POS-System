import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminHeader from "../../components/admin/Header";
import Sidebar from "../../components/super-admin/Sidebar";
import Header from "../../components/super-admin/Header";
import Spinner from "../../components/super-admin/Spinner";
import { connectSocket, SOCKET_EVENTS } from "../../services/socket";
import {
  getActivityLogs,
  getActivityLogSummary,
  deleteActivityLog,
  purgeActivityLogs,
  setAuthToken,
  logout,
} from "../../services/api";
import {
  FaSearch,
  FaFilter,
  FaTrash,
  FaSync,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaBan,
  FaUser,
} from "react-icons/fa";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTION_TYPES = ["LOGIN", "LOGIN_FAILED", "CREATE", "READ", "UPDATE", "DELETE"];
const MODULE_NAMES = [
  "AUTH", "USER", "ROLE", "COMPANY", "BRANCH", "CUSTOMER", "TABLE",
  "TABLE_ASSIGNMENT", "RESERVATION", "WAITER", "CATEGORY", "PRODUCT",
  "BRANCH_PRODUCT", "RECIPE", "RAW_MATERIAL", "WASTE", "SUPPLIER",
  "PURCHASE_ORDER", "PURCHASE_ITEM", "SUPPLIER_PAYMENT", "ORDER",
  "ORDER_ITEM", "PAYMENT", "DISCOUNT", "DELIVERY", "TERMINAL",
  "DASHBOARD", "STATS", "REPORT", "PAYHERE", "ACTIVITY_LOG",
];

// ─── Color helpers ─────────────────────────────────────────────────────────────
const ACTION_COLORS = {
  LOGIN:        { bg: "#DCFCE7", color: "#16A34A" },
  LOGIN_FAILED: { bg: "#FEE2E2", color: "#DC2626" },
  CREATE:       { bg: "#DBEAFE", color: "#1D4ED8" },
  READ:         { bg: "#F3F4F6", color: "#6B7280" },
  UPDATE:       { bg: "#FEF9C3", color: "#CA8A04" },
  DELETE:       { bg: "#FEE2E2", color: "#DC2626" },
};

const getActionStyle = (action) =>
  ACTION_COLORS[action] ?? { bg: "#F3F4F6", color: "#374151" };

// ─── Sub-components ────────────────────────────────────────────────────────────
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
      <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{value}</div>
    </div>
  </div>
);

// ─── Toast notification ────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  const colors = {
    success: { bg: "#DCFCE7", color: "#16A34A", border: "#BBF7D0" },
    error:   { bg: "#FEE2E2", color: "#DC2626", border: "#FECACA" },
    info:    { bg: "#DBEAFE", color: "#1D4ED8", border: "#BFDBFE" },
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
      {type === "error"   && <FaTimesCircle />}
      {type === "info"    && <FaInfoCircle />}
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

// ─── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, onConfirm, onCancel, danger }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 8000,
    }}
    onClick={onCancel}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: "32px 36px",
        width: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: danger ? "#FEE2E2" : "#FEF9C3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 18px",
          fontSize: 24,
          color: danger ? "#DC2626" : "#CA8A04",
        }}
      >
        <FaExclamationTriangle />
      </div>
      <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: "#111827" }}>{title}</h3>
      <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "1px solid #E5E7EB",
            background: "#F9FAFB",
            color: "#374151",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: danger ? "#DC2626" : "#2E3E8F",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          {danger ? "Delete" : "Confirm"}
        </button>
      </div>
    </div>
  </div>
);

// ─── Purge Modal ───────────────────────────────────────────────────────────────
const PurgeModal = ({ onConfirm, onCancel }) => {
  const [before, setBefore] = useState("");
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 8000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "32px 36px",
          width: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#FEE2E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#DC2626",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            <FaBan />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>
            Bulk Purge Logs
          </h3>
        </div>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 18, lineHeight: 1.6 }}>
          Permanently delete all activity logs created <strong>before</strong> the selected date.
          This action cannot be undone.
        </p>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
          Delete all logs before:
        </label>
        <input
          type="date"
          value={before}
          onChange={(e) => setBefore(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #D1D5DB",
            fontSize: 14,
            marginBottom: 24,
            boxSizing: "border-box",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              background: "#F9FAFB",
              color: "#374151",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => before && onConfirm(before)}
            disabled={!before}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: "none",
              background: before ? "#DC2626" : "#FCA5A5",
              color: "#fff",
              fontWeight: 700,
              cursor: before ? "pointer" : "not-allowed",
              fontSize: 14,
            }}
          >
            Purge Logs
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────
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
  const [logs, setLogs]       = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isMockData, setIsMockData] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search:      "",
    action_type: "",
    module_name: "",
    from:        "",
    to:          "",
  });
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // UI state
  const [toast, setToast]               = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // log_id to delete
  const [showPurge, setShowPurge]       = useState(false);
  const [deleting, setDeleting]         = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── fetch ─────────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filters.search)      params.search      = filters.search;
      if (filters.action_type) params.action_type = filters.action_type;
      if (filters.module_name) params.module_name = filters.module_name;
      if (filters.from)        params.from        = filters.from;
      if (filters.to)          params.to          = filters.to;

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
      // Set empty state to prevent UI breakage
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getActivityLogSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
      // Set default summary to prevent UI breakage
      setSummary({
        byAction: [],
        byModule: [],
        recent: []
      });
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

  // ── delete single ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteActivityLog(deleteTarget);
      showToast("Log entry deleted successfully", "success");
      setDeleteTarget(null);
      fetchLogs();
      fetchSummary();
    } catch (err) {
      showToast("Failed to delete log entry", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── purge ─────────────────────────────────────────────────────────────────────
  const handlePurge = async (before) => {
    setDeleting(true);
    try {
      const result = await purgeActivityLogs({ before });
      const deletedCount = result.deleted ?? 0;
      if (result._mock) {
        showToast(result.message || "Purge feature is not yet implemented", "info");
      } else {
        showToast(`Purged ${deletedCount} log entries`, "success");
      }
      setShowPurge(false);
      fetchLogs();
      fetchSummary();
    } catch (err) {
      showToast("Failed to purge logs", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── filter change ─────────────────────────────────────────────────────────────
  const onFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  // ── format date ───────────────────────────────────────────────────────────────
  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      year:   "numeric",
      month:  "short",
      day:    "2-digit",
      hour:   "2-digit",
      minute: "2-digit",
    });
  };

  // ── summary numbers ───────────────────────────────────────────────────────────
  const totalActions = summary?.byAction?.reduce((s, a) => s + parseInt(a.count), 0) ?? 0;
  const loginCount   = summary?.byAction?.find((a) => a.action_type === "LOGIN")?.count ?? 0;
  const createCount  = summary?.byAction?.find((a) => a.action_type === "CREATE")?.count ?? 0;
  const deleteCount  = summary?.byAction?.find((a) => a.action_type === "DELETE")?.count ?? 0;
  const tableHeaders = ["#", "User", "Company / Branch", "Action", "Module", "Description", "Timestamp"];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Inter', sans-serif" }}>
      <ShellSidebar />

      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
        <ShellHeader title="Activity Log" />

        <div style={{ padding: "24px 28px", flex: 1 }}>

          {/* ── Summary Cards ─────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <SummaryCard
              icon={<FaFilter />}
              label="Total Events"
              value={totalActions.toLocaleString()}
              bg="#EFF6FF"
              iconColor="#3B82F6"
            />
            <SummaryCard
              icon={<FaCheckCircle />}
              label="Logins"
              value={parseInt(loginCount).toLocaleString()}
              bg="#DCFCE7"
              iconColor="#16A34A"
            />
            <SummaryCard
              icon={<FaInfoCircle />}
              label="Creates"
              value={parseInt(createCount).toLocaleString()}
              bg="#DBEAFE"
              iconColor="#1D4ED8"
            />
            <SummaryCard
              icon={<FaTimesCircle />}
              label="Deletes"
              value={parseInt(deleteCount).toLocaleString()}
              bg="#FEE2E2"
              iconColor="#DC2626"
            />
          </div>

          {/* ── Toolbar ───────────────────────────────────────────── */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "18px 20px",
              marginBottom: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {/* Row 1: search + action buttons */}
            <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              {/* Search */}
              <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
                <FaSearch
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9CA3AF",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="log-search"
                  value={filters.search}
                  onChange={(e) => onFilterChange("search", e.target.value)}
                  placeholder="Search description…"
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 36px",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                {/* Refresh */}
                <button
                  id="btn-refresh-logs"
                  onClick={() => { fetchLogs(); fetchSummary(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 16px",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    background: "#F9FAFB",
                    color: "#374151",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <FaSync size={12} /> Refresh
                </button>

                {canManageLogs && (
                  <button
                    id="btn-purge-logs"
                    onClick={() => setShowPurge(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "9px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "#FEE2E2",
                      color: "#DC2626",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <FaBan size={12} /> Bulk Purge
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: filters */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {/* Action Type */}
              <select
                id="filter-action-type"
                value={filters.action_type}
                onChange={(e) => onFilterChange("action_type", e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 13,
                  color: "#374151",
                  background: "#fff",
                  cursor: "pointer",
                  outline: "none",
                  flex: "1 1 150px",
                }}
              >
                <option value="">All Actions</option>
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {/* Module */}
              <select
                id="filter-module-name"
                value={filters.module_name}
                onChange={(e) => onFilterChange("module_name", e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 13,
                  color: "#374151",
                  background: "#fff",
                  cursor: "pointer",
                  outline: "none",
                  flex: "1 1 160px",
                }}
              >
                <option value="">All Modules</option>
                {MODULE_NAMES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* Date From */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 180px" }}>
                <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, whiteSpace: "nowrap" }}>
                  From:
                </label>
                <input
                  id="filter-from-date"
                  type="date"
                  value={filters.from}
                  onChange={(e) => onFilterChange("from", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 13,
                    outline: "none",
                    flex: 1,
                  }}
                />
              </div>

              {/* Date To */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 180px" }}>
                <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, whiteSpace: "nowrap" }}>
                  To:
                </label>
                <input
                  id="filter-to-date"
                  type="date"
                  value={filters.to}
                  onChange={(e) => onFilterChange("to", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 13,
                    outline: "none",
                    flex: 1,
                  }}
                />
              </div>

              {/* Clear filters */}
              {(filters.search || filters.action_type || filters.module_name || filters.from || filters.to) && (
                <button
                  id="btn-clear-filters"
                  onClick={() => {
                    setFilters({ search: "", action_type: "", module_name: "", from: "", to: "" });
                    setPage(1);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    background: "#fff",
                    color: "#6B7280",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Mock data notice */}
          {isMockData && (
            <div style={{
              background: "#FEF3C7",
              border: "1px solid #F59E0B",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#92400E",
              fontSize: 13,
            }}>
              <FaInfoCircle />
              <span>Activity logs are not yet implemented on the backend. Showing mock data.</span>
            </div>
          )}

          {/* ── Table ─────────────────────────────────────────────── */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {/* Table header row with record count */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #F3F4F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                Activity Logs
              </span>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                {total.toLocaleString()} total record{total !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: "60px 0", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 12 }}>
                <Spinner size={40} />
                <p style={{ margin: 0, color: "#6B7280", fontSize: 14, fontWeight: 600 }}>Loading logs…</p>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ padding: "60px 0", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p style={{ margin: 0, color: "#9CA3AF", fontSize: 14 }}>No activity logs found</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      {[...tableHeaders, ...(canManageLogs ? [""] : [])].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 14px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#6B7280",
                            borderBottom: "1px solid #F3F4F6",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => {
                      const actionStyle = getActionStyle(log.action_type);
                      
                      // Improved user name handling - check all possible user fields
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
                      
                      // If still empty, show "System" or "Unknown"
                      if (userName === "—" || userName === "" || userName === "undefined" || userName === "null") {
                        // Check if this is a system/auto action
                        if (log.action_type === "LOGIN" || log.action_type === "LOGIN_FAILED") {
                          userName = "System";
                        } else {
                          userName = "Unknown User";
                        }
                      }
                      
                      const contextLabel = [log.com_name, log.branch_name].filter(Boolean).join(" / ") || "—";

                      return (
                        <tr
                          key={log.log_id || idx}
                          style={{
                            borderBottom: "1px solid #F3F4F6",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {/* # */}
                          <td style={cellStyle}>
                            <span style={{ color: "#9CA3AF", fontSize: 12 }}>
                              {(page - 1) * LIMIT + idx + 1}
                            </span>
                          </td>

                          {/* User - Improved with fallback */}
                          <td style={cellStyle}>
                            <div style={{ 
                              fontSize: 13, 
                              fontWeight: 600, 
                              color: userName === "System" || userName === "Unknown User" ? "#9CA3AF" : "#111827",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px"
                            }}>
                              {userName === "System" && <FaUser size={10} style={{ color: "#9CA3AF" }} />}
                              {userName}
                            </div>
                            {log.u_email && (
                              <div style={{ fontSize: 11, color: "#9CA3AF" }}>{log.u_email}</div>
                            )}
                          </td>

                          {/* Company / Branch */}
                          <td style={cellStyle}>
                            <span style={{ fontSize: 12, color: "#374151" }}>{contextLabel}</span>
                          </td>

                          {/* Action */}
                          <td style={cellStyle}>
                            <Badge
                              text={log.action_type || "UNKNOWN"}
                              bg={actionStyle.bg}
                              color={actionStyle.color}
                            />
                          </td>

                          {/* Module */}
                          <td style={cellStyle}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#2E3E8F",
                                background: "#EEF2FF",
                                padding: "3px 8px",
                                borderRadius: 6,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {log.module_name || "—"}
                            </span>
                          </td>

                          {/* Description */}
                          <td style={{ ...cellStyle, maxWidth: 280 }}>
                            <span
                              title={log.description}
                              style={{
                                fontSize: 12,
                                color: "#374151",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {log.description || "—"}
                            </span>
                          </td>

                          {/* Timestamp */}
                          <td style={cellStyle}>
                            <span style={{ fontSize: 12, color: "#374151", whiteSpace: "nowrap" }}>
                              {formatDate(log.created_at)}
                            </span>
                          </td>

                          {canManageLogs && (
                            <td style={{ ...cellStyle, textAlign: "center" }}>
                              <button
                                id={`btn-delete-log-${log.log_id || idx}`}
                                title="Delete this log entry"
                                onClick={() => setDeleteTarget(log.log_id || idx)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#FCA5A5",
                                  fontSize: 14,
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  transition: "color 0.2s, background 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "#DC2626";
                                  e.currentTarget.style.background = "#FEE2E2";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#FCA5A5";
                                  e.currentTarget.style.background = "none";
                                }}
                              >
                                <FaTrash />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination ─────────────────────────────────────── */}
            {totalPages > 1 && (
              <div
                style={{
                  padding: "16px 20px",
                  borderTop: "1px solid #F3F4F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 13, color: "#6B7280" }}>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  &nbsp;·&nbsp;{total.toLocaleString()} records
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    id="btn-prev-page"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: "1px solid #E5E7EB",
                      background: page <= 1 ? "#F9FAFB" : "#fff",
                      color: page <= 1 ? "#D1D5DB" : "#374151",
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <FaChevronLeft size={10} /> Prev
                  </button>

                  {/* Page number pills */}
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
                    return (
                      <button
                        key={p}
                        id={`btn-page-${p}`}
                        onClick={() => setPage(p)}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 8,
                          border: p === page ? "none" : "1px solid #E5E7EB",
                          background: p === page ? "#2E3E8F" : "#fff",
                          color: p === page ? "#fff" : "#374151",
                          fontWeight: p === page ? 700 : 500,
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    id="btn-next-page"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: "1px solid #E5E7EB",
                      background: page >= totalPages ? "#F9FAFB" : "#fff",
                      color: page >= totalPages ? "#D1D5DB" : "#374151",
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Next <FaChevronRight size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
      {canManageLogs && deleteTarget && (
        <ConfirmModal
          title="Delete Log Entry"
          message="Are you sure you want to permanently delete this log entry? This action cannot be undone."
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {canManageLogs && showPurge && (
        <PurgeModal
          onConfirm={handlePurge}
          onCancel={() => setShowPurge(false)}
        />
      )}

      {/* ── Toast ───────────────────────────────────────────────── */}
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

const cellStyle = {
  padding: "12px 14px",
  fontSize: 13,
  color: "#374151",
  verticalAlign: "middle",
};

export default ActivityLog;