import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import ToastMessage from "../../components/branch-admin/ToastMessage";
import { connectSocket, getSocket, SOCKET_EVENTS } from '../../services/socket';
import { useAuth } from "../../context/AuthContext";
import { getSuppliers } from "../../services/api";

const SupplierDetailView = ({ supplier, onBack }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");

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

  const openPaymentModal = (order) => {
    setActiveOrder(order);
    setPaymentMethod("cash");
    setShowPaymentModal(true);
  };

  const handleConfirmReception = async () => {
    if (!activeOrder) return;
    setProcessingId(activeOrder.po_id);
    setShowPaymentModal(false);

    try {
      const token = localStorage.getItem("token");
      const updateRes = await fetch(`/api/purchase-orders/${activeOrder.po_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "received" }),
      });
      if (!updateRes.ok) throw new Error("Failed to update order status");

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
                    onClick={() => openPaymentModal(order)}
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
                    <td className="px-6 py-3 font-medium text-gray-900">{item.rm_name}</td>
                    <td className="px-6 py-3 text-gray-600">{item.qty} {item.unit}</td>
                    <td className="px-6 py-3 text-gray-600">Rs. {item.unit_price}</td>
                    <td className="px-6 py-3 text-gray-900 font-bold">Rs. {item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Payment modal */}
      {showPaymentModal && activeOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-[420px] max-w-full shadow-2xl">
            <h3 className="m-0 mb-2 text-gray-900 text-xl font-bold">Confirm Reception</h3>
            <p className="text-gray-500 text-sm mb-6">
              Confirm receipt of Order #{activeOrder.po_id} and record payment.
            </p>
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
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowPaymentModal(false); setActiveOrder(null); }} 
                className="flex-1 py-2.5 rounded-lg border-2 border-gray-300 bg-white font-semibold cursor-pointer text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmReception} 
                className="flex-1 py-2.5 rounded-lg border-none bg-indigo-600 text-white font-semibold cursor-pointer hover:bg-indigo-700 transition-colors"
              >
                Confirm
              </button>
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
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Combine both approaches - try API service first, fallback to direct fetch
      try {
        const data = await getSuppliers();
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (apiError) {
        console.warn("API service failed, trying direct fetch:", apiError);
        // Fallback to direct fetch
        const token = localStorage.getItem("token");
        const res = await fetch("/api/suppliers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch suppliers (${res.status})`);
        const data = await res.json();
        const suppliersList = Array.isArray(data) ? data : data.suppliers || [];
        setSuppliers(suppliersList);
        localStorage.setItem('cached_suppliers', JSON.stringify(suppliersList));
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  // Initialize socket and listen for supplier events
  useEffect(() => {
    const companyId = user?.com_id;
    if (!companyId) return;

    // Connect to socket
    const socket = connectSocket();
    
    const handleConnect = () => {
      console.log('Socket connected in SupplierManagement');
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected in SupplierManagement');
      setSocketConnected(false);
    };

    // Listen for new supplier creation
    const handleSupplierCreated = (newSupplier) => {
      console.log('New supplier received via socket:', newSupplier);
      setSuppliers(prevSuppliers => {
        // Check if supplier already exists (prevent duplicates)
        const exists = prevSuppliers.some(s => 
          s.sup_id === newSupplier.sup_id || 
          s.sup_email?.toLowerCase() === newSupplier.sup_email?.toLowerCase()
        );
        if (exists) {
          console.log('Supplier already exists, skipping addition');
          return prevSuppliers;
        }
        // Add new supplier to the list
        const updated = [newSupplier, ...prevSuppliers];
        localStorage.setItem('cached_suppliers', JSON.stringify(updated));
        showToast(`New supplier "${newSupplier.sup_name}" added!`, "success");
        return updated;
      });
    };

    // Listen for supplier updates
    const handleSupplierUpdated = (updatedSupplier) => {
      console.log('Supplier updated via socket:', updatedSupplier);
      setSuppliers(prevSuppliers => {
        const updated = prevSuppliers.map(s => 
          s.sup_id === updatedSupplier.sup_id ? { ...s, ...updatedSupplier } : s
        );
        localStorage.setItem('cached_suppliers', JSON.stringify(updated));
        showToast(`Supplier "${updatedSupplier.sup_name}" updated`, "info");
        return updated;
      });
    };

    // Listen for supplier deletion
    const handleSupplierDeleted = (data) => {
      console.log('Supplier deleted via socket:', data);
      setSuppliers(prevSuppliers => {
        const deletedSupplier = prevSuppliers.find(s => s.sup_id === data.sup_id);
        const updated = prevSuppliers.filter(s => s.sup_id !== data.sup_id);
        localStorage.setItem('cached_suppliers', JSON.stringify(updated));
        if (deletedSupplier) {
          showToast(`Supplier "${deletedSupplier.sup_name}" deleted`, "info");
        }
        // If the deleted supplier was selected, clear selection
        if (selectedSupplier?.sup_id === data.sup_id) {
          setSelectedSupplier(null);
        }
        return updated;
      });
    };

    // Set up socket event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('supplier:created', handleSupplierCreated);
    socket.on('supplier:updated', handleSupplierUpdated);
    socket.on('supplier:deleted', handleSupplierDeleted);

    // If socket is already connected, call handleConnect
    if (socket.connected) {
      handleConnect();
    }

    // Initial fetch
    fetchSuppliers();

    // Cleanup on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('supplier:created', handleSupplierCreated);
      socket.off('supplier:updated', handleSupplierUpdated);
      socket.off('supplier:deleted', handleSupplierDeleted);
    };
  }, [user?.com_id]);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <Header title="Suppliers" role="Branch Admin" />
        {toast.show && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}
        
        {/* Socket connection indicator */}
        {socketConnected && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs shadow-lg z-50">
            Live Updates Active
          </div>
        )}
        
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