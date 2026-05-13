import React from "react";

const getStatusStyle = (status) => {
  const base = {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
  };
  switch ((status || "").toLowerCase()) {
    case "good":
      return { ...base, background: "#dcfce7", color: "#166534" };
    case "average":
      return { ...base, background: "#fef9c3", color: "#854d0e" };
    case "poor":
      return { ...base, background: "#fee2e2", color: "#991b1b" };
    default:
      return { ...base, background: "#f1f5f9", color: "#475569" };
  }
};

function deriveStatus(avg) {
  if (avg >= 800) return "Good";
  if (avg >= 600) return "Average";
  return "Poor";
}

export default function BranchComparisonTable({ rows = [] }) {
  return (
    <div
      style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "16px",
        border: "1px solid #f0f0f0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: "18px",
          color: "#1e293b",
          marginBottom: "20px",
        }}
      >
        Branch Performance Comparison
      </div>

      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#94a3b8", fontSize: "13px" }}>
            <th style={{ padding: "12px" }}>Branch Name</th>
            <th style={{ padding: "12px" }}>Total Sales</th>
            <th style={{ padding: "12px" }}>Total Orders</th>
            <th style={{ padding: "12px" }}>Avg Order Value</th>
            <th style={{ padding: "12px" }}>Status</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => {
            const name = r.B_name ?? r.name ?? r.branch_name ?? "—";
            const id = r.B_id ?? r.b_id ?? r.id ?? `row-${idx}`;

            // Backend may use different keys: income, total_sales, revenue, orders, completed_orders, count
            const totalSales = Number(r.total_sales ?? r.income ?? r.revenue ?? r.sales ?? 0);
            const totalOrders = Number(r.completed_orders ?? r.orders ?? r.count ?? r.order_count ?? 0);

            // compute average if not provided
            const avgOrderValue =
              Number(r.avg_order_value ?? r.avg ?? (totalOrders ? totalSales / totalOrders : 0)) || 0;

            const status = r.status ?? r.status_label ?? deriveStatus(avgOrderValue);

            return (
              <tr key={id} style={{ background: "#f8fafc", borderRadius: 12 }}>
                <td style={{ padding: "16px", borderRadius: "12px 0 0 12px", fontWeight: 600 }}>{name}</td>
                <td style={{ padding: "16px" }}>Rs. {Math.round(totalSales).toLocaleString()}</td>
                <td style={{ padding: "16px" }}>{totalOrders}</td>
                <td style={{ padding: "16px" }}>Rs. {Math.round(avgOrderValue).toLocaleString()}</td>
                <td style={{ padding: "16px", borderRadius: "0 12px 12px 0" }}>
                  <span style={getStatusStyle(status)}>{status}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


