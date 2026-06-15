import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import ToastMessage from "../../components/branch-admin/ToastMessage";
import { connectSocket, getSocket, SOCKET_EVENTS } from '../../services/socket';
import { useAuth } from "../../context/AuthContext";

// Detail view (kept inline)
const SupplierDetailView = ({ supplier, onBack }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // New states for the Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  if (!supplier) {
    return <div style={{ padding: "20px" }}>Loading supplier details...</div>;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier?.sup_id]);

  // UI trigger for the modal
  const openPaymentModal = (order) => {
    setActiveOrder(order);
    setPaymentMethod("cash");
    setShowPaymentModal(true);
  };

  // The actual logic (backend calls preserved)
  const handleConfirmReception = async () => {
    if (!activeOrder) return;

    setProcessingId(activeOrder.po_id);
    setShowPaymentModal(false); // Close modal immediately

    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/purchase-orders/${activeOrder.po_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "received" }),
      });

      const totalAmount = (activeOrder.items || []).reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
      await fetch(`/api/supplier-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sup_id: supplier.sup_id,
          po_id: activeOrder.po_id,
          amount: totalAmount,
          method: (paymentMethod || "cash").toLowerCase(),
          payment_date: new Date().toISOString(),
        }),
      });

      await fetchOrderData();
    } catch (err) {
      alert("Error: " + (err?.message || err));
    } finally {
      setProcessingId(null);
      setActiveOrder(null);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-in", position: "relative" }}>
      {/* PAYMENT MODAL UI */}
      {showPaymentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#101828" }}>Confirm Reception</h3>
            <p style={{ fontSize: "14px", color: "#667085", marginBottom: "20px" }}>
              Please select the payment method used for Order #{activeOrder?.po_id}.
            </p>

            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#344054" }}>
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #D0D5DD",
                marginBottom: "24px",
                fontSize: "16px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #D0D5DD", background: "#fff", fontWeight: "600", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReception}
                style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "#3A4DBF", color: "#fff", fontWeight: "600", cursor: "pointer" }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onBack}
        style={{
          marginBottom: "20px",
          background: "none",
          border: "none",
          color: "#3A4DBF",
          fontWeight: "600",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        ← Back to Directory
      </button>

      <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #E4E7EC", marginBottom: "30px" }}>
        <h2 style={{ margin: "0 0 12px 0", color: "#101828" }}>{supplier.sup_name}</h2>
        <div style={{ display: "flex", gap: "24px", color: "#667085", fontSize: "14px" }}>
          <span>📧 {supplier.sup_email}</span>
          <span>📞 {supplier.sup_contact}</span>
          <span>📍 {supplier.sup_address}</span>
        </div>
      </div>

      <h3 style={{ marginBottom: "20px", color: "#101828", fontSize: "18px" }}>Purchase History</h3>

      {loading ? (
        <p>Loading transaction history...</p>
      ) : (
        orders.map((order) => (
          <div key={order.po_id} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #EAECF0", marginBottom: "20px", overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", background: "#F9FAFB", borderBottom: "1px solid #EAECF0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: "700", color: "#101828" }}>Order #{order.po_id}</span>
                <span style={{ marginLeft: "12px", fontSize: "13px", color: "#667085" }}>
                  {order.order_date ? new Date(order.order_date).toLocaleDateString() : "—"}
                </span>
              </div>

              <div>
                {order.status === "pending" ? (
                  <button
                    onClick={() => openPaymentModal(order)}
                    disabled={processingId === order.po_id}
                    style={{ padding: "8px 16px", background: "#3A4DBF", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                  >
                    {processingId === order.po_id ? "Processing..." : "Mark as Received"}
                  </button>
                ) : (
                  <div style={{ textAlign: "right" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", background: "#ECFDF3", color: "#027A48" }}>
                      RECEIVED
                    </span>
                    {order.payment && (
                      <div style={{ fontSize: "11px", color: "#667085", marginTop: "4px" }}>
                        Paid via <span style={{ textTransform: "capitalize", fontWeight: "600" }}>{order.payment?.method}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#667085", borderBottom: "1px solid #EAECF0" }}>
                  <th style={{ padding: "12px 24px" }}>Ingredient</th>
                  <th style={{ padding: "12px 24px" }}>Quantity</th>
                  <th style={{ padding: "12px 24px" }}>Unit Price</th>
                  <th style={{ padding: "12px 24px" }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #F2F4F7" }}>
                    <td style={{ padding: "12px 24px", fontWeight: "500" }}>{item.rm_name}</td>
                    <td style={{ padding: "12px 24px" }}>
                      {item.qty} {item.unit}
                    </td>
                    <td style={{ padding: "12px 24px" }}>Rs. {item.unit_price}</td>
                    <td style={{ padding: "12px 24px", color: "#101828", fontWeight: "700" }}>Rs. {item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

// Page component that lists suppliers and shows details
const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [socketConnected, setSocketConnected] = useState(false);
  const { user } = useAuth();

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch suppliers (${res.status})`);
      const data = await res.json();
      const suppliersList = Array.isArray(data) ? data : data.suppliers || [];
      setSuppliers(suppliersList);
      localStorage.setItem('cached_suppliers', JSON.stringify(suppliersList));
    } catch (err) {
      showToast(err.message || "Failed to load suppliers", "error");
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
    <div style={{ display: "flex", background: "#F9FAFB", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header title="Suppliers" role="Branch Admin" />
        {toast.show && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}
        
        {/* Socket connection indicator */}
        {socketConnected && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs shadow-lg z-50">
            Live Updates Active
          </div>
        )}
        
        <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
          {selectedSupplier ? (
            <SupplierDetailView supplier={selectedSupplier} onBack={() => setSelectedSupplier(null)} />
          ) : (
            <>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#101828" }}>Supplier Directory</h2>
                <p style={{ color: "#667085" }}>View and manage your relationship with ingredient providers.</p>
              </div>

              {isLoading ? (
                <p>Loading suppliers...</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                  {suppliers.map((sup) => (
                    <div
                      key={sup.sup_id}
                      onClick={() => setSelectedSupplier(sup)}
                      style={{
                        background: "#fff",
                        padding: "24px",
                        borderRadius: "16px",
                        border: "1px solid #E4E7EC",
                        cursor: "pointer",
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                          🏢
                        </div>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#101828" }}>{sup.sup_name}</h3>
                      </div>

                      <div style={{ fontSize: "14px", color: "#475467", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>📧 <span>{sup.sup_email}</span></div>
                        <div style={{ display: "flex", gap: "8px" }}>📞 <span>{sup.sup_contact}</span></div>
                        <div style={{ display: "flex", gap: "8px" }}>📍 <span style={{ fontSize: "12px" }}>{sup.sup_address || "No address provided"}</span></div>
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