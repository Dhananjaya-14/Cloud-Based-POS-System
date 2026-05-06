import React, { useEffect, useState } from "react";
import Header from "../../components/admin/Header";
import Sidebar from "../../components/admin/Sidebar";
import OverviewCards from "../../components/admin/OverviewCards";
import TodayActivitiesChart from "../../components/admin/TodayActivitiesChart";
import QuickActions from "../../components/admin/QuickActions";
import { getStatsOverview, getBranchStats } from "../../services/api";

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [branchStats, setBranchStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [o, bs] = await Promise.all([getStatsOverview(), getBranchStats()]);
        setOverview(o);
        setBranchStats(bs || []);
      } catch (err) {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Loading Dashboard...</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>{error}</div>;

  return (
    <div style={{ display: "flex", backgroundColor: "#F5F7FA", minHeight: "100vh" }}>
      <Sidebar />
      {/* Assuming Sidebar is ~240px wide */}
      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
        <Header title="Admin DashBoard" />
        
        {/* Main Content Area */}
        <main style={{ padding: 40, flex: 1 }}>
          <OverviewCards overview={overview || {}} />

          {/* New Grid Layout: Three columns, center is wider */}
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 340px", gap: 20, marginTop: 20, alignItems: "start" }}>
            
            {/* Column 1: Order Summary Placeholder */}
            <div style={{ background: "#fff", padding: 24, borderRadius: 20, boxShadow: "0 4px 15px rgba(0,0,0,0.03)" }}>
               <h3 style={{ margin: 0, marginBottom: 15, fontSize: 18, fontWeight: 700, color: "#313D4F" }}>Order Summary</h3>
               <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8" }}>
                  <span className="material-icons" style={{ fontSize: 40 }}>analytics</span>
                  <p style={{ margin: 0, marginLeft: 10 }}>Placeholder</p>
               </div>
            </div>

            {/* Column 2: Chart (Wider Column) */}
            <TodayActivitiesChart data={branchStats} />

            {/* Column 3: Quick Actions */}
            <QuickActions />
          </div>

          {/* **NOTE: BranchTables (the long table) was removed from this page** to clean up the view and match the dashboard image. **/}
        </main>
      </div>
    </div>
  );
}





























// import React, { useEffect, useState } from "react";
// import Header from "../../components/admin/Header";
// import Sidebar from "../../components/admin/Sidebar";
// import OverviewCards from "../../components/admin/OverviewCards";
// import BranchChart from "../../components/admin/TodayActivitiesChart";
// import BranchTables from "../../components/admin/BranchTables";
// import { getStatsOverview, getBranchStats, getBranches } from "../../services/api";

// export default function AdminDashboard() {
//   const [overview, setOverview] = useState(null);
//   const [branchStats, setBranchStats] = useState([]);
//   const [branches, setBranches] = useState([]);

//   useEffect(() => {
//     (async () => {
//       try {
//         const o = await getStatsOverview();
//         setOverview(o);
//       } catch (err) {}
//       try {
//         const bs = await getBranchStats();
//         setBranchStats(bs || []);
//       } catch (err) {}
//       try {
//         const br = await getBranches();
//         setBranches(br || []);
//       } catch (err) {}
//     })();
//   }, []);

//   return (
//     <div style={{ display: "flex" }}>
//       <Sidebar />
//       <div style={{ flex: 1, marginLeft: 240 }}>
//         <Header title="Admin DashBoard" />
//         <main style={{ padding: 20 }}>
//           <OverviewCards overview={overview || {}} />
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 18, marginTop: 18 }}>
//             <BranchChart data={branchStats} />
//             <div style={{ background: "#fff", padding: 16, borderRadius: 12 }}>
//               <h3>Quick Actions</h3>
//               {/* Buttons: Add Branch, Edit Branch, View Reports */}
//             </div>
//           </div>
//           <div style={{ marginTop: 18 }}>
//             <BranchTables branches={branches} branchStats={branchStats} />
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// }