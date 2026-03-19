import React from "react";

const FormField = ({ label, type = "text", placeholder = "", value = "", onChange }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "14px", fontWeight: "500", color: "#4D4D4D" }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          height: "36px",
          borderRadius: "8px",
          border: "1px solid #C8C8C8",
          outline: "none",
          padding: "0 12px",
          fontSize: "14px",
          color: "#383838",
          background: "#F4F4F4",
        }}
      />
    </div>
  );
};

export default FormField;
