import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import { useAuth } from "../../context/AuthContext";
import {
	getOrders,
	getUsers,
	getBranchProducts,
	getOrderItems,
	getRawMaterials,
	getLowStockMaterials,
} from "../../services/api";
import { connectSocket, subscribeToBranchAdminDashboardUpdates } from "../../services/socket";
import { useTranslation } from "react-i18next";

const formatCurrency = (value) => {
	const number = Number(value || 0);
	if (Number.isNaN(number)) return "$0.00";
	return `$${number.toFixed(2)}`;
};

/* ===== Design components (Branch Admin dashboard redesign) ===== */
const BD_PANEL = "rounded-[14px] border border-[#E7E3D8] bg-white p-6";
const BD_PANEL_TITLE = "font-space text-[15px] font-bold text-[#071E38]";
const BD_PANEL_SUB = "mt-0.5 text-xs text-[#5B6470]";
const BD_OUTLINE_BTN = "inline-flex flex-shrink-0 items-center gap-[7px] whitespace-nowrap rounded-lg border-[1.5px] border-[#E7E3D8] bg-white px-4 py-[9px] text-[13px] font-semibold text-[#071E38] transition-colors hover:border-[#0F9B8E] hover:text-[#0F9B8E]";
const BD_TONES = {
	teal: "bg-[#0F9B8E]/10 text-[#0F9B8E]",
	navy: "bg-[#0B2E4F]/[0.08] text-[#0B2E4F]",
	brass: "bg-[#D9A15C]/15 text-[#D9A15C]",
	coral: "bg-[#E0654F]/10 text-[#E0654F]",
};
const BdMoneyIcon = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>;
const BdBagIcon = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18" /></svg>;
const BdStarIcon = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l3 6 6.5 1-4.7 4.5L18 20l-6-3-6 3 1.2-6.5L2 9l6.5-1z" /></svg>;
const BdUsersIcon = ({ size = 19 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>;
const BdTableIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8" /></svg>;
const BdCheckIcon = () => <svg className="flex-shrink-0 text-[#3CAE49]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>;
const BdWarningIcon = () => <svg className="flex-shrink-0 text-[#E0654F]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9V13M12 17H12.01" /><path d="M10.3 3.9L2.5 17a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0Z" /></svg>;

function BdKpiCard({ icon, tone, label, value }) {
	return (
		<div className="flex items-center gap-3.5 rounded-[14px] border border-[#E7E3D8] bg-white p-5">
			<div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] ${BD_TONES[tone]}`}>{icon}</div>
			<div className="min-w-0">
				<div className="mb-[3px] text-xs text-[#5B6470]">{label}</div>
				<div className="truncate font-space text-base font-bold text-[#071E38]">{value}</div>
			</div>
		</div>
	);
}

function BdEmptyState({ icon, title, sub }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 py-7 text-center">
			<div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#FBFAF7] text-[#5B6470]">{icon}</div>
			<div className="text-[13px] font-semibold text-[#071E38]">{title}</div>
			<div className="text-[11.5px] text-[#5B6470]">{sub}</div>
		</div>
	);
}
/* ===== End of design components ===== */

const Dashboard = () => {
	const { user, features } = useAuth();
	const inventoryEnabled = features?.has_inventory === true;
	const navigate = useNavigate();
	const [orders, setOrders] = useState([]);
	const [orderItems, setOrderItems] = useState([]);
	const [branchProducts, setBranchProducts] = useState([]);
	const [rawMaterials, setRawMaterials] = useState([]);
	const [lowStockMaterials, setLowStockMaterials] = useState([]);
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [activeCashierTab, setActiveCashierTab] = useState("Bar");

	// Socket connection and real-time dashboard listeners
	useEffect(() => {
		if (!user?.b_id) return;

		connectSocket();

		const handleRefresh = () => {
			console.log("WebSocket event: refreshing branch admin dashboard...");
			setRefreshTrigger((prev) => prev + 1);
		};

		const unsubscribe = subscribeToBranchAdminDashboardUpdates(user.b_id, {
			onRefresh: handleRefresh,
		});

		return () => {
			unsubscribe();
		};
	}, [user?.b_id]);
	const { t } = useTranslation();

	useEffect(() => {
		let isMounted = true;

		const loadDashboard = async () => {
			setIsLoading(true);
			setError("");

			const today = new Date().toISOString().split("T")[0];
			const orderParams = { date: today };
			if (user?.b_id) {
				orderParams.b_id = user.b_id;
			}

			const apiCalls = [
				getOrders(orderParams),
				getUsers(),
				getBranchProducts(),
				getOrderItems(),
			];

			if (inventoryEnabled) {
				apiCalls.push(getRawMaterials(), getLowStockMaterials());
			}

			const results = await Promise.allSettled(apiCalls);

			if (!isMounted) return;

			const nextOrdersRaw = results[0]?.status === "fulfilled" ? results[0].value : [];
			const nextOrders = Array.isArray(nextOrdersRaw) ? nextOrdersRaw.filter(
				(o) => o.or_status === "completed" || o.pay_status === "paid"
			) : [];
			const nextUsers = results[1]?.status === "fulfilled" ? results[1].value : [];
			const nextBranchProducts = results[2]?.status === "fulfilled" ? results[2].value : [];
			const nextOrderItems = results[3]?.status === "fulfilled" ? results[3].value : [];

			let nextRawMaterials = [];
			let nextLowStock = [];

			if (inventoryEnabled) {
				nextRawMaterials = results[4]?.status === "fulfilled" ? results[4].value : [];
				nextLowStock = results[5]?.status === "fulfilled" ? results[5].value : [];
			}

			setOrders(Array.isArray(nextOrders) ? nextOrders : []);
			setUsers(Array.isArray(nextUsers) ? nextUsers : []);
			setBranchProducts(Array.isArray(nextBranchProducts) ? nextBranchProducts : []);
			setOrderItems(Array.isArray(nextOrderItems) ? nextOrderItems : []);
			setRawMaterials(Array.isArray(nextRawMaterials) ? nextRawMaterials : []);
			setLowStockMaterials(Array.isArray(nextLowStock) ? nextLowStock : []);

			setIsLoading(false);
		};

		loadDashboard();

		return () => {
			isMounted = false;
		};
	}, [user?.b_id, inventoryEnabled, refreshTrigger]);

	const cashierUsers = useMemo(
		() => users.filter((item) => Number(item?.role_id) === 3),
		[users],
	);

	const orderIds = useMemo(() => new Set(orders.map((order) => order.or_id)), [orders]);

	const totalRevenue = useMemo(() => {
		return orders.reduce((sum, order) => {
			const value = Number(order.or_totalCostWtax ?? order.or_totalcost ?? 0);
			if (Number.isNaN(value)) return sum;
			return sum + value;
		}, 0);
	}, [orders]);

	const productNameById = useMemo(() => {
		const map = new Map();
		branchProducts.forEach((product) => {
			if (product?.Bpro_id) {
				map.set(product.Bpro_id, product.pro_name || `Item ${product.Bpro_id}`);
			}
		});
		return map;
	}, [branchProducts]);

	const topSelling = useMemo(() => {
		const tally = new Map();

		orderItems.forEach((item) => {
			if (!orderIds.has(item?.order_id)) return;
			const key = item?.Bpro_id;
			if (!key) return;
			const qty = Number(item?.pro_quantity ?? 0);
			tally.set(key, (tally.get(key) || 0) + (Number.isNaN(qty) ? 0 : qty));
		});

		let bestId = null;
		let bestQty = 0;
		tally.forEach((qty, id) => {
			if (qty > bestQty) {
				bestQty = qty;
				bestId = id;
			}
		});

		return {
			name: bestId ? productNameById.get(bestId) || `Item ${bestId}` : "-",
			qty: bestQty,
		};
	}, [orderIds, orderItems, productNameById]);

	const cashierStats = useMemo(() => {
		const totals = new Map();
		orders.forEach((order) => {
			const cashierId = order?.u_id;
			if (!cashierId) return;
			const total = Number(order.or_totalCostWtax ?? order.or_totalcost ?? 0);
			if (Number.isNaN(total)) return;
			totals.set(cashierId, (totals.get(cashierId) || 0) + total);
		});

		return cashierUsers.map((cashier, index) => {
			const revenue = totals.get(cashier.u_id) || 0;
			return {
				id: cashier.u_id,
				name: `${cashier.u_fname || ""} ${cashier.u_lname || ""}`.trim() || "Staff",
				revenue,
				rank: index + 1,
			};
		});
	}, [cashierUsers, orders]);

	const topStaff = useMemo(() => {
		const sorted = [...cashierStats].sort((a, b) => b.revenue - a.revenue);
		return sorted.slice(0, 3);
	}, [cashierStats]);

	const maxStaffRevenue = useMemo(() => {
		return topStaff.reduce((max, staff) => Math.max(max, staff.revenue), 0);
	}, [topStaff]);

	const stockItems = useMemo(() => {
		return rawMaterials.slice(0, 4);
	}, [rawMaterials]);

	const maxStockQty = useMemo(() => {
		return stockItems.reduce((max, item) => Math.max(max, Number(item?.stock_qty ?? 0)), 0);
	}, [stockItems]);

	const lowStockItem = lowStockMaterials[0];
	const cashierAreas = ["Bar", "Restaurant", "Spa", "Reception"];

	// Cashier rows for the selected area tab
	const cashierRows = cashierStats
		.map((cashier, index) => ({
			cashier,
			// NOTE: areas are assigned in rotation (same logic as before) until real area data exists
			area: cashierAreas[index % cashierAreas.length],
			percent: totalRevenue > 0 ? Math.round((cashier.revenue / totalRevenue) * 100) : 0,
		}))
		.filter((row) => row.area === activeCashierTab);

	const kpiValue = (value) => (isLoading
		? <span className="text-[13px] font-medium italic text-[#5B6470]">{t("branch_admin.awaiting_data", "Awaiting data")}</span>
		: value);

	return (
		<>
			<Sidebar />
			<div style={{ marginLeft: 240, background: "#F7F5F0", minHeight: "100vh" }}>
				<Header title={t("branch_admin.branch_admin_overview", "Branch Admin Overview")} showAddUserIcon={false} />

				<div className="px-9 py-8">
					{/* Heading */}
					<div className="mb-[22px] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h3 className="mb-1 font-space text-xl font-bold text-[#071E38]">{t("branch_admin.today_s_sales", "Today's Sales")}</h3>
							<p className="text-[13px] text-[#5B6470]">{t("branch_admin.sales_summary", "Sales summary")}</p>
						</div>
						<button type="button" onClick={() => navigate("/branch-admin/transactions")} className={BD_OUTLINE_BTN}>
							{t("branch_admin.see_transactions", t("buttons.see_transactions", "See Transactions"))}
						</button>
					</div>

					{/* Summary cards */}
					<div className="mb-6 grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
						<BdKpiCard tone="teal" icon={<BdMoneyIcon />} label={t("branch_admin.total_revenue", "Total Revenue")} value={kpiValue(formatCurrency(totalRevenue))} />
						<BdKpiCard tone="navy" icon={<BdBagIcon />} label={t("branch_admin.total_sales", "Total Sales")} value={kpiValue(String(orders.length))} />
						<BdKpiCard tone="brass" icon={<BdStarIcon />} label={t("branch_admin.top_selling_item", "Top Selling Item")} value={kpiValue(topSelling.name)} />
						<BdKpiCard tone="coral" icon={<BdUsersIcon />} label={t("branch_admin.active_staff", "Active Staff")} value={kpiValue(String(cashierUsers.length))} />
					</div>

					{error && (
						<div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
							{error}
						</div>
					)}

					{/* Today's Staff + Inventory Updates */}
					<div className={`mb-5 grid grid-cols-1 gap-5 ${inventoryEnabled ? "lg:grid-cols-2" : ""}`}>
						<div className={BD_PANEL}>
							<div className="mb-[18px]">
								<h4 className={BD_PANEL_TITLE}>{t("branch_admin.todays_staff_title", "Today's Staff")}</h4>
								<p className={BD_PANEL_SUB}>{t("branch_admin.staff_performance", "Staff performance")}</p>
							</div>
							{isLoading ? (
								<div className="space-y-4">
									{[0, 1].map((n) => <div key={n} className="h-14 animate-pulse rounded-xl bg-[#FBFAF7]" />)}
								</div>
							) : topStaff.length === 0 ? (
								<BdEmptyState icon={<BdUsersIcon size={18} />} title={t("branch_admin.no_staff_activity", "No staff activity yet today")} sub={t("branch_admin.no_staff_activity_sub", "Performance will appear here once shifts start")} />
							) : (
								<div className="space-y-4">
									{topStaff.map((staff) => {
										const percent = maxStaffRevenue > 0 ? Math.round((staff.revenue / maxStaffRevenue) * 100) : 0;
										return (
											<div key={staff.id} className="flex items-center gap-3">
												<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0F9B8E]/10 font-space text-xs font-bold text-[#0F9B8E]">
													{staff.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex items-center justify-between gap-2">
														<div className="truncate text-[13px] font-semibold text-[#071E38]">{staff.name}</div>
														<div className="text-xs font-bold text-[#0F9B8E]">{percent}%</div>
													</div>
													<div className="text-[11.5px] text-[#5B6470]">{t("branch_admin.cashier", "Cashier")}</div>
													<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EFEBE2]">
														<div className="h-full rounded-full bg-[#0F9B8E]" style={{ width: `${percent}%` }} />
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>

						{inventoryEnabled && (
							<div className={BD_PANEL}>
								<div className="mb-[18px] flex items-start justify-between gap-3">
									<div>
										<h4 className={BD_PANEL_TITLE}>{t("branch_admin.inventory_updates", "Inventory Updates")}</h4>
										<p className={BD_PANEL_SUB}>{t("branch_admin.current_stock_levels", "Current stock levels")}</p>
									</div>
									<button type="button" onClick={() => navigate("/branch-admin/inventory")} className={BD_OUTLINE_BTN}>
										{t("branch_admin.go_to_inventory_page", "Go to Inventory Page")}
									</button>
								</div>

								{/* Green banner when all good, coral warning when something is low */}
								{lowStockItem ? (
									<div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[#E0654F]/30 bg-[#E0654F]/[0.08] px-4 py-3">
										<BdWarningIcon />
										<div className="min-w-0 flex-1">
											<div className="text-[12.5px] font-bold text-[#071E38]">{t("branch_admin.low_stock_alert", "Low Stock Alert")}</div>
											<div className="truncate text-[11.5px] text-[#5B6470]">
												{lowStockItem.rm_name}{lowStockMaterials.length > 1 ? ` +${lowStockMaterials.length - 1} ${t("branch_admin.more", "more")}` : ""}
											</div>
										</div>
										<div className="text-[13px] font-bold text-[#E0654F]">{Number(lowStockItem.stock_qty ?? 0)} {t("branch_admin.left", "left")}</div>
									</div>
								) : !isLoading && (
									<div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[#3CAE49]/25 bg-[#3CAE49]/[0.08] px-4 py-3">
										<BdCheckIcon />
										<div>
											<div className="text-[12.5px] font-bold text-[#071E38]">{t("branch_admin.no_low_stock_alerts", "No low stock alerts")}</div>
											<div className="text-[11.5px] text-[#5B6470]">{t("branch_admin.all_items_well_stocked", "All tracked items are currently well stocked")}</div>
										</div>
									</div>
								)}

								<div className="space-y-4">
									{isLoading && [0, 1, 2].map((n) => <div key={n} className="h-11 animate-pulse rounded-xl bg-[#FBFAF7]" />)}
									{!isLoading && stockItems.map((item) => {
										const stockQty = Number(item.stock_qty ?? 0);
										const percent = maxStockQty > 0 ? Math.round((stockQty / maxStockQty) * 100) : 0;
										return (
											<div key={item.rm_id} className="flex items-center gap-3">
												<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#FBFAF7] font-space text-xs font-bold text-[#5B6470]">
													{item.rm_name?.slice(0, 2)?.toUpperCase() || "RM"}
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex items-center justify-between gap-2">
														<div className="truncate text-[13px] font-semibold text-[#071E38]">{item.rm_name}</div>
														<div className="whitespace-nowrap text-xs font-semibold text-[#5B6470]">{stockQty} {item.unit || ""}</div>
													</div>
													<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EFEBE2]">
														<div className="h-full rounded-full bg-[#0F9B8E]" style={{ width: `${percent}%` }} />
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>

					{/* Today's Cashiers */}
					<div className={BD_PANEL}>
						<div className="mb-[18px]">
							<h4 className={BD_PANEL_TITLE}>{t("branch_admin.todays_cashiers_title", "Today's Cashiers")}</h4>
							<p className={BD_PANEL_SUB}>{t("branch_admin.work_distribution", "Work distribution")}</p>
						</div>

						<div className="mb-[18px] flex flex-wrap gap-2">
							{cashierAreas.map((area) => (
								<button
									key={area}
									type="button"
									onClick={() => setActiveCashierTab(area)}
									className={`rounded-full border-[1.5px] px-4 py-[7px] text-[12.5px] font-semibold transition-colors ${activeCashierTab === area ? "border-[#071E38] bg-[#071E38] text-white" : "border-[#E7E3D8] bg-white text-[#5B6470] hover:border-[#071E38]"}`}
								>
									{area}
								</button>
							))}
						</div>

						<div className="overflow-x-auto">
							<table className="w-full border-collapse">
								<thead>
									<tr>
										{["#", t("branch_admin.name", "Name"), t("branch_admin.area", "Area"), t("branch_admin.sales_percent_title", "Sales (%)")].map((col) => (
											<th key={col} className="border-b border-[#E7E3D8] px-1 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#5B6470]">{col}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{isLoading ? [0, 1, 2].map((n) => (
										<tr key={n} className="border-b border-[#E7E3D8] last:border-b-0">
											<td colSpan={4} className="px-1 py-4"><div className="h-4 animate-pulse rounded bg-[#FBFAF7]" /></td>
										</tr>
									)) : cashierRows.length === 0 ? (
										<tr>
											<td colSpan={4}>
												<BdEmptyState icon={<BdTableIcon />} title={t("branch_admin.no_cashier_activity", "No cashier activity for this area yet")} sub={t("branch_admin.no_cashier_activity_sub", "Try another tab, or check back once shifts begin")} />
											</td>
										</tr>
									) : cashierRows.map(({ cashier, area, percent }) => (
										<tr key={cashier.id} className="border-b border-[#E7E3D8] last:border-b-0">
											<td className="px-1 py-3 text-[13px] text-[#5B6470]">#{String(cashier.id).padStart(2, "0")}</td>
											<td className="px-1 py-3 text-[13px] font-semibold text-[#071E38]">{cashier.name}</td>
											<td className="px-1 py-3 text-[13px] text-[#5B6470]">{area}</td>
											<td className={`px-1 py-3 text-[13px] font-bold ${percent >= 70 ? "text-[#3CAE49]" : percent >= 40 ? "text-[#D9A15C]" : "text-[#E0654F]"}`}>{percent}%</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
export default Dashboard;
