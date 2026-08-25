import { useTranslation } from "react-i18next";
import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
export default function PeakHoursChart({
  data = []
}) {
  const { t } = useTranslation();
const formatted = Array.from({
    length: 24
  }).map((_, h) => {
    const found = (data || []).find(r => Number(r.hour) === h);
    return {
      hour: `${h}:00`,
      orders: found ? Number(found.orders) : 0
    };
  }).slice(10, 23); // show 10AM - 10PM
  return <div style={{
    background: "#fff",
    padding: 12,
    borderRadius: 12
  }}>
      <div style={{
      marginBottom: 8,
      fontWeight: 600
    }}>{t("company_admin.peak_hours", "Peak Hours")}</div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="orders" stroke="#2b6cff" fill="#cfe3ff" />
        </AreaChart>
      </ResponsiveContainer>
    </div>;
}