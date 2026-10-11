import { useTranslation } from "react-i18next";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FaTachometerAlt, FaStore, FaUsers, FaChartBar, FaMoneyBill, 
  FaCog, FaSignOutAlt, FaBox, FaTag, FaFileAlt, FaTruck, 
  FaClipboardList, FaLock, FaWifi 
} from "react-icons/fa";
import { PiInvoiceBold } from "react-icons/pi";
import { useAuth } from "../../context/AuthContext";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";

const Sidebar = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, features, logout } = useAuth();
  const { toasts, removeToast, toast } = useToast();

  const menuItem = (icon, label, path, isLocked = false, onClick) => {
    const isActive = location.pathname === path || location.pathname.startsWith(path + "/");
    
    const content = (
      <>
        <span style={{ 
          fontSize: 16, 
          color: isActive ? "#ffffff" : "#8B9BB4", // Pure white when active, muted blue-gray when inactive
          display: "flex", 
          alignItems: "center",
          transition: "color 0.2s ease"
        }}>
          {icon}
        </span>
        <span style={{
          fontSize: 14,
          fontWeight: isActive ? 500 : 400,
          flex: 1,
          letterSpacing: "0.2px"
        }}>
          {label}
        </span>
        {isLocked && <FaLock size={12} color="#8B9BB4" />}
      </>
    );

    const style = {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      background: isActive && !isLocked ? "#112A3C" : "transparent", // Exact active background color from image
      borderRadius: 6,
      cursor: isLocked ? "not-allowed" : "pointer",
      marginBottom: 4,
      color: isLocked ? "#4B5A6E" : (isActive ? "#ffffff" : "#8B9BB4"),
      textDecoration: "none",
      transition: "all 0.2s ease",
      opacity: isLocked ? 0.6 : 1,
    };

    // Inline hover effect
    const handleMouseEnter = (e) => {
      if (!isActive && !isLocked) {
        e.currentTarget.style.color = "#ffffff";
        if(e.currentTarget.firstChild) {
           e.currentTarget.firstChild.style.color = "#ffffff";
        }
      }
    };
    
    const handleMouseLeave = (e) => {
      if (!isActive && !isLocked) {
        e.currentTarget.style.color = "#8B9BB4";
        if(e.currentTarget.firstChild) {
           e.currentTarget.firstChild.style.color = "#8B9BB4";
        }
      }
    };

    if (isLocked) {
      return (
        <div 
          key={label} 
          style={style} 
          onClick={(e) => {
            e.preventDefault();
            toast.info("Upgrade Required", `Your current package doesn't include ${label}.`);
          }}
        >
          {content}
        </div>
      );
    }

    return (
      <Link 
        key={label} 
        to={path} 
        style={style} 
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </Link>
    );
  };

  const isLocked = (featureKey) => {
    return features && features[featureKey] !== true;
  };

  const renderSectionHeader = (title) => (
    <div style={{
      fontSize: 10,
      fontWeight: 600,
      color: "#5A6D85", // Muted color for "MAIN" and "INSIGHTS"
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      marginTop: 28,
      marginBottom: 10,
      paddingLeft: 14
    }}>
      {title}
    </div>
  );

  return (
    <>
      <div style={{
        width: 250,
        minHeight: "100vh",
        height: "100%",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#081321", // Deep navy blue matching the image
        padding: "24px 16px",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        overflowY: "auto",
        boxSizing: "border-box",
        zIndex: 40,
        borderRight: "1px solid rgba(255,255,255,0.03)"
      }}>
        <div>
          {/* Logo Section */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 6, marginBottom: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", // Bright green gradient
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff"
            }}>
              <FaWifi size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "0.5px" }}>
              <span style={{ color: "#ffffff" }}>{t("company_admin.slt", "SLT")}</span>{" "}
              <span style={{ color: "#10B981" }}>{t("company_admin.pos", "POS")}</span>
            </h2>
          </div>

          {/* MAIN Section */}
          {renderSectionHeader("MAIN")}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {menuItem(<FaTachometerAlt />, t("company_admin.dashboard", "Dashboard"), "/admin/dashboard")}
            {menuItem(<FaStore />, t("company_admin.branches", "Branches"), "/branches")}
            {menuItem(<FaBox />, t("company_admin.products", "Products"), "/admin/products")}
            {menuItem(<FaUsers />, t("company_admin.user_management", "User Management"), "/users")}
          </div>

          {/* INSIGHTS Section */}
          {renderSectionHeader("INSIGHTS")}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {menuItem(<FaChartBar />, t("company_admin.statistics", "Statistics"), "/admin/statistics")}
            {menuItem(<FaMoneyBill />, t("company_admin.transactions", "Transactions"), "/admin/transactions")}
            {!isLocked("has_promotions") && menuItem(<FaTag />, t("company_admin.promotions", "Promotions"), "/admin/promotions")}
            {!isLocked("has_inventory") && menuItem(<FaTruck />, t("company_admin.suppliers", "Suppliers"), "/admin/suppliers")}
            {!isLocked("has_reports") && menuItem(<FaFileAlt />, t("company_admin.reports", "Reports"), "/admin/sales-details")}
            {menuItem(<FaClipboardList />, t("company_admin.activity_log", "Activity Log"), "/admin/activity-log")}
            {menuItem(<PiInvoiceBold />, t("company_admin.invoice_settings", "Invoice Settings"), "/admin/bill-settings")}
          </div>
        </div>

        {/* Bottom Section */}
        <div style={{ display: "flex", flexDirection: "column", paddingTop: 16 }}>
          {menuItem(
            <FaSignOutAlt />,
            t("company_admin.log_out", "Log Out"),
            "/logout",
            false,
            (event) => {
              event.preventDefault();
              logout();
            }
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};

export default Sidebar;