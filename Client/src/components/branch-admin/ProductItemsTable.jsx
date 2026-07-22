import React, { useEffect, useRef, useState } from "react";
import { FaEdit, FaMinus, FaPlus, FaSpinner, FaTrashAlt } from "react-icons/fa";

const statusStyles = {
  "In stock": { background: "#D7F4DF", color: "#2C9B52" },
  "Low stock": { background: "#FFE8BE", color: "#C98918" },
  "Out of stock": { background: "#FFD8D8", color: "#D04444" },
};
const statusIcon = (s) => s === "out" ? "❌" : s === "low" ? "⚠️" : "✅";
const statusLabel = (s) => s === "out" ? "Out of stock" : s === "low" ? "Low stock" : "OK";
const ingredientRowColor = (s) => s === "out" ? "#FFF0F0" : s === "low" ? "#FFFBF0" : "#F6FFF8";

const IngredientPopover = ({ productId, productName, onFetch, onClose, anchorRef }) => {
  const popoverRef = useRef(null);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState({ top: 0, left: 0 });
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
      setPosition({ top, left });
    }
  }, [anchorRef]);
  

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await onFetch(productId);
        if (!cancelled) setIngredients(data?.ingredients ?? []);
      } catch { if (!cancelled) setError("Failed to load ingredients"); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [productId, onFetch]);

  useEffect(() => {
    const handler = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        anchorRef.current  && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 200);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose, anchorRef]);

  return (
    <div ref={popoverRef} style={{ position: "fixed", top: position.top, left: position.left, width: "320px", background: "#fff", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: "1px solid #E5E7EB", zIndex: 9999, overflow: "hidden" }}>
      <div style={{ background: "#FFF8EC", borderBottom: "1px solid #FFE4A0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#92400E" }}>⚠️ Ingredient Status</div>
          <div style={{ fontSize: "11px", color: "#B45309", marginTop: "2px" }}>{productName}</div>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: "16px", cursor: "pointer", color: "#9CA3AF" }}>×</button>
      </div>
      <div style={{ padding: "10px 0", maxHeight: "260px", overflowY: "auto" }}>
        {loading && <div style={{ padding: "20px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>Loading ingredients...</div>}
        {error   && <div style={{ padding: "12px 14px", color: "#D04444", fontSize: "13px" }}>{error}</div>}
        {!loading && !error && ingredients.length === 0 && <div style={{ padding: "12px 14px", color: "#9CA3AF", fontSize: "13px" }}>No recipe ingredients found.</div>}
        {!loading && !error && ingredients.map((ing) => (
          <div key={ing.rm_id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", background: ingredientRowColor(ing.status), borderBottom: "1px solid #F3F4F6" }}>
            <span style={{ fontSize: "14px", flexShrink: 0 }}>{statusIcon(ing.status)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ing.rm_name}</div>
              <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "1px" }}>Needed: {ing.required_qty} {ing.recipe_unit}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: ing.status === "out" ? "#D04444" : ing.status === "low" ? "#C98918" : "#2C9B52" }}>{ing.stock_qty} {ing.stock_unit}</div>
              <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "1px" }}>{statusLabel(ing.status)}</div>
            </div>
          </div>
        ))}
      </div>
      {!loading && !error && ingredients.length > 0 && (
        <div style={{ padding: "8px 14px", background: "#F9FAFB", borderTop: "1px solid #E5E7EB", fontSize: "11px", color: "#9CA3AF" }}>Sorted by most critical first</div>
      )}
    </div>
  );
};

const StatusBadge = ({ item, onFetchIngredients }) => {
  const [open, setOpen] = useState(false);
  const badgeRef = useRef(null);
  const isClickable = item.product_type === "made_to_order" && (item.status === "Low stock" || item.status === "Out of stock");

  if (!isClickable) {
    return (
      <span style={{ ...(statusStyles[item.status] || { background: "#E5E7EB", color: "#374151" }), borderRadius: "18px", padding: "5px 12px", fontSize: "12px", fontWeight: "600", display: "inline-block" }}>
        {item.status}
      </span>
    );
  }
   return (
    <>
      <button ref={badgeRef} type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => { if (!open) setOpen(true); }}
        style={{ ...(statusStyles[item.status] || {}), borderRadius: "18px", padding: "5px 12px", fontSize: "12px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px", border: "none", cursor: "pointer" }}
        title="Click to see ingredient details">
        {item.status} <span style={{ fontSize: "10px", opacity: 0.7 }}>▼</span>
      </button>
      {open && <IngredientPopover productId={item.id} productName={item.name} onFetch={onFetchIngredients} onClose={() => setOpen(false)} anchorRef={badgeRef} />}
    </>
  );
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
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageStart = 0,
  pageEnd = 0,
  onPageChange,
}) => {
  const shouldShowActions = showActions && (onViewProduct || onEditProduct || onDeleteProduct);
  const showPageNumbers = totalPages <= 4;
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const headers = [
    "IMAGE",
    "PRODUCT NAME",
    "CATEGORY",
    ...(showTypeColumn ? ["TYPE"] : []),
    "PRICE",
    "DISCOUNT",
    ...(hideStockColumn ? [] : ["STOCK QUANTITY"]),
    ...(hideStatusColumn ? [] : ["STATUS"]),
    ...(shouldShowActions ? ["ACTION"] : []),
  ];

  return (
    <>
      <style>
        {`@keyframes stockButtonSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
      </style>
      <div
        style={{
          background: "#fff",
          borderRadius: "10px",
          border: "1px solid #E5E7EB",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#F8FAFC" }}>
            <tr>
              {headers.map((head) => (
                <th
                  key={head}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    fontSize: "11px",
                    color: "#94A3B8",
                    fontWeight: "700",
                  }}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {products.map((item) => (
              <tr key={item.id} style={{ borderTop: "1px solid #EEF2F7" }}>
                <td style={{ padding: "10px 14px" }}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.imageAlt || "Product"}
                      style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "10px" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "12px", color: "#9CA3AF" }}>No image</span>
                  )}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <button
                    type="button"
                    onClick={() => onViewProduct?.(item.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      margin: 0,
                      display: "block",
                      textAlign: "left",
                      fontSize: "15px",
                      fontWeight: "600",
                      color: "#1F2937",
                      cursor: onViewProduct ? "pointer" : "default",
                    }}
                  >
                    {item.name}
                  </button>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "3px" }}>{item.sku}</div>
                </td>
                <td style={{ padding: "10px 14px", color: "#6B7280", fontSize: "14px" }}>{item.category}</td>
                {showTypeColumn && (
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      background: item.product_type === 'pre_made' ? '#E0F2FE' : 
                                 item.product_type === 'finished' ? '#FEF3C7' : '#F3F4F6',
                      color: item.product_type === 'pre_made' ? '#0369A1' :
                             item.product_type === 'finished' ? '#B45309' : '#374151',
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      whiteSpace: "nowrap"
                    }}>
                      {item.product_type === 'pre_made' ? 'Pre-made' : 
                       item.product_type === 'finished' ? 'External' : 'Made to Order'}
                    </span>
                  </td>
                )}
                <td style={{ padding: "10px 14px", color: "#6B7280", fontSize: "14px" }}>{item.price}</td>
                <td style={{ padding: "10px 14px", color: "#6B7280", fontSize: "14px" }}>{item.discount}</td>

                {!hideStockColumn && (
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#111827" }}>
                      {onAddStock ? (
                        <>
                          <span style={{ fontSize: "14px", fontWeight: "600", minWidth: "26px" }}>{item.stock}</span>
                          <button
                            type="button"
                            onClick={() => onAddStock(item)}
                            disabled={updatingStockId === item.id}
                            style={{
                              background: "#0E6DCF",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "4px 10px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              opacity: updatingStockId === item.id ? 0.6 : 1,
                            }}
                          >
                            {updatingStockId === item.id ? (
                               <FaSpinner size={10} style={{ animation: "stockButtonSpin 0.8s linear infinite" }} />
                            ) : null}
                               
                            Add Stock
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onDecreaseStock?.(item.id)}
                            disabled={updatingStockId === item.id}
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              border: "1px solid #D1D5DB",
                              background: "#fff",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                              lineHeight: 1,
                              opacity: updatingStockId === item.id ? 0.6 : 1,
                            }}
                          >
                            {updatingStockId === item.id ? (
                              <FaSpinner
                                size={10}
                                color="#6B7280"
                                style={{ display: "block", animation: "stockButtonSpin 0.8s linear infinite" }}
                              />
                            ) : (
                              <FaMinus size={10} color="#6B7280" style={{ display: "block" }} />
                            )}
                          </button>
                          <span style={{ width: "26px", textAlign: "center", fontSize: "14px" }}>{item.stock}</span>
                          <button
                            type="button"
                            onClick={() => onIncreaseStock?.(item.id)}
                            disabled={updatingStockId === item.id}
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              border: "1px solid #D1D5DB",
                              background: "#fff",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                              lineHeight: 1,
                              opacity: updatingStockId === item.id ? 0.6 : 1,
                            }}
                          >
                            {updatingStockId === item.id ? (
                              <FaSpinner
                                size={10}
                                color="#6B7280"
                                style={{ display: "block", animation: "stockButtonSpin 0.8s linear infinite" }}
                              />
                            ) : (
                              <FaPlus size={10} color="#6B7280" style={{ display: "block" }} />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}

                {!hideStatusColumn && (
                  <td style={{ padding: "10px 14px" }}>
                    <StatusBadge item={item} onFetchIngredients={onFetchIngredients} />
                  </td>
                )}


                {shouldShowActions && (
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {onEditProduct && (
                        <button
                          type="button"
                          onClick={() => onEditProduct?.(item.id)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "7px",
                            border: "none",
                            background: "#F1F3F6",
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                            padding: 0,
                          }}
                        >
                          <FaEdit color="#8A94A6" size={10} />
                        </button>
                      )}
                      {onDeleteProduct && (
                        <button
                          type="button"
                          onClick={() => onDeleteProduct?.(item.id)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "7px",
                            border: "none",
                            background: "#FFE7E7",
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                            padding: 0,
                          }}
                          title="Delete product"
                        >
                          <FaTrashAlt color="#FF6A6A" size={10} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#6B7280",
          fontSize: "14px",
        }}
      >
        <div>
          Showing {pageStart} to {pageEnd} of {totalItems} products
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={!canGoPrevious}
              style={{
                border: "none",
                background: "#fff",
                borderRadius: "10px",
                padding: "8px 16px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                cursor: canGoPrevious ? "pointer" : "not-allowed",
                color: "#374151",
                opacity: canGoPrevious ? 1 : 0.5,
              }}
            >
              Previous
            </button>
            {showPageNumbers &&
              Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1;
                const isActive = page === currentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => onPageChange?.(page)}
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      border: "none",
                      cursor: "pointer",
                      color: isActive ? "#fff" : "#374151",
                      background: isActive ? "#0E6DCF" : "#fff",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                      fontWeight: "600",
                    }}
                  >
                    {page}
                  </button>
                );
              })}
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={!canGoNext}
              style={{
                border: "none",
                background: "#fff",
                borderRadius: "10px",
                padding: "8px 16px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                cursor: canGoNext ? "pointer" : "not-allowed",
                color: "#374151",
                opacity: canGoNext ? 1 : 0.5,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductItemsTable;