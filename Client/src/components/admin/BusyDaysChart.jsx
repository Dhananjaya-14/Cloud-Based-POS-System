import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function BusyDaysChart({ data = [] }) {
  const orderMap = {};
  (data || []).forEach(d => {
    const key = (d.weekday || d.weekday_name || "").trim() || d.day || d.week || d.label;
    orderMap[key] = Number(d.orders || d.count || 0);
  });
  const orderList = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(k => ({ day: k, orders: orderMap[k] || 0 }));
  return (
    <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Busy Days</div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={orderList}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="orders" fill="#16A34A" radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}