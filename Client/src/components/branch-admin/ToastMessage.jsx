// components/common/ToastMessage.jsx
import React, { useEffect } from "react";

const ToastMessage = ({ message, type, onClose }) => {
  useEffect(() => {
    // Auto-close after 4 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Determine colors based on theme and type
  const isSuccess = type === "success";
  const bgColor = isSuccess ? "#28a745" : "#dc3545"; // Success Green / Error Red
  const icon = isSuccess ? "✓" : "✕";

  const toastStyle = {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: bgColor,
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    zIndex: 9999, // Ensure it's on top
    fontFamily: "sans-serif",
    fontSize: "14px",
    animation: "slideInRight 0.3s ease-out",
  };

  const closeButtonStyle = {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.7)",
    cursor: "pointer",
    fontSize: "18px",
    padding: "0 0 0 10px",
    marginLeft: "auto",
  };

  // Add simple slide-in animation via styled-components alternative (inline keyframes are hacky, using a style tag here for simplicity in this format)
  const animationScript = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;

  return (
    <>
      <style>{animationScript}</style>
      <div style={toastStyle}>
        <span style={{ fontSize: "18px", fontWeight: "bold" }}>{icon}</span>
        <span>{message}</span>
        <button onClick={onClose} style={closeButtonStyle}>✕</button>
      </div>
    </>
  );
};

export default ToastMessage;