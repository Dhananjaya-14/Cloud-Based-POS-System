import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/super-admin/Sidebar";
import Header from "../../components/super-admin/Header";
import { getBranches, getUsers, getCompanies, setAuthToken, logout } from "../../services/api";
import Spinner from "../../components/super-admin/Spinner";
import {
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaShoppingBag,
  FaIdCard,
  FaLock
} from "react-icons/fa";

/* ─── Stat Card ─────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, bgColor, iconBg }) => (
  <div style={{
    flex: 1, background: bgColor, borderRadius: 16, padding: "24px",
    display: "flex", alignItems: "center", gap: 16, justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
  }}>
    <div style={{
      width: 50, height: 50, borderRadius: "50%", background: iconBg,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: 20
    }}>
      {icon}
    </div>
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ color: "#374151", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#111827", fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  </div>
);

/* ─── SVG Line Chart ────────────────────────────────────────── */
const RegistrationChart = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Extract just the counts for calculations
  const counts = data.map(d => d.count);
  const maxDataVal = Math.max(...counts);
  const maxVal = maxDataVal > 0 ? Math.ceil(maxDataVal * 1.2) : 10;

  const W = 700, H = 280;
  const pad = { top: 40, right: 20, bottom: 35, left: 45 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map(Math.ceil);

  const pts = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * iw,
    y: pad.top + ih - (Math.min(d.count, maxVal) / maxVal) * ih,
  }));

  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {yTicks.map((t) => {
          const y = pad.top + ih - (t / maxVal) * ih;
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#9ca3af">
                {t}
              </text>
            </g>
          );
        })}
        <polyline
          fill="none" stroke="#22C55E" strokeWidth={3} strokeLinejoin="round"
          points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
          style={{ transition: "all 0.3s ease" }}
        />
        {pts.map((p, i) => (
          <g key={i}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
            style={{ cursor: "pointer" }}
          >
            <circle cx={p.x} cy={p.y} r={hoverIndex === i ? 7 : 5} fill="#fff" stroke="#22C55E" strokeWidth={3} style={{ transition: "all 0.2s" }} />
            {/* Invisible larger hit area for easier hover */}
            <circle cx={p.x} cy={p.y} r={15} fill="transparent" />
          </g>
        ))}
        {months.map((m, i) => (
          <text key={m} x={pad.left + (i / (months.length - 1)) * iw} y={H - 8}
            textAnchor="middle" fontSize={11} fill="#9ca3af" fontWeight={hoverIndex === i ? 700 : 400}>
            {m}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hoverIndex !== null && data[hoverIndex].companies.length > 0 && (
        <div style={{
          position: "absolute",
          top: pts[hoverIndex].y - 20,
          left: Math.min(pts[hoverIndex].x + 10, W - 180),
          background: "rgba(17, 24, 39, 0.95)",
          color: "#fff",
          padding: "12px",
          borderRadius: "10px",
          fontSize: "12px",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
          zIndex: 10,
          minWidth: "160px",
          pointerEvents: "none",
          transform: "translateY(-100%)",
          backdropFilter: "blur(4px)",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <div style={{ fontWeight: 700, marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "4px", color: "#4ADE80" }}>
            {months[hoverIndex]} registrations ({data[hoverIndex].count})
          </div>
          {data[hoverIndex].companies.map((c, idx) => (
            <div key={idx} style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>• {c.name}</span>
              <span style={{ opacity: 0.7, fontSize: "10px" }}>{c.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Status Badge ──────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const statusStr = String(status || "").toLowerCase();
  const isActive = statusStr === "active" || statusStr === "true";
  return (
    <span style={{
      padding: "4px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: isActive ? "#DCFCE7" : "#FEE2E2",
      color: isActive ? "#16A34A" : "#EF4444",
    }}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

/* ═══ MAIN DASHBOARD ═══════════════════════════════════════════ */
const Dashboard = () => {
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    setAuthToken(token);
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [bd, ud, cd] = await Promise.all([getBranches(), getUsers(), getCompanies()]);
      setBranches(Array.isArray(bd) ? bd : []);
      setUsers(Array.isArray(ud) ? ud : []);
      setCompanies(Array.isArray(cd) ? cd : []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (err.response?.status === 401) { logout(); navigate("/login"); }
    } finally { setLoading(false); }
  };

  const totalCompanies = companies.length;
  const totalUsers = users.length;
  const activeCompanies = companies.filter(c => {
    const s = String(c.c_status || "").toLowerCase();
    return s === "active" || s === "true" || c.c_status === true;
  }).length;

  /* Try to compute monthly registrations from company reg_date dates. */
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
            date: d.toISOString().slice(0, 10).split('-').reverse().join('-')
          });
        }
      }
    });
    return data;
  };

  const recentCompanies = [...companies]
    .sort((a, b) => new Date(b.reg_date || b.created_at) - new Date(a.reg_date || a.created_at))
    .slice(0, 4);

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
          <Header title="System Admin DashBoard" />
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 70px)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <Spinner size={44} />
              <p style={{ margin: 0, color: "#6B7280", fontWeight: 600, fontSize: 16 }}>Loading Dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: 240 }}>
        <Header title="System Admin DashBoard" />

        <div style={{ padding: "24px 28px" }}>
          {/* ── Stat Cards ─────────────────────────────────── */}
          <div style={{ display: "flex", gap: 20, marginBottom: 28 }}>
            <StatCard
              icon={<FaFileInvoiceDollar />} label="Total Companies Registered"
              value={totalCompanies} bgColor="#FFE4EC" iconBg="#FFB6CB"
            />
            <StatCard
              icon={<FaMoneyBillWave />} label="Total Users"
              value={totalUsers} bgColor="#D1F5E1" iconBg="#9EE6C5"
            />
            <StatCard
              icon={<FaShoppingBag />} label="Active Companies"
              value={activeCompanies} bgColor="#FFF3D6" iconBg="#FFD075"
            />
          </div>

          {/* ── Registration Growth Chart ───────────────────── */}
          <div style={{
            background: "#fff", borderRadius: 14, padding: "24px 28px",
            marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
              Company Registration Growth
            </h3>
            <RegistrationChart data={getMonthlyData()} />
          </div>

          {/* ── Bottom Section: Table + Quick Actions ──────── */}
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            {/* Recent Registrations Table */}
            <div style={{ flex: 2 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
                Recent Company Registrations
              </h3>
              <div style={{
                background: "#fff", borderRadius: 14, overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      {["Name", "Email", "Registration Date", "Status"].map((h) => (
                        <th key={h} style={{
                          padding: "14px 18px", textAlign: "left", fontSize: 13,
                          fontWeight: 600, color: "#6B7280", borderBottom: "1px solid #F3F4F6",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentCompanies.length > 0 ? recentCompanies.map((c, i) => (
                      <tr key={c.com_id || i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={cellStyle}>{c.com_name || "—"}</td>
                        <td style={cellStyle}>{c.c_email || "Not Provided"}</td>
                        <td style={cellStyle}>
                          {(c.reg_date || c.created_at)
                            ? new Date(c.reg_date || c.created_at).toISOString().slice(0, 10).split('-').reverse().join('-')
                            : "N/A"}
                        </td>
                        <td style={cellStyle}>
                          <StatusBadge status={c.c_status} />
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ ...cellStyle, textAlign: "center", color: "#aaa" }}>
                          No companies found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              flex: 1, background: "#fff", borderRadius: 14, padding: "24px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 240,
            }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#1a1a1a", textAlign: "center" }}>
                Quick Actions
              </h3>

              <div
                onClick={() => navigate("/super-admin/hotels", { state: { openAddModal: true } })}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
                  cursor: "pointer", borderBottom: "1px solid #F3F4F6",
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "12px", background: "#FFF8D6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#F59E0B", fontSize: 20,
                }}>
                  <FaIdCard />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Add New Company</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>Instantly add new Company</div>
                </div>
              </div>

              <div
                onClick={() => navigate("/super-admin/hotels")}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "12px", background: "#E0E7FF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#4F46E5", fontSize: 20,
                }}>
                  <FaLock />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Change Company Details</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>Edit details</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const cellStyle = { padding: "14px 18px", fontSize: 14, color: "#374151" };

export default Dashboard;
