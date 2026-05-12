import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/admin/Header";
import Sidebar from "../../components/admin/Sidebar";
import OverviewCards from "../../components/admin/OverviewCards";
import TodayActivitiesChart from "../../components/admin/TodayActivitiesChart";
import { getStatsOverview, getBranchStats, getOrders } from "../../services/api";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { FiPlus, FiBarChart2 } from "react-icons/fi";

ChartJS.register(ArcElement, Tooltip, Legend);

function OrderSummaryChart() {
  const [counts, setCounts] = React.useState({ completed: 0, pending: 0, other: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const orders = await getOrders();
        if (!mounted) return;
        const completed = orders.filter((o) => o.or_status === "completed").length;
        const pending = orders.filter((o) => o.or_status === "pending").length;
        const other = orders.length - completed - pending;
        setCounts({ completed, pending, other });
      } catch (err) {
        setCounts({ completed: 0, pending: 0, other: 0 });
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading)
    return <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;

  const data = {
    labels: ["Completed", "Pending", "Other"],
    datasets: [
      {
        data: [counts.completed, counts.pending, counts.other],
        backgroundColor: ["#16A34A", "#0D5EA8", "#EF4444"],
      },
    ],
  };

  return (
    <div style={{ width: 240, height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Doughnut data={data} options={{ plugins: { legend: { position: "bottom" } }, maintainAspectRatio: false }} />
    </div>
  );
}

function QuickActionsCompact() {
  const navigate = useNavigate();

  const handleAddBranch = () => {
    navigate("/branches");
  };

  const handleBranchStats = () => {
    navigate("/branches"); // adjust route if you have a dedicated branch-stats page
  };

  const cardStyle = {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    background: "#fff",
    border: "1px solid #EEF2F7",
    cursor: "pointer",
  };

  const iconWrap = (bg) => ({
    background: bg,
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });

  return (
    <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div role="button" onClick={handleAddBranch} style={cardStyle}>
          <div style={iconWrap("#FFFBEB")}>
            <FiPlus size={20} color="#F59E0B" />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Add New Branch</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>Instantly add new branch</div>
          </div>
        </div>

        <div role="button" onClick={handleBranchStats} style={cardStyle}>
          <div style={iconWrap("#EFF6FF")}>
            <FiBarChart2 size={20} color="#0D5EA8" />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Branch Statistics</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>View branch performance</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [branchStats, setBranchStats] = useState([]);
  const [loading, setLoading] = useState(true); // kept for non-blocking indicators
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [o, bs] = await Promise.all([getStatsOverview(), getBranchStats()]);
        if (!mounted) return;
        setOverview(o);
        setBranchStats(bs || []);
        setError(null);
      } catch (err) {
        // keep the page visible; show a small inline error banner instead
        setError("Failed to load dashboard data.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ display: "flex", backgroundColor: "#F5F7FA", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
        <Header title="Admin DashBoard" />
        <main style={{ padding: 40, flex: 1 }}>
          {/* Inline error banner (non-blocking) */}
          {error && (
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: "#FEF3C7", color: "#92400E" }}>
              {error}
            </div>
          )}

          {/* Overview cards render immediately even while data loads */}
          <OverviewCards overview={overview || {}} />

          {/* Layout: wide main chart on left, right column shows Order Summary and compact quick actions below */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 360px",
              gridTemplateRows: "auto auto",
              gap: 20,
              marginTop: 20,
              alignItems: "start",
            }}
          >
            {/* Left: Today's Activities (spans both rows) */}
            <div style={{ gridColumn: "1 / 2", gridRow: "1 / 3" }}>
              <TodayActivitiesChart data={branchStats} />
            </div>

            {/* Right (row 1): Order Summary */}
            <div style={{ gridColumn: "2 / 3", gridRow: "1 / 2" }}>
              <div style={{ background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 4px 15px rgba(0,0,0,0.03)" }}>
                <h3 style={{ margin: 0, marginBottom: 12, fontSize: 16, fontWeight: 700, color: "#313D4F" }}>Order Summary</h3>
                <OrderSummaryChart />
              </div>
            </div>

            {/* Right (row 2): Compact quick actions with two friendly cards */}
            <div style={{ gridColumn: "2 / 3", gridRow: "2 / 3" }}>
              <QuickActionsCompact />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

















































