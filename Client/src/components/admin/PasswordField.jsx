import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const PasswordField = ({ label, placeholder = "", value = "", onChange, width = "100%" }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", position: "relative", width }}>
      <label style={{ fontSize: "14px", fontWeight: "500", color: "#4D4D4D" }}>{label}</label>
      <input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          height: "36px",
          borderRadius: "8px",
          border: "1px solid #E4E4E4",
          outline: "none",
          padding: "0 34px 0 6px",
          fontSize: "14px",
          color: "#383838",
          background: "#EFEFEF",
        }}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        style={{
          position: "absolute",
          right: "10px",
          bottom: "6px",
          background: "none",
          border: "none",
          padding: "4px",
          cursor: "pointer",
          color: "#A1A1A1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
      </button>
    </div>
  );
};

export default PasswordField;
