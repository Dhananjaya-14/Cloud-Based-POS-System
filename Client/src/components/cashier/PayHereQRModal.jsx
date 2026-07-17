import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getSocket } from "../../services/socket";

const TIMEOUT_SECONDS = 300; // 5 minutes

export default function PayHereQRModal({ paymentUrl, orderId, onSuccess, onCancel }) {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);
  const [status, setStatus] = useState("waiting"); // "waiting" | "confirmed" | "expired"
  const timerRef = useRef(null);

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setStatus("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Socket listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handleConfirmed = (data) => {
      if (String(data.order_id) === String(orderId)) {
        clearInterval(timerRef.current);
        setStatus("confirmed");
        // Give user 2 seconds to see the success banner, then proceed
        setTimeout(() => onSuccess(data), 2000);
      }
    };

    socket.on("payhere:payment_confirmed", handleConfirmed);
    return () => socket.off("payhere:payment_confirmed", handleConfirmed);
  }, [orderId, onSuccess]);

  // ── Format timer ───────────────────────────────────────────────────────────
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const progress = (secondsLeft / TIMEOUT_SECONDS) * 100;
  const isUrgent = secondsLeft <= 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#0E6DCF] to-[#1a82e8] px-8 py-6">
          <div className="flex items-center gap-3 mb-1">
            {/* PayHere logo text */}
            <span className="text-2xl font-black text-white tracking-tight">
              pay<span className="text-yellow-300">here</span>
            </span>
            <span className="text-blue-200 text-sm font-medium">QR Payment</span>
          </div>
          <p className="text-blue-100 text-sm">
            Order <span className="font-bold text-white">#{orderId}</span>
          </p>
        </div>

        {/* ── Content ── */}
        <div className="px-8 py-6">

          {/* Status: Waiting */}
          {status === "waiting" && (
            <>
              <p className="text-center text-slate-500 text-sm mb-5">
                Ask the customer to scan this QR code with their mobile to complete payment.
              </p>

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-2xl border-4 border-[#0E6DCF]/20 bg-white shadow-inner">
                  <QRCodeSVG
                    value={paymentUrl}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#0E2C5E"
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Countdown */}
             <div className="mb-6 text-center">
                <p
                  className={`text-sm font-medium mb-2 ${
                    isUrgent ? "text-red-500" : "text-slate-500"
                  }`}
                >
                  {isUrgent ? "⚠ QR Code Expiring Soon" : "QR Code Expires In"}
                </p>

                <div
                  className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 shadow-sm border ${
                    isUrgent
                      ? "border-red-200 bg-red-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <span
                    className={`font-mono text-2xl font-bold tracking-wider ${
                      isUrgent ? "text-red-600" : "text-[#0E6DCF]"
                    }`}
                  >
                    {mm}:{ss}
                  </span>
                </div>
              </div>

              {/* Cancel */}
              <button
                onClick={onCancel}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
              >
                Cancel Payment
              </button>
            </>
          )}

          {/* Status: Confirmed */}
          {status === "confirmed" && (
            <div className="text-center py-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-green-600 mb-1">Payment Received!</h3>
              <p className="text-slate-500 text-sm">Preparing invoice...</p>
            </div>
          )}

          {/* Status: Expired */}
          {status === "expired" && (
            <div className="text-center py-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-1">QR Code Expired</h3>
              <p className="text-slate-500 text-sm mb-6">
                The payment window has timed out. Please try again.
              </p>
              <button
                onClick={onCancel}
                className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
              >
                Back to Checkout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
