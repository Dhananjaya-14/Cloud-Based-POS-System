import React from "react";
import { FaChevronDown } from "react-icons/fa";

const FormSelect = ({ label, value = "", onChange, options = [] }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", position: "relative" }}>
      <label style={{ fontSize: "14px", fontWeight: "500", color: "#4D4D4D" }}>{label}</label>
      <select
        value={value}
        onChange={onChange}
        style={{
          height: "36px",
          borderRadius: "8px",
          border: "1px solid #C8C8C8",
          outline: "none",
          padding: "0 34px 0 12px",
          fontSize: "14px",
          color: "#808080",
          background: "#F4F4F4",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FaChevronDown
        size={12}
        style={{
          position: "absolute",
          right: "12px",
          bottom: "12px",
          color: "#6A6A6A",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export default FormSelect;
