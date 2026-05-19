import React from "react";

const StatCard = ({
  title,
  count,
  value,
  subtitle,
  badgeText,
  badgeColor = "bg-blue-500",
  bgColor = "bg-white",
  textColor = "text-slate-900",
  icon,
  onClick,
  actionText = "View",
  showAction = true,
  colorClass,
  cardClass,
  iconClass,
  cardStyle,
}) => {
  const displayValue = value ?? count ?? 0;
  const resolvedIconClass = iconClass || colorClass || "bg-slate-100 text-slate-600";
  const resolvedCardClass = cardClass || bgColor || "bg-white";

  return (
    <div
      onClick={onClick}
      className={`${resolvedCardClass} p-5 rounded-2xl shadow-sm border border-white/60 flex items-center gap-4 flex-1 cursor-pointer transition-all duration-200 relative overflow-hidden active:scale-[0.98]`}
      style={cardStyle}
    >
      <div className={`p-3 rounded-full ${resolvedIconClass}`}>
        <span className="text-xl">{icon}</span>
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start mb-2">
          <div />
          {badgeText && (
            <span className={`${badgeColor} text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider`}>
              {badgeText}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-700 font-semibold">{title}</p>
        <h3 className={`text-2xl font-bold leading-tight ${textColor} mt-1`}>{displayValue}</h3>

        {subtitle && <p className={`text-xs opacity-80 ${textColor} leading-relaxed max-w-[85%] mt-1`}>{subtitle}</p>}

        {showAction && (
          <div className={`mt-4 flex items-center gap-1.5 text-sm font-bold ${textColor} group`}>
            <span className="border-b-2 border-current">{actionText}</span>
            <span className="text-lg transition-transform group-hover:translate-x-1">→</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
