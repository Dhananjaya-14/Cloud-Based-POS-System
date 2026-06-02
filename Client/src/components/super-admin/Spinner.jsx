import React from "react";

const Spinner = ({ size = 32, color = "#0ea5e9" }) => {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px 0" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `3px solid ${color}15`,
          borderTop: `3px solid ${color}`,
          animation: "spin 0.8s linear infinite",
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
