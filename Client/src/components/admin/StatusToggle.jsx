import { useTranslation } from "react-i18next";
import React from "react";
const StatusToggle = ({
  checked = true,
  onChange
}) => {
  const { t } = useTranslation();
  const statusLabel = checked ? "Active" : "Inactive";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "14px", fontWeight: "500", color: "#4D4D4D" }}>
        {t("company_admin.status", "Status")}
      </label>
      <label style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "36px",
        padding: "0 12px",
        borderRadius: "8px",
        border: "1px solid #C8C8C8",
        background: "#F4F4F4",
        cursor: "pointer",
        boxSizing: "border-box",
        width: "100%"
      }}>
        <span style={{
          fontSize: "13px",
          fontWeight: 600,
          color: checked ? "#1e6f2a" : "#a33b3b",
        }}>
          {statusLabel}
        </span>

        <div aria-hidden style={{
          width: "40px",
          height: "24px",
          borderRadius: "999px",
          background: checked ? "#53C653" : "#E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: checked ? "flex-end" : "flex-start",
          padding: "3px",
          transition: "0.18s",
          boxSizing: "border-box"
        }}>
          <div style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)"
          }} />
        </div>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ display: "none" }} />
      </label>
    </div>
  );
};
export default StatusToggle;