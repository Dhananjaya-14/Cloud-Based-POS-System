import React, { useState, useEffect } from "react";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import { getSuppliers } from "../../services/api";


const SupplierDetailView = ({ supplier, onBack }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showWastageModal, setShowWastageModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [wastageData, setWastageData] = useState({});
  const [modalStep, setModalStep] = useState("wastage"); // "wastage" or "payment"

  if (!supplier) {
    return <div className="p-5">Loading supplier details...</div>;
  }

  const fetchOrderData = async () => {
    if (!supplier?.sup_id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const poRes = await fetch(`/api/purchase-orders/supplier/${supplier.sup_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const poList = poRes.ok ? await poRes.json() : [];
      const actualPOList = Array.isArray(poList) ? poList : (poList?.data || []);

      const payRes = await fetch(`/api/supplier-payments/supplier/${supplier.sup_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payData = payRes.ok ? await payRes.json() : [];
      const payments = Array.isArray(payData) ? payData : (payData?.data || []);

      const mergedData = await Promise.all(
        actualPOList.map(async (po) => {
          const itemRes = await fetch(`/api/purchase-items/order/${po.po_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const itemData = itemRes.ok ? await itemRes.json() : [];
          return {
            ...po,
            items: Array.isArray(itemData) ? itemData : (itemData?.data || []),
            payment: payments.find((p) => p.po_id === po.po_id) || null,
          };
        })
      );
      setOrders(mergedData);
    } catch (err) {
      console.error("Error loading order history:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
  }, [supplier?.sup_id]);

  const openWastageModal = (order) => {
    setActiveOrder(order);
    setPaymentMethod("cash");
    
    // Initialize wastage data for all items
    const initialWastage = {};
    (order.items || []).forEach(item => {
      initialWastage[item.rm_id] = {
        wastage_type: "none",
        wastage_value: 0,
        selected_unit: item.unit || item.rm_unit,
        reason: ""
      };
    });
    setWastageData(initialWastage);
    setModalStep("wastage");
    setShowWastageModal(true);
  };

  const handleWastageChange = (rm_id, field, value) => {
    setWastageData(prev => ({
      ...prev,
      [rm_id]: {
        ...prev[rm_id],
        [field]: value
      }
    }));
  };

  const getAvailableUnits = (baseUnit) => {
    const lower = String(baseUnit || "").toLowerCase();
    if (lower === "kg" || lower === "g") return ["kg", "g"];
    if (lower === "l" || lower === "ml") return ["l", "ml"];
    return [baseUnit];
  };

  const calculateFinalQty = (qty, inputUnit, baseUnit) => {
    let finalQty = Number(qty) || 0;
    if (!inputUnit || !baseUnit) return finalQty;
    const from = String(inputUnit).toLowerCase();
    const to = String(baseUnit).toLowerCase();
    
    if (from === "g" && to === "kg") finalQty /= 1000;
    else if (from === "kg" && to === "g") finalQty *= 1000;
    else if (from === "ml" && to === "l") finalQty /= 1000;
    else if (from === "l" && to === "ml") finalQty *= 1000;
    
    return finalQty;
  };

  const calculateWasteQty = (rm_id, orderedQty, baseUnit) => {
    const data = wastageData[rm_id];
    if (!data || data.wastage_type === "none") return 0;
    
    if (data.wastage_type === "percentage") {
      const waste = (Number(orderedQty) * (Number(data.wastage_value) || 0)) / 100;
      return Math.round(waste * 1000) / 1000; // max 3 decimals
    }
    if (data.wastage_type === "fixed") {
      return calculateFinalQty(data.wastage_value, data.selected_unit, baseUnit);
    }
    return 0;
  };

  const handleConfirmReception = async () => {
    if (!activeOrder) return;
    setProcessingId(activeOrder.po_id);
    setShowWastageModal(false);

    try {
      const token = localStorage.getItem("token");
      
      // Format wastage array for backend
      const wastagePayload = Object.entries(wastageData).map(([rm_id, data]) => {
        const item = activeOrder.items.find(i => String(i.rm_id) === String(rm_id));
        let finalWaste = Number(data.wastage_value) || 0;
        
        if (data.wastage_type === "fixed" && item) {
          finalWaste = calculateFinalQty(data.wastage_value, data.selected_unit, item.unit || item.rm_unit);
        }

        return {
          rm_id: Number(rm_id),
          wastage_type: data.wastage_type,
          wastage_value: finalWaste,
          reason: data.reason || ""
        };
      });

      const receiveRes = await fetch(`/api/purchase-orders/${activeOrder.po_id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          wastage: wastagePayload,
          reason: "" 
        }),
      });
      
      if (!receiveRes.ok) {
         const errorData = await receiveRes.json();
         throw new Error(errorData.message || "Failed to mark order as received");
      }

      await fetch(`/api/supplier-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          po_id: activeOrder.po_id,
          sup_id: supplier.sup_id,
          method: paymentMethod,
          amount: activeOrder.total_amount,
        }),
      });
      await fetchOrderData();
    } catch (err) {
      console.error("Error processing order reception:", err);
      alert(err.message);
    } finally {
      setProcessingId(null);
      setActiveOrder(null);
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="bg-transparent border-none text-gray-500 text-sm cursor-pointer flex items-center gap-1.5 mb-5 p-0 hover:text-gray-700 transition-colors"
      >
        ← Back to Directory
      </button>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 mb-7 shadow-sm">
        <h2 className="m-0 mb-3 text-gray-900 text-2xl font-bold">{supplier.sup_name}</h2>
        <div className="flex flex-wrap gap-6 text-gray-500 text-sm">
          <span>📧 {supplier.sup_email}</span>
          <span>📞 {supplier.sup_contact}</span>
          <span>📍 {supplier.sup_address}</span>
        </div>
      </div>

      <h3 className="mb-5 text-gray-900 text-lg font-bold">Purchase History</h3>

      {loading ? (
        <p className="text-gray-500">Loading transaction history...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">No purchase orders found for this supplier.</p>
      ) : (
        orders.map((order) => (
          <div key={order.po_id} className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-900">Order #{order.po_id}</span>
                <span className="ml-3 text-[13px] text-gray-500">
                  {order.order_date ? new Date(order.order_date).toLocaleDateString() : "—"}
                </span>
              </div>
              <div>
                {order.status === "pending" ? (
                  <button
                    onClick={() => openWastageModal(order)}
                    disabled={processingId === order.po_id}
                    className="px-4 py-2 bg-indigo-600 text-white border-none rounded-lg font-semibold cursor-pointer hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingId === order.po_id ? "Processing..." : "Mark as Received"}
                  </button>
                ) : (
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                      RECEIVED
                    </span>
                    {order.payment && (
                      <div className="text-[11px] text-gray-500 mt-1.5">
                        Paid via <span className="capitalize font-semibold text-gray-700">{order.payment?.method}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200 bg-white">
                  <th className="px-6 py-3 font-semibold">Ingredient</th>
                  <th className="px-6 py-3 font-semibold">Quantity</th>
                  <th className="px-6 py-3 font-semibold">Unit Price</th>
                  <th className="px-6 py-3 font-semibold">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{item.item_name || item.rm_name || item.pro_name}</td>
                    <td className="px-6 py-3 text-gray-600">{item.qty} {item.unit || item.rm_unit}</td>
                    <td className="px-6 py-3 text-gray-600">Rs. {item.unit_price}</td>
                    <td className="px-6 py-3 text-gray-900 font-bold">Rs. {item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Wastage and Payment modal */}
      {showWastageModal && activeOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 w-[600px] max-w-full shadow-2xl my-auto">
            <h3 className="m-0 mb-2 text-gray-900 text-xl font-bold">
              {modalStep === "wastage" ? "Record Wastage" : "Confirm Reception"}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {modalStep === "wastage" 
                ? `Record any wastage for Order #${activeOrder.po_id} before receiving to stock.`
                : `Confirm receipt of Order #${activeOrder.po_id} and record payment.`}
            </p>
            
            {modalStep === "wastage" ? (
              <div className="max-h-[60vh] overflow-y-auto pr-2 mb-6">
                {(activeOrder.items || []).map((item, idx) => {
                  const wasteQty = calculateWasteQty(item.rm_id, item.qty, item.unit || item.rm_unit);
                  const netStock = Math.max(0, item.qty - wasteQty);
                  const isExceeding = wasteQty > item.qty;
                  
                  return (
                    <div key={idx} className="mb-6 p-4 border border-gray-200 rounded-xl bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="m-0 font-bold text-gray-800">{item.item_name || item.rm_name || item.pro_name}</h4>
                        <span className="text-sm font-semibold text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200">
                          Ordered: {item.qty} {item.unit || item.rm_unit}
                        </span>
                      </div>
                      
                      <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name={`waste_${item.rm_id}`} 
                            checked={wastageData[item.rm_id]?.wastage_type === "none"}
                            onChange={() => {
                              handleWastageChange(item.rm_id, "wastage_type", "none");
                              handleWastageChange(item.rm_id, "wastage_value", 0);
                            }}
                          />
                          No wastage
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name={`waste_${item.rm_id}`} 
                            checked={wastageData[item.rm_id]?.wastage_type === "percentage"}
                            onChange={() => handleWastageChange(item.rm_id, "wastage_type", "percentage")}
                          />
                          Percentage
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name={`waste_${item.rm_id}`} 
                            checked={wastageData[item.rm_id]?.wastage_type === "fixed"}
                            onChange={() => handleWastageChange(item.rm_id, "wastage_type", "fixed")}
                          />
                          Fixed quantity
                        </label>
                      </div>

                      {wastageData[item.rm_id]?.wastage_type !== "none" && (
                        <div className="mb-3 space-y-3">
                          <div>
                            <label className="block text-[12px] font-semibold text-gray-600 mb-1">
                              {wastageData[item.rm_id]?.wastage_type === "percentage" ? "Waste Percentage (%)" : `Waste Quantity`}
                            </label>
                            <div className="flex gap-2">
                              <input 
                                type="number"
                                min="0"
                                step="0.01"
                                value={wastageData[item.rm_id]?.wastage_value === 0 ? "" : wastageData[item.rm_id]?.wastage_value}
                                onChange={(e) => handleWastageChange(item.rm_id, "wastage_value", e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border-2 text-sm outline-none transition-colors ${isExceeding ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'}`}
                                placeholder="Enter amount"
                              />
                              {wastageData[item.rm_id]?.wastage_type === "fixed" && (
                                <select
                                  value={wastageData[item.rm_id]?.selected_unit || item.unit || item.rm_unit}
                                  onChange={(e) => handleWastageChange(item.rm_id, "selected_unit", e.target.value)}
                                  className="w-[90px] px-2 py-2 rounded-lg border-2 border-gray-300 text-sm outline-none focus:border-indigo-500 transition-colors bg-gray-50"
                                >
                                  {getAvailableUnits(item.unit || item.rm_unit).map(u => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[12px] font-semibold text-gray-600 mb-1">
                              Reason
                            </label>
                            <input 
                              type="text"
                              value={wastageData[item.rm_id]?.reason || ""}
                              onChange={(e) => handleWastageChange(item.rm_id, "reason", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border-2 text-sm outline-none transition-colors border-gray-300 focus:border-indigo-500"
                              placeholder="e.g. Spoiled, Damaged, Expired"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                        <span className="text-sm font-semibold text-gray-600">Net to stock:</span>
                        <span className={`font-bold ${isExceeding ? 'text-red-500' : 'text-indigo-600'}`}>
                          {netStock} {item.unit || item.rm_unit}
                        </span>
                      </div>
                      {isExceeding && (
                        <p className="text-xs text-red-500 mt-1 mb-0">Waste cannot exceed ordered quantity.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border-2 border-gray-300 text-sm outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            )}
            
            <div className="flex gap-3">
              {modalStep === "wastage" ? (
                <>
                  <button 
                    onClick={() => { setShowWastageModal(false); setActiveOrder(null); }} 
                    className="flex-1 py-2.5 rounded-lg border-2 border-gray-300 bg-white font-semibold cursor-pointer text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      // Check for validation errors before proceeding
                      const hasError = (activeOrder.items || []).some(item => {
                        return calculateWasteQty(item.rm_id, item.qty, item.unit || item.rm_unit) > item.qty;
                      });
                      if (hasError) {
                        alert("Please fix wastage errors (waste cannot exceed ordered quantity) before proceeding.");
                        return;
                      }
                      setModalStep("payment");
                    }} 
                    className="flex-1 py-2.5 rounded-lg border-none bg-indigo-600 text-white font-semibold cursor-pointer hover:bg-indigo-700 transition-colors"
                  >
                    Next →
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setModalStep("wastage")} 
                    className="flex-1 py-2.5 rounded-lg border-2 border-gray-300 bg-white font-semibold cursor-pointer text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ← Back
                  </button>
                  <button 
                    onClick={handleConfirmReception} 
                    className="flex-1 py-2.5 rounded-lg border-none bg-indigo-600 text-white font-semibold cursor-pointer hover:bg-indigo-700 transition-colors"
                  >
                    Confirm Received
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Branch Admin Supplier Page (Read-Only) ──────────────────────────────
const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <Header title="Suppliers" role="Branch Admin" />
        
        <div className="p-8 max-w-[1200px] mx-auto">
          {selectedSupplier ? (
            <SupplierDetailView supplier={selectedSupplier} onBack={() => setSelectedSupplier(null)} />
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 m-0">Supplier Directory</h1>
                <p className="text-gray-500 mt-1.5 text-sm">
                  Suppliers assigned to your branch. Contact your Company Admin to add new suppliers.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-red-600 mb-5 font-medium">
                  {error}
                </div>
              )}

              {isLoading ? (
                <p className="text-gray-500">Loading suppliers...</p>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <div className="text-5xl mb-3">🏢</div>
                  <p className="font-semibold text-base mb-1">No suppliers assigned to this branch</p>
                  <p className="text-sm">Ask your Company Admin to add suppliers to this branch.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {suppliers.map((sup) => (
                    <div
                      key={sup.sup_id}
                      onClick={() => setSelectedSupplier(sup)}
                      className="bg-white p-6 rounded-2xl border border-gray-200 cursor-pointer shadow-sm hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-200 flex items-center justify-center text-xl">
                          🏢
                        </div>
                        <h3 className="m-0 text-base font-bold text-gray-900">{sup.sup_name}</h3>
                      </div>
                      
                      <div className="text-sm text-gray-600 flex flex-col gap-2">
                        <div className="flex gap-2">📧 <span className="truncate">{sup.sup_email}</span></div>
                        <div className="flex gap-2">📞 <span>{sup.sup_contact}</span></div>
                        <div className="flex gap-2">📍 <span className="text-xs mt-0.5">{sup.sup_address || "No address provided"}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierManagement;
