import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from 'react';
import { getOrderById, getOrderItemsByOrderId, getPurchaseOrderById, getPurchaseItemsByOrder, getPaymentsByOrder, getBranchProducts } from '../../services/api';
function formatAmount(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}
export default function TransactionDetailsModal({
  item,
  onClose
}) {
  const { t } = useTranslation();
const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [bpMap, setBpMap] = useState({});
  useEffect(() => {
    if (!item) return;
    setFetchError('');
    const load = async () => {
      setLoading(true);
      try {
        const idToken = Number(item.invoiceNo);
        if (!Number.isFinite(idToken) || idToken <= 0) {
          setFetchError('Malformed transaction invoice parameters.');
          return;
        }
        if (item.type === 'sale') {
          const [orderRes, itemsRes] = await Promise.all([getOrderById(idToken).catch(() => null), getOrderItemsByOrderId(idToken).catch(() => [])]);

          // Unpack custom API wrapper objects cleanly if the backend wraps arrays in .data
          const orderData = orderRes?.data ?? orderRes;
          const itemsData = Array.isArray(itemsRes) ? itemsRes : itemsRes?.data ?? [];
          setDetails({
            order: orderData,
            items: itemsData
          });
        } else {
          const [po, items, payments] = await Promise.all([getPurchaseOrderById(idToken).catch(() => null), getPurchaseItemsByOrder(idToken).catch(() => []), getPaymentsByOrder(idToken).catch(() => [])]);
          setDetails({
            po,
            items,
            payments
          });
        }
      } catch (err) {
        console.error('Modal data extraction capture crash:', err);
        setFetchError('Could not retrieve absolute item attributes.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [item]);
  if (!item) return null;
  useEffect(() => {
    let mounted = true;
    getBranchProducts().then(res => {
      const arr = Array.isArray(res) ? res : res?.data ?? res ?? [];
      if (!mounted) return;
      setBpMap(Object.fromEntries(arr.map(p => [String(p.Bpro_id), p])));
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex flex-col w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden max-h-[85vh] border border-slate-100">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {item.type === 'sale' ? 'Sales Transaction Receipt' : 'Purchase Expense Ledger'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t("company_admin.reference", "Reference:")}{item.txId}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 focus:outline-none">{t("company_admin.print", "Print")}</button>
            <button onClick={onClose} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none">{t("company_admin.close", t("buttons.close", "Close"))}</button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {fetchError && <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-lg font-medium">
              {fetchError}
            </div>}

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs">
            <div>
              <span className="block text-slate-400 font-medium uppercase tracking-wider">{t("company_admin.invoice_po_number", "Invoice / PO Number")}</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block">#{item.invoiceNo}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium uppercase tracking-wider">{t("company_admin.transaction_timestamp", "Transaction Timestamp")}</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
                {item.date ? new Date(item.date).toLocaleString() : '-'}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium uppercase tracking-wider">{t("company_admin.settlement_routing", "Settlement Routing")}</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block capitalize">{item.paymentMethod ?? '-'}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium uppercase tracking-wider">{t("company_admin.total_value_gross", "Total Value Gross")}</span>
              <span className={`text-sm font-bold font-mono mt-0.5 block ${item.type === 'sale' ? 'text-emerald-600' : 'text-rose-600'}`}>{t("company_admin.lkr", "LKR")}{formatAmount(item.amount)}
              </span>
            </div>
          </div>

          {loading ? <div className="flex items-center justify-center py-10 gap-2 text-slate-400 text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
              <span>{t("company_admin.fetching_transactional_logs", "Fetching transactional logs...")}</span>
            </div> : <>
              {item.type === 'sale' && details?.items && <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("company_admin.line_items_detail_breakout", "Line Items Detail Breakout")}</h4>
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 pl-4">{t("company_admin.item_id_reference", "Item ID/ Reference")}</th>
                          <th className="p-2.5 text-center">{t("company_admin.quantity", "Quantity")}</th>
                          <th className="p-2.5 text-right">{t("company_admin.unit_price", "Unit Price")}</th>
                          <th className="p-2.5 text-right pr-4">{t("company_admin.line_total", "Line Total")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-xs">
                        {details.items.map((it, idx) => {
                    const name = it.pro_name ?? bpMap[String(it.Bpro_id)]?.pro_name ?? it.name ?? (it.pro_id ? `Product ID: #${it.pro_id}` : "Unknown Item Ref");
                    const refId = name;
                    const qty = Number(it.pro_quantity ?? 0);
                    const unitPrice = Number(it.unit_price ?? 0);
                    const totalLine = Number(it.total_price ?? qty * unitPrice);
                    return <tr key={it.orderItem_id || idx}>
                              <td className="p-2.5 pl-4 font-medium text-slate-800">{refId}</td>
                              <td className="p-2.5 text-center text-slate-600">{qty}</td>
                              <td className="p-2.5 text-right font-mono text-slate-600">{t("company_admin.lkr", "LKR")}{formatAmount(unitPrice)}</td>
                              <td className="p-2.5 text-right font-mono font-semibold text-slate-800 pr-4">{t("company_admin.lkr", "LKR")}{formatAmount(totalLine)}
                              </td>
                            </tr>;
                  })}
                      </tbody>
                    </table>
                  </div>
                </div>}

              {item.type === 'purchase' && details?.po && <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("company_admin.raw_material_input_procurement", "Raw Material Input Procurement")}</h4>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5 pl-4">{t("company_admin.resource_designation", "Resource Designation")}</th>
                            <th className="p-2.5 text-center">{t("company_admin.qty_bought", "Qty Bought")}</th>
                            <th className="p-2.5 text-right">{t("company_admin.cost_per_unit", "Cost per Unit")}</th>
                            <th className="p-2.5 text-right pr-4">{t("company_admin.subtotal", "Subtotal")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-xs">
                          {(details.items || []).map((it, idx) => <tr key={idx}>
                              <td className="p-2.5 pl-4 font-medium text-slate-800">{it.rm_name}</td>
                              <td className="p-2.5 text-center text-slate-600">{it.qty}</td>
                              <td className="p-2.5 text-right font-mono text-slate-600">{formatAmount(it.unit_price)}</td>
                              <td className="p-2.5 text-right font-mono font-semibold text-slate-800 pr-4">{formatAmount(it.price)}</td>
                            </tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>}
            </>}
        </div>
      </div>
    </div>;
}