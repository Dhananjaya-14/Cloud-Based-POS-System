import React from "react";
import { FaBell, FaUserCircle, FaUserPlus } from "react-icons/fa";

const Header = ({
  title = "Product Management",
  role = "Branch Admin",
  email = "branchadmin@gmail.com",
  showAddUserIcon = true,
}) => {
  return (
    <div
      style={{
        position: "relative",
        
        top: "-10px",
        left: 0,
        right: 0,
        height: "70px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        boxSizing: "border-box",
        color: "#fff",
        background: "linear-gradient(135deg, #2E3E8F 0%, #00B4EB 59%, #55D24B 100%)",
      }}
    >
      <h2 style={{ fontSize: "30px", margin: 0, fontWeight: "700" }}>{title}</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {showAddUserIcon && <FaUserPlus size={18} />}
        <FaBell size={20} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "1px solid rgba(255,255,255,0.6)",
            padding: "6px 14px",
            borderRadius: "10px",
          }}
        >
          <FaUserCircle size={30} />
          <div>
            <div style={{ fontSize: "14px", lineHeight: 1.2 }}>{role}</div>
            <div style={{ fontSize: "12px", lineHeight: 1.2 }}>{email}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
