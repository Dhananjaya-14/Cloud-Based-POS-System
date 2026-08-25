import { useTranslation } from "react-i18next";
import React from "react";
const StatusToggle = ({
  checked = true,
  onChange
}) => {
  const { t } = useTranslation();
const statusLabel = checked ? "Active" : "Inactive";
  return <div style={{
    display: "flex",
    alignItems: "center",
    marginTop: "6px"
  }}>
      <label style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "165px",
      height: "45px",
      padding: "0 12px",
      borderRadius: "12px",
      border: "1px solid #d8e0ed",
      background: "#ffffff",
      cursor: "pointer",
      boxSizing: "border-box",
      minWidth: "220px"
    }}>
        <span style={{
        fontSize: "14px",
        color: "#30425f",
        fontWeight: 500
      }}>{t("company_admin.status", "Status")}</span>

        <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px"
      }}>
          <span style={{
          fontSize: "13px",
          fontWeight: 600,
          color: checked ? "#1e6f2a" : "#a33b3b",
          minWidth: "56px",
          textAlign: "right"
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
        </div>

        <input type="checkbox" checked={checked} onChange={onChange} style={{
        display: "none"
      }} />
      </label>
    </div>;
};
export default StatusToggle;