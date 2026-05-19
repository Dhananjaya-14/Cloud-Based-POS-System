import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/admin/Header";
import Sidebar from "../../components/admin/Sidebar";
import TransactionFilters from "../../components/admin/TransactionFilters";
import TransactionTable from "../../components/admin/TransactionTable";
import TransactionDetailsModal from "../../components/admin/TransactionDetailsModal";
import { getBranches, getOrders, getPayments, getPurchaseOrders, getSupplierPayments } from "../../services/api";

export default function Transactions() {
  const [filters, setFilters] = useState({
    search: "",
    branch: "all",
    method: "all",
    dateFrom: null,
    dateTo: null,
    tab: "all",
  });
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pageSize] = useState(10);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const orderParams = { status: "completed" };
        const branchFilter = filters.branch !== "all" && filters.branch != null ? Number(filters.branch) : null;

        if (branchFilter !== null) {
          orderParams.b_id = branchFilter;
        }

        const [sales, paymentsList, supplierPayments, purchaseOrders, branches] = await Promise.all([
          getOrders(orderParams).catch(() => []),
          getPayments().catch(() => []),
          getSupplierPayments().catch(() => []),
          getPurchaseOrders().catch(() => []),
          getBranches().catch(() => []),
        ]);

        const paymentsByOrder = {};
        (paymentsList || []).forEach((payment) => {
          const orderId = payment.or_id;
          if (!orderId) return;

          const existing = paymentsByOrder[orderId];
          const currentDate = payment.pay_date ? new Date(payment.pay_date) : new Date();
          const existingDate = existing?.pay_date ? new Date(existing.pay_date) : null;

          if (!existing || !existingDate || currentDate > existingDate) {
            paymentsByOrder[orderId] = payment;
          }
        });

        const purchaseOrdersById = {};
        (purchaseOrders || []).forEach((purchaseOrder) => {
          if (purchaseOrder?.po_id != null) {
            purchaseOrdersById[purchaseOrder.po_id] = purchaseOrder;
          }
        });

        const branchById = {};
        (branches || []).forEach((branch) => {
          if (branch?.B_id != null) {
            branchById[branch.B_id] = branch;
          }
        });

        const normalizedSales = (sales || []).map((order) => {
          const payment = paymentsByOrder[order.or_id];
          const paymentMethod = payment?.pay_method ?? payment?.method ?? order.or_paymentmethod ?? "Cash";
          const branchName = branchById[order.b_id]?.B_name ?? order.B_name ?? order.b_name ?? null;

          return {
            id: `sale-${order.or_id}`,
            type: "sale",
            txId: `POS#${order.or_id}`,
            invoiceNo: order.or_id,
            branchId: order.b_id,
            branchLabel: branchName,
            cashierId: order.u_id,
            cashierLabel: order.u_name ?? null,
            date: order.or_date ?? order.or_time ?? order.created_at,
            paymentMethod: String(paymentMethod),
            amount: Number(order.or_totalCostWtax ?? order.or_totalcost ?? 0),
            raw: order,
          };
        });

        let normalizedPayments = (supplierPayments || []).map((payment) => {
          const purchaseOrder = purchaseOrdersById[payment.po_id];
          const branchId = purchaseOrder?.b_id ?? purchaseOrder?.B_id ?? payment.b_id ?? payment.B_id ?? null;
          const branchName =
            purchaseOrder?.B_name ??
            purchaseOrder?.b_name ??
            branchById[branchId]?.B_name ??
            payment.B_name ??
            payment.b_name ??
            null;

          return {
            id: `pay-${payment.pay_id}`,
            type: "purchase",
            txId: `PAY#${payment.pay_id}`,
            invoiceNo: payment.po_id,
            branchId,
            branchLabel: branchName,
            cashierId: payment.sup_id,
            cashierLabel: payment.sup_name,
            date: payment.payment_date,
            paymentMethod: payment.method,
            amount: Number(payment.amount ?? 0),
            raw: payment,
          };
        });

        if (branchFilter !== null) {
          normalizedPayments = normalizedPayments.filter((payment) => payment.branchId != null && Number(payment.branchId) === branchFilter);
        }

        setTransactions([...normalizedSales, ...normalizedPayments].sort((a, b) => new Date(b.date) - new Date(a.date)));
      } catch (error) {
        console.error("Ledger engine compilation error:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [filters.branch]);

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      if (filters.tab === "income" && transaction.type !== "sale") return false;
      if (filters.tab === "expense" && transaction.type !== "purchase") return false;

      if (filters.method !== "all" && filters.method !== "") {
        const targetMethod = String(transaction.paymentMethod || "").toLowerCase();
        if (targetMethod !== String(filters.method).toLowerCase()) return false;
      }

      if (filters.search.trim()) {
        const search = filters.search.toLowerCase();
        const matches =
          String(transaction.txId || "").toLowerCase().includes(search) ||
          String(transaction.invoiceNo || "").toLowerCase().includes(search) ||
          String(transaction.branchLabel || "").toLowerCase().includes(search) ||
          String(transaction.cashierLabel || "").toLowerCase().includes(search);

        if (!matches) return false;
      }

      if (filters.dateFrom && transaction.date && new Date(transaction.date) < new Date(filters.dateFrom)) return false;

      if (filters.dateTo && transaction.date) {
        const boundaryDate = new Date(filters.dateTo);
        boundaryDate.setHours(23, 59, 59, 999);
        if (new Date(transaction.date) > boundaryDate) return false;
      }

      return true;
    });
  }, [transactions, filters]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden" style={{ marginLeft: 240 }}>
        <Header title="Transaction Details" />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Ledger</h1>
                <p className="text-sm text-slate-500">Audit, inspect, and trace global multi-branch transactions and payments.</p>
              </div>
            </div>

            <TransactionFilters filters={filters} setFilters={setFilters} />

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {!loading && filtered.length === 0 && filters.branch !== "all" ? (
                <div className="p-20 text-center">
                  <p className="text-base font-medium text-slate-600">No transaction history in this branch.</p>
                  <p className="mt-1 text-xs text-slate-400">Try selecting a different date range or clearing the branch filter.</p>
                </div>
              ) : (
                <TransactionTable data={filtered} loading={loading} pageSize={pageSize} onView={(item) => setSelected(item)} />
              )}
            </div>
          </div>
        </main>
      </div>

      {selected && <TransactionDetailsModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
}














