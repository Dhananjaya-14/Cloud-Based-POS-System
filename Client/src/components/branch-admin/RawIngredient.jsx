import { useTranslation } from "react-i18next";
// components/branch-admin/RawIngredient.jsx
import React from "react";
import { FiX } from "react-icons/fi";

const labelClass = "mb-[7px] block text-[11px] font-bold uppercase tracking-[0.04em] text-[#5B6470]";
const baseField = "w-full rounded-lg border-[1.5px] border-[#E7E3D8] px-[13px] py-2.5 text-[13.5px] outline-none";
const inputClass = `${baseField} bg-white text-[#1A1A1A] placeholder:text-[#B7BEC8] focus:border-[#0F9B8E]`;
const readOnlyClass = `${baseField} bg-[#FBFAF7] font-semibold text-[#5B6470]`;

const RawIngredient = ({
  index,
  data,
  onChange,
  onRemove,
  validUnits
}) => {
  const { t } = useTranslation();
  const rowTotal = (parseFloat(data.stock_qty) || 0) * (parseFloat(data.unit_price) || 0);
  // Rows share one card: dashed separator between repeated rows (none above the first)
  const separator = index > 0 ? "mt-4 border-t border-dashed border-[#E7E3D8] pt-4" : "";
  return <div className={`grid grid-cols-[2fr_1fr_0.8fr_0.9fr_1fr_1fr_32px] items-end gap-3.5 ${separator}`}>
      {/* 1. Name (widest column) */}
      <div>
        <label className={labelClass}>{t("branch_admin.ingredient_name", "Ingredient Name *")}</label>
        <input className={inputClass} placeholder={t("branch_admin.e_g_flour", "e.g. Flour")} value={data.rm_name} onChange={e => onChange(index, "rm_name", e.target.value)} />
      </div>

      {/* 2. Unit */}
      <div>
        <label className={labelClass}>{t("branch_admin.unit", "Unit *")}</label>
        <select className={inputClass} value={data.unit} onChange={e => onChange(index, "unit", e.target.value)}>
          <option value="" disabled>{t("branch_admin.select", "Select")}</option>
          {validUnits.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* 3. Qty */}
      <div>
        <label className={labelClass}>{t("branch_admin.qty", "Qty *")}</label>
        <input type="number" className={inputClass} placeholder="0" value={data.stock_qty} onChange={e => onChange(index, "stock_qty", e.target.value)} />
      </div>

      {/* 4. Min stock */}
      <div>
        <label className={labelClass}>{t("branch_admin.min_stock", "Min. Stock *")}</label>
        <input type="number" className={inputClass} placeholder="0" value={data.record_level} onChange={e => onChange(index, "record_level", e.target.value)} />
      </div>

      {/* 5. Unit price */}
      <div>
        <label className={labelClass}>{t("branch_admin.price_rs", "Price (Rs.) *")}</label>
        <input type="number" className={inputClass} placeholder={t("branch_admin.0_00", "0.00")} value={data.unit_price} onChange={e => onChange(index, "unit_price", e.target.value)} />
      </div>

      {/* 6. Total preview (read-only) */}
      <div>
        <label className={labelClass}>{t("branch_admin.total", "Total")}</label>
        <input type="text" readOnly tabIndex={-1} className={readOnlyClass} value={rowTotal.toFixed(2)} />
      </div>

      {/* 7. Remove */}
      <button type="button" title="Remove item" aria-label="Remove item" onClick={() => onRemove(index)} className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-[7px] border-[1.5px] border-[rgba(224,101,79,0.3)] bg-white p-0 text-[#E0654F] transition-colors hover:bg-[#E0654F] hover:text-white">
        <FiX size={14} strokeWidth={2} />
      </button>
    </div>;
};
export default RawIngredient;
