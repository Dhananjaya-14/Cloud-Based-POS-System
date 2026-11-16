/**
 * CartItem — A single item row inside the Shopping Cart.
 *
 * Props:
 *   item           – { Bpro_id, pro_name, unitPrice, qty }
 *   onRemove       – (Bpro_id) => void
 *   onChangeQty    – (Bpro_id, delta) => void
 */
import React from "react";
import { FaMinus, FaPlus } from "react-icons/fa";

const CartItem = ({ item, onRemove, onChangeQty }) => (
  <div className="border-b border-slate-100 pb-4 last:border-0">
    {/* Name + remove */}
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="font-space text-sm font-semibold text-slate-900">{item.pro_name}</p>
        <p className="font-inter mt-0.5 text-xs text-slate-500">
          ${item.unitPrice.toFixed(2)}
        </p>
      </div>
      <button
        onClick={() => onRemove(item.Bpro_id)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition text-sm"
        aria-label="Remove item"
      >
        ×
      </button>
    </div>

    {/* Qty + line total */}
    <div className="mt-3 flex items-center justify-between">
      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-0.5">
        <button
          onClick={() => onChangeQty(item.Bpro_id, -1)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition"
          aria-label="Decrease"
        >
          <FaMinus className="h-2.5 w-2.5" />
        </button>
        <span className="font-space min-w-[24px] text-center text-sm font-semibold text-slate-900">
          {item.qty}
        </span>
        <button
          onClick={() => onChangeQty(item.Bpro_id, 1)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition"
          aria-label="Increase"
        >
          <FaPlus className="h-2.5 w-2.5" />
        </button>
      </div>
      <span className="font-space text-sm font-bold text-slate-900">
        ${(item.unitPrice * item.qty).toFixed(2)}
      </span>
    </div>
  </div>
);

export default CartItem;
