/**
 * ProductCard — Single product tile in the POS product grid.
 *
 * Props:
 *   product      – branch product object
 *   onAdd        – () => void  called when card is clicked
 */
import React from "react";
import { FaShoppingBag } from "react-icons/fa";

const ProductCard = ({ product, onAdd }) => {
  const isMadeToOrder = product.product_type === "made_to_order";
  const stockCount    = Number(product.pro_quantity ?? 0);
  const isOutOfStock  = !isMadeToOrder && stockCount <= 0;
  const priceLabel    = Number(product.pro_price ?? 0).toFixed(2);

  return (
    <article
      onClick={() => !isOutOfStock && onAdd(product)}
      className={`group rounded-2xl border bg-white p-3 shadow-sm transition select-none ${
        isOutOfStock
          ? "cursor-not-allowed border-slate-100 opacity-50"
          : "cursor-pointer border-slate-200 hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      {/* Icon area */}
      <div className="relative flex h-[90px] w-full items-center justify-center rounded-xl bg-[#E8F5F3]">
        <FaShoppingBag className="h-8 w-8 text-[#2BB5A0]" />
        {!isMadeToOrder && (
          <span className="absolute top-2 right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
            {stockCount}
          </span>
        )}
      </div>

      {/* Info */}
      <h3 className="font-space mt-3 text-sm font-semibold text-slate-900 leading-tight">
        {product.pro_name}
      </h3>
      <p className="font-inter mt-0.5 text-[11px] font-semibold text-emerald-500">
        {isOutOfStock ? "Out of stock" : "Available now"}
      </p>
      <p className="font-space mt-1.5 text-base font-bold text-slate-900">
        ${priceLabel}
      </p>
    </article>
  );
};

export default ProductCard;
