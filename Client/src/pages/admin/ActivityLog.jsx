import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminHeader from "../../components/admin/Header";
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

const ACTION_TYPES = ["LOGIN", "LOGIN_FAILED", "CREATE", "READ", "UPDATE", "DELETE"];
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
	CREATE: { bg: "#DBEAFE", color: "#1D4ED8" },
	READ: { bg: "#F3F4F6", color: "#6B7280" },
	UPDATE: { bg: "#FEF9C3", color: "#CA8A04" },
	DELETE: { bg: "#FEE2E2", color: "#DC2626" },
};

const getActionStyle = (action) => ACTION_COLORS[action] ?? { bg: "#F3F4F6", color: "#374151" };

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

const ActivityLog = () => {
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

	const showToast = (message, type = "info") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 4000);
	};

	const fetchLogs = useCallback(async () => {
		setLoading(true);
		try {
			const params = { page, limit: LIMIT };
			if (filters.search) params.search = filters.search;
			if (filters.action_type) params.action_type = filters.action_type;
			if (filters.module_name) params.module_name = filters.module_name;
			if (filters.from) params.from = filters.from;
			if (filters.to) params.to = filters.to;
			if (companyId) params.com_id = companyId;

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
	}, [page, filters, companyId]);

	const fetchSummary = useCallback(async () => {
		try {
			const params = companyId ? { com_id: companyId } : {};
			const data = await getActivityLogSummary(params);
			setSummary(data);
		} catch (err) {
			console.error("Failed to fetch summary:", err);
			setSummary({ byAction: [], byModule: [], recent: [] });
		}
	}, [companyId]);

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

	const totalActions = summary?.byAction?.reduce((sum, action) => sum + parseInt(action.count), 0) ?? 0;
	const loginCount = summary?.byAction?.find((action) => action.action_type === "LOGIN")?.count ?? 0;
	const createCount = summary?.byAction?.find((action) => action.action_type === "CREATE")?.count ?? 0;
	const deleteCount = summary?.byAction?.find((action) => action.action_type === "DELETE")?.count ?? 0;
	const tableHeaders = ["#", "User", "Company / Branch", "Action", "Module", "Description", "Timestamp"];

	return (
		<div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Inter', sans-serif" }}>
			<AdminSidebar />

			<div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
				<AdminHeader title="Activity Log" />

				<div style={{ padding: "24px 28px", flex: 1 }}>
					<div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
						<SummaryCard icon={<FaFilter />} label="Total Events" value={totalActions.toLocaleString()} bg="#EFF6FF" iconColor="#3B82F6" />
						<SummaryCard icon={<FaCheckCircle />} label="Logins" value={parseInt(loginCount).toLocaleString()} bg="#DCFCE7" iconColor="#16A34A" />
						<SummaryCard icon={<FaInfoCircle />} label="Creates" value={parseInt(createCount).toLocaleString()} bg="#DBEAFE" iconColor="#1D4ED8" />
						<SummaryCard icon={<FaTimesCircle />} label="Deletes" value={parseInt(deleteCount).toLocaleString()} bg="#FEE2E2" iconColor="#DC2626" />
					</div>

					<div
						style={{
							background: "#fff",
							borderRadius: 14,
							padding: "18px 20px",
							marginBottom: 20,
							boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
						}}
					>
						<div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
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
								<button
									id="btn-refresh-logs"
									onClick={() => {
										fetchLogs();
										fetchSummary();
									}}
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
							</div>
						</div>

						<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
								{ACTION_TYPES.map((action) => (
									<option key={action} value={action}>{action}</option>
								))}
							</select>

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
								{MODULE_NAMES.map((moduleName) => (
									<option key={moduleName} value={moduleName}>{moduleName}</option>
								))}
							</select>

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

					{isMockData && (
						<div
							style={{
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
							}}
						>
							<FaInfoCircle />
							<span>Activity logs are not yet implemented on the backend. Showing mock data.</span>
						</div>
					)}

					<div
						style={{
							background: "#fff",
							borderRadius: 14,
							overflow: "hidden",
							boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
						}}
					>
						<div
							style={{
								padding: "14px 20px",
								borderBottom: "1px solid #F3F4F6",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Activity Logs</span>
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
											{tableHeaders.map((header) => (
												<th
													key={header}
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
													{header}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{logs.map((log, idx) => {
											const actionStyle = getActionStyle(log.action_type);

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
												<tr
													key={log.log_id || idx}
													style={{
														borderBottom: "1px solid #F3F4F6",
														transition: "background 0.15s",
													}}
													onMouseEnter={(event) => (event.currentTarget.style.background = "#F9FAFB")}
													onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
												>
													<td style={{ padding: "14px", fontSize: 13, color: "#6B7280" }}>{idx + 1 + (page - 1) * LIMIT}</td>
													<td style={{ padding: "14px", fontSize: 13, color: "#111827", fontWeight: 500 }}>{userName}</td>
													<td style={{ padding: "14px", fontSize: 13, color: "#6B7280" }}>{contextLabel}</td>
													<td style={{ padding: "14px" }}>
														<Badge text={log.action_type || "—"} bg={actionStyle.bg} color={actionStyle.color} />
													</td>
													<td style={{ padding: "14px" }}>
														<Badge text={log.module_name || "—"} bg="#E0E7FF" color="#4338CA" />
													</td>
													<td style={{ padding: "14px", fontSize: 13, color: "#374151", maxWidth: 320 }}>
														<div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={log.description}>
															{log.description || "—"}
														</div>
													</td>
													<td style={{ padding: "14px", fontSize: 13, color: "#6B7280", whiteSpace: "nowrap" }}>{formatDate(log.created_at)}</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>

					{totalPages > 1 && (
						<div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
							<button
								onClick={() => setPage((current) => Math.max(1, current - 1))}
								disabled={page === 1}
								style={{
									padding: "8px 12px",
									borderRadius: 8,
									border: "1px solid #E5E7EB",
									background: page === 1 ? "#F9FAFB" : "#fff",
									color: page === 1 ? "#9CA3AF" : "#374151",
									cursor: page === 1 ? "not-allowed" : "pointer",
								}}
							>
								Previous
							</button>
							<button
								onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
								disabled={page >= totalPages}
								style={{
									padding: "8px 12px",
									borderRadius: 8,
									border: "1px solid #E5E7EB",
									background: page >= totalPages ? "#F9FAFB" : "#fff",
									color: page >= totalPages ? "#9CA3AF" : "#374151",
									cursor: page >= totalPages ? "not-allowed" : "pointer",
								}}
							>
								Next
							</button>
						</div>
					)}
				</div>
			</div>

			{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
		</div>
	);
};

export default ActivityLog;
