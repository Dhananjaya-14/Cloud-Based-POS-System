import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FaTachometerAlt, FaStore, FaUsers, FaChartBar, FaMoneyBill, 
  FaCog, FaSignOutAlt, FaBox, FaTag, FaFileAlt, FaTruck, 
  FaClipboardList, FaLock, FaWifi, FaTimes, FaChevronLeft, FaChevronRight 
} from "react-icons/fa";
import { PiInvoiceBold } from "react-icons/pi";
import { useAuth } from "../../context/AuthContext";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";

const Sidebar = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, features, logout } = useAuth();
  const { toasts, removeToast, toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem("admin_sidebar_minimized") === "true";
  });

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const closeSidebar = () => setIsOpen(false);
    const handleMinimizeToggle = (e) => {
      setIsMinimized(prev => {
        const next = e?.detail?.isMinimized !== undefined ? e.detail.isMinimized : !prev;
        localStorage.setItem("admin_sidebar_minimized", String(next));
        return next;
      });
    };

    window.addEventListener("toggle-admin-sidebar", handleToggle);
    window.addEventListener("close-admin-sidebar", closeSidebar);
    window.addEventListener("toggle-admin-sidebar-minimize", handleMinimizeToggle);

    return () => {
      window.removeEventListener("toggle-admin-sidebar", handleToggle);
      window.removeEventListener("close-admin-sidebar", closeSidebar);
      window.removeEventListener("toggle-admin-sidebar-minimize", handleMinimizeToggle);
    };
  }, []);

  const toggleMinimize = () => {
    setIsMinimized(prev => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_minimized", String(next));
      window.dispatchEvent(new CustomEvent("toggle-admin-sidebar-minimize", { detail: { isMinimized: next } }));
      return next;
    });
  };

  const menuItem = (icon, label, path, isLocked = false, onClick) => {
    const isActive = location.pathname === path || location.pathname.startsWith(path + "/");
    
    const content = (
      <>
        <span style={{ 
          fontSize: 16, 
          color: isActive ? "#ffffff" : "#8B9BB4", // Pure white when active, muted blue-gray when inactive
          display: "flex", 
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.2s ease",
          flexShrink: 0
        }}>
          {icon}
        </span>
        {!isMinimized && (
          <span style={{
            fontSize: 14,
            fontWeight: isActive ? 500 : 400,
            flex: 1,
            letterSpacing: "0.2px",
            whiteSpace: "nowrap"
          }}>
            {label}
          </span>
        )}
        {!isMinimized && isLocked && <FaLock size={12} color="#8B9BB4" />}
      </>
    );

    const style = {
      display: "flex",
      alignItems: "center",
      justifyContent: isMinimized ? "center" : "flex-start",
      gap: isMinimized ? 0 : 12,
      padding: isMinimized ? "10px 0" : "10px 14px",
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
          title={isMinimized ? label : undefined}
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
        title={isMinimized ? label : undefined}
        style={style} 
        onClick={(e) => {
          if (window.innerWidth <= 1024) setIsOpen(false);
          onClick?.(e);
        }}
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

  const renderSectionHeader = (title) => {
    if (isMinimized) return null;
    return (
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
  };

  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay */}
      {isOpen && (
        <div 
          className="admin-sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div 
        className={`admin-sidebar ${isOpen ? "open" : ""} ${isMinimized ? "minimized" : ""}`}
        style={{
          width: isMinimized ? 72 : 250,
          minHeight: "100vh",
          height: "100%",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#081321", // Deep navy blue matching the image
          padding: isMinimized ? "24px 8px" : "24px 16px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: "auto",
          boxSizing: "border-box",
          zIndex: 50,
          borderRight: "1px solid rgba(255,255,255,0.03)",
          transition: "width 0.25s ease-in-out, padding 0.25s ease-in-out, transform 0.3s ease-in-out"
        }}
      >
        <div>
          {/* Logo Section */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isMinimized ? "center" : "space-between",
            paddingLeft: isMinimized ? 0 : 6,
            marginBottom: 10
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", // Bright green gradient
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                flexShrink: 0
              }}>
                <FaWifi size={18} />
              </div>
              {!isMinimized && (
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                  <span style={{ color: "#ffffff" }}>{t("company_admin.slt", "SLT")}</span>{" "}
                  <span style={{ color: "#10B981" }}>{t("company_admin.pos", "POS")}</span>
                </h2>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Desktop Minimize/Maximize Button */}
              <button
                className="admin-sidebar-minimize-btn"
                onClick={toggleMinimize}
                title={isMinimized ? t("company_admin.maximize_sidebar", "Maximize Sidebar") : t("company_admin.minimize_sidebar", "Minimize Sidebar")}
                aria-label={isMinimized ? "Maximize Sidebar" : "Minimize Sidebar"}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  color: "#8B9BB4",
                  borderRadius: 6,
                  width: 26,
                  height: 26,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s"
                }}
              >
                {isMinimized ? <FaChevronRight size={12} /> : <FaChevronLeft size={12} />}
              </button>

              <button 
                className="admin-sidebar-close-btn"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8B9BB4",
                  cursor: "pointer",
                  padding: "6px",
                  display: "none",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                aria-label="Close menu"
              >
                <FaTimes size={18} />
              </button>
            </div>
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