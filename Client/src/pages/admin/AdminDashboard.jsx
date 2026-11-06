import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/slidebar";
import OverviewCards from "../../components/admin/OverviewCards";
import TodayActivitiesChart from "../../components/admin/TodayActivitiesChart";
import { getStatsOverview, getBranchStats, getOrders, getBranches, getCurrentUser, getCompanyById } from "../../services/api";
import { FiPlus, FiBarChart2 } from "react-icons/fi";

const ORDER_COLORS = { completed: "#0F9B8E", pending: "#0B2E4F", other: "#E0654F" };

// Donut ring drawn with SVG to match the design (160px, 20px ring, rounded ends)
function OrderDonut({ segments }) {
  const size = 160;
  const radius = 60;
  const stroke = 20;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Order summary">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EFEBE2" strokeWidth={stroke} />
      {total > 0 && segments.filter(seg => seg.value > 0).map(seg => {
        const length = (seg.value / total) * circumference;
        const circle = (
          <circle
            key={seg.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${length} ${circumference}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          >
            <title>{`${seg.label}: ${seg.value.toLocaleString()} (${seg.pct}%)`}</title>
          </circle>
        );
        offset += length;
        return circle;
      })}
    </svg>
  );
}

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
  const getPct = val => (total > 0 ? Math.round((val / total) * 100) : 0);

  const segments = [
    { key: "completed", label: t("company_admin.completed", "Completed"), value: counts.completed, color: ORDER_COLORS.completed },
    { key: "pending", label: t("company_admin.pending", "Pending"), value: counts.pending, color: ORDER_COLORS.pending },
    { key: "other", label: t("company_admin.other", "Other"), value: counts.other, color: ORDER_COLORS.other }
  ].map(seg => ({ ...seg, pct: getPct(seg.value) }));

  if (loading) {
    return (
      <div className="flex h-[160px] flex-col items-center justify-center gap-2 text-sm text-[#5B6470]">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#EFEBE2] border-t-[#0F9B8E]" />
        <span>{t("company_admin.loading", "Loading order summary...")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <OrderDonut segments={segments} />
      {/* Status breakdown: coloured dot, label and right-aligned percentage */}
      <div className="flex w-full flex-col gap-2.5">
        {segments.map(seg => (
          <div key={seg.key} className="flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2 text-[#5B6470]">
              <span className="h-[9px] w-[9px] rounded-full" style={{ background: seg.color }} />
              {seg.label}
            </div>
            <div className="font-bold text-[#071E38]">{seg.pct}%</div>
          </div>
        ))}
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
    backgroundColor: "#F7F5F0",
    minHeight: "100vh"
  }}>
      <Sidebar />
      <div style={{
      flex: 1,
      marginLeft: 240,
      display: "flex",
      flexDirection: "column"
    }}>
        <Header title={t("company_admin.admin_dashboard", "Admin Dashboard")} subtitle={companyLabel} />
        <main style={{
        padding: "32px 36px",
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
          gridTemplateColumns: "2.1fr 1fr",
          gridTemplateRows: "auto auto",
          gap: 20,
          marginTop: 0,
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
              <div className="rounded-[14px] border border-[#E7E3D8] bg-white p-6">
                <h2 className="m-0 mb-[22px] font-space text-base font-bold text-[#071E38]">{t("company_admin.order_summary", "Order Summary")}</h2>
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