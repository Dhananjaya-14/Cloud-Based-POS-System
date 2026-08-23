import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/admin/Header";
import Sidebar from "../../components/admin/Sidebar";
import TransactionFilters from "../../components/admin/TransactionFilters";
import TransactionTable from "../../components/admin/TransactionTable";
import TransactionDetailsModal from "../../components/admin/TransactionDetailsModal";
import { getOrders, getSupplierPayments, getPayments, getPurchaseOrders, getBranches, getCurrentUser } from "../../services/api";
import { SOCKET_EVENTS } from "../../services/socket";
import { getSocket, connectSocket } from "../../services/socket";
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
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pageSize] = useState(10);

  // company scoping from logged-in user
  const currentUser = getCurrentUser();
  const currentComId = currentUser?.com_id ?? null;
  useEffect(() => {
    const socket = connectSocket();
    const load = async () => {
      setLoading(true);
      try {
        const orderParams = {
          status: "completed"
        };

        // numeric branch filter (null = no branch filter)
        const branchFilter = filters.branch !== "all" && filters.branch !== undefined && filters.branch !== null ? Number(filters.branch) : null;
        if (branchFilter) {
          orderParams.b_id = branchFilter;
        }
        const [salesRaw, paymentsListRaw, supplierPaymentsRaw, purchaseOrdersRaw, branchesRaw] = await Promise.all([getOrders(orderParams).catch(() => []), getPayments().catch(() => []), getSupplierPayments().catch(() => []), getPurchaseOrders().catch(() => []), getBranches().catch(() => [])]);
        // after initial load, set up socket listener for real-time updates
        socket.on(SOCKET_EVENTS.PAYMENT_COMPLETED, load);

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
        console.error("Ledger engine compilation error:", err);
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
  }, [filters.branch, currentComId]); // re-run when branch or company scope changes

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
  return <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden" style={{
      marginLeft: 240
    }}>
        <Header title={t("company_admin.transaction_details", "Transaction Details")} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("company_admin.financial_ledger", "Financial Ledger")}</h1>
                <p className="text-sm text-slate-500">{t("company_admin.audit_inspect_and_trace_company_branch_t", "Audit, inspect, and trace company branch transactions and payments.")}</p>
              </div>
            </div>

            <TransactionFilters filters={filters} setFilters={setFilters} />

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {!loading && filtered.length === 0 && filters.branch !== "all" ? <div className="p-20 text-center">
                  <p className="text-base font-medium text-slate-600">{t("company_admin.no_transaction_history_in_this_branch", "No transaction history in this branch.")}</p>
                  <p className="text-xs text-slate-400 mt-1">{t("company_admin.try_selecting_a_different_date_range_or_", "Try selecting a different date range or clearing the branch filter.")}</p>
                </div> : <TransactionTable data={filtered} loading={loading} pageSize={pageSize} onView={item => setSelected(item)} />}
            </div>
          </div>
        </main>
      </div>

      {selected && <TransactionDetailsModal item={selected} onClose={() => setSelected(null)} />}
    </div>;
}

// import React, { useEffect, useMemo, useState } from "react";
// import Header from "../../components/admin/Header";
// import Sidebar from "../../components/admin/Sidebar";
// import TransactionFilters from "../../components/admin/TransactionFilters";
// import TransactionTable from "../../components/admin/TransactionTable";
// import TransactionDetailsModal from "../../components/admin/TransactionDetailsModal";
// import {
//   getOrders,
//   getSupplierPayments,
//   getPayments,
//   getPurchaseOrders,
//   getBranches,
// } from "../../services/api";

// export default function Transactions() {
//   const [filters, setFilters] = useState({
//     search: "",
//     branch: "all",
//     method: "all",
//     dateFrom: null,
//     dateTo: null,
//     tab: "all",
//   });

//   const [loading, setLoading] = useState(false);
//   const [transactions, setTransactions] = useState([]);
//   const [selected, setSelected] = useState(null);
//   const [pageSize] = useState(10);

//   useEffect(() => {
//     const load = async () => {
//       setLoading(true);
//       try {
//         const orderParams = { status: "completed" };

//         // numeric branch filter (null = no branch filter)
//         const branchFilter =
//           filters.branch !== "all" && filters.branch !== undefined && filters.branch !== null
//             ? Number(filters.branch)
//             : null;

//         if (branchFilter) {
//           orderParams.b_id = branchFilter;
//         }

//         const [sales, paymentsList, supplierPayments, purchaseOrders, branches] =
//           await Promise.all([
//             getOrders(orderParams).catch(() => []),
//             getPayments().catch(() => []),
//             getSupplierPayments().catch(() => []),
//             getPurchaseOrders().catch(() => []),
//             getBranches().catch(() => []),
//           ]);

//         const paymentsByOrder = {};
//         (paymentsList || []).forEach((p) => {
//           const oid = p.or_id;
//           if (!oid) return;
//           const existing = paymentsByOrder[oid];
//           const curDate = p.pay_date ? new Date(p.pay_date) : new Date();
//           const existingDate =
//             existing && existing.pay_date ? new Date(existing.pay_date) : null;
//           if (!existing || (existingDate && curDate > existingDate) || !existingDate) {
//             paymentsByOrder[oid] = p;
//           }
//         });

//         const purchaseOrdersById = {};
//         (purchaseOrders || []).forEach((po) => {
//           if (po && po.po_id !== undefined && po.po_id !== null) {
//             purchaseOrdersById[po.po_id] = po;
//           }
//         });

//         const branchById = {};
//         (branches || []).forEach((b) => {
//           if (b && (b.B_id !== undefined && b.B_id !== null)) {
//             branchById[b.B_id] = b;
//           }
//         });

//         const normalizedSales = (sales || []).map((o) => {
//           const pay = paymentsByOrder[o.or_id];
//           const payMethod = pay?.pay_method ?? pay?.method ?? null;
//           const branchName =
//             branchById[o.b_id]?.B_name ?? o.B_name ?? o.b_name ?? null;

//           return {
//             id: `sale-${o.or_id}`,
//             type: "sale",
//             txId: `POS#${o.or_id}`,
//             invoiceNo: o.or_id,
//             branchId: o.b_id,
//             branchLabel: branchName,
//             cashierId: o.u_id,
//             cashierLabel: o.u_name ?? null,
//             date: o.or_date ?? o.or_time ?? o.created_at,
//             paymentMethod:
//               payMethod ? String(payMethod) : (o.or_paymentmethod ?? null) ?? "Cash",
//             amount: Number(o.or_totalCostWtax ?? o.or_totalcost ?? 0),
//             raw: o,
//           };
//         });

// let normalizedPayments = (supplierPayments || []).map((p) => {
//   const po = purchaseOrdersById[p.po_id];

//   const branchId = po?.b_id ?? po?.B_id ?? p.b_id ?? p.B_id ?? null;
//   const branchName =
//     po?.B_name ??
//     po?.b_name ??
//     branchById[branchId]?.B_name ??
//     p.B_name ??
//     p.b_name ??
//     null;

//   return {
//     id: `pay-${p.pay_id}`,
//     type: "purchase",
//     txId: `PAY#${p.pay_id}`,
//     invoiceNo: p.po_id,
//     branchId,
//     branchLabel: branchName,
//     cashierId: p.sup_id,
//     cashierLabel: p.sup_name,
//     date: p.payment_date,
//     paymentMethod: p.method,
//     amount: Number(p.amount ?? 0),
//     raw: p,
//   };
// });

//         // Apply branch filter to purchases client-side so purchases respect the selected branch
//         if (branchFilter) {
//           normalizedPayments = normalizedPayments.filter(
//             (p) => p.branchId !== null && Number(p.branchId) === branchFilter,
//           );
//         }

//         setTransactions(
//           [...normalizedSales, ...normalizedPayments].sort(
//             (a, b) => new Date(b.date) - new Date(a.date),
//           ),
//         );
//       } catch (err) {
//         console.error("Ledger engine compilation error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     load();
//   }, [filters.branch]); // re-run when branch selection changes

//   const filtered = useMemo(() => {
//     return transactions.filter((t) => {
//       if (filters.tab === "income" && t.type !== "sale") return false;
//       if (filters.tab === "expense" && t.type !== "purchase") return false;

//       if (filters.method !== "all" && filters.method !== "") {
//         const targetMethod = String(t.paymentMethod || "").toLowerCase();
//         if (targetMethod !== String(filters.method).toLowerCase()) return false;
//       }

//       if (filters.search.trim()) {
//         const s = filters.search.toLowerCase();
//         const matches =
//           String(t.txId || "").toLowerCase().includes(s) ||
//           String(t.invoiceNo || "").toLowerCase().includes(s) ||
//           String(t.branchLabel || "").toLowerCase().includes(s) ||
//           String(t.cashierLabel || "").toLowerCase().includes(s);
//         if (!matches) return false;
//       }

//       if (filters.dateFrom && t.date) {
//         if (new Date(t.date) < new Date(filters.dateFrom)) return false;
//       }
//       if (filters.dateTo && t.date) {
//         const boundaryDate = new Date(filters.dateTo);
//         boundaryDate.setHours(23, 59, 59, 999);
//         if (new Date(t.date) > boundaryDate) return false;
//       }

//       return true;
//     });
//   }, [transactions, filters]);

//   return (
//     <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased">
//       <Sidebar />

//       <div className="flex flex-1 flex-col overflow-hidden" style={{ marginLeft: 240 }}>
//         <Header title={t("company_admin.transaction_details", "Transaction Details")} />

//         <main className="flex-1 overflow-y-auto p-6 lg:p-8">
//           <div className="mx-auto max-w-7xl space-y-6">
//             <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
//               <div>
//                 <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Ledger</h1>
//                 <p className="text-sm text-slate-500">Audit, inspect, and trace global multi-branch transactions and payments.</p>
//               </div>
//             </div>

//             <TransactionFilters filters={filters} setFilters={setFilters} />

//             <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
//               {!loading && filtered.length === 0 && filters.branch !== "all" ? (
//                 <div className="p-20 text-center">
//                   <p className="text-base font-medium text-slate-600">No transaction history in this branch.</p>
//                   <p className="text-xs text-slate-400 mt-1">Try selecting a different date range or clearing the branch filter.</p>
//                 </div>
//               ) : (
//                 <TransactionTable
//                   data={filtered}
//                   loading={loading}
//                   pageSize={pageSize}
//                   onView={(item) => setSelected(item)}
//                 />
//               )}
//             </div>
//           </div>
//         </main>
//       </div>

//       {selected && <TransactionDetailsModal item={selected} onClose={() => setSelected(null)} />}
//     </div>
//   );
// }