import React, { useState } from "react";

const ReceiveOrderModal = ({ order, onClose, onConfirm }) => {
  // State maps item index to its wastage settings
  const [wastages, setWastages] = useState(
    order.items.reduce((acc, item, idx) => {
      acc[idx] = { type: "none", value: "" };
      return acc;
    }, {})
  );

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reason, setReason] = useState("");

  const handleWastageChange = (idx, field, value) => {
    setWastages((prev) => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value,
      },
    }));
  };

  const calculateWasteQty = (item, wastage) => {
    const gross = Number(item.qty) || 0;
    if (wastage.type === "none") return 0;
    if (wastage.type === "percentage") {
      const pct = Number(wastage.value) || 0;
      return (gross * pct) / 100;
    }
    if (wastage.type === "fixed") {
      return Number(wastage.value) || 0;
    }
    return 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const wastagePayload = [];

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const w = wastages[i];
      const grossQty = Number(item.qty) || 0;
      const wasteQty = calculateWasteQty(item, w);

      if (item.rm_id) {
        if (wasteQty > grossQty) {
          alert(`Wastage for ${item.rm_name} cannot exceed ordered quantity.`);
          return;
        }

        if (wasteQty > 0) {
          wastagePayload.push({
            rm_id: item.rm_id,
            waste_qty: wasteQty,
            wastage_type: w.type,
            wastage_value: Number(w.value) || 0,
          });
        }
      }
    }

    onConfirm(wastagePayload, paymentMethod, reason);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
        <h2 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", color: "#111827" }}>Receive Order #{order.po_id}</h2>

        <form onSubmit={handleSubmit}>
          {order.items.map((item, idx) => {
            const w = wastages[idx];
            const wasteQty = calculateWasteQty(item, w);
            const netQty = (Number(item.qty) || 0) - wasteQty;

            return (
              <div key={idx} style={{ marginBottom: "24px", padding: "16px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <strong style={{ fontSize: "16px", color: "#374151" }}>{item.rm_name || item.pro_name}</strong>
                  <span style={{ color: "#6B7280" }}>Ordered: {item.qty} {item.unit}</span>
                </div>

                {item.pro_id ? (
                  // External/pre-made products: no wastage tracking, full quantity always received
                  <div style={{ paddingTop: "4px", display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ color: "#10B981", fontSize: "14px", fontWeight: "600" }}>
                      Received: {item.qty} {item.unit}
                    </span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: "16px", marginBottom: "12px", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input type="radio" name={`wastageType-${idx}`} checked={w.type === "none"} onChange={() => handleWastageChange(idx, "type", "none")} />
                        None
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input type="radio" name={`wastageType-${idx}`} checked={w.type === "percentage"} onChange={() => handleWastageChange(idx, "type", "percentage")} />
                        Percentage (%)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input type="radio" name={`wastageType-${idx}`} checked={w.type === "fixed"} onChange={() => handleWastageChange(idx, "type", "fixed")} />
                        Fixed Quantity
                      </label>
                    </div>

                    {w.type !== "none" && (
                      <div style={{ marginBottom: "12px" }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder={w.type === "percentage" ? "Enter % (e.g. 10)" : "Enter amount"}
                          value={w.value}
                          onChange={(e) => handleWastageChange(idx, "value", e.target.value)}
                          style={{ padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: "6px", width: "100%", maxWidth: "200px" }}
                          required
                        />
                      </div>
                    )}

                    <div style={{ paddingTop: "12px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#EF4444", fontSize: "14px", fontWeight: "500" }}>Wastage: {wasteQty.toFixed(2)} {item.unit}</span>
                      <span style={{ color: "#10B981", fontSize: "14px", fontWeight: "600" }}>Net to Stock: {netQty.toFixed(2)} {item.unit}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {order.items.some((item) => item.rm_id) && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#4B5563" }}>
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Damaged in transit, spoiled during storage..."
                rows={2}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "14px", color: "#111827", outline: "none", resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          )}

          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "2px dashed #E5E7EB" }}>
            <h3 style={{ marginTop: 0, marginBottom: "12px", fontSize: "16px", color: "#374151" }}>Payment Details</h3>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#4B5563" }}>
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "14px", color: "#111827", backgroundColor: "#fff", outline: "none", transition: "border-color 0.15s ease-in-out" }}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 16px", border: "1px solid #D1D5DB", background: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "500", color: "#374151" }}>
              Cancel
            </button>
            <button type="submit" style={{ padding: "10px 16px", border: "none", background: "#3A4DBF", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>
              Confirm Received
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceiveOrderModal;
