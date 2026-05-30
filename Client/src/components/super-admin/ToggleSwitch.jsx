import React from "react";

const ToggleSwitch = ({ checked, onChange, disabled }) => {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 46,
        height: 24,
        borderRadius: 12,
        background: checked ? "#10B981" : "#E5E7EB", // emerald-500 or slate-200
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: disabled ? 0.6 : 1,
        display: "inline-block",
        verticalAlign: "middle",
        boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.06)"
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 3,
          left: checked ? 25 : 3,
          transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)"
        }}
      />
    </div>
  );
};

export default ToggleSwitch;
