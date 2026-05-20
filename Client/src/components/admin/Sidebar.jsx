import React from "react";
import { Link, useLocation } from "react-router-dom"; // 1. Import Router tools
import {
  FaTachometerAlt,
  FaStore,
  FaUsers,
  FaChartBar,
  FaMoneyBill,
  FaCog,
  FaSignOutAlt,
  FaTag,
} from "react-icons/fa";

const Sidebar = () => {
  const location = useLocation(); // 2. Get the current URL path

  const menuItem = (icon, label, path) => {
    // 3. Check if this item is the active one
    const isActive = location.pathname === path;

    return (
      <Link
        to={path}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 20px",
          background: isActive ? "rgba(255,255,255,0.2)" : "transparent",
          borderRadius: "8px",
          cursor: "pointer",
          marginBottom: "8px",
          color: "#fff", // Link defaults to blue, so we force white
          textDecoration: "none", // Remove underline
          transition: "background 0.3s ease",
        }}
      >
        {icon}
        <span style={{ fontSize: "15px", fontWeight: isActive ? "600" : "400" }}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <div
      style={{
        width: "240px",
        height: "100vh",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#2E3E8F",
        padding: "20px 10px",
        position: "fixed", // Keeps sidebar in place while scrolling
        left: 0,
        top: 0,
      }}
    >
      <div>
        <h2 style={{ marginLeft: "10px", fontSize: "20px", fontWeight: "600" }}>
          <span style={{ color: "#00FF1A" }}>SLT</span>{" "}
          <span style={{ color: "#4880FF" }}>POS</span>
        </h2>

        <div style={{ marginTop: "30px" }}>
          {/* 4. Define your paths here */}
          {menuItem(<FaTachometerAlt />, "Dashboard", "/dashboard")}
          {menuItem(<FaStore />, "Branches", "/branches")}
          {menuItem(<FaUsers />, "User Management", "/users")}
          {menuItem(<FaChartBar />, "Statistics", "/statistics")}
          {menuItem(<FaMoneyBill />, "Transactions", "/transactions")}
          {menuItem(<FaTag />, "Promotions", "/promotions")}
        </div>
      </div>

      <div>
        {menuItem(<FaCog />, "Settings", "/settings")}
        {menuItem(<FaSignOutAlt />, "Log Out", "/logout")}
      </div>
    </div>
  );
};

export default Sidebar;



















// import React from "react";
// import {
//   FaTachometerAlt,
//   FaStore,
//   FaUsers,
//   FaChartBar,
//   FaMoneyBill,
//   FaCog,
//   FaSignOutAlt,
// } from "react-icons/fa";

// const Sidebar = () => {
//   const menuItem = (icon, label, active = false) => (
//     <div
//       style={{
//         display: "flex",
//         alignItems: "center",
//         gap: "10px",
//         padding: "12px 20px",
//         background: active ? "rgba(255,255,255,0.2)" : "transparent",
//         borderRadius: "8px",
//         cursor: "pointer",
//         marginBottom: "8px",
//       }}
//     >
//       {icon}
//       <span>{label}</span>
//     </div>
//   );

//   return (
//     <div
//       style={{
//         width: "240px",
//         height: "100vh",
//         color: "#fff",
//         display: "flex",
//         flexDirection: "column",
//         justifyContent: "space-between",
//         background: "#2E3E8F",
//         padding: "20px 10px",
//       }}
//     >
//       <div>
//         <h2 style={{ marginLeft: "10px", fontSize: "20px", fontWeight: "600" }}>
//           <span style={{ color: "#00FF1A" }}>SLT</span> <span style={{color: "#4880FF"}}>POS</span>
//         </h2>

//         <div style={{ marginTop: "30px" }}>
//           {menuItem(<FaTachometerAlt />, "Dashboard")}
//           {menuItem(<FaStore />, "Branches", true)}
//           {menuItem(<FaUsers />, "User Management")}
//           {menuItem(<FaChartBar />, "Statistics")}
//           {menuItem(<FaMoneyBill />, "Transactions")}
//         </div>
//       </div>

//       <div>
//         {menuItem(<FaCog />, "Settings")}
//         {menuItem(<FaSignOutAlt />, "Log Out")}
//       </div>
//     </div>
//   );
// };

// export default Sidebar;


