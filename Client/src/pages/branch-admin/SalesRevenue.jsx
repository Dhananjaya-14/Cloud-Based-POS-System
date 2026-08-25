import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import { useAuth } from "../../context/AuthContext";
import { getOrders, getOrderItems, getBranchProducts } from "../../services/api";
import totalRevenueIcon from "../../assets/images/total revenue.png";
import totalOrdersIcon from "../../assets/images/total orders.png";
import orderValueIcon from "../../assets/images/order value.png";
import profitIcon from "../../assets/images/profit.png";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);
const formatCurrency = value => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return "$0.00";
  return `$${number.toFixed(2)}`;
};
const getDateKey = date => {
  if (!date) return "";
  if (typeof date === "string") return date.slice(0, 10);
  return new Date(date).toISOString().slice(0, 10);
};
const SalesRevenue = () => {
  const { t } = useTranslation();
const {
    user
  } = useAuth();
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [branchProducts, setBranchProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState("weekly");
  useEffect(() => {
    let isMounted = true;
    const loadAnalytics = async () => {
      setIsLoading(true);
      setError("");
      const params = {
        status: "completed"
      };
      if (user?.b_id) {
        params.b_id = user.b_id;
      }
      const results = await Promise.allSettled([getOrders(params), getOrderItems(), getBranchProducts()]);
      if (!isMounted) return;
      const [ordersResult, itemsResult, productsResult] = results;
      const nextOrders = ordersResult.status === "fulfilled" ? ordersResult.value : [];
      const nextItems = itemsResult.status === "fulfilled" ? itemsResult.value : [];
      const nextProducts = productsResult.status === "fulfilled" ? productsResult.value : [];
      setOrders(Array.isArray(nextOrders) ? nextOrders : []);
      setOrderItems(Array.isArray(nextItems) ? nextItems : []);
      setBranchProducts(Array.isArray(nextProducts) ? nextProducts : []);
      if (results.some(result => result.status === "rejected")) {
        setError("Some analytics data could not be loaded.");
      }
      setIsLoading(false);
    };
    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, [user?.b_id]);
  const rangeDays = useMemo(() => {
    const counts = {
      today: 1,
      weekly: 7,
      monthly: 30,
      custom: 14
    };
    const total = counts[timeRange] || 7;
    const days = [];
    for (let i = total - 1; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const label = total <= 7 ? date.toLocaleDateString("en-US", {
        weekday: "short"
      }) : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });
      days.push({
        key,
        label
      });
    }
    return days;
  }, [timeRange]);
  const ordersByDate = useMemo(() => {
    const map = new Map();
    orders.forEach(order => {
      const key = getDateKey(order?.or_date);
      if (!key) return;
      map.set(key, [...(map.get(key) || []), order]);
    });
    return map;
  }, [orders]);
  const revenueByDay = useMemo(() => {
    return rangeDays.map(({
      key
    }) => {
      const list = ordersByDate.get(key) || [];
      return list.reduce((sum, order) => {
        const value = Number(order.or_totalCostWtax ?? order.or_totalcost ?? 0);
        if (Number.isNaN(value)) return sum;
        return sum + value;
      }, 0);
    });
  }, [rangeDays, ordersByDate]);
  const totalRevenue = useMemo(() => {
    return revenueByDay.reduce((sum, value) => sum + value, 0);
  }, [revenueByDay]);
  const totalOrders = useMemo(() => orders.length, [orders]);
  const avgOrderValue = useMemo(() => {
    if (totalOrders === 0) return 0;
    return totalRevenue / totalOrders;
  }, [totalRevenue, totalOrders]);
  const bestDay = useMemo(() => {
    let maxValue = 0;
    let maxIndex = 0;
    revenueByDay.forEach((value, index) => {
      if (value > maxValue) {
        maxValue = value;
        maxIndex = index;
      }
    });
    return {
      value: maxValue,
      label: rangeDays[maxIndex]?.label || "-"
    };
  }, [rangeDays, revenueByDay]);
  const netProfit = useMemo(() => {
    return totalRevenue * 0.72;
  }, [totalRevenue]);
  const orderTypeBreakdown = useMemo(() => {
    const counts = {
      "dine-in": 0,
      takeaway: 0,
      delivery: 0
    };
    orders.forEach(order => {
      const type = order?.or_type;
      if (type && counts[type] !== undefined) {
        counts[type] += 1;
      }
    });
    return counts;
  }, [orders]);
  const productNameById = useMemo(() => {
    const map = new Map();
    branchProducts.forEach(product => {
      if (product?.Bpro_id) {
        map.set(product.Bpro_id, product.pro_name || `Item ${product.Bpro_id}`);
      }
    });
    return map;
  }, [branchProducts]);
  const topItems = useMemo(() => {
    const tally = new Map();
    const validOrders = new Set(orders.map(order => order?.or_id));
    orderItems.forEach(item => {
      if (!validOrders.has(item?.order_id)) return;
      const key = item?.Bpro_id;
      if (!key) return;
      const qty = Number(item?.pro_quantity ?? 0);
      tally.set(key, (tally.get(key) || 0) + (Number.isNaN(qty) ? 0 : qty));
    });
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, qty]) => ({
      id,
      name: productNameById.get(id) || `Item ${id}`,
      qty
    }));
  }, [orders, orderItems, productNameById]);
  const previousRevenueByDay = useMemo(() => {
    const offset = rangeDays.length;
    return rangeDays.map((_, index) => {
      const target = new Date();
      target.setDate(target.getDate() - (offset + (rangeDays.length - 1 - index)));
      const key = target.toISOString().slice(0, 10);
      const list = ordersByDate.get(key) || [];
      return list.reduce((sum, order) => {
        const value = Number(order.or_totalCostWtax ?? order.or_totalcost ?? 0);
        if (Number.isNaN(value)) return sum;
        return sum + value;
      }, 0);
    });
  }, [ordersByDate, rangeDays]);
  const revenueChartData = useMemo(() => {
    return {
      labels: rangeDays.map(day => day.label),
      datasets: [{
        label: "Current",
        data: revenueByDay,
        borderColor: "#5DB5F1",
        backgroundColor: "#5DB5F1",
        pointBackgroundColor: "#5DB5F1",
        pointRadius: 4,
        pointHoverRadius: 5,
        borderWidth: 3,
        tension: 0.35,
        fill: false
      }, {
        label: "Previous",
        data: previousRevenueByDay,
        borderColor: "#7BC96F",
        backgroundColor: "#7BC96F",
        pointBackgroundColor: "#7BC96F",
        pointRadius: 4,
        pointHoverRadius: 5,
        borderWidth: 3,
        tension: 0.35,
        fill: false
      }]
    };
  }, [previousRevenueByDay, rangeDays, revenueByDay]);
  const orderTypeChartData = useMemo(() => {
    return {
      labels: ["Dine-in", "Takeaway", "Delivery"],
      datasets: [{
        data: [orderTypeBreakdown["dine-in"], orderTypeBreakdown.takeaway, orderTypeBreakdown.delivery],
        backgroundColor: ["#22C55E", "#F59E0B", "#EF4444"],
        borderWidth: 0
      }]
    };
  }, [orderTypeBreakdown]);
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "center",
        labels: {
          boxWidth: 36,
          boxHeight: 8,
          color: "#94A3B8",
          font: {
            size: 11,
            weight: "600",
            family: "Hanuman, sans-serif"
          }
        }
      }
    },
    layout: {
      padding: {
        top: 6
      }
    },
    scales: {
      x: {
        grid: {
          color: "#E5E7EB"
        },
        ticks: {
          color: "#9CA3AF",
          font: {
            size: 10
          }
        }
      },
      y: {
        grid: {
          color: "#E5E7EB"
        },
        ticks: {
          color: "#9CA3AF",
          font: {
            size: 10
          }
        }
      }
    }
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true
        }
      }
    },
    cutout: "68%"
  };
  const paymentBreakdown = useMemo(() => {
    const fallback = {
      card: 55,
      online: 30,
      cash: 15
    };
    return fallback;
  }, []);
  const paymentChartData = useMemo(() => {
    return {
      labels: ["Card", "Online", "Cash"],
      datasets: [{
        data: [paymentBreakdown.card, paymentBreakdown.online, paymentBreakdown.cash],
        backgroundColor: ["#2563EB", "#22C55E", "#0EA5E9"],
        borderWidth: 0
      }]
    };
  }, [paymentBreakdown]);
  return <>
			<Sidebar />
			<div style={{
      marginLeft: 240,
      background: "#F4F6FB",
      minHeight: "100vh"
    }}>
				<Header title={t("branch_admin.sales_revenue", "Sales & Revenue")} showAddUserIcon={false} />

				<div className="p-8">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
						<div>
							<h2 className="text-[22px] font-bold text-slate-900">{t("branch_admin.sales_revenue_analytics", "Sales & Revenue Analytics")}</h2>
							<p className="text-[15px] text-slate-500">{t("branch_admin.real_time_performance_tracking_for_branc", "Real time performance tracking for branch #")}</p>
						</div>
						<div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-sm">
							{[{
              key: "today",
              label: "Today"
            }, {
              key: "weekly",
              label: "Weekly"
            }, {
              key: "monthly",
              label: "Monthly"
            }, {
              key: "custom",
              label: "Custom"
            }].map(tab => <button key={tab.key} type="button" onClick={() => setTimeRange(tab.key)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${timeRange === tab.key ? "bg-sky-500 text-white" : "text-slate-500 hover:text-slate-700"}`}>
									{tab.label}
								</button>)}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
						<div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{
            backgroundColor: "#B7F5BC"
          }}>
							<div className="w-10 h-10 rounded-xl  flex items-center justify-center">
								<img src={totalRevenueIcon} alt="Total revenue" className="h-10 w-10 object-contain" />
							</div>
							<div>
								<div className="text-xs font-semibold text-gray-700">{t("branch_admin.total_revenue", "Total Revenue")}</div>
								<div className="text-sm font-bold text-slate-900">
									{isLoading ? "..." : formatCurrency(totalRevenue)}
								</div>
							</div>
						</div>

						<div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{
            backgroundColor: "#FFC0D4"
          }}>
							<div className="w-10 h-10 rounded-xl  flex items-center justify-center">
								<img src={totalOrdersIcon} alt="Total orders" className="h-10 w-10 object-contain" />
							</div>
							<div>
								<div className="text-xs font-semibold text-gray-700">{t("branch_admin.total_orders", "Total Orders")}</div>
								<div className="text-sm font-bold text-slate-900">
									{isLoading ? "..." : String(totalOrders)}
								</div>
							</div>
						</div>

						<div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{
            backgroundColor: "#A8E6FF"
          }}>
							<div className="w-10 h-10 rounded-xl  flex items-center justify-center">
								<img src={orderValueIcon} alt="Average order value" className="h-10 w-10 object-contain" />
							</div>
							<div>
								<div className="text-xs font-semibold text-gray-700">{t("branch_admin.avg_order_value", "AVG Order Value")}</div>
								<div className="text-sm font-bold text-slate-900">
									{isLoading ? "..." : formatCurrency(avgOrderValue)}
								</div>
							</div>
						</div>

						<div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{
            backgroundColor: "#FFE7B8"
          }}>
							<div className="w-10 h-10 rounded-xl  flex items-center justify-center">
								<img src={profitIcon} alt="Net profit" className="h-10 w-10 object-contain" />
							</div>
							<div>
								<div className="text-xs font-semibold text-gray-700">{t("branch_admin.net_profit", "Net Profit")}</div>
								<div className="text-sm font-bold text-slate-900">
									{isLoading ? "..." : formatCurrency(netProfit)}
								</div>
							</div>
						</div>
					</div>

					{error && <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
							{error}
						</div>}

					<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
						<div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
							<div className="text-center mb-4">
								<h3 className="text-sm font-semibold text-slate-900">{t("branch_admin.revenue_trends", "Revenue Trends")}</h3>
								<p className="text-xs font-bold text-black">{t("branch_admin.comparing_current_vs_previous_period", "Comparing Current vs Previous Period")}</p>
							</div>
							<div className="h-72">
								{isLoading ? <div className="h-full rounded-xl bg-slate-50 animate-pulse" /> : <Line data={revenueChartData} options={lineOptions} />}
							</div>
						</div>

						<div className="space-y-6">
							<div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
								<h3 className="text-sm font-bold text-slate-900">{t("branch_admin.order_types", "Order Types")}</h3>
								<div className="space-y-4 mt-4">
									{[{
                  key: "dine-in",
                  label: "Dine - in",
                  icon: "🍽️",
                  color: "bg-sky-400"
                }, {
                  key: "takeaway",
                  label: "Takeaway",
                  icon: "🛍️",
                  color: "bg-indigo-500"
                }, {
                  key: "delivery",
                  label: "Delivery",
                  icon: "🛵",
                  color: "bg-green-500"
                }].map(item => {
                  const total = Object.values(orderTypeBreakdown).reduce((sum, value) => sum + value, 0) || 1;
                  const value = orderTypeBreakdown[item.key] || 0;
                  const percent = Math.round(value / total * 100);
                  return <div key={item.key} className="space-y-2">
												<div className="flex items-center gap-3 text-sm text-slate-700">
													<span className="text-lg">{item.icon}</span>
													<span className="font-semibold">{item.label}</span>
													<span className="ml-auto text-xs text-slate-500">{percent}%</span>
												</div>
												<div className="h-2 rounded-full bg-slate-100">
													<div className={`h-full rounded-full ${item.color}`} style={{
                        width: `${percent}%`
                      }} />
												</div>
											</div>;
                })}
								</div>
							</div>

							<div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
								<h3 className="text-sm font-bold text-slate-900">{t("branch_admin.payment_method", "Payment Method")}</h3>
								<div className="h-44 mt-4">
									{isLoading ? <div className="h-full rounded-xl bg-slate-50 animate-pulse" /> : <Doughnut data={paymentChartData} options={doughnutOptions} />}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>;
};
export default SalesRevenue;