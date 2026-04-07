import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CashierHeader from "../../components/cashier/Header";
import { useAuth } from "../../context/AuthContext";
import { getOrders } from "../../services/api";

const statCards = [
  {
    label: "Today's Revenue",
    value: "$0.00",
    badge: "+12.5%",
    icon: "$",
    badgeColor: "bg-emerald-100 text-emerald-600",
    iconBg: "bg-emerald-500",
  },
  {
    label: "Transactions",
    value: "0",
    badge: "+8 today",
    icon: "⇄",
    badgeColor: "bg-sky-100 text-sky-600",
    iconBg: "bg-sky-500",
  },
  {
    label: "Products Sold",
    value: "156",
    badge: "+23 today",
    icon: "📦",
    badgeColor: "bg-indigo-100 text-indigo-600",
    iconBg: "bg-blue-700",
  },
  {
    label: "Total Customers",
    value: "35",
    badge: "+5 new",
    icon: "👥",
    badgeColor: "bg-lime-100 text-lime-600",
    iconBg: "bg-cyan-500",
  },
];

const CashierDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ revenue: 0, transactions: 0 });
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchTodayOrders = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const params = { status: "completed", date: today };

        if (user?.u_id) {
          params.u_id = user.u_id;
        }

        const orders = await getOrders(params);

        let revenue = 0;
        orders.forEach((order) => {
          const total = Number(
            order.or_totalCostWtax ?? order.or_totalcost ?? 0,
          );
          if (!Number.isNaN(total)) revenue += total;
        });

        setStats({
          revenue,
          transactions: orders.length,
        });

        const recent = orders.slice(0, 5).map((order) => ({
          time: order.or_time?.slice(0, 5) || "--:--",
          title: "Sale completed",
          subtitle: order.or_type || "-",
          amount: `$${Number(
            order.or_totalCostWtax ?? order.or_totalcost ?? 0,
          ).toFixed(2)}`,
        }));

        setActivities(recent);
      } catch (error) {
        console.error("Failed to load cashier dashboard orders", error);
      }
    };

    fetchTodayOrders();
  }, [user]);
  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col">
      <CashierHeader />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Welcome area */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium mb-4 border border-sky-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
              Welcome back!
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              Hello,<span className="ml-1">Samantha</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
              Ready to start your day? Let&apos;s make it productive.
            </p>

            <button
              onClick={() => navigate("/cashier/pos")}
              className="mt-6 inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full bg-linear-to-r from-[#0052A8] to-[#00B4EB] text-white text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
            >
              <span>Open POS System</span>
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((card) => {
              let displayValue = card.value;
              if (card.label === "Today's Revenue") {
                displayValue = `$${stats.revenue.toFixed(2)}`;
              } else if (card.label === "Transactions") {
                displayValue = String(stats.transactions);
              }

              return (
                <div
                  key={card.label}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white text-sm ${card.iconBg}`}>
                        {card.icon}
                      </div>
                      <div className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                        {card.badge}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mb-1">{card.label}</div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {displayValue}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent activity */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Recent Activity
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Your latest transactions and updates
                </p>
              </div>
              <button className="self-start px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
                Last 24 hours
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {activities.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-sky-600 text-xs bg-sky-50">
                      ⏱
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-700 mb-0.5">
                        <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50">
                          {item.time}
                        </span>
                        <span className="inline-flex items-center text-emerald-500 text-[10px]">
                          <span className="mr-1">●</span>Completed
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500">{item.subtitle}</div>
                    </div>
                  </div>

                  <div className="text-right text-sm font-semibold text-emerald-500">
                    {item.amount}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default CashierDashboard;
