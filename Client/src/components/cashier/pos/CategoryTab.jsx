/**
 * CategoryTab — Single pill tab for product category filtering.
 *
 * Props:
 *   label    – string  tab text
 *   icon     – React component (react-icons)
 *   active   – boolean
 *   onClick  – () => void
 */
import React from "react";

const CategoryTab = ({ label, icon: Icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
      active
        ? "border-transparent bg-[#0D2236] text-white shadow-sm"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
    }`}
  >
    {Icon && <Icon className="h-3.5 w-3.5" />}
    {label}
  </button>
);

export default CategoryTab;
