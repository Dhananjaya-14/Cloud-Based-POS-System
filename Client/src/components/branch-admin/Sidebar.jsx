import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaBoxOpen, FaClipboardList, FaChevronDown, FaChartLine, FaExchangeAlt, FaCog, FaSignOutAlt, FaUsers, FaFileAlt, FaLock, FaChair } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
const Sidebar = () => {
  const { t } = useTranslation();
const location = useLocation();
  const {
    features
  } = useAuth();
  const {
    toasts,
    removeToast,
    toast
  } = useToast();

  // Returns true if the feature is NOT in the current package
  const isLocked = featureKey => features && features[featureKey] !== true;
  const inventoryPaths = ["/branch-admin/inventory", "/branch-admin/raw-ingredient", "/branch-admin/recipe-mapper", "/branch-admin/waste-management", "/branch-admin/return-management"];
  const statisticsPaths = ["/branch-admin/sales-revenue", "/branch-admin/cashier-performance", "/branch-admin/inventory-stats"];
  const reportPaths = ["/branch-admin/reports/sales", "/branch-admin/reports/product-sales"];
  const isExactActive = path => location.pathname === path;
  const isAnyActive = paths => paths.some(path => location.pathname === path);
  const inventoryActive = isAnyActive(inventoryPaths);
  const statisticsActive = isAnyActive(statisticsPaths);
  const reportsActive = isAnyActive(reportPaths);
  const productActive = location.pathname.startsWith("/branch-admin/products");
  const [isInventoryOpen, setIsInventoryOpen] = useState(inventoryActive);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(statisticsActive);
  const [isReportsOpen, setIsReportsOpen] = useState(reportsActive);
  useEffect(() => {
    if (inventoryActive) setIsInventoryOpen(true);
  }, [inventoryActive]);
  useEffect(() => {
    if (statisticsActive) setIsStatisticsOpen(true);
  }, [statisticsActive]);
  useEffect(() => {
    if (reportsActive) setIsReportsOpen(true);
  }, [reportsActive]);
  const menuItem = (icon, label, path, active = false) => <Link to={path} style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    background: active ? "rgba(255,255,255,0.2)" : "transparent",
    borderRadius: "6px",
    cursor: "pointer",
    marginBottom: "6px",
    color: "#fff",
    textDecoration: "none"
  }}>
      {icon}
      <span style={{
      fontSize: "15px",
      fontWeight: active ? "600" : "400"
    }}>{label}</span>
    </Link>;

  // Group label that optionally shows a lock icon and blocks expansion
  const groupLabel = (icon, label, active = false, open = false, onClick, locked = false) => <button type="button" onClick={() => {
    if (locked) {
      toast.info("Upgrade Required", `Your current package doesn't include ${label}. Please upgrade your plan.`);
      return;
    }
    onClick();
  }} style={{
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: "6px",
    marginBottom: "4px",
    background: active && !locked ? "rgba(255,255,255,0.1)" : "transparent",
    border: "none",
    color: locked ? "#9CA3AF" : "#fff",
    cursor: locked ? "not-allowed" : "pointer",
    opacity: locked ? 0.7 : 1
  }}>
      <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px"
    }}>
        {icon}
        <span style={{
        fontSize: "15px",
        whiteSpace: "nowrap"
      }}>
          {label}
        </span>
      </div>
      {locked ? <FaLock size={12} color="#9CA3AF" /> : <FaChevronDown size={12} style={{
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.2s ease"
    }} />}
    </button>;
  const subItem = (label, path) => <Link to={path} style={{
    display: "block",
    marginLeft: "40px",
    marginBottom: "8px",
    color: "#E8ECFF",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: isExactActive(path) ? "600" : "400",
    opacity: isExactActive(path) ? 1 : 0.9
  }}>
      {label}
    </Link>;
  const lockedSubItem = label => <div style={{
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginLeft: "40px",
    marginBottom: "8px",
    color: "#9CA3AF",
    fontSize: "15px",
    cursor: "not-allowed",
    opacity: 0.7
  }} onClick={() => toast.info("Upgrade Required", `Your current package doesn't include ${label}.`)}>
      {label} <FaLock size={10} />
    </div>;
  return <>
      <div style={{
      width: "240px",
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
          marginLeft: "10px",
          fontSize: "20px",
          fontWeight: "600"
        }}>
            <span style={{
            color: "#00FF1A"
          }}>{t("branch_admin.slt", "SLT")}</span>{" "}
            <span style={{
            color: "#4880FF"
          }}>{t("branch_admin.pos", "POS")}</span>
          </h2>

          <div style={{
          marginTop: "26px"
        }}>
            {menuItem(<FaTachometerAlt />, t("branch_admin.dashboard_overview", "Dashboard Overview"), "/branch-admin/dashboard", isExactActive("/branch-admin/dashboard"))}

            {menuItem(<FaBoxOpen />, t("branch_admin.product", "Product"), "/branch-admin/products", productActive)}
            {menuItem(<FaUsers />, t("branch_admin.user_management", "User Management"), "/branch-admin/users", isExactActive("/branch-admin/users"))}

            {!isLocked("has_inventory") && <>
                {groupLabel(<FaClipboardList />, t("branch_admin.inventory_management", "Inventory Management"), inventoryActive, isInventoryOpen, () => setIsInventoryOpen(prev => !prev))}
                {isInventoryOpen && <>
                    {subItem("Inventory", "/branch-admin/inventory")}
                    {subItem("Add Inventory Item", "/branch-admin/raw-ingredient")}
                    {isLocked("has_suppliers") ? lockedSubItem("Supplier Directory") : subItem("Supplier Directory", "/branch-admin/suppliers")}
                    {subItem("Waste Management", "/branch-admin/waste-management")}
                    {subItem("Return Management", "/branch-admin/return-management")}
                    {subItem(t("branch_admin.recipe_mapper", "Recipe Mapper"), "/branch-admin/recipe-mapper")}
                  </>}
              </>}
            {menuItem(<FaChair />, t("branch_admin.table_management", "Table Management"), "/branch-admin/tables", isExactActive("/branch-admin/tables"))}

            {groupLabel(<FaChartLine />, t("branch_admin.statistics", "Statistics"), statisticsActive, isStatisticsOpen, () => setIsStatisticsOpen(prev => !prev))}
            {isStatisticsOpen && <>
                {subItem("Sales & Revenue", "/branch-admin/sales-revenue")}
                {subItem(t("branch_admin.cashier_performance", "Cashier Performance"), "/branch-admin/cashier-performance")}
              </>}

            {menuItem(<FaExchangeAlt />, t("branch_admin.transactions", "Transactions"), "/branch-admin/transactions", isExactActive("/branch-admin/transactions"))}

            {!isLocked("has_reports") && <>
                {groupLabel(<FaFileAlt />, t("branch_admin.reports", "Reports"), reportsActive, isReportsOpen, () => setIsReportsOpen(prev => !prev))}
                {isReportsOpen && <>
                    {subItem("Sales Summary", "/branch-admin/summary-sales")}
                    {subItem(t("branch_admin.product_sales", "Product Sales"), "/branch-admin/summary-productsales")}
                    {!isLocked("has_inventory") && subItem("Raw Material Stock", "/branch-admin/raw-material-stock")}
                    {!isLocked("has_inventory") && subItem("Raw Material Consumption", "/branch-admin/raw-material-consumption")}
                  </>}
              </>}

          </div>
        </div>

        <div>
          {menuItem(<FaCog />, t("branch_admin.settings", "Settings"), "/branch-admin/settings", isExactActive("/branch-admin/settings"))}
          {menuItem(<FaSignOutAlt />, t("branch_admin.log_out", "Log Out"), "/logout", isExactActive("/logout"))}
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>;
};
export default Sidebar;
