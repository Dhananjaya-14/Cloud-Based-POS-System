import React from "react";

const StatusToggle = ({ checked = true, onChange }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: "20px" }}>
      <label
        style={{
          width: "190px",
          height: "36px",
          borderRadius: "8px",
          border: "1px solid #C8C8C8",
          background: "#F4F4F4",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "14px", color: "#4D4D4D" }}>Active Status</span>

        <div
          style={{
            width: "36px",
            height: "20px",
            borderRadius: "20px",
            background: checked ? "#53C653" : "#B8B8B8",
            display: "flex",
            alignItems: "center",
            justifyContent: checked ? "flex-end" : "flex-start",
            padding: "2px",
            transition: "0.2s",
          }}
        >
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              background: "#fff",
            }}
          />
        </div>

        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
};

export default StatusToggle;
