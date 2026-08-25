import { useTranslation } from "react-i18next";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaStore, FaUsers, FaChartBar, FaMoneyBill, FaCog, FaSignOutAlt, FaBox, FaTag, FaFileAlt, FaTruck, FaClipboardList, FaLock } from "react-icons/fa";
import { PiInvoiceBold } from "react-icons/pi";
import { useAuth } from "../../context/AuthContext";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
const Sidebar = () => {
  const { t } = useTranslation();
const location = useLocation();
  const {
    user,
    features
  } = useAuth();
  const {
    toasts,
    removeToast,
    toast
  } = useToast();
  const menuItem = (icon, label, path, isLocked = false) => {
    const isActive = location.pathname === path || location.pathname.startsWith(path);
    const content = <>
        {icon}
        <span style={{
        fontSize: 15,
        fontWeight: isActive ? 600 : 500,
        flex: 1
      }}>{label}</span>
        {isLocked && <FaLock size={12} color="#9CA3AF" />}
      </>;
    const style = {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 20px",
      background: isActive && !isLocked ? "rgba(255,255,255,0.08)" : "transparent",
      borderRadius: 10,
      cursor: isLocked ? "not-allowed" : "pointer",
      marginBottom: 8,
      color: isLocked ? "#9CA3AF" : "#fff",
      textDecoration: "none",
      transition: "background 0.2s ease",
      opacity: isLocked ? 0.7 : 1
    };
    if (isLocked) {
      return <div key={label} style={style} onClick={e => {
        e.preventDefault();
        toast.info("Upgrade Required", `Your current package doesn't include ${label}.`);
      }}>
          {content}
        </div>;
    }
    return <Link key={label} to={path} style={style}>
        {content}
      </Link>;
  };
  const isLocked = featureKey => {
    const locked = features && features[featureKey] !== true;
    return locked;
  };
  return <>
      <div style={{
      width: 240,
      minHeight: "100vh",
      height: "100%",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      background: "#2E3E8F",
      padding: "20px 12px 28px",
      position: "fixed",
      left: 0,
      top: 0,
      bottom: 0,
      overflowY: "auto",
      boxSizing: "border-box",
      zIndex: 40
    }}>
        <div>
          <h2 style={{
          marginLeft: 10,
          fontSize: 20,
          fontWeight: 600
        }}>
            <span style={{
            color: "#00FF1A"
          }}>{t("company_admin.slt", "SLT")}</span>{" "}
            <span style={{
            color: "#4880FF"
          }}>{t("company_admin.pos", "POS")}</span>
          </h2>

          <div style={{
          marginTop: 30
        }}>
            {menuItem(<FaTachometerAlt />, t("company_admin.dashboard", "Dashboard"), "/admin/dashboard")}
            {menuItem(<FaStore />, t("company_admin.branches", "Branches"), "/branches")}
            {menuItem(<FaBox />, t("company_admin.products", "Products"), "/admin/products")}
            {menuItem(<FaUsers />, t("company_admin.user_management", "User Management"), "/users")}
            {menuItem(<FaChartBar />, t("company_admin.statistics", "Statistics"), "/admin/statistics")}
            {menuItem(<FaMoneyBill />, t("company_admin.transactions", "Transactions"), "/admin/transactions")}
            {!isLocked("has_promotions") && menuItem(<FaTag />, t("company_admin.promotions", "Promotions"), "/admin/promotions")}
            {!isLocked("has_inventory") && menuItem(<FaTruck />, t("company_admin.suppliers", "Suppliers"), "/admin/suppliers")}
            {!isLocked("has_reports") && menuItem(<FaFileAlt />, t("company_admin.reports", "Reports"), "/admin/sales-details")}
            {menuItem(<FaClipboardList />, t("company_admin.activity_log", "Activity Log"), "/admin/activity-log")}
            {menuItem(<PiInvoiceBold />, t("company_admin.invoice_settings", "Invoice Settings"), "/admin/bill-settings")}
          </div>
        </div>

        <div>
          {menuItem(<FaCog />, t("company_admin.settings", "Settings"), "/settings")}
          {menuItem(<FaSignOutAlt />, t("company_admin.log_out", "Log Out"), "/logout")}
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>;
};
export default Sidebar;
