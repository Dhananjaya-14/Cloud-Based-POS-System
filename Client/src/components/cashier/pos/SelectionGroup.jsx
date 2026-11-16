/**
 * SelectionGroup — Reusable pill button group for Order Type / Payment Method.
 *
 * Props:
 *   label    – string   section heading
 *   options  – [{ value: string, label: ReactNode }]
 *   value    – currently selected value
 *   onChange – (value) => void
 *   cols     – number of grid columns (default 2)
 */
import React from "react";

const SelectionGroup = ({ label, options, value, onChange, cols = 2 }) => (
  <div>
    <p className="font-inter mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {label}
    </p>
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
              isActive
                ? "border-emerald-300 bg-white text-slate-900 ring-1 ring-emerald-200"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {isActive && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default SelectionGroup;
