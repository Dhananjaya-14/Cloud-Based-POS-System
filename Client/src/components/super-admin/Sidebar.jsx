import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FaTachometerAlt,
  FaStore,
  FaUsers,
  FaSignOutAlt,
  FaCodeBranch,
  FaClipboardList,
  FaBox,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem("sa_sidebar_minimized") === "true";
  });

  useEffect(() => {
    if (isMinimized) {
      document.body.classList.add("sa-sidebar-minimized");
    } else {
      document.body.classList.remove("sa-sidebar-minimized");
    }
  }, [isMinimized]);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const closeSidebar = () => setIsOpen(false);
    const handleMinimizeToggle = (e) => {
      setIsMinimized(prev => {
        const next = e?.detail?.isMinimized !== undefined ? e.detail.isMinimized : !prev;
        localStorage.setItem("sa_sidebar_minimized", String(next));
        return next;
      });
    };
    
    window.addEventListener("toggle-sa-sidebar", handleToggle);
    window.addEventListener("close-sa-sidebar", closeSidebar);
    window.addEventListener("toggle-sa-sidebar-minimize", handleMinimizeToggle);
    
    return () => {
      window.removeEventListener("toggle-sa-sidebar", handleToggle);
      window.removeEventListener("close-sa-sidebar", closeSidebar);
      window.removeEventListener("toggle-sa-sidebar-minimize", handleMinimizeToggle);
    };
  }, []);

  const toggleMinimize = () => {
    setIsMinimized(prev => {
      const next = !prev;
      localStorage.setItem("sa_sidebar_minimized", String(next));
      window.dispatchEvent(new CustomEvent("toggle-sa-sidebar-minimize", { detail: { isMinimized: next } }));
      return next;
    });
  };

  const menuItem = (icon, label, path, onClick) => {
    const isActive = location.pathname === path || location.pathname.startsWith(path);
    return (
      <Link
        to={path}
        title={isMinimized ? label : undefined}
        onClick={(event) => {
          if (window.innerWidth < 1024) setIsOpen(false);
          onClick?.(event);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMinimized ? "center" : "flex-start",
          gap: isMinimized ? 0 : 10,
          padding: isMinimized ? "12px 0" : "12px 20px",
          background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 8,
          color: "#fff",
          textDecoration: "none",
          transition: "background 0.2s ease",
        }}
      >
        <span style={{ fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </span>
        {!isMinimized && (
          <span style={{ fontSize: 15, fontWeight: isActive ? 600 : 500, whiteSpace: "nowrap" }}>{label}</span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="sa-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        className={`sa-sidebar ${isOpen ? "open" : ""} ${isMinimized ? "minimized" : ""}`}
        style={{
          width: isMinimized ? 72 : 240,
          minHeight: "100vh",
          height: "100%",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#2E3E8F",
          padding: isMinimized ? "20px 8px 28px" : "20px 12px 28px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: "auto",
          boxSizing: "border-box",
          zIndex: 40,
          transition: "width 0.25s ease-in-out, transform 0.3s ease-in-out",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: isMinimized ? "center" : "space-between", alignItems: "center", paddingRight: isMinimized ? 0 : 6 }}>
            {!isMinimized ? (
              <h2 style={{ marginLeft: 10, fontSize: 20, fontWeight: 600, margin: "0 0 0 10px" }}>
                <span style={{ color: "#00FF1A" }}>SLT</span>{" "}
                <span style={{ color: "#4880FF" }}>POS</span>
              </h2>
            ) : (
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 auto 0 4px", textAlign: "center" }} title="SLT POS">
                <span style={{ color: "#00FF1A" }}>S</span><span style={{ color: "#4880FF" }}>P</span>
              </h2>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                className="sa-minimize-btn"
                onClick={toggleMinimize}
                title={isMinimized ? "Maximize Sidebar" : "Minimize Sidebar"}
                aria-label={isMinimized ? "Maximize Sidebar" : "Minimize Sidebar"}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
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
                className="sa-close-btn"
                onClick={() => setIsOpen(false)}
                style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}
              >
                <FaTimes size={20} />
              </button>
            </div>
          </div>

          <div style={{ marginTop: 30 }}>
            {menuItem(<FaTachometerAlt />, "Dashboard", "/dashboard")}
            {menuItem(<FaStore />, "Company Management", "/super-admin/hotels")}
            {menuItem(<FaUsers />, "User Management", "/super-admin/users")}
            {menuItem(<FaCodeBranch />, "Branch Management", "/super-admin/branches")}
            {menuItem(<FaClipboardList />, "Activity Log", "/super-admin/activity-log")}
            {menuItem(<FaBox />, "Package Management", "/super-admin/packages")}
          </div>
        </div>

        <div>
          {menuItem(
            <FaSignOutAlt />,
            "Log Out",
            "/logout",
            (event) => {
              event.preventDefault();
              logout();
            },
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;