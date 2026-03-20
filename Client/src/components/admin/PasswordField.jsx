import React from "react";
import { FaEye } from "react-icons/fa";

const PasswordField = ({ label, placeholder = "", value = "", onChange, width = "100%" }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", position: "relative", width }}>
      <label style={{ fontSize: "14px", fontWeight: "500", color: "#4D4D4D" }}>{label}</label>
      <input
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          height: "36px",
          borderRadius: "8px",
          border: "1px solid #E4E4E4",
          outline: "none",
          padding: "0 28px 0 6px",
          fontSize: "14px",
          color: "#383838",
          background: "#EFEFEF",
        }}
      />
      <FaEye
        size={14}
        style={{
          position: "absolute",
          right: "12px",
          bottom: "10px",
          color: "#A1A1A1",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export default PasswordField;
