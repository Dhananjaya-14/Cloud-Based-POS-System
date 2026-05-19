import React from "react";

export default function QuickActions() {
  const actions = [
    { title: "Add New Branch", description: "Instantly add new branch", icon: "add_business", color: "#FBBF24" }, // Yellow
    { title: "Change Branch Details", description: "Edit details", icon: "edit", color: "#16A34A" }, // Green
    { title: "View Branch Reports", description: "In-depth statistics", icon: "summarize", color: "#1E3A8A" }, // Dark Blue
    { title: "Search Branches", description: "Manage existing records", icon: "search", color: "#0EA5E9" }, // Sky Blue
  ];

  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 20, boxShadow: "0 4px 15px rgba(0,0,0,0.03)" }}>
      <h3 style={{ margin: 0, marginBottom: 20, color: "#313D4F", fontSize: 20, fontWeight: 700 }}>
        Quick Actions
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 15 }}>
        {actions.map((action, i) => (
          <button
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              textAlign: "left",
              backgroundColor: "#F9FAFB",
              border: "1px solid #EEF2F7",
              borderRadius: 16,
              padding: "16px 20px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ width: 50, height: 50, borderRadius: "50%", backgroundColor: action.color + "15", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 15 }}>
               <span className="material-icons" style={{ fontSize: 24, color: action.color }}>{action.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1E293B" }}>{action.title}</div>
              <div style={{ fontSize: 14, color: "#64748B" }}>{action.description}</div>
            </div>
            <span className="material-icons" style={{ marginLeft: "auto", color: "#94A3B8" }}>chevron_right</span>
          </button>
        ))}
      </div>
    </div>
  );
}