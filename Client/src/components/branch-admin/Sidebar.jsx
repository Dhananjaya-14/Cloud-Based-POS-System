import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaChartBar,
  FaBoxOpen,
  FaClipboardList,
  FaChevronDown,
  FaChartLine,
  FaExchangeAlt,
  FaCog,
  FaSignOutAlt,
  FaUsers,
  FaFileAlt,
} from "react-icons/fa";

const Sidebar = () => {
  const location = useLocation();

  const inventoryPaths = [
    "/branch-admin/inventory",
    "/branch-admin/raw-ingredient",
    "/branch-admin/recipe-mapper",
  ];
  const statisticsPaths = [
    "/branch-admin/sales-revenue",
    "/branch-admin/cashier-performance",
    "/branch-admin/inventory-stats",
  ];
  const reportPaths = [
    "/branch-admin/reports/sales",
    "/branch-admin/reports/product-sales",
  ];

  const isExactActive = (path) => location.pathname === path;
  const isAnyActive = (paths) => paths.some((path) => location.pathname === path);

  const inventoryActive = isAnyActive(inventoryPaths);
  const statisticsActive = isAnyActive(statisticsPaths);
  const reportsActive = isAnyActive(reportPaths);
  const productActive = location.pathname.startsWith("/branch-admin/products");

  const [isInventoryOpen, setIsInventoryOpen] = useState(inventoryActive);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(statisticsActive);
  const [isReportsOpen, setIsReportsOpen] = useState(reportsActive);

  useEffect(() => {
    if (inventoryActive) {
      setIsInventoryOpen(true);
    }
  }, [inventoryActive]);

  useEffect(() => {
    if (statisticsActive) {
      setIsStatisticsOpen(true);
    }
  }, [statisticsActive]);

  useEffect(() => {
    if (reportsActive) {
      setIsReportsOpen(true);
    }
  }, [reportsActive]);

  const menuItem = (icon, label, path, active = false) => (
    <Link
      to={path}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        background: active ? "rgba(255,255,255,0.2)" : "transparent",
        borderRadius: "6px",
        cursor: "pointer",
        marginBottom: "6px",
        color: "#fff",
        textDecoration: "none",
      }}
    >
      {icon}
      <span style={{ fontSize: "15px", fontWeight: active ? "600" : "400" }}>{label}</span>
    </Link>
  );

  const groupLabel = (icon, label, active = false, open = false, onClick) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: "6px",
        marginBottom: "4px",
        background: active ? "rgba(255,255,255,0.1)" : "transparent",
        border: "none",
        color: "#fff",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {icon}
        <span
          style={{
            fontSize: "15px",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>
      <FaChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
    </button>
  );

  const subItem = (label, path) => (
    <Link
      to={path}
      style={{
        display: "block",
        marginLeft: "40px",
        marginBottom: "8px",
        color: "#E8ECFF",
        textDecoration: "none",
        fontSize: "15px",
        fontWeight: isExactActive(path) ? "600" : "400",
        opacity: isExactActive(path) ? 1 : 0.9,
      }}
    >
      {label}
    </Link>
  );

  return (
    <div
      style={{
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
      zIndex: 40,
      }}
    >
      <div>
        <h2 style={{ marginLeft: "10px", fontSize: "20px", fontWeight: "600" }}>
          <span style={{ color: "#00FF1A" }}>SLT</span>{" "}
          <span style={{ color: "#4880FF" }}>POS</span>
        </h2>

        <div style={{ marginTop: "26px" }}>
          {menuItem(
            <FaTachometerAlt />,
            "Dashboard Overview",
            "/branch-admin/dashboard",
            isExactActive("/branch-admin/dashboard")
          )}
          
          {menuItem(<FaBoxOpen />, "Product", "/branch-admin/products", productActive)}
          {menuItem(<FaUsers />, "User Management", "/branch-admin/users", isExactActive("/branch-admin/users"))}

          {groupLabel(
            <FaClipboardList />,
            "Inventory Management",
            inventoryActive,
            isInventoryOpen,
            () => setIsInventoryOpen((prev) => !prev)
          )}
          {isInventoryOpen && (
            <>
              {subItem("Inventory", "/branch-admin/inventory")}
              {subItem("Add Inventory Item", "/branch-admin/raw-ingredient")}
              {subItem("Supplier Directory", "/branch-admin/suppliers")}
              {subItem("Recipe Mapper", "/branch-admin/recipe-mapper")}
            </>
          )}

          {groupLabel(
            <FaChartLine />,
            "Statistics",
            statisticsActive,
            isStatisticsOpen,
            () => setIsStatisticsOpen((prev) => !prev)
          )}
          {isStatisticsOpen && (
            <>
              {subItem("Sales & Revenue", "/branch-admin/sales-revenue")}
              {subItem("Cashier Performance", "/branch-admin/cashier-performance")}
            </>
          )}

          {menuItem(
            <FaExchangeAlt />,
            "Transactions",
            "/branch-admin/transactions",
            isExactActive("/branch-admin/transactions")
          )}

          {groupLabel(
            <FaFileAlt />,
            "Reports",
            reportsActive,
            isReportsOpen,
            () => setIsReportsOpen((prev) => !prev)
          )}
          {isReportsOpen && (
            <>
              {subItem("Sales Summary ", "/branch-admin/summary-sales")}
              {subItem("Product Sales ", "/branch-admin/summary-productsales")}
              {subItem("Raw Material Stock", "/branch-admin/raw-material-stock")}
              {subItem("Raw Material Consumption", "/branch-admin/raw-material-consumption")}
            </>
          )}
          
        </div>
      </div>

      <div>
        {menuItem(<FaCog />, "Settings", "/branch-admin/settings", isExactActive("/branch-admin/settings"))}
        {menuItem(<FaSignOutAlt />, "Log Out", "/logout", isExactActive("/logout"))}
        
      </div>
    </div>
  );
};

export default Sidebar;
