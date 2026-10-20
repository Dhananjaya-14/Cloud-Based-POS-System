import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import { getUsers, getCompanies, setAuthToken, logout } from "../../services/api";
import Spinner from "../../components/super-admin/Spinner";
import {
  Home,
  Users,
  Lock,
  Clock,
  Plus,
  Pencil,
} from "lucide-react";

/* ─── Stat Card ─────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, iconBg, iconColor }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-all">
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
    >
      {icon}
    </div>
    <div className="flex flex-col justify-center">
      <span className="text-xs font-medium text-slate-500 mb-0.5">{label}</span>
      <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
    </div>
  </div>
);

/* ─── SVG Registration Growth Chart ─────────────────────────── */
const RegistrationChart = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const counts = data.map((d) => d.count);
  const maxDataVal = Math.max(...counts, 0);
  const maxVal = maxDataVal > 10 ? Math.ceil(maxDataVal * 1.25) : 10;

  // Custom tick marks matching the design: 10, 8, 5, 3, 0 when maxVal is 10
  const yTicks =
    maxVal === 10
      ? [10, 8, 5, 3, 0]
      : [maxVal, Math.round(maxVal * 0.8), Math.round(maxVal * 0.5), Math.round(maxVal * 0.3), 0];

  const W = 860;
  const H = 260;
  const pad = { top: 30, right: 25, bottom: 35, left: 45 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const pts = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * iw,
    y: pad.top + ih - (Math.min(d.count, maxVal) / maxVal) * ih,
  }));

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="min-w-[650px]">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
          {/* Horizontal Grid lines and Y-axis tick labels */}
          {yTicks.map((t) => {
            const y = pad.top + ih - (t / maxVal) * ih;
            return (
              <g key={t}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={W - pad.right}
                  y2={y}
                  stroke="#F1F3F5"
                  strokeWidth={1}
                />
                <text
                  x={pad.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="#94A3B8"
                  fontWeight={400}
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Registration Line */}
          <polyline
            fill="none"
            stroke="#0D9488"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
          />

          {/* Data Points with White Fill & Teal Border */}
          {pts.map((p, i) => (
            <g
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-pointer"
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIndex === i ? 7 : 5}
                fill="#FFFFFF"
                stroke="#0D9488"
                strokeWidth={2.5}
                className="transition-all duration-150"
              />
              {/* Invisible larger hover area */}
              <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
            </g>
          ))}

          {/* X-axis Month Labels */}
          {months.map((m, i) => (
            <text
              key={m}
              x={pad.left + (i / (months.length - 1)) * iw}
              y={H - 8}
              textAnchor="middle"
              fontSize={12}
              fill={hoverIndex === i ? "#0D9488" : "#94A3B8"}
              fontWeight={hoverIndex === i ? 600 : 400}
            >
              {m}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoverIndex !== null && (
          <div
            className="absolute z-20 pointer-events-none rounded-xl bg-slate-900/95 text-white px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-sm border border-white/10"
            style={{
              top: Math.max(pts[hoverIndex].y - 45, 10),
              left: Math.min(pts[hoverIndex].x + 10, W - 180),
              transform: "translateY(-100%)",
            }}
          >
            <div className="font-semibold text-teal-300">
              {months[hoverIndex]}: {data[hoverIndex].count} signup{data[hoverIndex].count === 1 ? "" : "s"}
            </div>
            {data[hoverIndex].companies.length > 0 && (
              <div className="mt-1.5 space-y-1 max-h-32 overflow-y-auto">
                {data[hoverIndex].companies.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-[11px] text-slate-300">
                    <span className="truncate max-w-[120px]">• {c.name}</span>
                    <span className="text-slate-400 text-[10px]">{c.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Status Badge ──────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const statusStr = String(status || "").toLowerCase();
  const isActive = statusStr === "active" || statusStr === "true";
  return (
    <span
      className={`px-3 py-0.5 rounded-full text-xs font-semibold ${
        isActive
          ? "bg-[#DCFCE7] text-[#16A34A]"
          : "bg-[#FEE2E2] text-[#EF4444]"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

/* ═══ MAIN DASHBOARD ═══════════════════════════════════════════ */
const Dashboard = () => {
  const [companies, setCompanies] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [ud, cd] = await Promise.all([
        getUsers({ countOnly: "true" }),
        getCompanies(),
      ]);
      setTotalUsers(ud?.count ?? 0);
      setCompanies(Array.isArray(cd) ? cd : []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => {
    const s = String(c.c_status || "").toLowerCase();
    return s === "active" || s === "true" || c.c_status === true;
  }).length;

  /* Compute monthly registrations from company dates */
  const getMonthlyData = () => {
    const data = new Array(12).fill(null).map(() => ({ count: 0, companies: [] }));

    companies.forEach((c) => {
      const dateStr = c.reg_date || c.created_at;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const monthIndex = d.getMonth();
          data[monthIndex].count++;
          data[monthIndex].companies.push({
            name: c.com_name,
            date: d.toISOString().slice(0, 10).split("-").reverse().join("-"),
          });
        }
      }
    });
    return data;
  };

  const monthlyData = getMonthlyData();
  const totalRegistrationsThisYear = monthlyData.reduce((acc, curr) => acc + curr.count, 0);

  const recentCompanies = [...companies]
    .sort((a, b) => new Date(b.reg_date || b.created_at) - new Date(a.reg_date || a.created_at))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F0]">
        <Sidebar />
        <div className="sa-main-content flex-1 ml-[240px] flex flex-col">
          <Header title="System Admin DashBoard" />
          <div className="flex-1 flex justify-center items-center min-h-[calc(100vh-70px)]">
            <div className="flex flex-col items-center gap-4">
              <Spinner size={44} />
              <p className="m-0 text-slate-500 font-medium text-sm">Loading Dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F6F0]">
      <Sidebar />

      <div className="sa-main-content flex-1 ml-[240px] flex flex-col min-w-0">
        <Header title="System Admin DashBoard" />

        <div className="p-6 md:p-8 space-y-6">
          {/* ── Stat Cards ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <StatCard
              icon={<Home size={20} strokeWidth={1.75} />}
              label="Total Companies Registered"
              value={totalCompanies}
              iconBg="bg-[#F0F3F6]"
              iconColor="text-[#64748B]"
            />
            <StatCard
              icon={<Users size={20} strokeWidth={1.75} />}
              label="Total Users"
              value={totalUsers}
              iconBg="bg-[#E6F7F5]"
              iconColor="text-[#0D9488]"
            />
            <StatCard
              icon={<Lock size={20} strokeWidth={1.75} />}
              label="Active Companies"
              value={activeCompanies}
              iconBg="bg-[#FEF3E8]"
              iconColor="text-[#D97706]"
            />
          </div>

          {/* ── Registration Growth Chart Card ─────────────── */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="m-0 text-base font-bold text-slate-900">
                  Company Registration Growth
                </h3>
                <p className="m-0 text-xs text-slate-400 mt-0.5">
                  Monthly new company signups
                </p>
              </div>

              {/* Status Pill Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200/80 bg-slate-50/50 text-xs text-slate-500 font-medium self-start sm:self-auto">
                <Clock size={13} className="text-slate-400" />
                <span>
                  {totalRegistrationsThisYear === 0
                    ? "No registrations yet this year"
                    : `${totalRegistrationsThisYear} registration${totalRegistrationsThisYear === 1 ? "" : "s"} this year`}
                </span>
              </div>
            </div>

            <RegistrationChart data={monthlyData} />
          </div>

          {/* ── Bottom Section: Recent Registrations & Quick Actions ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Card: Recent Company Registrations (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col min-h-[300px]">
              <h3 className="m-0 text-base font-bold text-slate-900 mb-5">
                Recent Company Registrations
              </h3>

              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="pb-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="pb-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Registration Date
                      </th>
                      <th className="pb-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCompanies.length > 0 ? (
                      recentCompanies.map((c, i) => (
                        <tr
                          key={c.com_id || i}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="py-3.5 px-3 text-sm font-medium text-slate-800">
                            {c.com_name || "—"}
                          </td>
                          <td className="py-3.5 px-3 text-sm text-slate-600">
                            {c.c_email || "Not Provided"}
                          </td>
                          <td className="py-3.5 px-3 text-sm text-slate-600">
                            {c.reg_date || c.created_at
                              ? new Date(c.reg_date || c.created_at)
                                  .toISOString()
                                  .slice(0, 10)
                                  .split("-")
                                  .reverse()
                                  .join("-")
                              : "N/A"}
                          </td>
                          <td className="py-3.5 px-3">
                            <StatusBadge status={c.c_status} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-12">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 rounded-xl bg-[#F0F3F6] flex items-center justify-center text-slate-400 mb-3">
                              <Home size={18} strokeWidth={1.75} />
                            </div>
                            <div className="text-sm font-semibold text-slate-800">
                              No companies registered yet
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              New signups will appear here as they come in
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Card: Quick Actions (1 col) */}
            <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h3 className="m-0 text-base font-bold text-slate-900 mb-5">
                Quick Actions
              </h3>

              <div className="space-y-3.5">
                {/* Action 1: Add New Company */}
                <div
                  onClick={() =>
                    navigate("/super-admin/hotels", { state: { openAddModal: true } })
                  }
                  className="w-full border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer bg-white hover:border-teal-500/50 hover:shadow-sm hover:bg-slate-50/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#E6F7F5] flex items-center justify-center text-[#0D9488] shrink-0 group-hover:scale-105 transition-transform">
                    <Plus size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                      Add New Company
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Instantly add new company
                    </div>
                  </div>
                </div>

                {/* Action 2: Change Company Details */}
                <div
                  onClick={() => navigate("/super-admin/hotels")}
                  className="w-full border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer bg-white hover:border-amber-500/50 hover:shadow-sm hover:bg-slate-50/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3E8] flex items-center justify-center text-[#D97706] shrink-0 group-hover:scale-105 transition-transform">
                    <Pencil size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors">
                      Change Company Details
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Edit details
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
