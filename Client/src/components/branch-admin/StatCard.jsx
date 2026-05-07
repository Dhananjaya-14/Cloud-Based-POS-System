import React from "react";

const StatCard = ({ title, value, icon, colorClass, cardClass, iconClass, cardStyle }) => {
  const resolvedIconClass = iconClass || colorClass || "bg-slate-100 text-slate-600";
  const resolvedCardClass = cardClass || "bg-white";

  return (
    <div
      className={`${resolvedCardClass} p-5 rounded-2xl shadow-sm border border-white/60 flex items-center gap-4 flex-1`}
      style={cardStyle}
    >
      <div className={`p-3 rounded-full ${resolvedIconClass}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-700 font-semibold">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 leading-tight">{value}</h3>
      </div>
    </div>
  );
};

export default StatCard;