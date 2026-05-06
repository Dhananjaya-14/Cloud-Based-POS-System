import React from "react";

export default function OverviewCards({ overview = {} }) {
  const { totalBranches = 0, totalRevenue = 0, totalOrders = 0 } = overview;

  // Custom icon background circle style
  const iconCircleStyle = (bgColor) => ({
    width: 60,
    height: 60,
    borderRadius: "50%",
    backgroundColor: bgColor,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
  });

  const cardStyle = (bgColor) => ({
    flex: 1,
    backgroundColor: bgColor,
    padding: "24px 28px",
    borderRadius: 20,
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
  });

  const titleStyle = {
    fontSize: 14,
    color: "#64748B",
    fontWeight: 600,
    marginBottom: 4,
  };

  const valueStyle = {
    fontSize: 28,
    fontWeight: 800,
    color: "#0B1220",
  };

  const trendStyle = (type) => ({
    fontSize: 14,
    color: type === "up" ? "#16A34A" : "#DC2626", // Green or Red
    marginTop: 4,
  });

  return (
    <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
      {/* Total Branches */}
      <div style={cardStyle("#FFEFEF")}> {/* Slightly softer pink */}
        <div style={iconCircleStyle("#FFDBDB")}>
          <span className="material-icons" style={{ fontSize: 30, color: "#EF4444" }}>business</span>
        </div>
        <div>
          <div style={titleStyle}>Total Branches</div>
          <div style={valueStyle}>{totalBranches}</div>
        </div>
      </div>

      {/* Total Revenue */}
      <div style={cardStyle("#E8FFEA")}> {/* Slightly softer green */}
        <div style={iconCircleStyle("#C1FFC7")}>
          <span className="material-icons" style={{ fontSize: 30, color: "#16A34A" }}>payments</span>
        </div>
        <div>
          <div style={titleStyle}>Total Revenue</div>
          <div style={valueStyle}>Rs {Number(totalRevenue).toLocaleString()}</div>
          <div style={trendStyle("up")}>+12.5% vs last month</div> {/* Trend Placeholder */}
        </div>
      </div>

      {/* Total Orders */}
      <div style={cardStyle("#FFF5D9")}> {/* Slightly softer yellow */}
        <div style={iconCircleStyle("#FFE7A6")}>
          <span className="material-icons" style={{ fontSize: 30, color: "#FBBF24" }}>local_mall</span>
        </div>
        <div>
          <div style={titleStyle}>Total Orders</div>
          <div style={valueStyle}>{totalOrders}</div>
          <div style={trendStyle("down")}>-2.1% vs last month</div> {/* Trend Placeholder */}
        </div>
      </div>
    </div>
  );
}




























// import React from "react";

// export default function OverviewCards({ overview = {} }) {
//   const { totalBranches = 0, totalRevenue = 0, totalOrders = 0 } = overview;
//   const card = (title, value, bg = "#fff") => (
//     <div style={{ background: bg, padding: 18, borderRadius: 12, minWidth: 200 }}>
//       <div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>{title}</div>
//       <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: "#0B1220" }}>{value}</div>
//     </div>
//   );

//   return (
//     <div style={{ display: "flex", gap: 12 }}>
//       {card("Total Branches", totalBranches, "#FEE2E2")}
//       {card("Total Revenue", `$${Number(totalRevenue).toFixed(2)}`, "#DCFCE7")}
//       {card("Total Orders", totalOrders, "#FEF3C7")}
//     </div>
//   );
// }