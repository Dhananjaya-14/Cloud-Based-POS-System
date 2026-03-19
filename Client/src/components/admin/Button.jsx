import React from "react";

const Button = ({ label, onClick, type = "button", ...rest }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      {...rest}

      style={{
        padding: "10px 16px",
        background: "#3A4DBF",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px",
      }}
    >
      {label}
    </button>
  );
};

export default Button;



