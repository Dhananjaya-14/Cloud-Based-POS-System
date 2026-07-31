import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaStore,
  FaUsers,
  FaSignOutAlt,
  FaCodeBranch,
  FaClipboardList,
} from "react-icons/fa";

const Sidebar = () => {
  const location = useLocation();

  const menuItem = (icon, label, path) => {
    const isActive = location.pathname === path || location.pathname.startsWith(path);
    return (
      <Link
        to={path}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 20px",
          background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 8,
          color: "#fff",
          textDecoration: "none",
          transition: "background 0.2s ease",
        }}
      >
        {icon}
        <span style={{ fontSize: 15, fontWeight: isActive ? 600 : 500 }}>{label}</span>
      </Link>
    );
  };

  return (
    <div
      style={{
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
        zIndex: 40,
      }}
    >
      <div>
        <h2 style={{ marginLeft: 10, fontSize: 20, fontWeight: 600 }}>
          <span style={{ color: "#00FF1A" }}>SLT</span>{" "}
          <span style={{ color: "#4880FF" }}>POS</span>
        </h2>

        <div style={{ marginTop: 30 }}>
          {menuItem(<FaTachometerAlt />, "Dashboard", "/dashboard")}
          {menuItem(<FaStore />, "Company Management", "/super-admin/hotels")}
          {menuItem(<FaUsers />, "User Management", "/super-admin/users")}
          {menuItem(<FaCodeBranch />, "Branch Management", "/super-admin/branches")}
          {menuItem(<FaClipboardList />, "Activity Log", "/super-admin/activity-log")}
        </div>
      </div>

      <div>
        {menuItem(<FaSignOutAlt />, "Log Out", "/logout")}
      </div>
    </div>
  );
};

export default Sidebar;
