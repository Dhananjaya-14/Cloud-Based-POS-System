import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaDollarSign, FaShoppingCart, FaStar, FaUsers } from "react-icons/fa";
import Sidebar from "./Sidebar";
import Header from "./Header";
import StatCard from "./StatCard";
import { useAuth } from "../../context/AuthContext";
import {
	getOrders,
	getUsers,
	getBranchProducts,
	getOrderItems,
	getRawMaterials,
	getLowStockMaterials,
} from "../../services/api";
import { useTranslation } from "react-i18next";

const formatCurrency = (value) => {
	const number = Number(value || 0);
	if (Number.isNaN(number)) return "$0.00";
	return `$${number.toFixed(2)}`;
};

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
	const { t } = useTranslation();

	useEffect(() => {
		let isMounted = true;

		const loadDashboard = async () => {
			setIsLoading(true);
			setError("");

			const today = new Date().toISOString().split("T")[0];
			const orderParams = { status: "completed", date: today };
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

			const nextOrders = results[0]?.status === "fulfilled" ? results[0].value : [];
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
	}, [user?.b_id, inventoryEnabled]);

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

	return (
		<>
			<Sidebar />
			<div style={{ marginLeft: 240, background: "#F4F6FB", minHeight: "100vh" }}>
				<Header title={t("branch_admin.branch_admin_overview", "Branch Admin Overview")} showAddUserIcon={false} />

				<div className="p-8">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
						<div>
							<h3 className="text-[22px] font-bold text-slate-900">{t("branch_admin.today_s_sales", "Today's Sales")}</h3>
							<p className="text-[15px] text-slate-500">{t("branch_admin.sales_summary", "Sales summary")}</p>
						</div>
						<button
							type="button"
							onClick={() => navigate("/branch-admin/transactions")}
							className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50"
						>
							{t("branch_admin.see_transactions", t("buttons.see_transactions", "See Transactions"))}
						</button>
					</div>

					<div className="flex flex-col lg:flex-row gap-4 mb-8">
						<StatCard
							title={t("branch_admin.total_revenue", "Total Revenue")}
							value={isLoading ? "..." : formatCurrency(totalRevenue)}
							showAction={false}
							cardClass=""
							cardStyle={{ backgroundColor: "#B7F5BC" }}
							iconClass="bg-white/80 text-emerald-600 ring-1 ring-emerald-200"
							icon={<FaDollarSign />}
						/>
						<StatCard
							title={t("branch_admin.total_sales", "Total Sales")}
							value={isLoading ? "..." : String(orders.length)}
							showAction={false}
							cardClass=""
							cardStyle={{ backgroundColor: "#FFC0D4" }}
							iconClass="bg-white/80 text-pink-500 ring-1 ring-pink-200"
							icon={<FaShoppingCart />}
						/>
						<StatCard
							title={t("branch_admin.top_selling_item", "Top Selling Item")}
							value={isLoading ? "..." : topSelling.name}
							showAction={false}
							cardClass=""
							cardStyle={{ backgroundColor: "#A8E6FF" }}
							iconClass="bg-white/80 text-sky-600 ring-1 ring-sky-200"
							icon={<FaStar />}
						/>
						<StatCard
							title={t("branch_admin.active_staff", "Active Staff")}
							value={isLoading ? "..." : String(cashierUsers.length)}
							showAction={false}
							cardClass=""
							cardStyle={{ backgroundColor: "#FFE7B8" }}
							iconClass="bg-white/80 text-amber-600 ring-1 ring-amber-200"
							icon={<FaUsers />}
						/>
					</div>

					{error && (
						<div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
							{error}
						</div>
					)}

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm ${inventoryEnabled ? '' : 'lg:col-span-3'}`}>
							<div className="mb-4">
								<h4 className="text-sm font-bold text-slate-900">{t("branch_admin.todays_staff", "Today&apos;s Staff")}</h4>
								<p className="text-xs text-slate-500">{t("branch_admin.staff_performance", "Staff performance")}</p>
							</div>
							<div className="space-y-4">
								{topStaff.length === 0 && !isLoading && (
									<div className="text-xs text-slate-500">No staff activity recorded yet.</div>
								)}
								{(isLoading ? Array.from({ length: 2 }) : topStaff).map((staff, index) => {
									if (!staff) {
										return (
											<div key={`staff-skeleton-${index}`} className="h-16 rounded-xl bg-slate-50 animate-pulse" />
										);
									}

									const percent = maxStaffRevenue > 0
										? Math.round((staff.revenue / maxStaffRevenue) * 100)
										: 0;

									return (
										<div key={staff.id} className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
												{staff.name
													.split(" ")
													.map((part) => part[0])
													.join("")
													.slice(0, 2)
													.toUpperCase()}
											</div>
											<div className="flex-1">
												<div className="text-sm font-semibold text-slate-900">{staff.name}</div>
												<div className="text-xs text-slate-500">Cashier</div>
												<div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
													<div
														className="h-full bg-sky-500"
														style={{ width: `${percent}%` }}
													/>
												</div>
											</div>
											<div className="text-xs font-semibold text-sky-600">{percent}%</div>
										</div>
									);
								})}
							</div>
						</div>

						{inventoryEnabled && (
							<div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm lg:col-span-2">
								<div className="flex items-start justify-between mb-4">
									<div>
										<h4 className="text-sm font-bold text-slate-900">{t("branch_admin.inventory_updates", "Inventory Updates")}</h4>
										<p className="text-xs text-slate-500">{t("branch_admin.current_stock_levels", "Current stock levels")}</p>
									</div>
									<button
										type="button"
										onClick={() => navigate("/branch-admin/inventory")}
										className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50"
									>
										{t("branch_admin.go_to_inventory_page", "Go to Inventory Page")}
									</button>
								</div>

								<div className="mb-4">
									<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between">
										<div>
											<div className="text-xs font-semibold text-red-600">{t("branch_admin.low_stock_alert", "Low Stock Alert")}</div>
											<div className="text-xs text-red-500">
												{lowStockItem ? lowStockItem.rm_name : t("branch_admin.no_low_stock_alerts", "No low stock alerts")}
											</div>
										</div>
										<div className="text-sm font-semibold text-red-600">
											{lowStockItem ? `${Number(lowStockItem.stock_qty ?? 0)} left` : "--"}
										</div>
									</div>
								</div>

								<div className="space-y-4">
									{stockItems.length === 0 && !isLoading && (
										<div className="text-xs text-slate-500">No stock data available.</div>
									)}
									{(isLoading ? Array.from({ length: 4 }) : stockItems).map((item, index) => {
										if (!item) {
											return (
												<div key={`stock-skeleton-${index}`} className="h-12 rounded-xl bg-slate-50 animate-pulse" />
											);
										}

										const stockQty = Number(item.stock_qty ?? 0);
										const recordLevel = Number(item.record_level ?? 0);
										const percent = maxStockQty > 0
											? Math.round((stockQty / maxStockQty) * 100)
											: 0;

										return (
											<div key={item.rm_id} className="flex items-center gap-4">
												<div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
													{item.rm_name?.slice(0, 2)?.toUpperCase() || "RM"}
												</div>
												<div className="flex-1">
													<div className="text-xs font-semibold text-slate-900">{item.rm_name}</div>
													<div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
														<div className="h-full bg-sky-500" style={{ width: `${percent}%` }} />
													</div>
												</div>
												<div className="text-xs text-slate-500">
													{stockQty}{recordLevel ? ` / ${recordLevel}` : ""}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>

					<div className="mt-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
						<div className="mb-4">
							<h4 className="text-sm font-bold text-slate-900">{t("branch_admin.todays_cashiers", "Today&apos;s Cashiers")}</h4>
							<p className="text-xs text-slate-500">{t("branch_admin.work_distribution", "Work distribution")}</p>
						</div>

						<div className="flex flex-wrap gap-3 mb-5">
							{["Bar", "Restaurant", "Spa", "Reception"].map((area) => (
								<div
									key={area}
									className="px-3 py-1 rounded-full border border-slate-200 text-xs font-semibold text-slate-500"
								>
									{area}
								</div>
							))}
						</div>

						<div className="overflow-x-auto">
							<table className="min-w-full text-xs">
								<thead>
									<tr className="text-slate-400 text-[11px] text-left border-b">
										<th className="py-2">#</th>
										<th className="py-2">{t("branch_admin.name_upper", "NAME")}</th>
										<th className="py-2">{t("branch_admin.area_upper", "AREA")}</th>
										<th className="py-2">{t("branch_admin.sales_percent", "SALES (%)")}</th>
									</tr>
								</thead>
								<tbody>
									{cashierStats.length === 0 && !isLoading && (
										<tr>
											<td colSpan="4" className="py-4 text-slate-500">
												No cashier data available.
											</td>
										</tr>
									)}
									{(isLoading ? Array.from({ length: 4 }) : cashierStats).map((cashier, index) => {
										if (!cashier) {
											return (
												<tr key={`cashier-skeleton-${index}`} className="border-b">
													<td colSpan="4" className="py-4">
														<div className="h-4 bg-slate-100 rounded animate-pulse" />
													</td>
												</tr>
											);
										}

										const percent = totalRevenue > 0
											? Math.round((cashier.revenue / totalRevenue) * 100)
											: 0;
										const percentClass = percent >= 70
											? "text-emerald-500"
											: percent >= 40
												? "text-amber-500"
												: "text-red-500";
										const areas = ["Bar", "Restaurant", "Spa", "Reception"];
										const area = areas[index % areas.length];

										return (
											<tr key={cashier.id} className="border-b last:border-b-0">
												<td className="py-3 text-slate-600">#{String(cashier.id).padStart(2, "0")}</td>
												<td className="py-3 text-slate-700 font-semibold">{cashier.name}</td>
												<td className="py-3 text-slate-500">{area}</td>
												<td className={`py-3 font-semibold ${percentClass}`}>{percent}%</td>
											</tr>
										);
									})}
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
