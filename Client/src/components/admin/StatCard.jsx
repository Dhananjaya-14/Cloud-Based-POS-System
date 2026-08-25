import { useTranslation } from "react-i18next";
import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
export default function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  trendValue
}) {
  const { t } = useTranslation();
const isPositive = trend === "up";
  const trendColor = isPositive ? "#16A34A" : "#DC2626"; // Standardized Green/Red
  const trendPrefix = isPositive ? "+" : "-";
  return <div style={{
    // The card background is now a soft pastel version of the icon color
    background: `${color}12`,
    // ~7-8% opacity for a soft tinted look
    padding: "24px",
    borderRadius: "20px",
    flex: 1,
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    minWidth: "280px",
    border: "1px solid rgba(0,0,0,0.02)" // Almost invisible border for structure
  }}>
      {/* Saturated Icon Circle Container */}
      <div style={{
      background: `${color}25`,
      // Slightly darker than the card for contrast
      width: "60px",
      height: "60px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }}>
        {Icon && <Icon size={28} color={color} strokeWidth={2.5} />}
      </div>

      {/* Content Area */}
      <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "2px"
    }}>
        <div style={{
        fontSize: "14px",
        color: "#64748B",
        fontWeight: 600,
        marginBottom: "2px"
      }}>
          {title}
        </div>
        
        <div style={{
        fontSize: "28px",
        fontWeight: 800,
        color: "#0B1220",
        // Deep navy/black for maximum readability
        lineHeight: "1.1"
      }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>

        {trendValue && <div style={{
        marginTop: "4px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "13px",
        fontWeight: 600,
        color: trendColor
      }}>
            {/* Using the standard icons from the image style */}
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trendPrefix}{trendValue}%</span>
            <span style={{
          color: "#94a3b8",
          fontWeight: 500,
          marginLeft: "2px"
        }}>{t("company_admin.from_the_last_week", "from the last week")}</span>
          </div>}
      </div>
    </div>;
}