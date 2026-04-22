import React from 'react';

const StatCard = ({ title, value, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 flex-1">
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <span className="text-xl">{icon}</span>
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

export default StatCard;