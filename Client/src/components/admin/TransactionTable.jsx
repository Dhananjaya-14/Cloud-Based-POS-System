import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TransactionTable({ data = [], loading = false, pageSize = 10, onView }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const fmtMethod = (m) => {
    if (!m) return "-";
    return String(m).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 mb-3" />
        <span className="text-sm font-medium tracking-wide">Compiling matching accounts...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-20 text-center">
        <p className="text-base font-medium text-slate-600">No transactions match your query criteria.</p>
        <p className="text-xs text-slate-400 mt-1">Try loosening search query string phrases or choosing a different date spread.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <th className="p-4 pl-6">Transaction ID</th>
            <th className="p-4">Invoice / PO</th>
            <th className="p-4">Branch Node</th>
            <th className="p-4">Counterparty Asset</th>
            <th className="p-4">Timestamp</th>
            <th className="p-4">Settlement Route</th>
            <th className="p-4 text-right pr-6">Amount (LKR)</th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {paged.map((row) => {
            const isSale = row.type === "sale";
            const methodName = String(row.paymentMethod || "").toLowerCase();
            const isCash = methodName.includes("cash");

            return (
              <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-4 pl-6 font-mono text-xs font-semibold text-slate-900">{row.txId}</td>
                <td className="p-4 font-medium text-slate-700">#{row.invoiceNo}</td>
                <td className="p-4">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                    {row.branchLabel ?? row.branchId ?? "-"}
                  </span>
                </td>
                <td className="p-4 max-w-[160px] truncate font-medium text-slate-700" title={row.cashierLabel}>
                  {row.cashierLabel ?? "-"}
                </td>
                <td className="p-4 text-xs text-slate-500">
                  {row.date ? new Date(row.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "-"}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isCash ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}>
                    {fmtMethod(row.paymentMethod)}
                  </span>
                </td>
                <td className={`p-4 text-right pr-6 font-mono font-semibold ${isSale ? "text-emerald-600" : "text-rose-600"}`}>
                  {isSale ? "+ " : "- "}
                  {(row.amount?.toFixed?.(2) ?? Number(row.amount ?? 0).toFixed(2))}
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                    onClick={() => onView && onView(row)}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none"
                    >
                      Receipt
                    </button>
                    <button
                      onClick={() => onView && onView(row)}
                      className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none"
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination Controls Footer Deck */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white p-4 px-6">
        <p className="text-xs text-slate-500">
          Showing <span className="font-medium text-slate-800">{paged.length}</span> of <span className="font-medium text-slate-800">{data.length}</span> entries
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40 transition-all"
          >
            Prev
          </button>
          <div className="text-xs font-medium text-slate-700">
            Page {page} / {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40 transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}


