import React from "react";

const Spinner = ({ size = 32, color = "#0ea5e9", padding, className = "" }) => {
  // Only add spacious vertical padding for standalone page/section loaders (size > 24)
  const defaultPadding = padding !== undefined ? padding : size > 24 ? "20px 0" : "0";
  const strokeWidth = size <= 16 ? 2 : size <= 32 ? 2.5 : 3;

  // Safe color for track (handles 3-digit hex like #fff cleanly)
  const trackColor =
    color.toLowerCase() === "#fff" || color.toLowerCase() === "#ffffff"
      ? "rgba(255, 255, 255, 0.25)"
      : `${color}25`;

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        padding: defaultPadding,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: "50%",
          border: `${strokeWidth}px solid ${trackColor}`,
          borderTop: `${strokeWidth}px solid ${color}`,
          animation: "spin 0.8s linear infinite",
          boxSizing: "border-box",
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Spinner;
