import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/slidebar";
import OverviewCards from "../../components/admin/OverviewCards";
import TodayActivitiesChart from "../../components/admin/TodayActivitiesChart";
import { getStatsOverview, getBranchStats, getOrders, getBranches, getCurrentUser, getCompanyById } from "../../services/api";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { FiPlus, FiBarChart2 } from "react-icons/fi";
ChartJS.register(ArcElement, Tooltip, Legend);
function OrderSummaryChart({ branchStats = [], currentComId = null }) {
  const { t } = useTranslation();
  const [counts, setCounts] = React.useState({
    completed: 0,
    pending: 0,
    other: 0
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const orders = await getOrders();
        if (!mounted) return;

        // Scope orders to company branches when currentComId is provided
        let scopedOrders = Array.isArray(orders) ? orders : [];
        if (currentComId && Array.isArray(branchStats) && branchStats.length > 0) {
          const allowedBranchIds = new Set(
            branchStats.map(b => String(b.B_id ?? b.b_id ?? b.id ?? "")).filter(Boolean)
          );
          if (allowedBranchIds.size > 0) {
            scopedOrders = scopedOrders.filter(o => allowedBranchIds.has(String(o.b_id)));
          }
        }

        const completed = scopedOrders.filter(
          o => String(o.or_status || "").toLowerCase() === "completed"
        ).length;
        const pending = scopedOrders.filter(
          o => String(o.or_status || "").toLowerCase() === "pending"
        ).length;
        const other = scopedOrders.length - completed - pending;

        setCounts({
          completed,
          pending,
          other: Math.max(0, other)
        });
      } catch (err) {
        console.error("Failed to load order summary", err);
        setCounts({
          completed: 0,
          pending: 0,
          other: 0
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentComId, branchStats]);

  const total = counts.completed + counts.pending + counts.other;
  const getPct = val => (total > 0 ? ((val / total) * 100).toFixed(1) : "0.0");

  const pctCompleted = getPct(counts.completed);
  const pctPending = getPct(counts.pending);
  const pctOther = getPct(counts.other);

  const completedName = t("company_admin.completed", "Completed");
  const pendingName = t("company_admin.pending", "Pending");
  const otherName = t("company_admin.other", "Other");

  // Chart datasets & labels with counts and percentages for both legend and tooltip
  const chartData = {
    labels: [
      `${completedName}: ${counts.completed} (${pctCompleted}%)`,
      `${pendingName}: ${counts.pending} (${pctPending}%)`,
      `${otherName}: ${counts.other} (${pctOther}%)`
    ],
    datasets: total > 0 ? [{
      data: [counts.completed, counts.pending, counts.other],
      backgroundColor: ["#16A34A", "#0D5EA8", "#EF4444"],
      hoverBackgroundColor: ["#15803D", "#0A4880", "#DC2626"],
      borderWidth: 2,
      borderColor: "#ffffff"
    }] : [{
      data: [1],
      backgroundColor: ["#E2E8F0"],
      hoverBackgroundColor: ["#E2E8F0"],
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 8,
          boxWidth: 8,
          boxHeight: 8,
          color: "#475569",
          font: {
            size: 11,
            weight: 600
          }
        }
      },
      tooltip: {
        enabled: total > 0,
        backgroundColor: "#1E293B",
        titleColor: "#FFFFFF",
        bodyColor: "#F8FAFC",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: context => {
            const val = context.raw || 0;
            const pct = getPct(val);
            const titles = [completedName, pendingName, otherName];
            const name = titles[context.dataIndex] || context.label;
            return ` ${name}: ${val.toLocaleString()} orders (${pct}%)`;
          },
          footer: () => ` Total Orders: ${total.toLocaleString()}`
        }
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        height: 180,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: "#64748B",
        fontSize: "0.9rem"
      }}>
        <div style={{
          width: 24,
          height: 24,
          border: "3px solid #E2E8F0",
          borderTopColor: "#0D5EA8",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
        <span>{t("company_admin.loading", "Loading order summary...")}</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const breakdownItems = [
    {
      key: "completed",
      label: completedName,
      count: counts.completed,
      pct: pctCompleted,
      color: "#16A34A",
      bgBadge: "#DCFCE7",
      textBadge: "#15803D"
    },
    {
      key: "pending",
      label: pendingName,
      count: counts.pending,
      pct: pctPending,
      color: "#0D5EA8",
      bgBadge: "#DBEAFE",
      textBadge: "#1D4ED8"
    },
    {
      key: "other",
      label: otherName,
      count: counts.other,
      pct: pctOther,
      color: "#EF4444",
      bgBadge: "#FEE2E2",
      textBadge: "#B91C1C"
    }
  ];

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Doughnut Chart with Center Total */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 240,
        height: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Doughnut data={chartData} options={chartOptions} />
        <div style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          pointerEvents: "none"
        }}>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#0F172A", lineHeight: 1 }}>
            {total.toLocaleString()}
          </div>
          <div style={{ fontSize: "10px", color: "#64748B", fontWeight: "600", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {t("company_admin.orders", "Orders")}
          </div>
        </div>
      </div>

      {/* Numeric Status Breakdown */}
      <div style={{
        marginTop: 14,
        borderTop: "1px solid #F1F5F9",
        paddingTop: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%"
      }}>
        {breakdownItems.map(item => (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "7px 10px",
              borderRadius: 8,
              backgroundColor: "#F8FAFC",
              border: "1px solid #EEF2F6"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: item.color,
                  display: "inline-block",
                  flexShrink: 0
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                {item.label}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                {item.count.toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 12,
                  backgroundColor: item.bgBadge,
                  color: item.textBadge,
                  minWidth: 44,
                  textAlign: "center"
                }}
              >
                {item.pct}%
              </span>
            </div>
          </div>
        ))}

        {/* Total Summary Row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 10px 0",
          fontSize: 12,
          fontWeight: 600,
          color: "#64748B"
        }}>
          <span>{t("company_admin.total_orders", "Total Breakdown")}</span>
          <span style={{ fontWeight: 700, color: "#0F172A" }}>
            {total.toLocaleString()} ({total > 0 ? "100%" : "0%"})
          </span>
        </div>
      </div>
    </div>
  );
}
function QuickActionsCompact() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleAddBranch = () => {
    navigate("/branches");
  };
  const handleBranchStats = () => {
    navigate("/admin/statistics");
  };
  const cardStyle = {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    background: "#fff",
    border: "1px solid #EEF2F7",
    cursor: "pointer"
  };
  const iconWrap = bg => ({
    background: bg,
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  });
  return <div style={{
    background: "#F8FAFC",
    padding: 12,
    borderRadius: 12
  }}>
      <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 12
    }}>
        <div role="button" onClick={handleAddBranch} style={cardStyle}>
          <div style={iconWrap("#FFFBEB")}>
            <FiPlus size={20} color="#F59E0B" />
          </div>
          <div style={{
          textAlign: "left"
        }}>
            <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#0F172A"
          }}>{t("company_admin.add_new_branch", "Add New Branch")}</div>
            <div style={{
            fontSize: 12,
            color: "#64748B"
          }}>{t("company_admin.instantly_add_new_branch", "Instantly add new branch")}</div>
          </div>
        </div>

        <div role="button" onClick={handleBranchStats} style={cardStyle}>
          <div style={iconWrap("#EFF6FF")}>
            <FiBarChart2 size={20} color="#0D5EA8" />
          </div>
          <div style={{
          textAlign: "left"
        }}>
            <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#0F172A"
          }}>{t("company_admin.branch_statistics", "Branch Statistics")}</div>
            <div style={{
            fontSize: 12,
            color: "#64748B"
          }}>{t("company_admin.view_branch_performance", "View branch performance")}</div>
          </div>
        </div>
      </div>
    </div>;
}
export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [branchStats, setBranchStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // read logged-in user to determine company scope
  const currentUser = getCurrentUser();
  const currentComId = currentUser?.com_id ?? null;
  const [currentComName, setCurrentComName] = useState("Unknown Company");
  const companyLabel = currentComId ? `${currentComName}` : "All companies";
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // fetch server stats and the branch catalog (branches include com_id)
        const [o, bs, allBranches, companyData] = await Promise.all([getStatsOverview(), getBranchStats(), getBranches(), currentComId ? getCompanyById(currentComId).catch(e => {
          console.error("Failed to fetch company", e);
          return null;
        }) : Promise.resolve(null)]);
        if (!mounted) return;
        if (currentComId && companyData) {
          setCurrentComName(companyData.com_name || "Unknown Company");
        }
        const branchesList = allBranches?.data ?? allBranches ?? [];
        let filteredBranches = Array.isArray(bs) ? bs.slice() : [];
        if (currentComId) {
          // build allowed branch id set from the branches catalog where com_id matches
          const allowed = new Set(branchesList.filter(b => b?.com_id != null && String(b.com_id) === String(currentComId)).map(b => String(b.B_id ?? b.b_id ?? b.id ?? "")));

          // keep only branch-stats whose B_id is in allowed set
          filteredBranches = filteredBranches.filter(b => {
            const bid = b?.B_id ?? b?.b_id ?? b?.id ?? null;
            return bid != null && allowed.has(String(bid));
          });
        }
        setBranchStats(filteredBranches);

        // compute overview scoped to company when com_id exists; otherwise use server overview
        if (currentComId) {
          const totalBranches = filteredBranches.length;
          const totalRevenue = filteredBranches.reduce((sum, b) => {
            const inc = b?.income ?? 0;
            return sum + Number(inc || 0);
          }, 0);
          const totalOrders = filteredBranches.reduce((sum, b) => {
            const ord = b?.orders ?? 0;
            return sum + Number(ord || 0);
          }, 0);
          setOverview({
            totalBranches,
            totalRevenue,
            totalOrders
          });
        } else {
          setOverview(o);
        }
        setError(null);
      } catch (err) {
        setError("Failed to load dashboard data.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentComId]);
  return <div style={{
    display: "flex",
    backgroundColor: "#F5F7FA",
    minHeight: "100vh"
  }}>
      <Sidebar />
      <div style={{
      flex: 1,
      marginLeft: 240,
      display: "flex",
      flexDirection: "column"
    }}>
        <Header title={`${t("company_admin.admin_dashboard", "Admin Dashboard")} — ${companyLabel}`} />
        <main style={{
        padding: 40,
        flex: 1
      }}>
          {error && <div style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 8,
          background: "#FEF3C7",
          color: "#92400E"
        }}>
              {error}
            </div>}

          <OverviewCards overview={overview || {}} />

          <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gridTemplateRows: "auto auto",
          gap: 20,
          marginTop: 20,
          alignItems: "start"
        }}>
            <div style={{
            gridColumn: "1 / 2",
            gridRow: "1 / 3"
          }}>
              <TodayActivitiesChart data={branchStats} />
            </div>

            <div style={{
            gridColumn: "2 / 3",
            gridRow: "1 / 2"
          }}>
              <div style={{
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              boxShadow: "0 4px 15px rgba(0,0,0,0.03)"
            }}>
                <h3 style={{
                margin: 0,
                marginBottom: 12,
                fontSize: 16,
                fontWeight: 700,
                color: "#313D4F"
              }}>{t("company_admin.order_summary", "Order Summary")}</h3>
                <OrderSummaryChart branchStats={branchStats} currentComId={currentComId} />
              </div>
            </div>

            <div style={{
            gridColumn: "2 / 3",
            gridRow: "2 / 3"
          }}>
              <QuickActionsCompact />
            </div>
          </div>
        </main>
      </div>
    </div>;
}