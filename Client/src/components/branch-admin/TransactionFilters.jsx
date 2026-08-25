import { useTranslation } from "react-i18next";
import React from "react";
export default function TransactionFilters({
  filters,
  setFilters
}) {
  const { t } = useTranslation();
const update = patch => setFilters(prev => ({
    ...prev,
    ...patch
  }));
  return <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input type="text" value={filters.search} onChange={e => update({
          search: e.target.value
        })} placeholder={t("branch_admin.search_by_transaction_id_invoice_no_or_p", "Search by Transaction ID, Invoice No. or Personnel...")} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>

        <div className="inline-flex h-11 items-center rounded-lg bg-slate-100 p-1 self-start lg:self-auto">
          <button onClick={() => update({
          tab: "all"
        })} className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${filters.tab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{t("branch_admin.all_ledger", "All Ledger")}</button>
          <button onClick={() => update({
          tab: "income"
        })} className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${filters.tab === "income" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{t("branch_admin.income_sales", "Income (Sales)")}</button>
          <button onClick={() => update({
          tab: "expense"
        })} className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${filters.tab === "expense" ? "bg-white text-rose-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{t("branch_admin.expenses_purchases", "Expenses (Purchases)")}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 pt-3 border-t border-slate-100">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("branch_admin.payment_channel", "Payment Channel")}</label>
          <select value={filters.method} onChange={e => update({
          method: e.target.value
        })} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
            <option value="all">{t("branch_admin.all_settlement_methods", "All Settlement Methods")}</option>
            <option value="cash">{t("branch_admin.cash_tender", "Cash Tender")}</option>
            <option value="card">{t("branch_admin.card_terminal_pos", "Card Terminal / POS")}</option>
            <option value="bank_transfer">{t("branch_admin.bank_wire_transfer", "Bank Wire Transfer")}</option>
            <option value="cheque">{t("branch_admin.cheque_settlement", "Cheque Settlement")}</option>
            <option value="online">{t("branch_admin.online_payment", "Online Payment")}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("branch_admin.date_from", "Date From")}</label>
          <input type="date" value={filters.dateFrom || ""} onChange={e => update({
          dateFrom: e.target.value || null
        })} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("branch_admin.date_to", "Date To")}</label>
          <input type="date" value={filters.dateTo || ""} onChange={e => update({
          dateTo: e.target.value || null
        })} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>
      </div>
    </div>;
}