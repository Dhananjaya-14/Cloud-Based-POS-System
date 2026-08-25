import React, { useEffect, useMemo, useState } from "react";
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
	Filler,
);

const formatCurrency = (value) => {
	const number = Number(value || 0);
	if (Number.isNaN(number)) return "$0.00";
	return `$${number.toFixed(2)}`;
};

const getDateKey = (date) => {
	if (!date) return "";
	if (typeof date === "string") return date.slice(0, 10);
	return new Date(date).toISOString().slice(0, 10);
};

const CashierPerformance = () => {
	const { user } = useAuth();
	const [orders, setOrders] = useState([]);
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [timeRange, setTimeRange] = useState("30days");

	useEffect(() => {
		let isMounted = true;

		const loadData = async () => {
			setIsLoading(true);
			setError("");

			const params = { status: "completed" };
			if (user?.b_id) {
				params.b_id = user.b_id;
			}

			const results = await Promise.allSettled([getOrders(params), getUsers()]);

			if (!isMounted) return;

			const [ordersResult, usersResult] = results;
			const nextOrders = ordersResult.status === "fulfilled" ? ordersResult.value : [];
			const nextUsers = usersResult.status === "fulfilled" ? usersResult.value : [];

			setOrders(Array.isArray(nextOrders) ? nextOrders : []);
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
	}, [user?.b_id]);

	const rangeDays = useMemo(() => {
		const counts = { today: 1, weekly: 7, monthly: 30, "30days": 30 };
		const total = counts[timeRange] || 30;
		const days = [];
		for (let i = total - 1; i >= 0; i -= 1) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			const key = date.toISOString().slice(0, 10);
			const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
			days.push({ key, label });
		}
		return days;
	}, [timeRange]);

	const rangeKeys = useMemo(() => new Set(rangeDays.map((day) => day.key)), [rangeDays]);

	const rangeOrders = useMemo(() => {
		return orders.filter((order) => rangeKeys.has(getDateKey(order?.or_date)));
	}, [orders, rangeKeys]);

	const cashierUsers = useMemo(() => {
		return users.filter((item) => Number(item?.role_id) === 3);
	}, [users]);

	const cashierStats = useMemo(() => {
		const totals = new Map();
		rangeOrders.forEach((order) => {
			const cashierId = order?.u_id;
			if (!cashierId) return;
			const total = Number(order.or_totalCostWtax ?? order.or_totalcost ?? 0);
			const entry = totals.get(cashierId) || { revenue: 0, orders: 0 };
			entry.revenue += Number.isNaN(total) ? 0 : total;
			entry.orders += 1;
			totals.set(cashierId, entry);
		});

		return cashierUsers.map((cashier) => {
			const metrics = totals.get(cashier.u_id) || { revenue: 0, orders: 0 };
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
	}, [cashierUsers, rangeOrders]);

	const sortedCashiers = useMemo(() => {
		return [...cashierStats].sort((a, b) => b.revenue - a.revenue);
	}, [cashierStats]);

	const totalRevenue = useMemo(() => {
		return sortedCashiers.reduce((sum, cashier) => sum + cashier.revenue, 0);
	}, [sortedCashiers]);

	const totalOrders = useMemo(() => {
		return sortedCashiers.reduce((sum, cashier) => sum + cashier.orders, 0);
	}, [sortedCashiers]);

	const avgOrderValue = useMemo(() => {
		if (!totalOrders) return 0;
		return totalRevenue / totalOrders;
	}, [totalRevenue, totalOrders]);

	const topCashier = sortedCashiers[0];

	const avgProcessingTime = useMemo(() => {
		if (!rangeOrders.length) return "--";
		return "2m 14s";
	}, [rangeOrders.length]);

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
		if (index === 0) return { label: "Top Performer", color: "bg-green-100 text-green-700" };
		if (cashier.revenue >= avgOrderValue * cashier.orders) {
			return { label: "High Efficiency", color: "bg-emerald-100 text-emerald-700" };
		}
		if (cashier.revenue >= totalRevenue * 0.2) {
			return { label: "Steady", color: "bg-sky-100 text-sky-700" };
		}
		return { label: "Needs Attention", color: "bg-rose-100 text-rose-700" };
	};

	const [isExporting, setIsExporting] = useState(false);

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
				b_id: user.b_id,
				filterType: timeRange,
				fromDate,
				toDate,
			});

			const reportData = response.data || [];

			// Format rows for Excel
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

			// Add TOTAL summary row
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

			// Auto-adjust column widths
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
				<Header title="Cashier Performance" showAddUserIcon={false} />

				<div className="p-8">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
						<h2 className="text-[22px] font-bold text-slate-900">Cashier Performance</h2>
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setTimeRange("30days")}
								className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm"
							>
								<span className="text-slate-400">📅</span>
								Last 30 Days
							</button>
							<button
								type="button"
								onClick={exportReport}
								disabled={isExporting}
								className="flex items-center gap-2 rounded-full bg-[#0D5EA8] px-4 py-2 text-xs font-semibold text-white shadow disabled:opacity-50"
							>
								<FaDownload />
								{isExporting ? "Exporting..." : "Export Report"}
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
								<div className="text-xs font-semibold text-gray-700">Top Performer</div>
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
								<div className="text-xs font-semibold text-gray-700">AVG Processing Time</div>
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
								<div className="text-xs font-semibold text-gray-700">Total Branch Sales</div>
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
								<h3 className="text-sm font-semibold text-slate-900">Revenue Distribution by Cashier</h3>
								<p className="text-xs text-slate-400">Comparison of total sales generated per staff member</p>
							</div>
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<span className="h-2 w-2 rounded-full bg-[#0D5EA8]" />
								Primary Revenue
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
							<h4 className="text-sm font-semibold text-slate-900">Detailed Performance Metrics</h4>
						</div>

						<div className="overflow-x-auto">
							<table className="min-w-full text-xs">
								<thead>
									<tr className="text-slate-400 text-[11px] text-left border-b">
										<th className="py-3">Cashier Name</th>
										<th className="py-3">Total Orders</th>
										<th className="py-3">Revenue</th>
										<th className="py-3">Performance Status</th>
									</tr>
								</thead>
								<tbody>
									{sortedCashiers.length === 0 && !isLoading && (
										<tr>
											<td colSpan="4" className="py-4 text-slate-500">
												No cashier data available.
											</td>
										</tr>
									)}
									{(isLoading ? Array.from({ length: 4 }) : sortedCashiers.slice(0, 4)).map((cashier, index) => {
										if (!cashier) {
											return (
												<tr key={`cashier-row-${index}`} className="border-b">
													<td colSpan="4" className="py-4">
														<div className="h-4 bg-slate-100 rounded animate-pulse" />
													</td>
												</tr>
											);
										}

										const status = statusForCashier(cashier, index);
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
							<div>Showing 4 of {cashierUsers.length || 0} cashiers registered</div>
							<div className="flex items-center gap-2">
								<button type="button" className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-500">
									Previous
								</button>
								<button type="button" className="h-7 w-7 rounded-lg bg-[#0D5EA8] text-white">1</button>
								<button type="button" className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500">2</button>
								<button type="button" className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-500">
									Next
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
