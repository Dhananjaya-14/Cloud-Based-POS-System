/**
 * ProductCard — Single product tile in the POS product grid.
 *
 * Props:
 *   product      – branch product object (must include pro_image field from API)
 *   onAdd        – (product) => void  called when card is clicked
 */
import React, { useState } from "react";
import { FaShoppingBag } from "react-icons/fa";
import { resolveProductImage } from "../../../utils/resolveProductImage";

const ProductCard = ({ product, onAdd }) => {
  const isMadeToOrder = product.product_type === "made_to_order";
  const stockCount    = Number(product.pro_quantity ?? 0);
  const isOutOfStock  = !isMadeToOrder && stockCount <= 0;
  const priceLabel    = Number(product.pro_price ?? 0).toFixed(2);

  // Resolve the image URL — empty string means "show fallback icon"
  const imageUrl = resolveProductImage(product.pro_image);

  // Track load errors so we can fall back to the icon gracefully
  const [imgError, setImgError] = useState(false);
  const showImage = imageUrl && !imgError;

  return (
    <article
      onClick={() => !isOutOfStock && onAdd(product)}
      className={`group rounded-2xl border bg-white p-3 shadow-sm transition select-none ${
        isOutOfStock
          ? "cursor-not-allowed border-slate-100 opacity-50"
          : "cursor-pointer border-slate-200 hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      {/* Image / icon area */}
      <div className="relative flex h-[90px] w-full items-center justify-center overflow-hidden rounded-xl bg-[#E8F5F3]">
        {showImage ? (
          <img
            src={imageUrl}
            alt={product.pro_name || "Product"}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <FaShoppingBag className="h-8 w-8 text-[#2BB5A0]" />
        )}

        {/* Stock badge (only for stocked products) */}
        {!isMadeToOrder && (
          <span className="absolute top-2 right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
            {stockCount}
          </span>
        )}
      </div>

      {/* Info */}
      <h3 className="font-space mt-3 text-sm font-semibold text-slate-900 leading-tight line-clamp-2">
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
