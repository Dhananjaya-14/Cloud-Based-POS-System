import React, { useState } from "react";

const ReceiveOrderModal = ({ order, onClose, onConfirm, isProcessing = false }) => {
  // State maps item index to { waste_qty, waste_reason, return_qty, return_reason }
  const [adjustments, setAdjustments] = useState(
    order.items.reduce((acc, item, idx) => {
      acc[idx] = {
        waste_qty: "", waste_reason: "", return_qty: "", return_reason: "",
        unit_price: item.unit_price ?? "",
      };
      return acc;
    }, {})
  );

  const [paymentMethod, setPaymentMethod] = useState("cash");

  const handleChange = (idx, field, value) => {
    setAdjustments((prev) => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value },
    }));
  };

  const getNumbers = (idx, item) => {
    const gross = Number(item.qty) || 0;
    const wasteQty = Number(adjustments[idx].waste_qty) || 0;
    const returnQty = Number(adjustments[idx].return_qty) || 0;
    const netQty = gross - wasteQty - returnQty;
    return { gross, wasteQty, returnQty, netQty };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isProcessing) return;

    const itemsPayload = [];

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const { gross, wasteQty, returnQty, netQty } = getNumbers(i, item);
      const itemName = item.rm_name || item.pro_name;
      const unitPrice = parseFloat(adjustments[i].unit_price);

      if (wasteQty + returnQty > gross) {
        alert(`Waste + Return for ${itemName} cannot exceed ordered quantity.`);
        return;
      }
      if (netQty < 0) {
        alert(`Invalid quantities for ${itemName}.`);
        return;
      }
      if (isNaN(unitPrice) || unitPrice <= 0) {
        alert(`Please enter the unit price for ${itemName}.`);
        return;
      }

      itemsPayload.push({
        rm_id: item.rm_id || undefined,
        pro_id: item.pro_id || undefined,
        waste_qty: wasteQty || undefined,
        waste_reason: wasteQty > 0 ? (adjustments[i].waste_reason || undefined) : undefined,
        return_qty: returnQty || undefined,
        return_reason: returnQty > 0 ? (adjustments[i].return_reason || undefined) : undefined,
        unit_price: unitPrice,
      });
    }

    onConfirm(itemsPayload, paymentMethod);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "640px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
        <h2 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", color: "#111827" }}>Receive Order #{order.po_id}</h2>

        <form onSubmit={handleSubmit}>
          {order.items.map((item, idx) => {
            const { gross, wasteQty, returnQty, netQty } = getNumbers(idx, item);
            const unit = item.unit || item.rm_unit || (item.pro_id ? "pcs" : "");
            const itemName = item.rm_name || item.pro_name;

            return (
              <div key={idx} style={{ marginBottom: "20px", padding: "16px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                  <strong style={{ fontSize: "16px", color: "#374151" }}>{itemName}</strong>
                  <span style={{ color: "#6B7280" }}>Ordered: {gross} {unit}</span>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                    Unit Price ({unit}) — enter the price confirmed by the supplier
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 850.00"
                    value={adjustments[idx].unit_price}
                    onChange={(e) => handleChange(idx, "unit_price", e.target.value)}
                    style={{ width: "160px", padding: "8px 10px", border: "1px solid #D1D5DB", borderRadius: "6px" }}
                    required
                  />
                </div>

                {/* Waste — staff-caused loss */}
                <div style={{ marginBottom: "12px", padding: "10px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "6px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                    Waste Qty (staff mistake / breakage)
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={adjustments[idx].waste_qty}
                      onChange={(e) => handleChange(idx, "waste_qty", e.target.value)}
                      style={{ width: "100px", padding: "8px 10px", border: "1px solid #D1D5DB", borderRadius: "6px" }}
                    />
                    <input
                      type="text"
                      placeholder="Waste reason (e.g. dropped by waiter)"
                      value={adjustments[idx].waste_reason}
                      onChange={(e) => handleChange(idx, "waste_reason", e.target.value)}
                      style={{ flex: 1, padding: "8px 10px", border: "1px solid #D1D5DB", borderRadius: "6px" }}
                    />
                  </div>
                </div>

                {/* Return — supplier-caused */}
                <div style={{ marginBottom: "12px", padding: "10px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "6px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                    Return Qty (damaged/wrong from supplier)
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={adjustments[idx].return_qty}
                      onChange={(e) => handleChange(idx, "return_qty", e.target.value)}
                      style={{ width: "100px", padding: "8px 10px", border: "1px solid #D1D5DB", borderRadius: "6px" }}
                    />
                    <input
                      type="text"
                      placeholder="Return reason (e.g. cracked bottles)"
                      value={adjustments[idx].return_reason}
                      onChange={(e) => handleChange(idx, "return_reason", e.target.value)}
                      style={{ flex: 1, padding: "8px 10px", border: "1px solid #D1D5DB", borderRadius: "6px" }}
                    />
                  </div>
                </div>

                <div style={{ paddingTop: "10px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ color: "#374151", fontSize: "13px", fontWeight: "500" }}>Waste: {wasteQty.toFixed(2)} {unit}</span>
                  <span style={{ color: "#374151", fontSize: "13px", fontWeight: "500" }}>Return: {returnQty.toFixed(2)} {unit}</span>
                  <span style={{ color: "#374151", fontSize: "13px", fontWeight: "600" }}>Net to Stock: {netQty.toFixed(2)} {unit}</span>
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "2px dashed #E5E7EB" }}>
            <h3 style={{ marginTop: 0, marginBottom: "12px", fontSize: "16px", color: "#374151" }}>Payment Details</h3>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#4B5563" }}>
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "14px", color: "#111827", backgroundColor: "#fff", outline: "none" }}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
            
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              style={{ padding: "10px 16px", border: "1px solid #D1D5DB", background: "#fff", borderRadius: "6px", cursor: isProcessing ? "not-allowed" : "pointer", fontWeight: "500", color: "#374151", opacity: isProcessing ? 0.6 : 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              style={{ padding: "10px 16px", border: "none", background: "#3A4DBF", color: "#fff", borderRadius: "6px", cursor: isProcessing ? "not-allowed" : "pointer", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px", opacity: isProcessing ? 0.8 : 1 }}
            >
              {isProcessing && (
                <span style={{
                  width: "14px", height: "14px",
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  display: "inline-block", animation: "spin 0.7s linear infinite",
                }} />
              )}
              {isProcessing ? "Processing..." : "Confirm Received"}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>
    </div>
  );
};

export default ReceiveOrderModal;