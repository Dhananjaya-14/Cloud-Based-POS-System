import { useTranslation } from "react-i18next";
import React from "react";
export default function OverviewCards({
  overview = {}
}) {
  const { t } = useTranslation();
const {
    totalBranches = 0,
    totalRevenue = 0,
    totalOrders = 0
  } = overview;

  // Custom icon background circle style
  const iconCircleStyle = bgColor => ({
    width: 60,
    height: 60,
    borderRadius: "50%",
    backgroundColor: bgColor,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20
  });
  const cardStyle = bgColor => ({
    flex: 1,
    backgroundColor: bgColor,
    padding: "24px 28px",
    borderRadius: 20,
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center"
  });
  const titleStyle = {
    fontSize: 14,
    color: "#64748B",
    fontWeight: 600,
    marginBottom: 4
  };
  const valueStyle = {
    fontSize: 28,
    fontWeight: 800,
    color: "#0B1220"
  };
  const trendStyle = type => ({
    fontSize: 14,
    color: type === "up" ? "#16A34A" : "#DC2626",
    // Green or Red
    marginTop: 4
  });
  return <div style={{
    display: "flex",
    gap: 20,
    marginBottom: 30
  }}>
      {/* Total Branches */}
      <div style={cardStyle("#FFEFEF")}> {/* Slightly softer pink */}
        <div style={iconCircleStyle("#FFDBDB")}>
          <span className="material-icons" style={{
          fontSize: 30,
          color: "#EF4444"
        }}>{t("company_admin.business", "business")}</span>
        </div>
        <div>
          <div style={titleStyle}>{t("company_admin.total_branches", "Total Branches")}</div>
          <div style={valueStyle}>{totalBranches}</div>
        </div>
      </div>

      {/* Total Revenue */}
      <div style={cardStyle("#E8FFEA")}> {/* Slightly softer green */}
        <div style={iconCircleStyle("#C1FFC7")}>
          <span className="material-icons" style={{
          fontSize: 30,
          color: "#16A34A"
        }}>{t("company_admin.payments", "payments")}</span>
        </div>
        <div>
          <div style={titleStyle}>{t("company_admin.total_revenue", "Total Revenue")}</div>
          <div style={valueStyle}>{t("company_admin.rs", "Rs")}{Number(totalRevenue).toLocaleString()}</div>
          <div style={trendStyle("up")}>{t("company_admin.12_5_vs_last_month", "+12.5% vs last month")}</div> {/* Trend Placeholder */}
        </div>
      </div>

      {/* Total Orders */}
      <div style={cardStyle("#FFF5D9")}> {/* Slightly softer yellow */}
        <div style={iconCircleStyle("#FFE7A6")}>
          <span className="material-icons" style={{
          fontSize: 30,
          color: "#FBBF24"
        }}>{t("company_admin.local_mall", "local_mall")}</span>
        </div>
        <div>
          <div style={titleStyle}>{t("company_admin.total_orders", "Total Orders")}</div>
          <div style={valueStyle}>{totalOrders}</div>
          <div style={trendStyle("down")}>{t("company_admin.2_1_vs_last_month", "-2.1% vs last month")}</div> {/* Trend Placeholder */}
        </div>
      </div>
    </div>;
}