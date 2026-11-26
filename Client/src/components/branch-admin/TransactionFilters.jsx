import { useTranslation } from "react-i18next";
import React from "react";
import { FiSearch } from "react-icons/fi";

const controlClass = "w-full rounded-lg border-[1.5px] border-[#E7E3D8] bg-white px-3.5 py-2.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#0F9B8E]";
const labelClass = "mb-[7px] block text-[12px] font-semibold text-[#5B6470]";

export default function TransactionFilters({
  filters,
  setFilters
}) {
  const { t } = useTranslation();
  const update = patch => setFilters(prev => ({
    ...prev,
    ...patch
  }));
  const tabs = [
    { value: "all", label: t("branch_admin.all_ledger", "All Ledger") },
    { value: "income", label: t("branch_admin.income_sales", "Income (Sales)") },
    { value: "expense", label: t("branch_admin.expenses_purchases", "Expenses (Purchases)") }
  ];
  return <div className="border-b border-[#E7E3D8]">
      <div className="flex flex-col gap-3.5 px-[22px] pb-4 pt-5 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6470]" size={15} />
          <input type="text" value={filters.search} onChange={e => update({
          search: e.target.value
        })} placeholder={t("branch_admin.search_by_transaction_id_invoice_no_or_p", "Search by Transaction ID, Invoice No. or Personnel...")} className="w-full rounded-lg border-[1.5px] border-[#E7E3D8] bg-white py-[11px] pl-[38px] pr-3.5 text-[13.5px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0F9B8E]" />
        </div>

        <div className="flex shrink-0 self-start rounded-[9px] border border-[#E7E3D8] bg-[#FBFAF7] p-[3px] lg:self-auto">
          {tabs.map(tab => <button key={tab.value} type="button" onClick={() => update({
          tab: tab.value
        })} className={`cursor-pointer whitespace-nowrap rounded-[7px] border-0 px-[15px] py-2 text-[12.5px] font-semibold transition-colors ${filters.tab === tab.value ? "bg-[#071E38] text-white" : "bg-transparent text-[#5B6470] hover:text-[#071E38]"}`}>{tab.label}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-[22px] pb-[22px] sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <label className={labelClass}>{t("branch_admin.payment_channel", "Payment Channel")}</label>
          <select value={filters.method} onChange={e => update({
          method: e.target.value
        })} className={`${controlClass} cursor-pointer`}>
            <option value="all">{t("branch_admin.all_settlement_methods", "All Settlement Methods")}</option>
            <option value="cash">{t("branch_admin.cash_tender", "Cash Tender")}</option>
            <option value="card">{t("branch_admin.card_terminal_pos", "Card Terminal / POS")}</option>
            <option value="bank_transfer">{t("branch_admin.bank_wire_transfer", "Bank Wire Transfer")}</option>
            <option value="cheque">{t("branch_admin.cheque_settlement", "Cheque Settlement")}</option>
            <option value="online">{t("branch_admin.online_payment", "Online Payment")}</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>{t("branch_admin.date_from", "Date From")}</label>
          <input type="date" value={filters.dateFrom || ""} onChange={e => update({
          dateFrom: e.target.value || null
        })} className={controlClass} />
        </div>

        <div>
          <label className={labelClass}>{t("branch_admin.date_to", "Date To")}</label>
          <input type="date" value={filters.dateTo || ""} onChange={e => update({
          dateTo: e.target.value || null
        })} className={controlClass} />
        </div>
      </div>
    </div>;
}
