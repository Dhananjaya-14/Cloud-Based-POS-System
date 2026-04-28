import React from "react";
import { FaEdit, FaMinus, FaPlus, FaSpinner, FaTrashAlt } from "react-icons/fa";

const statusStyles = {
  "In stock": { background: "#D7F4DF", color: "#2C9B52" },
  "Low stock": { background: "#FFE8BE", color: "#C98918" },
  "Out of stock": { background: "#FFD8D8", color: "#D04444" },
};

const ProductItemsTable = ({
  products = [],
  onDecreaseStock,
  onIncreaseStock,
  updatingStockId = null,
  onViewProduct,
  onEditProduct,
  onDeleteProduct,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageStart = 0,
  pageEnd = 0,
  onPageChange,
}) => {
  const showPageNumbers = totalPages <= 4;
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

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
              {[
                "IMAGE",
                "PRODUCT NAME",
                "CATEGORY",
                "PRICE",
                "DISCOUNT",
                "STOCK QUANTITY",
                "STATUS",
                "ACTION",
              ].map((head) => (
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
                <td style={{ padding: "10px 14px", fontSize: "28px" }}>{item.image}</td>
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
                <td style={{ padding: "10px 14px", color: "#6B7280", fontSize: "14px" }}>{item.price}</td>
                <td style={{ padding: "10px 14px", color: "#6B7280", fontSize: "14px" }}>{item.discount}</td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#111827" }}>
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
                  </div>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span
                    style={{
                      ...(statusStyles[item.status] || { background: "#E5E7EB", color: "#374151" }),
                      borderRadius: "18px",
                      padding: "5px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      display: "inline-block",
                    }}
                  >
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                  </div>
                </td>
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
