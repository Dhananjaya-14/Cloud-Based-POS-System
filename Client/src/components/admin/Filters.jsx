import React from "react";
import { Calendar, MapPin, ChevronDown } from "lucide-react";

export default function Filters({ branches = [], value = {}, onChange }) {
  const daysOptions = [
    { label: "Last 7 Days", value: 7 },
    { label: "Last 30 Days", value: 30 },
    { label: "Last 90 Days", value: 90 },
  ];

  const selectStyle = {
    appearance: "none",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "10px 36px 10px 40px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#475569",
    cursor: "pointer",
    outline: "none",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  };

  const containerStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
  };

  const iconStyle = {
    position: "absolute",
    left: "12px",
    color: "#94a3b8",
    pointerEvents: "none",
  };

  const chevronStyle = {
    position: "absolute",
    right: "12px",
    color: "#94a3b8",
    pointerEvents: "none",
  };

  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      {/* Date Range Filter */}
      <div style={containerStyle}>
        <Calendar size={18} style={iconStyle} />
        <select
          value={value.days}
          onChange={(e) => onChange({ ...value, days: Number(e.target.value) })}
          style={selectStyle}
          onFocus={(e) => (e.target.style.borderColor = "#0b76ef")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        >
          {daysOptions.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} style={chevronStyle} />
      </div>

      {/* Branch Filter */}
      <div style={containerStyle}>
        <MapPin size={18} style={iconStyle} />
        <select
          value={value.b_id}
          onChange={(e) => onChange({ ...value, b_id: e.target.value })}
          style={selectStyle}
          onFocus={(e) => (e.target.style.borderColor = "#0b76ef")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        >
          <option value="all">All Branches</option>
          {branches.map((b) => (
            <option key={b.B_id} value={b.B_id}>
              {b.B_name}
            </option>
          ))}
        </select>
        <ChevronDown size={16} style={chevronStyle} />
      </div>
    </div>
  );
}










