import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CashierHeader from "../../layout/header";
import OrderReadyAlerts from "../../components/cashier/OrderReadyAlerts";
import DashboardButton from "../../components/cashier/DashboardButton";
import { useAuth } from "../../context/AuthContext";
import { getOrders, getDashboardStats } from "../../services/api";
import { connectSocket } from "../../services/socket";
import {
  addOrderReadyAlert,
  addOrderRejectedAlert,
  dismissOrderReadyAlert,
  loadOrderReadyAlerts,
  saveOrderReadyAlerts,
} from "../../utils/orderReadyAlerts";

// ─── Icons ────────────────────────────────────────────────────────────────────

const RevenueIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path
      fillRule="evenodd"
      d="M10 4a1 1 0 011 1v.5h.5a1.5 1.5 0 010 3H11V10h.5a1.5 1.5 0 010 3H11v.5a1 1 0 11-2 0V13h-.5a1.5 1.5 0 010-3H9V8.5h-.5a1.5 1.5 0 010-3H9V5a1 1 0 011-1z"
      clipRule="evenodd"
    />
  </svg>
);

const TransactionIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path
      fillRule="evenodd"
      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
      clipRule="evenodd"
    />
  </svg>
);

const ProductIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
    <path
      fillRule="evenodd"
      d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

// ─── Stat card config ─────────────────────────────────────────────────────────

const STAT_CARD_CONFIG = [
  {
    key: "revenue",
    label: "Today's Revenue",
    badge: "+12.5%",
    icon: <RevenueIcon />,
    badgeColor: "bg-emerald-100 text-emerald-600",
    iconBg: "bg-emerald-500",
  },
  {
    key: "transactions",
    label: "Transactions",
    badge: "+8 today",
    icon: <TransactionIcon />,
    badgeColor: "bg-sky-100 text-sky-600",
    iconBg: "bg-sky-500",
  },
  {
    key: "productsSold",
    label: "Products Sold",
    badge: "+23 today",
    icon: <ProductIcon />,
    badgeColor: "bg-indigo-100 text-indigo-600",
    iconBg: "bg-[#0D3B4F]",
  },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
// font-space  → Space Grotesk (registered in tailwind.config.js)
// font-inter  → Inter         (registered in tailwind.config.js)

const StatCard = ({ label, displayValue, badge, icon, badgeColor, iconBg }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex flex-col justify-between">
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${iconBg}`}>
        {icon}
      </div>
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
        {badge}
      </span>
    </div>
    {/* Label — Inter 400 */}
    <p className="font-inter text-xs text-slate-500 mb-1">{label}</p>
    {/* Value — Space Grotesk 700 */}
    <p className="font-space text-2xl font-bold text-slate-900">{displayValue}</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const CashierDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ revenue: 0, transactions: 0, productsSold: 0 });
  const [activities, setActivities] = useState([]);
  const [orderReadyAlerts, setOrderReadyAlerts] = useState([]);

  // ── Load today's orders ──────────────────────────────────────────────────────
  const loadTodayOrders = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const params = { date: today };
      if (user?.u_id) params.u_id = user.u_id;

      const allOrders = await getOrders(params);
      const orders = allOrders.filter(
        (o) => o.or_status === "completed" || o.pay_status === "paid"
      );

      setActivities(
        orders.slice(0, 5).map((order) => ({
          orderId: order.or_id,
          time: order.or_time?.slice(0, 5) || "--:--",
          title: "Sale completed",
          subtitle: order.or_type || "-",
          amount: `$${Number(order.or_totalCostWtax ?? order.or_totalcost ?? 0).toFixed(2)}`,
        }))
      );
    } catch (error) {
      console.error("Failed to load cashier dashboard orders", error);
    }
  }, [user?.u_id]);

  useEffect(() => { loadTodayOrders(); }, [loadTodayOrders]);

  // ── Order-ready alerts ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.u_id) { setOrderReadyAlerts([]); return; }
    setOrderReadyAlerts(loadOrderReadyAlerts(user.u_id));
  }, [user?.u_id]);

  useEffect(() => {
    const socket = connectSocket();

    const handleOrderReady = (order) => {
      if (!order) return;
      if (user?.u_id && order.u_id && Number(order.u_id) !== Number(user.u_id)) return;

      setOrderReadyAlerts((cur) => {
        const next = addOrderReadyAlert(cur, order);
        saveOrderReadyAlerts(user?.u_id, next);
        return next;
      });

      setActivities((cur) => {
        const item = {
          orderId: order.or_id,
          time: order.or_time?.slice(0, 5) || "--:--",
          title: "Sale completed",
          subtitle: order.or_type || "-",
          amount: `$${Number(order.or_totalCostWtax ?? order.or_totalcost ?? 0).toFixed(2)}`,
        };
        return [item, ...cur.filter((x) => Number(x.orderId) !== Number(order.or_id))].slice(0, 5);
      });

      loadTodayOrders();
    };

    const handleOrderRejected = (order) => {
      if (!order) return;
      if (user?.u_id && order.u_id && Number(order.u_id) !== Number(user.u_id)) return;
      setOrderReadyAlerts((cur) => {
        const next = addOrderRejectedAlert(cur, order);
        saveOrderReadyAlerts(user?.u_id, next);
        return next;
      });
    };

    socket.on("order:ready", handleOrderReady);
    socket.on("order:rejected", handleOrderRejected);
    return () => {
      socket.off("order:ready", handleOrderReady);
      socket.off("order:rejected", handleOrderRejected);
    };
  }, [loadTodayOrders, user?.u_id]);

  const handleDismissOrderReady = useCallback(
    (orderId) => {
      setOrderReadyAlerts((cur) => {
        const next = dismissOrderReadyAlert(cur, orderId);
        saveOrderReadyAlerts(user?.u_id, next);
        return next;
      });
    },
    [user?.u_id]
  );

  // ── Dashboard stats ──────────────────────────────────────────────────────────
  const loadDashboardStats = useCallback(async () => {
    try {
      const data = await getDashboardStats(user.b_id);
      setStats({
        revenue: Number(data.revenue),
        transactions: Number(data.transactions),
        productsSold: Number(data.products_sold),
      });
    } catch (error) {
      console.error("Failed to load dashboard stats", error);
    }
  }, [user?.b_id]);

  useEffect(() => {
    if (user?.b_id) loadDashboardStats();
  }, [loadDashboardStats, user?.b_id]);

  const displayValues = {
    revenue: `$${stats.revenue.toFixed(2)}`,
    transactions: stats.transactions,
    productsSold: stats.productsSold,
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#EDEDE8] flex flex-col">
      <CashierHeader />
      <OrderReadyAlerts alerts={orderReadyAlerts} onDismiss={handleDismissOrderReady} />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

          {/* ── Greeting ─────────────────────────────────────────────────── */}
          <div className="text-center mb-10">

            {/* Welcome pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8F0E8] border border-[#C6DEC6] text-[#3D7A4A] text-xs font-semibold mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              {t("cashier.welcome_back", "Welcome back!")}
            </div>

            {/* Heading — font-space (Space Grotesk) 700 40px */}
            <h1 className="font-space text-[36px] sm:text-[40px] font-bold text-[#0D2236] leading-tight tracking-tight">
              {t("cashier.hello", "Hello,")}
              <span className="ml-2">
                &lsquo;{user?.u_fname || "User"} {user?.u_lname || "Name"}&rsquo;
              </span>
            </h1>

            {/* Subtitle — font-inter (Inter) 400 14px */}
            <p className="font-inter mt-3 text-sm text-[#5B6470] max-w-md mx-auto">
              {t(
                "cashier.ready_to_start_your_day_let_s_make_it_productive",
                "Ready to start your day? Let's make it productive."
              )}
            </p>

            {/* Buttons */}
            <div className="mt-7 flex flex-wrap justify-center items-center gap-4">
              <DashboardButton variant="solid" onClick={() => navigate("/cashier/pos")}>
                {t("cashier.open_pos_system", "Open POS System")}
              </DashboardButton>

              <DashboardButton variant="outline" onClick={() => navigate("/cashier/sales-summary")}>
                {t("cashier.view_sales_report", "View Sales Report")}
              </DashboardButton>
            </div>
          </div>

          {/* ── Stat cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {STAT_CARD_CONFIG.map((card) => (
              <StatCard
                key={card.key}
                label={card.label}
                displayValue={displayValues[card.key]}
                badge={card.badge}
                icon={card.icon}
                badgeColor={card.badgeColor}
                iconBg={card.iconBg}
              />
            ))}
          </div>

          {/* ── Recent Activity ───────────────────────────────────────────── */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                {/* font-space for headings */}
                <h2 className="font-space text-base font-semibold text-slate-900">
                  {t("cashier.recent_activity", "Recent Activity")}
                </h2>
                {/* font-inter for body text */}
                <p className="font-inter text-xs text-slate-500 mt-0.5">
                  {t("cashier.your_latest_transactions_and_updates", "Your latest transactions and updates")}
                </p>
              </div>
              <button className="self-start px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                {t("cashier.last_24_hours", "Last 24 hours")}
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {activities.length === 0 ? (
                <p className="font-inter py-8 text-center text-sm text-slate-400">
                  {t("cashier.no_recent_activity", "No recent activity yet.")}
                </p>
              ) : (
                activities.map((item, idx) => (
                  <div
                    key={item.orderId ?? idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-sky-600 text-xs bg-sky-50 shrink-0">
                        ⏱
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-700 mb-0.5">
                          <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50">
                            {item.time}
                          </span>
                          <span className="inline-flex items-center text-emerald-500 text-[10px]">
                            <span className="mr-1">●</span>
                            {t("cashier.completed", "Completed")}
                          </span>
                        </div>
                        {/* font-space for title, font-inter for subtitle */}
                        <div className="font-space text-sm font-medium text-slate-900">{item.title}</div>
                        <div className="font-inter text-xs text-slate-500">{item.subtitle}</div>
                      </div>
                    </div>
                    <div className="font-space text-right text-sm font-semibold text-emerald-500">
                      {item.amount}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default CashierDashboard;