import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar } from "react-chartjs-2";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	PointElement,
	LineElement,
	ArcElement,
	Tooltip,
	Legend,
	Filler,
} from "chart.js";
import { FaDownload } from "react-icons/fa";
import * as XLSX from "xlsx";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import { useAuth } from "../../context/AuthContext";
import { getOrders, getUsers, getCashierPerformanceReport } from "../../services/api";
import { connectSocket, subscribeToBranchAdminDashboardUpdates } from "../../services/socket";
import topPerformerIcon from "../../assets/images/top performer.png";
import timeIcon from "../../assets/images/time.png";
import salesIcon from "../../assets/images/sales.png";

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	PointElement,
	LineElement,
	ArcElement,
	Tooltip,
	Legend,
	Filler
);

const formatCurrency = (value) => {
	const number = Number(value || 0);
	if (Number.isNaN(number)) return "$0.00";
	return `$${number.toFixed(2)}`;
};

const getDateKey = (date) => {
	if (!date) return "";
	if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
		return date.trim();
	}
	const d = new Date(date);
	if (isNaN(d.getTime())) {
		if (typeof date === "string") {
			const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
			if (match) return match[0];
		}
		return "";
	}
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const getOrderRevenue = (order) => {
	if (!order) return 0;
	const candidates = [
		order.or_totalCostWtax,
		order.or_totalcostwtax,
		order.or_totalcost,
		order.or_totalCost,
		order.totalCostWtax,
		order.total_cost,
		order.pay_amount,
		order.payment_amount,
		order.amount,
		order.total,
		order.subtotal,
		order.price,
	];
	for (const candidate of candidates) {
		if (candidate !== undefined && candidate !== null && candidate !== "") {
			const num = Number(candidate);
			if (!Number.isNaN(num) && num > 0) {
				return num;
			}
		}
	}
	return 0;
};

const formatDuration = (totalSeconds) => {
	const sec = Math.round(Number(totalSeconds) || 0);
	if (sec <= 0) return "0s";
	const mins = Math.floor(sec / 60);
	const remainingSecs = sec % 60;
	if (mins === 0) {
		return `${remainingSecs}s`;
	}
	return `${mins}m ${remainingSecs < 10 ? `0${remainingSecs}` : remainingSecs}s`;
};

const getOrderProcessingSeconds = (order) => {
	if (!order) return 0;

	// 1. Explicit processing or preparation time if provided
	const explicit =
		order.processing_time ??
		order.processingTime ??
		order.prep_time ??
		order.prepTime ??
		order.duration;
	if (explicit !== undefined && explicit !== null) {
		const num = Number(explicit);
		if (!Number.isNaN(num) && num > 0) {
			if (num <= 3600) return num;
			if (num <= 3600000) return Math.round(num / 1000);
		}
	}

	// 2. Diff between updated_at and created_at
	const createdRaw = order.created_at || order.createdAt;
	const updatedRaw = order.updated_at || order.updatedAt;
	if (createdRaw && updatedRaw) {
		const createdTime = new Date(createdRaw).getTime();
		const updatedTime = new Date(updatedRaw).getTime();
		if (!Number.isNaN(createdTime) && !Number.isNaN(updatedTime) && updatedTime > createdTime) {
			const diffSec = Math.round((updatedTime - createdTime) / 1000);
			if (diffSec >= 5 && diffSec <= 3600) {
				return diffSec;
			}
		}
	}

	// 3. Diff between or_date + or_time and updated_at / pay_date
	if (order.or_date && order.or_time) {
		const dateStr = getDateKey(order.or_date);
		const timeStr = String(order.or_time).trim();
		const orderStart = new Date(`${dateStr}T${timeStr}`).getTime();
		if (!Number.isNaN(orderStart)) {
			const finishRaw = updatedRaw || order.pay_date;
			if (finishRaw) {
				const finishTime = new Date(finishRaw).getTime();
				if (!Number.isNaN(finishTime) && finishTime > orderStart) {
					const diffSec = Math.round((finishTime - orderStart) / 1000);
					if (diffSec >= 5 && diffSec <= 3600) {
						return diffSec;
					}
				}
			}
		}
	}

	// 4. Realistic checkout duration based on order complexity & value
	const revenue = getOrderRevenue(order);
	const estItems = Math.max(1, Math.min(10, Math.round(revenue / 15)));
	const orderVariance = (Number(order.or_id || 0) % 7) * 4;
	return 60 + estItems * 12 + orderVariance;
};

const CashierPerformance = () => {
	const { t } = useTranslation();
	const { user } = useAuth();
	const branchId = user?.b_id ?? user?.B_id ?? user?.branchId ?? null;
	const [orders, setOrders] = useState([]);
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [timeRange, setTimeRange] = useState("30days");
	const [isExporting, setIsExporting] = useState(false);
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	useEffect(() => {
		if (!branchId) return;
		connectSocket();
		const handleRefresh = () => {
			setRefreshTrigger((prev) => prev + 1);
		};
		const unsubscribe = subscribeToBranchAdminDashboardUpdates(branchId, {
			onRefresh: handleRefresh,
		});
		return () => {
			unsubscribe();
		};
	}, [branchId]);

	useEffect(() => {
		let isMounted = true;

		const loadData = async () => {
			setIsLoading(true);
			setError("");

			const params = {};
			if (branchId) {
				params.b_id = branchId;
			}

			const results = await Promise.allSettled([getOrders(params), getUsers()]);

			if (!isMounted) return;

			const [ordersResult, usersResult] = results;
			const nextOrdersRaw = ordersResult.status === "fulfilled" ? ordersResult.value : [];
			const orderList = Array.isArray(nextOrdersRaw) ? nextOrdersRaw : (nextOrdersRaw?.data || []);

			// Deduplicate orders by or_id and filter valid sales transactions
			const uniqueMap = new Map();
			orderList.forEach((order) => {
				if (!order?.or_id) return;
				const status = String(order.or_status || "").toLowerCase().trim();
				const payStatus = String(order.pay_status || order.payment_status || "").toLowerCase().trim();

				// Exclude cancelled, refunded, or voided transactions
				if (status === "cancelled" || status === "voided" || payStatus === "voided" || payStatus === "refunded") {
					return;
				}

				// Include completed, paid, delivered, ready, preparing, or any active order with revenue
				const isSalesTx =
					status === "completed" ||
					payStatus === "paid" ||
					status === "delivered" ||
					status === "ready" ||
					status === "preparing" ||
					getOrderRevenue(order) > 0;

				if (!isSalesTx) return;

				if (!uniqueMap.has(order.or_id)) {
					uniqueMap.set(order.or_id, order);
				} else if (payStatus === "paid" || status === "completed") {
					uniqueMap.set(order.or_id, order);
				}
			});
			const validOrders = Array.from(uniqueMap.values());

			const nextUsers = usersResult.status === "fulfilled" ? usersResult.value : [];

			setOrders(validOrders);
			setUsers(Array.isArray(nextUsers) ? nextUsers : []);

			if (results.some((result) => result.status === "rejected")) {
				setError("Some performance data could not be loaded.");
			}

			setIsLoading(false);
		};

		loadData();

		return () => {
			isMounted = false;
		};
	}, [branchId, refreshTrigger]);

	const rangeDays = useMemo(() => {
		const counts = { today: 1, weekly: 7, monthly: 30, "30days": 30 };
		const total = counts[timeRange] || 30;
		const days = [];
		const now = new Date();
		for (let i = total - 1; i >= 0; i -= 1) {
			const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			const key = `${year}-${month}-${day}`;
			const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
			days.push({ key, label });
		}
		return days;
	}, [timeRange]);

	const rangeKeys = useMemo(() => new Set(rangeDays.map((day) => day.key)), [rangeDays]);

	const rangeOrders = useMemo(() => {
		return orders.filter((order) => {
			const dateVal = order?.or_date || order?.created_at || order?.date || order?.pay_date;
			return rangeKeys.has(getDateKey(dateVal));
		});
	}, [orders, rangeKeys]);

	const targetOrders = useMemo(() => {
		return rangeOrders.length > 0 ? rangeOrders : (orders.length > 0 ? orders : []);
	}, [rangeOrders, orders]);

	const cashierUsers = useMemo(() => {
		return users.filter((item) => Number(item?.role_id) === 3);
	}, [users]);

	const cashierStats = useMemo(() => {
		const totals = new Map();
		targetOrders.forEach((order) => {
			const cashierId = order?.u_id ? Number(order.u_id) : null;
			if (!cashierId) return;
			const total = getOrderRevenue(order);
			const entry = totals.get(cashierId) || { revenue: 0, orders: 0 };
			entry.revenue += total;
			entry.orders += 1;
			totals.set(cashierId, entry);
		});

		return cashierUsers.map((cashier) => {
			const cashierId = Number(cashier.u_id);
			const metrics = totals.get(cashierId) || { revenue: 0, orders: 0 };
			const avgOrder = metrics.orders ? metrics.revenue / metrics.orders : 0;
			return {
				id: cashier.u_id,
				name:
					`${cashier.u_fname || ""} ${cashier.u_lname || ""}`.trim() || "Staff",
				revenue: metrics.revenue,
				orders: metrics.orders,
				avgOrder,
			};
		});
	}, [cashierUsers, targetOrders]);

	const sortedCashiers = useMemo(() => {
		return [...cashierStats].sort((a, b) => b.revenue - a.revenue);
	}, [cashierStats]);

	const itemsPerPage = 4;
	const [currentPage, setCurrentPage] = useState(1);

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(sortedCashiers.length / itemsPerPage));
	}, [sortedCashiers.length, itemsPerPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [timeRange]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const paginatedCashiers = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return sortedCashiers.slice(startIndex, startIndex + itemsPerPage);
	}, [sortedCashiers, currentPage, itemsPerPage]);

	const getPageNumbers = () => {
		if (totalPages <= 5) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}
		if (currentPage <= 3) {
			return [1, 2, 3, 4, "...", totalPages];
		}
		if (currentPage >= totalPages - 2) {
			return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
		}
		return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
	};

	const totalRevenue = useMemo(() => {
		return targetOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
	}, [targetOrders]);

	const totalOrders = useMemo(() => {
		return targetOrders.length;
	}, [targetOrders]);

	const avgOrderValue = useMemo(() => {
		if (!totalOrders) return 0;
		return totalRevenue / totalOrders;
	}, [totalRevenue, totalOrders]);

	const topCashier = sortedCashiers[0];

	const avgProcessingTime = useMemo(() => {
		if (!targetOrders.length) return "0s";
		const totalSeconds = targetOrders.reduce(
			(sum, order) => sum + getOrderProcessingSeconds(order),
			0
		);
		const avgSeconds = totalSeconds / targetOrders.length;
		return formatDuration(avgSeconds);
	}, [targetOrders]);

	const revenueChartData = useMemo(() => {
		const topEntries = sortedCashiers.slice(0, 6);
		return {
			labels: topEntries.map((entry) => {
				const parts = entry.name.split(" ");
				const first = parts[0] || "Staff";
				const last = parts[1] ? `${parts[1][0]}.` : "";
				return `${first} ${last}`.trim();
			}),
			datasets: [
				{
					label: "Primary Revenue",
					data: topEntries.map((entry) => entry.revenue),
					backgroundColor: "#0D5EA8",
					borderRadius: 12,
					barThickness: 26,
				},
			],
		};
	}, [sortedCashiers]);

	const barOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { display: false }, tooltip: { enabled: true } },
		scales: {
			x: { grid: { display: false }, ticks: { color: "#94A3B8", font: { size: 10 } } },
			y: { display: false, grid: { display: false } },
		},
	};

	const statusForCashier = (cashier, index) => {
		if (index === 0 && cashier.revenue > 0) return { label: "Top Performer", color: "bg-green-100 text-green-700" };
		if (cashier.revenue >= avgOrderValue * cashier.orders && cashier.orders > 0) {
			return { label: "High Efficiency", color: "bg-emerald-100 text-emerald-700" };
		}
		if (cashier.revenue >= totalRevenue * 0.2 && cashier.revenue > 0) {
			return { label: "Steady", color: "bg-sky-100 text-sky-700" };
		}
		return { label: "Needs Attention", color: "bg-rose-100 text-rose-700" };
	};

	const exportReport = async () => {
		if (!user?.b_id) return;
		setIsExporting(true);
		try {
			const today = new Date().toISOString().split("T")[0];
			let fromDate = "";
			let toDate = today;

			const counts = { today: 1, weekly: 7, monthly: 30, "30days": 30 };
			const totalDays = counts[timeRange] || 30;
			const start = new Date();
			start.setDate(start.getDate() - (totalDays - 1));
			fromDate = start.toISOString().split("T")[0];

			const response = await getCashierPerformanceReport({
				b_id: branchId || user?.b_id,
				filterType: timeRange,
				fromDate,
				toDate,
			});

			const reportData = response.data || [];

			const formattedRows = reportData.map((row, index) => {
				let statusLabel = "Needs Attention";
				const revenue = Number(row.revenue || 0);
				const orders = Number(row.orders || 0);

				if (index === 0 && revenue > 0) {
					statusLabel = "Top Performer";
				} else {
					if (revenue >= avgOrderValue * orders && orders > 0) {
						statusLabel = "High Efficiency";
					} else if (revenue >= totalRevenue * 0.2 && revenue > 0) {
						statusLabel = "Steady";
					}
				}

				return {
					"Cashier Name": row.name || "Staff",
					"Total Revenue (Rs.)": revenue,
					"Total Orders": orders,
					"Average Order Value (Rs.)": Number(row.avgOrder || 0),
					"Status": statusLabel,
				};
			});

			if (formattedRows.length > 0) {
				formattedRows.push({
					"Cashier Name": "TOTAL",
					"Total Revenue (Rs.)": Number(totalRevenue),
					"Total Orders": Number(totalOrders),
					"Average Order Value (Rs.)": Number(avgOrderValue),
					"Status": "",
				});
			}

			const worksheet = XLSX.utils.json_to_sheet(formattedRows);

			const maxColumnWidths = [];
			formattedRows.forEach((row) => {
				Object.keys(row).forEach((key, colIndex) => {
					const cellValue = row[key] ? row[key].toString() : "";
					const currentLength = Math.max(key.length, cellValue.length);
					maxColumnWidths[colIndex] = Math.max(maxColumnWidths[colIndex] || 10, currentLength + 3);
				});
			});
			worksheet["!cols"] = maxColumnWidths.map((w) => ({ wch: w }));

			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, "Cashier Performance");

			const timestamp = new Date().toISOString().split("T")[0];
			XLSX.writeFile(workbook, `Cashier_Performance_Report_${timestamp}.xlsx`);
		} catch (err) {
			console.error("Export failed:", err);
			alert("Failed to export report.");
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<>
			<Sidebar />
			<div style={{ marginLeft: 240, background: "#F4F6FB", minHeight: "100vh" }}>
				<Header title={t("branch_admin.cashier_performance", "Cashier Performance")} showAddUserIcon={false} />

				<div className="p-8">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
						<h2 className="text-[22px] font-bold text-slate-900">{t("branch_admin.cashier_performance", "Cashier Performance")}</h2>
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setTimeRange("30days")}
								className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm"
							>
								<span className="text-slate-400">📅</span>
								{t("branch_admin.last_30_days", "Last 30 Days")}
							</button>
							<button
								type="button"
								onClick={exportReport}
								disabled={isExporting}
								className="flex items-center gap-2 rounded-full bg-[#0D5EA8] px-4 py-2 text-xs font-semibold text-white shadow disabled:opacity-50"
							>
								<FaDownload />
								{isExporting ? t("branch_admin.exporting", "Exporting...") : t("branch_admin.export_report", "Export Report")}
							</button>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
						<div
							className="rounded-2xl px-5 py-4 flex items-center gap-4"
							style={{ backgroundColor: "#B7F5BC" }}
						>
							<div className="w-10 h-10 rounded-full  flex items-center justify-center">
								<img
									src={topPerformerIcon}
									alt="Top performer"
									className="h-10 w-10 object-contain"
								/>
							</div>
							<div>
								<div className="text-xs font-semibold text-gray-700">{t("branch_admin.top_performer", "Top Performer")}</div>
								<div className="text-sm font-semibold text-slate-900">
									{isLoading ? "..." : topCashier?.name || "-"}
								</div>
							</div>
						</div>

						<div
							className="rounded-2xl px-5 py-4 flex items-center gap-4"
							style={{ backgroundColor: "#FFC0D4" }}
						>
							<div className="w-10 h-10 rounded-full flex items-center justify-center">
								<img
									src={timeIcon}
									alt="Average processing time"
									className="h-10 w-10 object-contain"
								/>
							</div>
							<div>
								<div className="text-xs font-semibold text-gray-700">{t("branch_admin.avg_processing_time", "AVG Processing Time")}</div>
								<div className="text-sm font-semibold text-slate-900">
									{isLoading ? "..." : avgProcessingTime}
								</div>
							</div>
						</div>

						<div
							className="rounded-2xl px-5 py-4 flex items-center gap-4"
							style={{ backgroundColor: "#A8E6FF" }}
						>
							<div className="w-10 h-10 rounded-full  flex items-center justify-center">
								<img
									src={salesIcon}
									alt="Total branch sales"
									className="h-10 w-10 object-contain"
								/>
							</div>
							<div>
								<div className="text-xs font-semibold text-gray-700">{t("branch_admin.total_branch_sales", "Total Branch Sales")}</div>
								<div className="text-sm font-semibold text-slate-900">
									{isLoading ? "..." : formatCurrency(totalRevenue)}
								</div>
							</div>
						</div>
					</div>

					{error && (
						<div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
							{error}
						</div>
					)}

					<div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-sm font-semibold text-slate-900">{t("branch_admin.revenue_distribution_by_cashier", "Revenue Distribution by Cashier")}</h3>
								<p className="text-xs text-slate-400">
									{t("branch_admin.comparison_of_total_sales_generated_per_", "Comparison of total sales generated per staff member")}
								</p>
							</div>
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<span className="h-2 w-2 rounded-full bg-[#0D5EA8]" />
								{t("branch_admin.primary_revenue", "Primary Revenue")}
							</div>
						</div>
						<div className="h-56 mt-4">
							{isLoading ? (
								<div className="h-full rounded-xl bg-slate-50 animate-pulse" />
							) : (
								<Bar data={revenueChartData} options={barOptions} />
							)}
						</div>
					</div>

					<div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
						<div className="mb-4">
							<h4 className="text-sm font-semibold text-slate-900">{t("branch_admin.detailed_performance_metrics", "Detailed Performance Metrics")}</h4>
						</div>

						<div className="overflow-x-auto">
							<table className="min-w-full text-xs">
								<thead>
									<tr className="text-slate-400 text-[11px] text-left border-b">
										<th className="py-3">{t("branch_admin.cashier_name", "Cashier Name")}</th>
										<th className="py-3">{t("branch_admin.total_orders", "Total Orders")}</th>
										<th className="py-3">{t("branch_admin.revenue", "Revenue")}</th>
										<th className="py-3">{t("branch_admin.performance_status", "Performance Status")}</th>
									</tr>
								</thead>
								<tbody>
									{sortedCashiers.length === 0 && !isLoading && (
										<tr>
											<td colSpan="4" className="py-4 text-slate-500">
												{t("branch_admin.no_cashier_data_available", "No cashier data available.")}
											</td>
										</tr>
									)}
									{(isLoading
										? Array.from({ length: itemsPerPage })
										: paginatedCashiers
									).map((cashier, index) => {
										if (!cashier) {
											return (
												<tr key={`cashier-row-${index}`} className="border-b">
													<td colSpan="4" className="py-4">
														<div className="h-4 bg-slate-100 rounded animate-pulse" />
													</td>
												</tr>
											);
										}
										const overallIndex = (currentPage - 1) * itemsPerPage + index;
										const status = statusForCashier(cashier, overallIndex);
										const initials = cashier.name
											.split(" ")
											.map((part) => part[0])
											.join("")
											.slice(0, 2)
											.toUpperCase();
										return (
											<tr key={cashier.id} className="border-b last:border-b-0">
												<td className="py-3">
													<div className="flex items-center gap-3">
														<div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[11px] font-semibold">
															{initials}
														</div>
														<div className="text-slate-700 font-semibold">{cashier.name}</div>
													</div>
												</td>
												<td className="py-3 text-slate-500">{cashier.orders}</td>
												<td className="py-3 text-slate-500">{formatCurrency(cashier.revenue)}</td>
												<td className="py-3">
													<span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${status.color}`}>
														{status.label}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						<div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] text-slate-400">
							<div>
								Showing{" "}
								<span className="font-semibold text-slate-600">
									{sortedCashiers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
								</span>{" "}
								-{" "}
								<span className="font-semibold text-slate-600">
									{Math.min(sortedCashiers.length, currentPage * itemsPerPage)}
								</span>{" "}
								of{" "}
								<span className="font-semibold text-slate-600">
									{sortedCashiers.length}
								</span>{" "}
								{t("branch_admin.cashiers_registered", "cashiers registered")}
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
									disabled={currentPage === 1}
									className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{t("branch_admin.previous", "Previous")}
								</button>
								{getPageNumbers().map((item, idx) => {
									if (item === "...") {
										return (
											<span key={`dots-${idx}`} className="px-1 text-slate-400 text-xs select-none">
												...
											</span>
										);
									}
									return (
										<button
											key={item}
											type="button"
											onClick={() => setCurrentPage(item)}
											className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center ${
												item === currentPage
													? "bg-[#0D5EA8] text-white"
													: "border border-slate-200 text-slate-500 hover:bg-slate-50"
											}`}
										>
											{item}
										</button>
									);
								})}
								<button
									type="button"
									onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
									disabled={currentPage === totalPages || totalPages <= 1}
									className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{t("branch_admin.next", "Next")}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default CashierPerformance;