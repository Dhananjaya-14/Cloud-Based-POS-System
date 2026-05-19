// import React from "react";
// import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, defs, linearGradient, stop } from "recharts";

import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function SalesChart({ data = [] }) {
  return (
    <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", flex: 2, border: "1px solid #f0f0f0", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>Sales & Revenue Over Time</h3>
        <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Daily performance tracking</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0b76ef" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0b76ef" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#0b76ef" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}











