import { useTranslation } from "react-i18next";
import React, { useMemo, useState } from "react";

const thClass = "whitespace-nowrap border-b border-[#E7E3D8] bg-[#FBFAF7] px-[22px] py-3 text-[12px] font-semibold text-[#5B6470]";
const tdClass = "whitespace-nowrap border-b border-[#E7E3D8] px-[22px] py-4 align-middle text-[13px]";
const pagerBtnClass = "cursor-pointer rounded-[7px] border-[1.5px] border-[#E7E3D8] bg-white px-[13px] py-1.5 text-[12.5px] font-semibold text-[#071E38] transition-colors hover:border-[#0F9B8E] hover:text-[#0F9B8E] disabled:cursor-not-allowed disabled:text-[#9CA3AF] disabled:opacity-60 disabled:hover:border-[#E7E3D8]";

export default function TransactionTable({
  data = [],
  loading = false,
  pageSize = 10,
  onView
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);
  const fmtMethod = m => {
    if (!m) return "-";
    return String(m).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };
  const fmtAmount = value => Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (loading) {
    return <div className="flex flex-col items-center justify-center p-16 text-[#5B6470]">
        <div className="mb-3 h-9 w-9 animate-spin rounded-full border-4 border-[#E7E3D8] border-t-[#0F9B8E]" />
        <span className="text-[13px] font-medium">{t("company_admin.compiling_matching_accounts", "Compiling matching accounts...")}</span>
      </div>;
  }
  if (data.length === 0) {
    return <div className="p-20 text-center">
        <p className="m-0 text-[15px] font-bold text-[#071E38]">{t("company_admin.no_transactions_match_your_query_criteri", "No transactions match your query criteria.")}</p>
        <p className="m-0 mt-1 text-[13px] text-[#5B6470]">{t("company_admin.try_loosening_search_query_string_phrase", "Try loosening search query string phrases or choosing a different date spread.")}</p>
      </div>;
  }
  return <div className="w-full">
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className={thClass}>{t("company_admin.transaction_id", "Transaction ID")}</th>
              <th className={thClass}>{t("company_admin.invoice_po", "Invoice / PO")}</th>
              <th className={thClass}>{t("company_admin.branch_node", "Branch Node")}</th>
              <th className={thClass}>{t("company_admin.counterparty_asset", "Counterparty Asset")}</th>
              <th className={thClass}>{t("company_admin.timestamp", "Timestamp")}</th>
              <th className={thClass}>{t("company_admin.settlement_route", "Settlement Route")}</th>
              <th className={`${thClass} text-right`}>{t("company_admin.amount_lkr", "Amount (LKR)")}</th>
              <th className={thClass}>{t("company_admin.actions", "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(row => {
            const isSale = row.type === "sale";
            const isCash = String(row.paymentMethod || "").toLowerCase().includes("cash");
            return <tr key={row.id} className="transition-colors hover:bg-[#FBFAF7] [&:last-child>td]:border-b-0">
                  <td className={`${tdClass} font-space font-bold text-[#071E38]`}>{row.txId}</td>
                  <td className={`${tdClass} text-[#1A1A1A]`}>#{row.invoiceNo}</td>
                  <td className={tdClass}>
                    <span className="inline-flex rounded-full bg-[rgba(11,46,79,0.07)] px-2.5 py-1 text-[11.5px] font-semibold text-[#0B2E4F]">
                      {row.branchLabel ?? row.branchId ?? "-"}
                    </span>
                  </td>
                  <td className={`${tdClass} max-w-[180px] truncate text-[#1A1A1A]`} title={row.cashierLabel || ""}>
                    {row.cashierLabel ?? "-"}
                  </td>
                  <td className={`${tdClass} text-[#6B7A99]`}>
                    {row.date ? new Date(row.date).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short"
                }) : "-"}
                  </td>
                  <td className={tdClass}>
                    <span className={`inline-flex items-center gap-[5px] rounded-full px-[11px] py-1 text-[11px] font-bold ${isCash ? "bg-[rgba(60,174,73,0.12)] text-[#3CAE49]" : "bg-[rgba(20,166,224,0.12)] text-[#0E6FA8]"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isCash ? "bg-[#3CAE49]" : "bg-[#14A6E0]"}`} />
                      {fmtMethod(row.paymentMethod)}
                    </span>
                  </td>
                  <td className={`${tdClass} text-right font-space font-bold tabular-nums ${isSale ? "text-[#3CAE49]" : "text-[#E0654F]"}`}>
                    {isSale ? "+" : "-"} {fmtAmount(row.amount)}
                  </td>
                  <td className={tdClass}>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onView && onView(row)} className="cursor-pointer rounded-lg border-[1.5px] border-[#E7E3D8] bg-white px-3.5 py-[7px] text-[12.5px] font-semibold text-[#071E38] transition-colors hover:border-[#0F9B8E] hover:text-[#0F9B8E]">{t("company_admin.receipt", "Receipt")}</button>
                      <button type="button" onClick={() => onView && onView(row)} className="cursor-pointer rounded-lg border-[1.5px] border-[#071E38] bg-[#071E38] px-3.5 py-[7px] text-[12.5px] font-semibold text-white transition-colors hover:border-[#0F9B8E] hover:bg-[#0F9B8E]">{t("company_admin.view", "View")}</button>
                    </div>
                  </td>
                </tr>;
          })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E3D8] px-[22px] py-4 text-[13px] text-[#5B6470]">
        <p className="m-0">
          {t("company_admin.showing", "Showing")} <span className="font-semibold text-[#1A1A1A]">{paged.length}</span> {t("company_admin.of", "of")} <span className="font-semibold text-[#1A1A1A]">{data.length}</span> <span className="font-semibold text-[#0F9B8E]">{t("company_admin.entries", "entries")}</span>
        </p>
        <div className="flex items-center gap-3.5">
          <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className={pagerBtnClass}>{t("company_admin.prev", "Prev")}</button>
          <span className="text-[12.5px] font-semibold text-[#1A1A1A]">{t("company_admin.page", "Page")} {currentPage} / {totalPages}</span>
          <button type="button" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className={pagerBtnClass}>{t("company_admin.next", "Next")}</button>
        </div>
      </div>
    </div>;
}
