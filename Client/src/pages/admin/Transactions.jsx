import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import Header from "../../layout/header";
import Sidebar from "../../layout/slidebar";
import TransactionDetailsModal from "../../components/admin/TransactionDetailsModal";
import { getOrders, getSupplierPayments, getPayments, getPurchaseOrders, getBranches, getCurrentUser } from "../../services/api";
import { SOCKET_EVENTS } from "../../services/socket";
import { getSocket, connectSocket } from "../../services/socket";

const REQUEST_TIMEOUT_MS = 15000;

const withRequestTimeout = (request, label) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} request timed out`)), REQUEST_TIMEOUT_MS);
  });

  return Promise.race([request, timeout]).finally(() => clearTimeout(timeoutId));
};

/* ===== Design components (Transactions redesign) ===== */
const TX_INPUT = "w-full rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white px-3.5 py-[11px] text-[13px] text-[#111827] outline-none focus:border-[#14A6E0]";
const TX_TD = "whitespace-nowrap px-5 py-[15px] text-[13.5px]";
const TX_STAT_TONES = {
  green: "bg-[#EAF9EC] text-[#3CAE49]",
  red: "bg-[#FDECEC] text-[#EF4444]",
  navy: "bg-[#E7ECF2] text-[#071E38]",
  blue: "bg-[#EAF6FD] text-[#14A6E0]"
};
const formatRs = value => `Rs ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatMethod = m => m ? String(m).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "-";
const TxUpIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12L12 5L19 12" /></svg>;
const TxDownIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5V19M5 12L12 19L19 12" /></svg>;
const TxBalanceIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12H21M3 6H21M3 18H15" /></svg>;
const TxTruckIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="15" height="10" rx="1.5" /><path d="M17 10H20.5L22 13V17H17" /><circle cx="7" cy="19" r="1.7" /><circle cx="18.5" cy="19" r="1.7" /></svg>;
const TxCashIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"><path d="M4 7H20M4 7V17H20V7M4 7L12 3L20 7" /></svg>;
const TxCardIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10H22" /></svg>;

function TxStatCard({ icon, tone, value, label }) {
  return (
    <div className="flex items-center gap-[15px] rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-[18px] shadow-[0_2px_10px_rgba(7,30,56,0.03)]">
      <div className={`flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl ${TX_STAT_TONES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="truncate font-space text-[21px] font-bold leading-tight text-[#071E38]">{value}</div>
        <div className="text-xs font-semibold text-[#6B7280]">{label}</div>
      </div>
    </div>
  );
}

function TxField({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9CA3AF]">{label}</label>
      {children}
    </div>
  );
}
/* ===== End of design components ===== */

export default function Transactions() {
  const { t } = useTranslation();
const [filters, setFilters] = useState({
    search: "",
    branch: "all",
    method: "all",
    dateFrom: null,
    dateTo: null,
    tab: "all"
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pageSize] = useState(10);
  const [branchOptions, setBranchOptions] = useState([]);

  // Branch list for the "Branch Node" dropdown
  useEffect(() => {
    let isMounted = true;
    getBranches().then(list => {
      if (!isMounted) return;
      setBranchOptions((list || []).map(b => {
        const id = b.b_id ?? b.B_id ?? b.bId;
        return { id, name: b.B_name ?? b.b_name ?? b.name ?? `Branch #${id}` };
      }));
    }).catch(() => {
      if (isMounted) setBranchOptions([]);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // company scoping from logged-in user
  const currentUser = getCurrentUser();
  const currentComId = currentUser?.com_id ?? null;
  useEffect(() => {
    const socket = connectSocket();
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const orderParams = {
          status: "completed"
        };

        // numeric branch filter (null = no branch filter)
        const branchFilter = filters.branch !== "all" && filters.branch !== undefined && filters.branch !== null ? Number(filters.branch) : null;
        if (branchFilter) {
          orderParams.b_id = branchFilter;
        }
        const [salesRaw, paymentsListRaw, supplierPaymentsRaw, purchaseOrdersRaw, branchesRaw] = await Promise.all([
          withRequestTimeout(getOrders(orderParams), "Orders"),
          withRequestTimeout(getPayments(), "Payments"),
          withRequestTimeout(getSupplierPayments(), "Supplier payments"),
          withRequestTimeout(getPurchaseOrders(), "Purchase orders"),
          withRequestTimeout(getBranches(), "Branches")
        ]);

        // normalize and scope branches to user's company (if present)
        const allBranches = branchesRaw?.data ?? branchesRaw ?? [];
        const scopedBranches = currentComId ? allBranches.filter(b => b?.com_id != null && String(b.com_id) === String(currentComId)) : allBranches;
        // map branch id -> branch
        const branchById = {};
        scopedBranches.forEach(b => {
          const id = b?.B_id ?? b?.b_id ?? null;
          if (id !== undefined && id !== null) branchById[id] = b;
        });
        const allowedBranchIds = scopedBranches.map(b => String(b?.B_id ?? b?.b_id ?? ""));

        // filter sales/orders to user's company branches (if scoped)
        const sales = (salesRaw || []).filter(o => {
          if (!currentComId) return true;
          const bid = o.b_id ?? o.B_id ?? o.b ?? null;
          return bid != null && allowedBranchIds.includes(String(bid));
        });

        // payments list we can keep; we'll only attach them to allowed orders later
        const paymentsList = paymentsListRaw || [];

        // filter purchase orders to company branches (so supplierPayments map via po will be scoped)
        const purchaseOrders = (purchaseOrdersRaw || []).filter(po => {
          if (!currentComId) return true;
          const bid = po.b_id ?? po.B_id ?? null;
          return bid != null && allowedBranchIds.includes(String(bid));
        });
        const supplierPayments = (supplierPaymentsRaw || []).filter(p => {
          if (!currentComId) return true;
          // if payment references po_id, ensure the purchase order belongs to allowed branches
          const po = purchaseOrders.find(x => String(x.po_id) === String(p.po_id));
          if (po) return true;
          // fallback: check p.b_id
          const bid = p.b_id ?? p.B_id ?? null;
          return bid != null && allowedBranchIds.includes(String(bid));
        });

        // build helper maps
        const paymentsByOrder = {};
        // we only consider payments for orders that we will include (sales)
        const allowedOrderIds = new Set((sales || []).map(o => String(o.or_id)));
        (paymentsList || []).forEach(p => {
          const oid = p.or_id ? String(p.or_id) : null;
          if (!oid) return;
          if (allowedOrderIds.size > 0 && !allowedOrderIds.has(oid)) return; // ignore payments for orders outside company
          const existing = paymentsByOrder[oid];
          const curDate = p.pay_date ? new Date(p.pay_date) : new Date();
          const existingDate = existing && existing.pay_date ? new Date(existing.pay_date) : null;
          if (!existing || existingDate && curDate > existingDate || !existingDate) {
            paymentsByOrder[oid] = p;
          }
        });
        const purchaseOrdersById = {};
        (purchaseOrders || []).forEach(po => {
          if (po && po.po_id !== undefined && po.po_id !== null) {
            purchaseOrdersById[po.po_id] = po;
          }
        });

        // Normalize sales (only allowed sales already)
        const normalizedSales = (sales || []).map(o => {
          const pay = paymentsByOrder[o.or_id];
          const payMethod = pay?.pay_method ?? pay?.method ?? null;
          const branchName = branchById[o.b_id]?.B_name ?? o.B_name ?? o.b_name ?? null;
          return {
            id: `sale-${o.or_id}`,
            type: "sale",
            txId: `POS#${o.or_id}`,
            invoiceNo: o.or_id,
            branchId: o.b_id,
            branchLabel: branchName,
            cashierId: o.u_id,
            cashierLabel: o.u_name ?? null,
            date: o.or_date ?? o.or_time ?? o.created_at,
            paymentMethod: payMethod ? String(payMethod) : o.or_paymentmethod ?? null ?? "Cash",
            amount: Number(o.or_totalCostWtax ?? o.or_totalcost ?? 0),
            raw: o
          };
        });

        // Normalize supplier payments (purchase payments) but only for purchase orders in this company
        let normalizedPayments = (supplierPayments || []).map(p => {
          const po = purchaseOrdersById[p.po_id];
          const branchId = po?.b_id ?? po?.B_id ?? p.b_id ?? p.B_id ?? null;
          const branchName = po?.B_name ?? po?.b_name ?? branchById[branchId]?.B_name ?? p.B_name ?? p.b_name ?? null;
          return {
            id: `pay-${p.pay_id}`,
            type: "purchase",
            txId: `PAY#${p.pay_id}`,
            invoiceNo: p.po_id,
            branchId,
            branchLabel: branchName,
            cashierId: p.sup_id,
            cashierLabel: p.sup_name,
            date: p.payment_date ?? p.pay_date,
            paymentMethod: p.method,
            amount: Number(p.amount ?? 0),
            raw: p
          };
        });

        // Apply UI branch filter (if selected)
        if (branchFilter) {
          // filter both sales and purchases
          const bf = Number(branchFilter);
          // normally sales were already filtered by branchFilter via orderParams; apply again defensively
          const salesFiltered = normalizedSales.filter(s => s.branchId !== null && Number(s.branchId) === bf);
          normalizedPayments = normalizedPayments.filter(p => p.branchId !== null && Number(p.branchId) === bf);
          setTransactions([...salesFiltered, ...normalizedPayments].sort((a, b) => new Date(b.date) - new Date(a.date)));
        } else {
          // no UI branch filter: still scope by company (we already did)
          setTransactions([...normalizedSales, ...normalizedPayments].sort((a, b) => new Date(b.date) - new Date(a.date)));
        }
      } catch (err) {
        console.error("Failed to load transactions:", err);
        setTransactions([]);
        setLoadError(t("company_admin.transaction_load_failed", "Transactions could not be loaded. Check your connection and try again."));
      } finally {
        setLoading(false);
      }
    };
    load();
    // Register socket listeners for real-time updates
    socket.on(SOCKET_EVENTS.ORDER_CREATED, load);
    socket.on(SOCKET_EVENTS.PAYMENT_COMPLETED, load);
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, load);
    socket.on(SOCKET_EVENTS.ORDER_READY, load);
    // Cleanup listeners on unmount
    return () => {
      socket.off(SOCKET_EVENTS.ORDER_CREATED, load);
      socket.off(SOCKET_EVENTS.PAYMENT_COMPLETED, load);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED, load);
      socket.off(SOCKET_EVENTS.ORDER_READY, load);
    };
  }, [filters.branch, currentComId, retryCount, t]); // re-run when branch or company scope changes

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filters.tab === "income" && t.type !== "sale") return false;
      if (filters.tab === "expense" && t.type !== "purchase") return false;
      if (filters.method !== "all" && filters.method !== "") {
        const targetMethod = String(t.paymentMethod || "").toLowerCase();
        if (targetMethod !== String(filters.method).toLowerCase()) return false;
      }
      if (filters.search.trim()) {
        const s = filters.search.toLowerCase();
        const matches = String(t.txId || "").toLowerCase().includes(s) || String(t.invoiceNo || "").toLowerCase().includes(s) || String(t.branchLabel || "").toLowerCase().includes(s) || String(t.cashierLabel || "").toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (filters.dateFrom && t.date) {
        if (new Date(t.date) < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo && t.date) {
        const boundaryDate = new Date(filters.dateTo);
        boundaryDate.setHours(23, 59, 59, 999);
        if (new Date(t.date) > boundaryDate) return false;
      }
      return true;
    });
  }, [transactions, filters]);
  // Pagination (10 rows per page) - go back to page 1 whenever the filters change
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Summary cards follow the current filters
  const totalIncome = filtered.filter(row => row.type === "sale").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalExpenses = filtered.filter(row => row.type === "purchase").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const netBalance = totalIncome - totalExpenses;
  const updateFilters = patch => setFilters(prev => ({
    ...prev,
    ...patch
  }));
  const ledgerTabs = [
    { value: "all", label: t("company_admin.all_ledger", "All Ledger") },
    { value: "income", label: t("company_admin.income_sales", "Income (Sales)") },
    { value: "expense", label: t("company_admin.expenses_purchases", "Expenses (Purchases)") }
  ];
  const columns = [
    t("company_admin.transaction_id", "Transaction ID"),
    t("company_admin.invoice_po", "Invoice / PO"),
    t("company_admin.branch_node", "Branch Node"),
    t("company_admin.counterparty_asset", "Counterparty Asset"),
    t("company_admin.timestamp", "Timestamp"),
    t("company_admin.settlement_route", "Settlement Route"),
    t("company_admin.amount_lkr", "Amount (LKR)"),
    t("company_admin.actions", "Actions")
  ];

  return <div className="flex min-h-screen bg-[#F3F4F6] text-[#111827] antialiased">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col" style={{
      marginLeft: 240
    }}>
        <Header title={t("company_admin.transaction_details", "Transaction Details")} />

        <main className="flex-1 px-8 pb-10 pt-7">
          {/* Page heading */}
          <div className="mb-[22px]">
            <h2 className="mb-1 font-space text-2xl font-bold text-[#111827]">{t("company_admin.financial_ledger", "Financial Ledger")}</h2>
            <p className="text-[13px] text-[#6B7280]">{t("company_admin.audit_inspect_and_trace_company_branch_t", "Audit, inspect, and trace company branch transactions and payments.")}</p>
          </div>

          {/* Summary cards */}
          <div className="mb-[22px] grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TxStatCard tone="green" icon={<TxUpIcon />} value={formatRs(totalIncome)} label={t("company_admin.total_income", "Total Income")} />
            <TxStatCard tone="red" icon={<TxDownIcon />} value={formatRs(totalExpenses)} label={t("company_admin.total_expenses", "Total Expenses")} />
            <TxStatCard tone="navy" icon={<TxBalanceIcon />} value={formatRs(netBalance)} label={t("company_admin.net_balance", "Net Balance")} />
            <TxStatCard tone="blue" icon={<TxTruckIcon />} value={filtered.length} label={t("company_admin.transactions", "Transactions")} />
          </div>

          {/* Filters panel */}
          <div className="mb-[18px] rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-[22px] shadow-[0_2px_10px_rgba(7,30,56,0.03)]">
            <div className="mb-[18px] flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <svg className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                <input type="text" value={filters.search} onChange={e => updateFilters({
                search: e.target.value
              })} placeholder={t("company_admin.search_by_transaction_id_invoice_no_bran", "Search by Transaction ID, Invoice No., Branch location, or Personnel...")} className="w-full rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white py-[13px] pl-[42px] pr-4 text-[13.5px] outline-none focus:border-[#14A6E0]" />
              </div>
              <div className="flex flex-shrink-0 self-start rounded-[10px] bg-[#F3F4F6] p-1 lg:self-auto">
                {ledgerTabs.map(tab => <button key={tab.value} type="button" onClick={() => updateFilters({
                tab: tab.value
              })} className={`whitespace-nowrap rounded-lg px-4 py-[9px] text-[12.5px] font-bold transition-colors ${filters.tab === tab.value ? "bg-[#071E38] text-white" : "text-[#6B7280] hover:text-[#111827]"}`}>{tab.label}</button>)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
              <TxField label={t("company_admin.branch_node", "Branch Node")}>
                <select value={filters.branch} onChange={e => {
                const v = e.target.value;
                updateFilters({
                  branch: v === "all" ? "all" : Number(v)
                });
              }} className={TX_INPUT}>
                  <option value="all">{t("company_admin.all_branches", "All Branches")}</option>
                  {branchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </TxField>
              <TxField label={t("company_admin.payment_channel", "Payment Channel")}>
                <select value={filters.method} onChange={e => updateFilters({
                method: e.target.value
              })} className={TX_INPUT}>
                  <option value="all">{t("company_admin.all_settlement_methods", "All Settlement Methods")}</option>
                  <option value="cash">{t("company_admin.cash_tender", "Cash Tender")}</option>
                  <option value="card">{t("company_admin.card_terminal_pos", "Card Terminal / POS")}</option>
                  <option value="mobile_pay">{t("company_admin.mobile_payment", "Mobile Payment")}</option>
                  <option value="voucher">{t("company_admin.voucher_payment", "Voucher")}</option>
                  <option value="split">{t("company_admin.split_payment", "Split Payment")}</option>
                </select>
              </TxField>
              <TxField label={t("company_admin.date_from", "Date From")}>
                <input type="date" value={filters.dateFrom || ""} onChange={e => updateFilters({
                dateFrom: e.target.value || null
              })} className={TX_INPUT} />
              </TxField>
              <TxField label={t("company_admin.date_to", "Date To")}>
                <input type="date" value={filters.dateTo || ""} onChange={e => updateFilters({
                dateTo: e.target.value || null
              })} className={TX_INPUT} />
              </TxField>
            </div>
          </div>

          {/* Transaction table */}
          <div className="overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(7,30,56,0.04)]">
            {loadError ? <div className="p-20 text-center">
                <p className="text-base font-medium text-[#6B7280]">{loadError}</p>
                <button type="button" onClick={() => setRetryCount(count => count + 1)} className="mt-4 rounded-lg bg-[#071E38] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D2B4D]">
                  {t("company_admin.retry", "Retry")}
                </button>
              </div> : loading ? <div className="flex flex-col items-center justify-center p-16 text-[#6B7280]">
                <div className="mb-3 h-9 w-9 animate-spin rounded-full border-4 border-[#E5E7EB] border-t-[#14A6E0]" />
                <span className="text-sm font-medium">{t("company_admin.compiling_matching_accounts", "Compiling matching accounts...")}</span>
              </div> : filtered.length === 0 ? <div className="p-20 text-center">
                <p className="text-base font-medium text-[#6B7280]">{filters.branch !== "all" ? t("company_admin.no_transaction_history_in_this_branch", "No transaction history in this branch.") : t("company_admin.no_transactions_match_your_query_criteri", "No transactions match your query criteria.")}</p>
                <p className="mt-1 text-xs text-[#9CA3AF]">{t("company_admin.try_selecting_a_different_date_range_or_", "Try selecting a different date range or clearing the branch filter.")}</p>
              </div> : <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {columns.map(col => <th key={col} className="whitespace-nowrap border-b border-[#E5E7EB] bg-[#FAFAFB] px-5 py-3.5 text-left text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#9CA3AF]">{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map(row => {
                    const isSale = row.type === "sale";
                    const isCash = String(row.paymentMethod || "").toLowerCase().includes("cash");
                    return <tr key={row.id} className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#FAFBFC]">
                            <td className={`${TX_TD} font-bold text-[#071E38]`}>{row.txId}</td>
                            <td className={TX_TD}>#{row.invoiceNo}</td>
                            <td className={TX_TD}>
                              <span className="inline-block rounded-full bg-[#EAF6FD] px-[11px] py-[5px] text-[11px] font-bold text-[#0E6FA8]">{row.branchLabel ?? row.branchId ?? "-"}</span>
                            </td>
                            <td className={`${TX_TD} ${row.cashierLabel ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>{row.cashierLabel ?? "—"}</td>
                            <td className={`${TX_TD} text-[#6B7280]`}>
                              {row.date ? new Date(row.date).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short"
                        }) : "-"}
                            </td>
                            <td className={TX_TD}>
                              <span className={`inline-flex items-center gap-[5px] rounded-full border-[1.5px] px-3 py-[5px] text-[11px] font-bold ${isCash ? "border-[#3CAE49]/30 bg-[#EAF9EC] text-[#15803D]" : "border-[#14A6E0]/30 bg-[#EAF6FD] text-[#0E6FA8]"}`}>
                                {isCash ? <TxCashIcon /> : <TxCardIcon />}
                                {formatMethod(row.paymentMethod)}
                              </span>
                            </td>
                            <td className={`${TX_TD} font-space font-bold ${isSale ? "text-[#15803D]" : "text-[#B91C1C]"}`}>
                              {isSale ? "+ " : "- "}{Number(row.amount ?? 0).toFixed(2)}
                            </td>
                            <td className={TX_TD}>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setSelected(row)} className="rounded-lg border-[1.5px] border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-bold text-[#111827] hover:bg-[#F9FAFB]">{t("company_admin.receipt", "Receipt")}</button>
                                <button type="button" onClick={() => setSelected(row)} className="rounded-lg bg-[#071E38] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D2B4D]">{t("company_admin.view", "View")}</button>
                              </div>
                            </td>
                          </tr>;
                  })}
                    </tbody>
                  </table>
                </div>

                {/* Footer: entries bottom-left, pagination bottom-right */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] px-5 py-3.5 text-xs text-[#6B7280]">
                  <p>{t("company_admin.showing", "Showing")} <span className="font-semibold text-[#111827]">{pagedRows.length}</span> {t("company_admin.of", "of")} <span className="font-semibold text-[#111827]">{filtered.length}</span> <span className="font-semibold text-[#0F9B8E]">{t("company_admin.entries", "entries")}</span></p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 font-semibold text-[#111827] disabled:cursor-not-allowed disabled:text-[#9CA3AF] disabled:opacity-60">{t("company_admin.prev", "Prev")}</button>
                    <span className="font-semibold text-[#111827]">{currentPage} / {totalPages}</span>
                    <button type="button" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 font-semibold text-[#111827] disabled:cursor-not-allowed disabled:text-[#9CA3AF] disabled:opacity-60">{t("company_admin.next", "Next")}</button>
                  </div>
                </div>
              </>}
          </div>
        </main>
      </div>

      {selected && <TransactionDetailsModal item={selected} onClose={() => setSelected(null)} />}
    </div>;
}
