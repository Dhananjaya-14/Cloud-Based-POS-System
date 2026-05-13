import React, { useEffect, useState } from "react";
import { DollarSign, ShoppingBag, Users, Truck } from "lucide-react";
import { getStatsOverview, getBranches, getOrders, getBranchStats } from "../../services/api";
import Header from "../../components/admin/Header";
import Sidebar from "../../components/admin/Sidebar";
import StatCard from "../../components/admin/StatCard";
import Filters from "../../components/admin/Filters";
import SalesChart from "../../components/admin/SalesChart";
import PeakHoursChart from "../../components/admin/PeakHoursChart";
import BusyDaysChart from "../../components/admin/BusyDaysChart";
import BranchComparisonTable from "../../components/admin/BranchComparisonTable";

export default function AdminStatistics() {
  const [overview, setOverview] = useState({});
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ days: 7, b_id: "all" });

  const [sales, setSales] = useState([]);
  const [typeBreakdown, setTypeBreakdown] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [busyDays, setBusyDays] = useState([]);
  const [branchCompare, setBranchCompare] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [ovRes, brRes] = await Promise.all([getStatsOverview(), getBranches()]);
        setOverview(ovRes || {});
        setBranches(brRes?.data || brRes || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    const toISODate = (d) => d.toISOString().slice(0, 10);
    const lastNDates = (n) => {
      const arr = [];
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        arr.push(toISODate(d));
      }
      return arr;
    };

    (async () => {
      try {
        const allOrders = await getOrders();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (filters.days - 1));
        
        const filtered = allOrders.filter((o) => {
          if (filters.b_id !== "all" && String(o.b_id) !== String(filters.b_id)) return false;
          const d = o.or_date ? new Date(o.or_date) : null;
          return d && d >= cutoff;
        });

        const dates = lastNDates(filters.days);
        const salesSeries = dates.map((date) => {
          const ordersOnDay = filtered.filter((o) => {
            const od = o.or_date ? o.or_date.slice(0, 10) : "";
            return od === date && o.or_status === "completed";
          });
          const revenue = ordersOnDay.reduce((s, o) => s + Number(o.or_totalCostWtax || 0), 0);
          return { date, revenue: revenue, orders: ordersOnDay.length };
        });

        const typeCounts = filtered.reduce((acc, o) => {
          const t = o.or_type?.toLowerCase() || "unknown";
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {});
        const typeBreakdownArr = Object.keys(typeCounts).map((k) => ({ or_type: k, count: typeCounts[k] }));

        const hourMap = {};
        filtered.forEach((o) => {
          const time = o.or_time || "";
          const hour = time ? parseInt(time.split(":")[0], 10) : (new Date(o.or_date).getHours() || 0);
          hourMap[hour] = (hourMap[hour] || 0) + 1;
        });
        const peakHoursArr = Object.keys(hourMap).map((h) => ({ hour: Number(h), orders: hourMap[h] }));

        const weekdayMap = {};
        filtered.forEach((o) => {
          const d = new Date(o.or_date);
          const wd = d.toLocaleDateString(undefined, { weekday: "short" });
          weekdayMap[wd] = (weekdayMap[wd] || 0) + 1;
        });
        const busyDaysArr = Object.keys(weekdayMap).map((k) => ({ weekday: k, orders: weekdayMap[k] }));

        const branchStats = await getBranchStats();

        setSales(salesSeries);
        setTypeBreakdown(typeBreakdownArr);
        setPeakHours(peakHoursArr);
        setBusyDays(busyDaysArr);
        setBranchCompare(branchStats || []);
      } catch (err) {
        console.error("Failed to build stats:", err);
      }
    })();
  }, [filters]);

  return (
    <div style={{ display: "flex", background: "#f8fafc", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: 240, transition: "all 0.3s" }}>
        <Header title="Super Admin Statistics" />

        <div style={{ padding: "30px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
            <Filters branches={branches} value={filters} onChange={setFilters} />
          </div>

          {/* Stat Cards Grid */}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <StatCard 
              title="Total Revenue" 
              value={overview.totalRevenue ?? 0} 
              icon={DollarSign} 
              color="#10b981" 
              trend="up" 
              trendValue="12" 
            />
            <StatCard 
              title="Total Orders" 
              value={overview.totalOrders ?? 0} 
              icon={ShoppingBag} 
              color="#f43f5e" 
              trend="down" 
              trendValue="5" 
            />
            <StatCard 
              title="Dine-In Orders" 
              value={typeBreakdown.find(t => t.or_type === "dine-in")?.count ?? 0} 
              icon={Users} 
              color="#0b76ef" 
              trend="up" 
              trendValue="8" 
            />
            <StatCard 
              title="Takeaway Orders" 
              value={typeBreakdown.find(t => t.or_type === "takeaway")?.count ?? 0} 
              icon={Truck} 
              color="#f59e0b" 
              trend="down" 
              trendValue="3" 
            />
          </div>

          {/* Charts Row */}
          <div style={{ display: "flex", gap: "20px", marginTop: "24px" }}>
            <div style={{ flex: 2 }}>
               <SalesChart data={sales} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
              <PeakHoursChart data={peakHours} />
              <BusyDaysChart data={busyDays} />
            </div>
          </div>

          {/* Table Row */}
          <div style={{ marginTop: "24px" }}>
            <BranchComparisonTable rows={branchCompare} />
          </div>
        </div>
      </div>
    </div>
  );
}


