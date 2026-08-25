import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { getBranches } from "../../services/api";
export default function TransactionFilters({
  filters,
  setFilters
}) {
  const { t } = useTranslation();
const [branches, setBranches] = useState([]);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const b = await getBranches();
        if (isMounted) setBranches(b || []);
      } catch {
        if (isMounted) setBranches([]);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);
  const update = patch => setFilters(prev => ({
    ...prev,
    ...patch
  }));
  return <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      
      {/* Top Filter Bar: Global Text Search + Segmented Tab Box */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input type="text" value={filters.search} onChange={e => update({
          search: e.target.value
        })} placeholder={t("company_admin.search_by_transaction_id_invoice_no_bran", "Search by Transaction ID, Invoice No., Branch location, or Personnel...")} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>

        {/* Directional Cash Flow Segment Controls */}
        <div className="inline-flex h-11 items-center rounded-lg bg-slate-100 p-1 self-start lg:self-auto">
          <button onClick={() => update({
          tab: "all"
        })} className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${filters.tab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{t("company_admin.all_ledger", "All Ledger")}</button>
          <button onClick={() => update({
          tab: "income"
        })} className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${filters.tab === "income" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{t("company_admin.income_sales", "Income (Sales)")}</button>
          <button onClick={() => update({
          tab: "expense"
        })} className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${filters.tab === "expense" ? "bg-white text-rose-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{t("company_admin.expenses_purchases", "Expenses (Purchases)")}</button>
        </div>
      </div>

      {/* Bottom Filter Bar: Dropdowns & Chronological Pickers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 pt-3 border-t border-slate-100">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("company_admin.branch_node", "Branch Node")}</label>
          <select value={filters.branch} onChange={e => {
          const v = e.target.value;
          update({
            branch: v === "all" ? "all" : Number(v)
          });
        }} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
            <option value="all">{t("company_admin.all_branches", "All Branches")}</option>
            {branches.map(b => {
            const id = b.b_id ?? b.B_id ?? b.bId;
            const name = b.B_name ?? b.b_name ?? b.name ?? `Branch #${id}`;
            return <option key={id} value={id}>{name}</option>;
          })}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("company_admin.payment_channel", "Payment Channel")}</label>
          <select value={filters.method} onChange={e => update({
          method: e.target.value
        })} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
            <option value="all">{t("company_admin.all_settlement_methods", "All Settlement Methods")}</option>
            <option value="cash">{t("company_admin.cash_tender", "Cash Tender")}</option>
            <option value="card">{t("company_admin.card_terminal_pos", "Card Terminal / POS")}</option>
            <option value="bank_transfer">{t("company_admin.bank_wire_transfer", "Bank Wire Transfer")}</option>
            <option value="cheque">{t("company_admin.cheque_settlement", "Cheque Settlement")}</option>
            <option value="online">{t("company_admin.online_payment", "Online Payment")}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("company_admin.date_from", "Date From")}</label>
          <input type="date" value={filters.dateFrom || ""} onChange={e => update({
          dateFrom: e.target.value || null
        })} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("company_admin.date_to", "Date To")}</label>
          <input type="date" value={filters.dateTo || ""} onChange={e => update({
          dateTo: e.target.value || null
        })} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>
      </div>
    </div>;
}