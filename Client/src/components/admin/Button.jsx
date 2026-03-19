import React from "react";

const Button = ({ label, type = "button", onClick, style, disabled = false }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 16px",
        background: "#3A4DBF",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px",
        opacity: disabled ? 0.7 : 1,
        ...style,
      }}
    >
      {label}
    </button>
  );
};

export default Button;



