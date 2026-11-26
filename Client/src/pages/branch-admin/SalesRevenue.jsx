import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import { useAuth } from "../../context/AuthContext";
import { getOrders, getOrderItems, getBranchProducts, getPayments, getBranchById } from "../../services/api";
import { connectSocket, subscribeToBranchAdminDashboardUpdates } from "../../services/socket";
import { TriangleAlert, Banknote, Bike, Clock, DollarSign, ShoppingBag, UtensilsCrossed } from "lucide-react";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);
const formatCurrency = value => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return "$0.00";
  return `$${number.toFixed(2)}`;
};
const getDateKey = date => {
  if (!date) return "";
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[0];
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const getOrderRevenue = order => {
  const cost =
    order?.or_totalCostWtax ??
    order?.or_totalcostwtax ??
    order?.or_totalcost ??
    order?.or_totalCost ??
    order?.totalCostWtax ??
    order?.total_cost ??
    order?.amount ??
    0;
  const num = Number(cost);
  return Number.isNaN(num) ? 0 : num;
};
const getOrderNetProfit = order => {
  const revenue = getOrderRevenue(order);
  if (revenue <= 0) return 0;

  const cost =
    order?.or_totalcost ??
    order?.or_totalCost ??
    order?.total_cost ??
    order?.subtotal ??
    null;

  if (cost !== null && cost !== undefined) {
    const num = Number(cost);
    if (!Number.isNaN(num) && num > 0) {
      if (num <= revenue) return num;
      return revenue;
    }
  }

  const tax = Number(order?.or_tax ?? order?.tax ?? 0);
  if (tax > 0 && !Number.isNaN(tax)) {
    if (tax <= 100) {
      return Number((revenue / (1 + tax / 100)).toFixed(2));
    }
    if (tax < revenue) {
      return Number((revenue - tax).toFixed(2));
    }
  }

  return revenue;
};
const KpiCard = ({ icon, tone, label, value, children }) => <div className="flex items-center gap-3.5 rounded-[14px] border border-[#E7E3D8] bg-white p-5">
    <div className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px] ${tone}`}>{icon}</div>
    <div className="min-w-0">
      <div className="mb-[3px] text-[12px] text-[#5B6470]">{label}</div>
      <div className="font-space text-[18px] font-bold text-[#071E38]">{value}</div>
      {children}
    </div>
  </div>;
const SalesRevenue = () => {
  const { t } = useTranslation();
const {
    user
  } = useAuth();
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [branchProducts, setBranchProducts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState("weekly");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!user?.b_id) return;
    connectSocket();
    const handleRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    const unsubscribe = subscribeToBranchAdminDashboardUpdates(user.b_id, {
      onRefresh: handleRefresh
    });
    return () => {
      unsubscribe();
    };
  }, [user?.b_id]);

  useEffect(() => {
    let isMounted = true;
    const loadAnalytics = async () => {
      setIsLoading(true);
      setError("");
      const params = {};
      if (user?.b_id) {
        params.b_id = user.b_id;
      }
      const results = await Promise.allSettled([getOrders(params), getOrderItems(), getBranchProducts(), getPayments()]);
      if (!isMounted) return;
      const [ordersResult, itemsResult, productsResult, paymentsResult] = results;
      const nextOrdersRaw = ordersResult.status === "fulfilled" ? ordersResult.value : [];
      const orderList = Array.isArray(nextOrdersRaw) ? nextOrdersRaw : (nextOrdersRaw?.data || []);

      // Deduplicate orders by or_id and filter completed or paid orders
      const uniqueMap = new Map();
      orderList.forEach(order => {
        if (!order?.or_id) return;
        const status = String(order.or_status || "").toLowerCase().trim();
        const payStatus = String(order.pay_status || order.payment_status || "").toLowerCase().trim();
        const isCompleted = status === "completed" || payStatus === "paid" || status === "delivered";
        if (!isCompleted) return;

        if (!uniqueMap.has(order.or_id)) {
          uniqueMap.set(order.or_id, order);
        } else if (payStatus === "paid") {
          uniqueMap.set(order.or_id, order);
        }
      });
      const validOrders = Array.from(uniqueMap.values());

      const nextItems = itemsResult.status === "fulfilled" ? itemsResult.value : [];
      const nextProducts = productsResult.status === "fulfilled" ? productsResult.value : [];
      setOrders(validOrders);
      setOrderItems(Array.isArray(nextItems) ? nextItems : []);
      setBranchProducts(Array.isArray(nextProducts) ? nextProducts : []);
      const nextPayments = paymentsResult.status === "fulfilled" ? paymentsResult.value : [];
      setPayments(Array.isArray(nextPayments) ? nextPayments : []);
      if (results.some(result => result.status === "rejected")) {
        setError("Some analytics data could not be loaded.");
      }
      setIsLoading(false);
    };
    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, [user?.b_id, refreshTrigger]);

  useEffect(() => {
    if (!user?.b_id) {
      setBranchName(user?.B_name || user?.b_name || user?.branchName || "");
      return undefined;
    }
    let mounted = true;
    getBranchById(user.b_id).then(result => {
      const branch = result?.data || result;
      if (mounted) setBranchName(branch?.B_name || branch?.b_name || "");
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [user?.b_id, user?.B_name, user?.b_name, user?.branchName]);

  const rangeDays = useMemo(() => {
    const counts = {
      today: 1,
      weekly: 7,
      monthly: 30,
      custom: 14
    };
    const total = counts[timeRange] || 7;
    const days = [];
    const now = new Date();
    for (let i = total - 1; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;
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

  const rangeKeys = useMemo(() => new Set(rangeDays.map(day => day.key)), [rangeDays]);

  const rangeOrders = useMemo(() => {
    return orders.filter(order => rangeKeys.has(getDateKey(order?.or_date || order?.created_at || order?.date)));
  }, [orders, rangeKeys]);

  const ordersByDate = useMemo(() => {
    const map = new Map();
    orders.forEach(order => {
      const key = getDateKey(order?.or_date || order?.created_at || order?.date);
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
        return sum + getOrderRevenue(order);
      }, 0);
    });
  }, [rangeDays, ordersByDate]);

  const totalRevenue = useMemo(() => {
    return rangeOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
  }, [rangeOrders]);

  const totalOrders = useMemo(() => rangeOrders.length, [rangeOrders]);

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
    return rangeOrders.reduce((sum, order) => sum + getOrderNetProfit(order), 0);
  }, [rangeOrders]);

  const orderTypeBreakdown = useMemo(() => {
    const counts = {
      "dine-in": 0,
      takeaway: 0,
      delivery: 0
    };
    rangeOrders.forEach(order => {
      const type = String(order?.or_type || "").toLowerCase();
      if (type && counts[type] !== undefined) {
        counts[type] += 1;
      }
    });
    return counts;
  }, [rangeOrders]);

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
    const validOrders = new Set(rangeOrders.map(order => order?.or_id));
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
  }, [rangeOrders, orderItems, productNameById]);

  const previousRevenueByDay = useMemo(() => {
    const offset = rangeDays.length;
    const now = new Date();
    return rangeDays.map((_, index) => {
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (offset + (rangeDays.length - 1 - index)));
      const year = target.getFullYear();
      const month = String(target.getMonth() + 1).padStart(2, "0");
      const day = String(target.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;
      const list = ordersByDate.get(key) || [];
      return list.reduce((sum, order) => {
        return sum + getOrderRevenue(order);
      }, 0);
    });
  }, [ordersByDate, rangeDays]);
  const revenueChartData = useMemo(() => {
    return {
      labels: rangeDays.map(day => day.label),
      datasets: [{
        label: "Current",
        data: revenueByDay,
        borderColor: "#14A6E0",
        backgroundColor: "#14A6E0",
        pointBackgroundColor: "#14A6E0",
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        tension: 0,
        fill: false
      }, {
        label: "Previous",
        data: previousRevenueByDay,
        borderColor: "#3CAE49",
        backgroundColor: "#3CAE49",
        pointBackgroundColor: "#3CAE49",
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        tension: 0,
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
        display: false
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
          display: false
        },
        border: {
          color: "#E7E3D8"
        },
        ticks: {
          color: "#5B6470",
          font: {
            size: 12
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#E7E3D8"
        },
        border: {
          display: false
        },
        ticks: {
          color: "#5B6470",
          font: {
            size: 11
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
        display: false
      }
    },
    cutout: "70%"
  };
  const paymentBreakdown = useMemo(() => {
    const orderIds = new Set(rangeOrders.map(order => order?.or_id));
    const latestByOrder = new Map();
    payments.forEach(payment => {
      if (!orderIds.has(payment?.or_id)) return;
      const status = String(payment?.pay_status || "").toLowerCase();
      if (status && status !== "paid") return;
      const existing = latestByOrder.get(payment.or_id);
      if (!existing || new Date(payment.pay_date || 0) > new Date(existing.pay_date || 0)) {
        latestByOrder.set(payment.or_id, payment);
      }
    });
    const counts = {
      card: 0,
      online: 0,
      cash: 0
    };
    latestByOrder.forEach(payment => {
      const method = String(payment?.pay_method || "").toLowerCase();
      if (method === "card") counts.card += 1;
      else if (method === "cash") counts.cash += 1;
      else if (method === "mobile_pay" || method === "online") counts.online += 1;
    });
    const total = counts.card + counts.online + counts.cash;
    const percent = value => total ? Math.round(value / total * 100) : 0;
    return {
      ...counts,
      total,
      cardPct: percent(counts.card),
      onlinePct: percent(counts.online),
      cashPct: percent(counts.cash)
    };
  }, [payments, rangeOrders]);
  const paymentNotice = useMemo(() => {
    if (!paymentBreakdown.total) return rangeOrders.length ? "No payment records for this period" : "";
    if (paymentBreakdown.card === paymentBreakdown.total) return "All orders paid by Card";
    if (paymentBreakdown.online === paymentBreakdown.total) return "All orders paid Online";
    if (paymentBreakdown.cash === paymentBreakdown.total) return "All orders paid by Cash";
    return "";
  }, [paymentBreakdown, rangeOrders.length]);
  const paymentChartData = useMemo(() => {
    return {
      labels: ["Card", "Online", "Cash"],
      datasets: [{
        data: paymentBreakdown.total ? [paymentBreakdown.card, paymentBreakdown.online, paymentBreakdown.cash] : [1],
        backgroundColor: paymentBreakdown.total ? ["#0B2E4F", "#3CAE49", "#14A6E0"] : ["#EFEBE2"],
        borderWidth: 0
      }]
    };
  }, [paymentBreakdown]);
  const orderTypeTotal = Object.values(orderTypeBreakdown).reduce((sum, value) => sum + value, 0);
  const showRevenueWarning = !isLoading && totalOrders > 0 && totalRevenue === 0;
  const periodTabs = [{
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
  }];
  const orderTypeRows = [{
    key: "dine-in",
    label: "Dine-in",
    icon: UtensilsCrossed
  }, {
    key: "takeaway",
    label: "Takeaway",
    icon: ShoppingBag
  }, {
    key: "delivery",
    label: "Delivery",
    icon: Bike
  }];
  const paymentLegend = [{
    label: "Card",
    color: "#0B2E4F",
    value: paymentBreakdown.cardPct
  }, {
    label: "Online",
    color: "#3CAE49",
    value: paymentBreakdown.onlinePct
  }, {
    label: "Cash",
    color: "#14A6E0",
    value: paymentBreakdown.cashPct
  }];
  return <div className="flex min-h-screen bg-[#F7F5F0]">
      <Sidebar />
      <div className="ml-[240px] min-w-0 flex-1">
        <Header title={t("branch_admin.sales_revenue", "Sales & Revenue")} showAddUserIcon={false} />

        <div className="px-9 py-8">
          <div className="mb-[22px] flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="m-0 mb-1 font-space text-xl font-bold text-[#071E38]">{t("branch_admin.sales_revenue_analytics", "Sales & Revenue Analytics")}</h2>
              <p className="m-0 text-[13px] text-[#5B6470]">
                {branchName ? `Real-time performance tracking for ${branchName} branch` : "Real-time performance tracking for your branch"}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5 self-start rounded-[9px] border border-[#E7E3D8] bg-white p-1">
              {periodTabs.map(tab => <button key={tab.key} type="button" onClick={() => setTimeRange(tab.key)} className={`cursor-pointer rounded-md border-0 px-4 py-[7px] text-[12.5px] font-semibold transition-colors ${timeRange === tab.key ? "bg-[#071E38] text-white" : "bg-transparent text-[#5B6470] hover:text-[#071E38]"}`}>
                  {tab.label}
                </button>)}
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={<Banknote size={20} strokeWidth={1.8} />} tone="bg-[rgba(15,155,142,0.1)] text-[#0F9B8E]" label={t("branch_admin.total_revenue", "Total Revenue")} value={isLoading ? "..." : formatCurrency(totalRevenue)}>
              {showRevenueWarning && <div className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-[#E0654F]">
                  <TriangleAlert size={11} strokeWidth={2.2} />
                  {totalOrders} {totalOrders === 1 ? "order" : "orders"} logged but {formatCurrency(0)} revenue
                </div>}
            </KpiCard>
            <KpiCard icon={<ShoppingBag size={20} strokeWidth={1.8} />} tone="bg-[rgba(11,46,79,0.08)] text-[#0B2E4F]" label={t("branch_admin.total_orders", "Total Orders")} value={isLoading ? "..." : String(totalOrders)} />
            <KpiCard icon={<Clock size={20} strokeWidth={1.8} />} tone="bg-[rgba(217,161,92,0.15)] text-[#D9A15C]" label={t("branch_admin.avg_order_value", "AVG Order Value")} value={isLoading ? "..." : formatCurrency(avgOrderValue)} />
            <KpiCard icon={<DollarSign size={20} strokeWidth={1.8} />} tone="bg-[rgba(60,174,73,0.1)] text-[#3CAE49]" label={t("branch_admin.net_profit", "Net Profit")} value={isLoading ? "..." : formatCurrency(netProfit)} />
          </div>

          {error && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
              {error}
            </div>}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2.1fr_1fr]">
            <div className="rounded-[14px] border border-[#E7E3D8] bg-white p-6">
              <h3 className="m-0 font-space text-[15px] font-bold text-[#071E38]">{t("branch_admin.revenue_trends", "Revenue Trends")}</h3>
              <p className="m-0 mt-0.5 text-[12px] text-[#5B6470]">{t("branch_admin.comparing_current_vs_previous_period", "Comparing current vs previous period")}</p>
              <div className="mb-3.5 mt-[18px] flex gap-4 text-[12px] text-[#5B6470]">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#14A6E0]" />Current</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3CAE49]" />Previous</span>
              </div>
              <div className="h-72">
                {isLoading ? <div className="h-full animate-pulse rounded-xl bg-[#FBFAF7]" /> : <Line data={revenueChartData} options={lineOptions} />}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-[14px] border border-[#E7E3D8] bg-white p-6">
                <h3 className="m-0 font-space text-[15px] font-bold text-[#071E38]">{t("branch_admin.order_types", "Order Types")}</h3>
                <div className="mt-4 flex flex-col gap-4">
                  {orderTypeRows.map(item => {
                  const Icon = item.icon;
                  const value = orderTypeBreakdown[item.key] || 0;
                  const percent = orderTypeTotal ? Math.round(value / orderTypeTotal * 100) : 0;
                  return <div key={item.key}>
                        <div className="mb-2 flex items-center justify-between text-[13px]">
                          <span className="flex items-center gap-2 font-medium text-[#1A1A1A]">
                            <Icon size={15} strokeWidth={1.8} className="text-[#5B6470]" />
                            {item.label}
                          </span>
                          <span className="font-semibold text-[#071E38]">{percent}%</span>
                        </div>
                        <div className="h-[7px] overflow-hidden rounded-full bg-[#F0EEE7]">
                          <div className="h-full rounded-full bg-[#0F9B8E] transition-all" style={{
                        width: `${percent}%`
                      }} />
                        </div>
                      </div>;
                })}
                </div>
              </div>

              <div className="rounded-[14px] border border-[#E7E3D8] bg-white p-6">
                <h3 className="m-0 font-space text-[15px] font-bold text-[#071E38]">{t("branch_admin.payment_method", "Payment Method")}</h3>
                <div className="mt-4 flex flex-col items-center gap-4">
                  {!isLoading && paymentNotice && <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E3D8] bg-[#FBFAF7] px-3 py-[5px] text-[12px] text-[#5B6470]">
                      <TriangleAlert size={12} strokeWidth={2} />
                      {paymentNotice}
                    </div>}
                  <div className="h-[140px] w-[140px]">
                    {isLoading ? <div className="h-full animate-pulse rounded-full bg-[#FBFAF7]" /> : <Doughnut data={paymentChartData} options={doughnutOptions} />}
                  </div>
                  <div className="flex flex-wrap justify-center gap-3.5 text-[12px] text-[#5B6470]">
                    {paymentLegend.map(item => <span key={item.label} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{
                      background: item.color
                    }} />
                        {item.label} {item.value}%
                      </span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default SalesRevenue;