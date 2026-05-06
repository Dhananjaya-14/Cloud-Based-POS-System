import React from 'react';

const StatCard = ({ title, count, subtitle, badgeText, badgeColor, bgColor, textColor, icon, onClick, actionText }) => (
  <div 
    onClick={onClick}
    className={`${bgColor} p-6 rounded-2xl flex-1 cursor-pointer transition-all duration-200 border-2 border-transparent hover:border-gray-200 shadow-sm relative overflow-hidden active:scale-[0.98]`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-full bg-white bg-opacity-40 shadow-inner text-2xl`}>
        {icon}
      </div>
      <span className={`${badgeColor} text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider`}>
        {badgeText}
      </span>
    </div>
    
    <div>
      <h3 className={`text-2xl font-bold ${textColor} mb-1`}>{count} {title}</h3>
      <p className={`text-xs opacity-80 ${textColor} leading-relaxed max-w-[85%]`}>
        {subtitle}
      </p>
      <div className={`mt-4 flex items-center gap-1.5 text-sm font-bold ${textColor} group`}>
        <span className="border-b-2 border-current">{actionText}</span>
        <span className="text-lg transition-transform group-hover:translate-x-1">→</span>
      </div>
    </div>
  </div>
);

export default StatCard;

































// import React from 'react';

// const StatCard = ({ title, value, icon, colorClass }) => (
//   <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 flex-1">
//     <div className={`p-3 rounded-lg ${colorClass}`}>
//       <span className="text-xl">{icon}</span>
//     </div>
//     <div>
//       <p className="text-sm text-gray-500 font-medium">{title}</p>
//       <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
//     </div>
//   </div>
// );

// export default StatCard;