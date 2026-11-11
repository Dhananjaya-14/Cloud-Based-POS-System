import { useTranslation } from "react-i18next";
import React, { useEffect, useRef, useState } from "react";
import { FaEdit, FaMinus, FaPlus, FaSpinner, FaTrashAlt } from "react-icons/fa";
const statusStyles = {
  "In stock": {
    background: "rgba(60,174,73,0.12)",
    color: "#3CAE49"
  },
  "Low stock": {
    background: "rgba(217,161,92,0.15)",
    color: "#B7791F"
  },
  "Out of stock": {
    background: "rgba(224,101,79,0.1)",
    color: "#E0654F"
  }
};
const statusIcon = s => s === "out" ? "\u274C" : s === "low" ? "\u26A0\uFE0F" : "\u2705";
const statusLabel = s => s === "out" ? "Out of stock" : s === "low" ? "Low stock" : "OK";
const ingredientRowColor = s => s === "out" ? "#FFF0F0" : s === "low" ? "#FFFBF0" : "#F6FFF8";
const IngredientPopover = ({
  productId,
  productName,
  onFetch,
  onClose,
  anchorRef
}) => {
const popoverRef = useRef(null);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState({
    top: 0,
    left: 0
  });
  const [error, setError] = useState("");
  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popW = 320;
      const popH = 300;
      let left = rect.left;
      let top = rect.bottom + 6;
      if (left + popW > window.innerWidth - 16) left = window.innerWidth - popW - 16;
      if (top + popH > window.innerHeight - 16) top = rect.top - popH - 6;
      setPosition({
        top,
        left
      });
    }
  }, [anchorRef]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await onFetch(productId);
        if (!cancelled) setIngredients(data?.ingredients ?? []);
      } catch {
        if (!cancelled) setError("Failed to load ingredients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productId, onFetch]);
  useEffect(() => {
    const handler = e => {
      if (popoverRef.current && !popoverRef.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 200);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose, anchorRef]);
  return <div ref={popoverRef} style={{
    position: "fixed",
    top: position.top,
    left: position.left,
    width: "320px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    border: "1px solid #E5E7EB",
    zIndex: 9999,
    overflow: "hidden"
  }}>
      <div style={{
      background: "#FFF8EC",
      borderBottom: "1px solid #FFE4A0",
      padding: "10px 14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
        <div>
          <div style={{
          fontSize: "13px",
          fontWeight: "700",
          color: "#92400E"
        }}>{t("branch_admin.ingredient_status", "⚠️ Ingredient Status")}</div>
          <div style={{
          fontSize: "11px",
          color: "#B45309",
          marginTop: "2px"
        }}>{productName}</div>
        </div>
        <button onClick={onClose} style={{
        border: "none",
        background: "transparent",
        fontSize: "16px",
        cursor: "pointer",
        color: "#9CA3AF"
      }}>×</button>
      </div>
      <div style={{
      padding: "10px 0",
      maxHeight: "260px",
      overflowY: "auto"
    }}>
        {loading && <div style={{
        padding: "20px",
        textAlign: "center",
        color: "#9CA3AF",
        fontSize: "13px"
      }}>{t("branch_admin.loading_ingredients", "Loading ingredients...")}</div>}
        {error && <div style={{
        padding: "12px 14px",
        color: "#D04444",
        fontSize: "13px"
      }}>{error}</div>}
        {!loading && !error && ingredients.length === 0 && <div style={{
        padding: "12px 14px",
        color: "#9CA3AF",
        fontSize: "13px"
      }}>{t("branch_admin.no_recipe_ingredients_found", "No recipe ingredients found.")}</div>}
        {!loading && !error && ingredients.map(ing => <div key={ing.rm_id} style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 14px",
        background: ingredientRowColor(ing.status),
        borderBottom: "1px solid #F3F4F6"
      }}>
            <span style={{
          fontSize: "14px",
          flexShrink: 0
        }}>{statusIcon(ing.status)}</span>
            <div style={{
          flex: 1,
          minWidth: 0
        }}>
              <div style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>{ing.rm_name}</div>
              <div style={{
            fontSize: "11px",
            color: "#6B7280",
            marginTop: "1px"
          }}>{t("branch_admin.needed", "Needed:")}{ing.required_qty} {ing.recipe_unit}</div>
            </div>
            <div style={{
          textAlign: "right",
          flexShrink: 0
        }}>
              <div style={{
            fontSize: "13px",
            fontWeight: "700",
            color: ing.status === "out" ? "#D04444" : ing.status === "low" ? "#C98918" : "#2C9B52"
          }}>{ing.stock_qty} {ing.stock_unit}</div>
              <div style={{
            fontSize: "10px",
            color: "#9CA3AF",
            marginTop: "1px"
          }}>{statusLabel(ing.status)}</div>
            </div>
          </div>)}
      </div>
      {!loading && !error && ingredients.length > 0 && <div style={{
      padding: "8px 14px",
      background: "#F9FAFB",
      borderTop: "1px solid #E5E7EB",
      fontSize: "11px",
      color: "#9CA3AF"
    }}>{t("branch_admin.sorted_by_most_critical_first", "Sorted by most critical first")}</div>}
    </div>;
};
const StatusBadge = ({
  item,
  onFetchIngredients
}) => {
const [open, setOpen] = useState(false);
  const badgeRef = useRef(null);
  const isClickable = item.product_type === "made_to_order" && (item.status === "Low stock" || item.status === "Out of stock");
  if (!isClickable) {
    return <span style={{
      ...(statusStyles[item.status] || {
        background: "#E5E7EB",
        color: "#374151"
      }),
      borderRadius: "100px",
      padding: "4px 11px",
      fontSize: "11px",
      fontWeight: "700",
      whiteSpace: "nowrap",
      display: "inline-block"
    }}>
        {item.status}
      </span>;
  }
  return <>
      <button ref={badgeRef} type="button" onMouseDown={e => e.stopPropagation()} onClick={() => {
      if (!open) setOpen(true);
    }} style={{
      ...(statusStyles[item.status] || {}),
      borderRadius: "100px",
      padding: "4px 11px",
      fontSize: "11px",
      fontWeight: "700",
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      border: "none",
      cursor: "pointer"
    }} title="Click to see ingredient details">
        {item.status} <span style={{
        fontSize: "10px",
        opacity: 0.7
      }}>▾</span>
      </button>
      {open && <IngredientPopover productId={item.id} productName={item.name} onFetch={onFetchIngredients} onClose={() => setOpen(false)} anchorRef={badgeRef} />}
    </>;
};
const ProductItemsTable = ({
  products = [],
  onDecreaseStock,
  onIncreaseStock,

  onAddStock,
  updatingStockId = null,
  onViewProduct,
  onEditProduct,
  onDeleteProduct,
  onFetchIngredients,
  showActions = true,
  hideStockColumn = false,
  hideStatusColumn = false,
  showTypeColumn = false,
  toolbar = null,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageStart = 0,
  pageEnd = 0,
  onPageChange
}) => {
  const { t } = useTranslation();
  const shouldShowActions = showActions && (onViewProduct || onEditProduct || onDeleteProduct);
  const showPageNumbers = totalPages <= 4;
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const headers = [
    t("table_headers.product", "Product"),
    t("table_headers.category", "Category"),
    ...(showTypeColumn ? [t("table_headers.type", "Type")] : []),
    t("table_headers.price", "Price"),
    t("table_headers.discount", "Discount"),
    ...(hideStockColumn ? [] : [t("table_headers.stock_quantity", "Stock Quantity")]),
    ...(hideStatusColumn ? [] : [t("table_headers.status", "Status")]),
    ...(shouldShowActions ? [t("table_headers.action", "Action")] : [])
  ];
  const TD = "px-[22px] py-3 align-middle text-[13px] text-[#1A1A1A]";
  const pagerBtn = "rounded-lg border-[1.5px] border-[#E7E3D8] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#071E38] disabled:cursor-not-allowed disabled:opacity-40";
  return <>
      <style>
        {`@keyframes stockButtonSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
      </style>
      <div className="overflow-hidden rounded-[14px] border border-[#E7E3D8] bg-white">
        {/* Search + filters inside the table card */}
        {toolbar && <div className="flex flex-wrap items-center gap-3 border-b border-[#E7E3D8] px-[22px] py-[18px]">{toolbar}</div>}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {headers.map((head, index) => <th key={head} className={`whitespace-nowrap border-b border-[#E7E3D8] bg-[#FBFAF7] px-[22px] py-3 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#5B6470] ${shouldShowActions && index === headers.length - 1 ? "text-right" : "text-left"}`}>{head}</th>)}
              </tr>
            </thead>

            <tbody>
              {products.length === 0 && <tr>
                  <td colSpan={headers.length} className="px-[22px] py-14 text-center text-sm text-[#5B6470]">{t("branch_admin.no_products_found", "No products found")}</td>
                </tr>}
              {products.map(item => <tr key={item.id} className="border-b border-[#E7E3D8] last:border-b-0 hover:bg-[#FBFAF7]">
                  {/* Product = thumbnail + name + SKU */}
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt || "Product"} className="h-[42px] w-[42px] flex-shrink-0 rounded-[9px] object-cover" onError={e => {
                    e.currentTarget.style.display = "none";
                  }} /> : <span className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#FBFAF7] text-center text-[9px] font-semibold leading-tight text-[#5B6470]">{t("branch_admin.no_image", "No image")}</span>}
                      <div className="min-w-0">
                        <button type="button" onClick={() => onViewProduct?.(item.id)} className={`block text-left text-[13.5px] font-semibold text-[#071E38] ${onViewProduct ? "cursor-pointer hover:underline" : "cursor-default"}`}>
                          {item.name}
                        </button>
                        <div className="text-[11px] text-[#5B6470]">{item.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className={TD}>{item.category}</td>
                  {showTypeColumn && <td className={TD}>
                      <span className="whitespace-nowrap rounded-full bg-[#FBFAF7] px-2.5 py-1 text-[11px] font-bold text-[#5B6470]">
                        {item.product_type === 'pre_made' ? 'Pre-made' : item.product_type === 'finished' ? 'External' : 'Made to Order'}
                      </span>
                    </td>}
                  <td className={TD}>{item.price}</td>
                  <td className={TD}>{item.discount ?? "0%"}</td>

                  {!hideStockColumn && <td className={TD}>
                      <div className="flex items-center gap-2.5">
                        {onAddStock ? <>
                            <span className="min-w-[26px] font-semibold">{item.stock}</span>
                            <button type="button" onClick={() => onAddStock(item)} disabled={updatingStockId === item.id} className="inline-flex items-center gap-1 rounded-[7px] bg-[#071E38] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#0F9B8E] disabled:opacity-60">
                              {updatingStockId === item.id ? <FaSpinner size={10} style={{
                        animation: "stockButtonSpin 0.8s linear infinite"
                      }} /> : null}
                              {item.product_type === 'finished' ? t("buttons.order", "Order") : t("buttons.add_stock", "Add Stock")}
                            </button>
                          </> : <>
                            <button type="button" onClick={() => onDecreaseStock?.(item.id)} disabled={updatingStockId === item.id} className="flex h-6 w-6 items-center justify-center rounded-md border-[1.5px] border-[#E7E3D8] bg-white text-[#5B6470] disabled:opacity-60">
                              {updatingStockId === item.id ? <FaSpinner size={10} style={{
                        animation: "stockButtonSpin 0.8s linear infinite"
                      }} /> : <FaMinus size={9} />}
                            </button>
                            <span className="w-[26px] text-center">{item.stock}</span>
                            <button type="button" onClick={() => onIncreaseStock?.(item.id)} disabled={updatingStockId === item.id} className="flex h-6 w-6 items-center justify-center rounded-md border-[1.5px] border-[#E7E3D8] bg-white text-[#5B6470] disabled:opacity-60">
                              {updatingStockId === item.id ? <FaSpinner size={10} style={{
                        animation: "stockButtonSpin 0.8s linear infinite"
                      }} /> : <FaPlus size={9} />}
                            </button>
                          </>}
                      </div>
                    </td>}

                  {!hideStatusColumn && <td className={TD}>
                      <StatusBadge item={item} onFetchIngredients={onFetchIngredients} />
                    </td>}

                  {shouldShowActions && <td className={TD}>
                      <div className="flex items-center justify-end gap-2">
                        {onEditProduct && <button type="button" onClick={() => onEditProduct?.(item.id)} title="Edit product" className="flex h-8 w-8 items-center justify-center rounded-[7px] border-[1.5px] border-[#E7E3D8] bg-white text-[#071E38] hover:border-[#0F9B8E] hover:text-[#0F9B8E]">
                            <FaEdit size={12} />
                          </button>}
                        {onDeleteProduct && <button type="button" onClick={() => onDeleteProduct?.(item.id)} title="Delete product" className="flex h-8 w-8 items-center justify-center rounded-[7px] border-[1.5px] border-[#E0654F]/30 bg-white text-[#E0654F] transition-colors hover:bg-[#E0654F] hover:text-white">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                          </button>}
                      </div>
                    </td>}
                </tr>)}
            </tbody>
          </table>
        </div>

        {/* Footer: count bottom-left, pagination bottom-right when needed */}
        {(totalItems > 0 || totalPages > 1) && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E3D8] px-[22px] py-4 text-[13px] text-[#5B6470]">
            {totalItems > 0 && <div>{t("branch_admin.showing", "Showing")} {pageStart} {t("branch_admin.to", "to")} {pageEnd} {t("branch_admin.of", "of")} {totalItems} {t("branch_admin.products", "products")}</div>}

            {totalPages > 1 && <div className="flex items-center gap-2">
                <button type="button" onClick={() => onPageChange?.(currentPage - 1)} disabled={!canGoPrevious} className={pagerBtn}>{t("branch_admin.previous", "Previous")}</button>
                {showPageNumbers && Array.from({
            length: totalPages
          }, (_, index) => {
            const page = index + 1;
            const isActive = page === currentPage;
            return <button key={page} type="button" onClick={() => onPageChange?.(page)} className={`h-8 w-8 rounded-lg text-[13px] font-semibold ${isActive ? "bg-[#071E38] text-white" : "border-[1.5px] border-[#E7E3D8] bg-white text-[#071E38]"}`}>
                        {page}
                      </button>;
          })}
                <button type="button" onClick={() => onPageChange?.(currentPage + 1)} disabled={!canGoNext} className={pagerBtn}>{t("branch_admin.next", "Next")}</button>
              </div>}
          </div>}
      </div>
    </>;
};
export default ProductItemsTable;
