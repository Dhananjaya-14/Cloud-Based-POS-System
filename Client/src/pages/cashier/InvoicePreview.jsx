import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaPrint, FaTimes } from "react-icons/fa";
import { printReceipt } from "../../utils/printReceipt";
import { useAuth } from "../../context/AuthContext";

const defaultState = {
  orderId: "INV-0000000",
  cashierName: "Cashier",
  branchName: "Kandy Branch",
  branchLabel: "Kandy\nBranch",
  paymentMethod: "Cash",
  items: [
    {
      Bpro_id: 3,
      pro_name: "Signature Cocktail",
      unitPrice: 650,
      qty: 1,
      total: 650,
    },
  ],
  subtotal: 650,
  discount: 0,
  tax: 65,
  total: 715,
};

const InvoicePreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();

  const invoice = useMemo(() => ({
    ...defaultState,
    ...(location.state || {}),
  }), [location.state]);

  const [isPaid, setIsPaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // To prevent double-clicks

  useEffect(() => {
    if (isPaid) {
      const timer = setTimeout(() => {
        navigate("/cashier/pos");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isPaid, navigate]);

  const grandTotal = Number(invoice.total ?? 0).toFixed(2);
  const subtotal = Number(invoice.subtotal ?? 0).toFixed(2);
  const discount = Number(invoice.discount ?? 0).toFixed(2);
  const tax = Number(invoice.tax ?? 0).toFixed(2);

  const handlePrint = () => {
    printReceipt(invoice);
  };

  const handlePay = async () => {
    if (isSubmitting || isPaid) return;

    setIsSubmitting(true);

    const mappedMethod = String(invoice.paymentMethod).toLowerCase() === "cash" ? "cash" : "card";
    const orderIdParsed = parseInt(String(invoice.orderId).replace(/[^0-9]/g, ""), 10) || 1;
    const paymentPayload = {
      pay_method: mappedMethod,
      pay_status: "paid",
      pay_date: new Date().toISOString().split('T')[0],
      pay_amount: Number(invoice.total),
      or_id: orderIdParsed,
    };

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify(paymentPayload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsPaid(true);
      } else {
        alert(`Payment Failed: ${result.message}\n${result.errors ? result.errors.map(e => `- ${e.field}: ${e.message}`).join('\n') : ''
          }`);
      }
    } catch (error) {
      console.error("Payment Submission Error:", error);
      alert("Network or Server error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      {isPaid && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-20">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-xl font-semibold text-green-600">Payment successful!</p>
            <p className="text-sm text-gray-600 mt-2">Redirecting to POS...</p>
          </div>
        </div>
      )}
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_32%),linear-gradient(135deg,#eff6ff_0%,#f8fafc_45%,#edfdf3_100%)] px-3 py-3 text-slate-900 sm:px-4 sm:py-4">

        <div className="pointer-events-none absolute -left-22.5 -top-22.5 h-56 w-56 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-25 -right-17.5 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-size-[36px_36px] opacity-30" />

        <div className="relative z-10 mx-auto w-full max-w-xl rounded-3xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Invoice Preview</h1>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#0A5BAE] to-[#19A4E5] px-3 py-2 text-xs font-semibold text-white shadow-md shadow-sky-200 transition hover:-translate-y-px sm:text-sm"
              >
                <FaPrint className="h-3.5 w-3.5" />
                Print Bill
              </button>

              <button
                onClick={() => navigate("/cashier/pos")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3 px-3 py-3 sm:px-4 sm:py-4">
            <section className="rounded-2xl bg-linear-to-r from-[#0A5BAE] via-[#11A9DF] to-[#55C24A] px-4 py-3 text-white shadow-[0_12px_24px_rgba(16,185,129,0.12)]">
              <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Hotel POS</h2>
                  <p className="mt-1 text-[11px] text-white/80 sm:text-xs">Point of Sale System</p>
                  <p className="mt-1 whitespace-pre-line text-[11px] text-white/80 sm:text-xs">{invoice.branchLabel}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 md:min-w-52">
                  <div className="rounded-2xl bg-white/15 px-3 py-2.5 text-right backdrop-blur-sm">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-white/80">Invoice No.</div>
                    <div className="mt-1 text-base font-semibold sm:text-lg">{invoice.orderId}</div>
                  </div>
                  <div className="rounded-2xl bg-white/15 px-3 py-2.5 text-right backdrop-blur-sm">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-white/80">Cashier</div>
                    <div className="mt-1 text-sm font-semibold sm:text-base">{invoice.cashierName}</div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-2.5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cashier Details</div>
                <div className="mt-2 text-sm font-semibold text-slate-900 sm:text-base">{invoice.cashierName}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">Cashier</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">Customer</div>
                <div className="mt-2 text-sm font-semibold text-slate-900 sm:text-base">Walk-in Customer</div>
                <div className="mt-0.5 text-[11px] text-slate-500">Counter Sale</div>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-[11px] sm:text-sm">
                  <thead>
                    <tr className="bg-linear-to-r from-[#0A5BAE] to-[#19A4E5] text-white">
                      <th className="px-3 py-2.5 font-semibold uppercase tracking-widest">Item</th>
                      <th className="px-3 py-2.5 font-semibold uppercase tracking-widest">Code</th>
                      <th className="px-3 py-2.5 font-semibold uppercase tracking-widest">Price</th>
                      <th className="px-3 py-2.5 font-semibold uppercase tracking-widest">Qty</th>
                      <th className="px-3 py-2.5 font-semibold uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {invoice.items.map((item) => (
                      <tr key={item.Bpro_id} className="align-middle">
                        <td className="px-3 py-2.5 font-semibold text-slate-900">{item.pro_name}</td>
                        <td className="px-3 py-2.5 text-slate-500">{item.Bpro_id}</td>
                        <td className="px-3 py-2.5 text-slate-900">${Number(item.unitPrice).toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-slate-900">{item.qty}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900">${Number(item.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex flex-col gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">Payment Method</div>
                <div className="mt-1 text-sm font-semibold text-emerald-600 sm:text-base">{invoice.paymentMethod} Payment</div>
              </div>
              <button
                type="button"
                onClick={handlePay}
                disabled={isPaid || isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-[#55C24A] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#49b03f] disabled:cursor-default disabled:opacity-70 sm:text-sm"
              >
                {isPaid ? "PAID" : isSubmitting ? "PROCESSING..." : "PAY NOW"}
              </button>
            </section>

            <section className="flex flex-col gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">Payment Method</div>
                <div className="mt-1 text-sm font-semibold text-emerald-600 sm:text-base">{invoice.paymentMethod} Payment</div>
              </div>
              <button
                type="button"
                onClick={handlePay}
                disabled={isPaid}
                className="inline-flex items-center justify-center rounded-xl bg-[#55C24A] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#49b03f] disabled:cursor-default disabled:opacity-70 sm:text-sm"
              >
                {isPaid ? "PAID" : "PAY NOW"}
              </button>
            </section>

            <div className="border-t border-slate-200 pt-2 text-center text-[11px] text-slate-500">
              <p>Thank you for your purchase!</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoicePreview;