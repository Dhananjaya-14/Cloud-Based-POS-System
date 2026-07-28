import React, { useState, useEffect } from "react";
import ReceiveOrderModal from "./ReceiveOrderModal";

const SupplierDetailView = ({ supplier, onBack, showToast }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // 1. COMPONENT GUARD: Prevent rendering if supplier is missing
  if (!supplier) {
    return <div style={{ padding: "20px" }}>No supplier selected.</div>;
  }

  const fetchOrderData = async () => {
    // 2. LOGIC GUARD: Prevent API calls if sup_id isn't available
    if (!supplier?.sup_id) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const poRes = await fetch(`/api/purchase-orders/supplier/${supplier.sup_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const poList = await poRes.json();
      const actualPOList = Array.isArray(poList) ? poList : poList.data || [];

      const payRes = await fetch(`/api/supplier-payments/supplier/${supplier.sup_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payData = await payRes.json();
      const payments = Array.isArray(payData) ? payData : payData.data || [];

      const mergedData = await Promise.all(actualPOList.map(async (po) => {
        const itemRes = await fetch(`/api/purchase-items/order/${po.po_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const itemData = await itemRes.json();
        
        return { 
          ...po, 
          items: Array.isArray(itemData) ? itemData : itemData.data || [],
          payment: payments.find(p => p.po_id === po.po_id) 
        };
      }));

      setOrders(mergedData);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
  }, [supplier?.sup_id]); // Use optional chaining in dependency array

  const onMarkAsReceived = (order) => {
    setSelectedOrder(order);
  };

  const handleConfirmReceipt = async (wastagePayload, method, reason) => {
    if (!method) return;

    setProcessingId(selectedOrder.po_id);
    try {
      const token = localStorage.getItem("token");

      // 1. Mark as received and process wastage/stock
      await fetch(`/api/purchase-orders/${selectedOrder.po_id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ wastage: wastagePayload, reason })
      });

      // 2. Process supplier payment
      const totalAmount = selectedOrder.items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
      await fetch(`/api/supplier-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          sup_id: supplier.sup_id,
          po_id: selectedOrder.po_id,
          amount: totalAmount,
          method: method.toLowerCase(),
          payment_date: new Date().toISOString()
        })
      });

      await fetchOrderData();
      setSelectedOrder(null);
      if (showToast) showToast("Order marked as received successfully!", "success");
    } catch (err) {
      if (showToast) showToast(err.message, "error");
      else alert("Error: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: "20px", background: "none", border: "none", color: "#3A4DBF", fontWeight: "600", cursor: "pointer" }}>
        ← Back to Directory
      </button>

      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #E4E7EC", marginBottom: "24px" }}>
        <h2 style={{ margin: 0 }}>{supplier.sup_name}</h2>
        <p style={{ color: "#667085" }}>{supplier.sup_email} | {supplier.sup_contact}</p>
      </div>

      {loading ? <p>Loading history...</p> : orders.map((order) => (
        <div key={order.po_id} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #EAECF0", marginBottom: "20px", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", background: "#F9FAFB", display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>Order #{order.po_id}</strong>
              <div style={{ fontSize: "12px", color: "#667085" }}>{new Date(order.order_date).toLocaleDateString()}</div>
            </div>
            <div>
              {order.status === "pending" ? (
                <button 
                  onClick={() => onMarkAsReceived(order)}
                  disabled={processingId === order.po_id}
                  style={{ padding: "6px 12px", background: "#3A4DBF", color: "#fff", border: "none", borderRadius: "6px" }}
                >
                  {processingId === order.po_id ? "Processing..." : "Mark as Received"}
                </button>
              ) : (
                <div style={{ textAlign: "right" }}>
                  <span style={{ padding: "4px 8px", background: "#ECFDF3", color: "#027A48", borderRadius: "6px", fontSize: "12px" }}>RECEIVED</span>
                  {order.payment && <div style={{ fontSize: "10px", marginTop: "4px" }}>Via {order.payment.method}</div>}
                </div>
              )}
            </div>
          </div>
          <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} style={{ borderTop: "1px solid #F2F4F7" }}>
                  <td style={{ padding: "10px 24px" }}>{item.rm_name}</td>
                  <td style={{ padding: "10px 24px" }}>{item.qty} {item.unit}</td>
                  <td style={{ padding: "10px 24px", textAlign: "right" }}>Rs. {item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {selectedOrder && (
        <ReceiveOrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirm={handleConfirmReceipt}
        />
      )}
    </div>
  );
};

export default SupplierDetailView;




































// import React, { useState, useEffect } from "react";

// const SupplierDetailView = ({ supplier, onBack }) => {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchOrderData = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         // 1. Fetch all Purchase Orders for this supplier
//         const poRes = await fetch(`/api/purchase-orders/supplier/${supplier.sup_id}`, {
//           headers: { Authorization: `Bearer ${token}` }
//         });
//         const poData = await poRes.json();
//         const poList = Array.isArray(poData) ? poData : poData.data || [];

//         // 2. For each PO, fetch its items
//         const ordersWithItems = await Promise.all(poList.map(async (po) => {
//           const itemRes = await fetch(`/api/purchase-items/order/${po.po_id}`, {
//             headers: { Authorization: `Bearer ${token}` }
//           });
//           const itemData = await itemRes.json();
//           return { ...po, items: Array.isArray(itemData) ? itemData : itemData.data || [] };
//         }));

//         setOrders(ordersWithItems);
//       } catch (err) {
//         console.error("Error loading order history:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchOrderData();
//   }, [supplier.sup_id]);

//   return (
//     <div>
//       <button 
//         onClick={onBack}
//         style={{ marginBottom: "20px", background: "none", border: "none", color: "#3A4DBF", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
//       >
//         ← Back to Directory
//       </button>

//       <div style={{ background: "#fff", padding: "30px", borderRadius: "16px", border: "1px solid #E4E7EC", marginBottom: "30px" }}>
//         <h2 style={{ margin: "0 0 8px 0" }}>{supplier.sup_name}</h2>
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", color: "#667085", fontSize: "14px" }}>
//           <span><strong>Email:</strong> {supplier.sup_email}</span>
//           <span><strong>Contact:</strong> {supplier.sup_contact}</span>
//           <span><strong>Address:</strong> {supplier.sup_address}</span>
//         </div>
//       </div>

//       <h3 style={{ marginBottom: "20px", color: "#101828" }}>Purchase History</h3>

//       {loading ? (
//         <p>Loading transactions...</p>
//       ) : orders.length === 0 ? (
//         <div style={{ textAlign: "center", padding: "40px", color: "#667085", background: "#f9fafb", borderRadius: "12px" }}>
//           No purchase orders found for this supplier.
//         </div>
//       ) : (
//         orders.map((order) => (
//           <div key={order.po_id} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #EAECF0", marginBottom: "20px", overflow: "hidden" }}>
//             <div style={{ padding: "16px 24px", background: "#F9FAFB", borderBottom: "1px solid #EAECF0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//               <div>
//                 <span style={{ fontWeight: "600", color: "#344054" }}>Order #{order.po_id}</span>
//                 <span style={{ marginLeft: "12px", fontSize: "13px", color: "#667085" }}>
//                   Ordered on: {new Date(order.order_date).toLocaleDateString()}
//                 </span>
//               </div>
//               <span style={{ 
//                 padding: "4px 12px", 
//                 borderRadius: "12px", 
//                 fontSize: "12px", 
//                 fontWeight: "500",
//                 background: order.status === "received" ? "#ECFDF3" : "#FFFAEB",
//                 color: order.status === "received" ? "#027A48" : "#B54708"
//               }}>
//                 {order.status.toUpperCase()}
//               </span>
//             </div>
            
//             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
//               <thead>
//                 <tr style={{ textAlign: "left", color: "#667085", borderBottom: "1px solid #EAECF0" }}>
//                   <th style={{ padding: "12px 24px" }}>Item Name</th>
//                   <th style={{ padding: "12px 24px" }}>Quantity</th>
//                   <th style={{ padding: "12px 24px" }}>Unit Price</th>
//                   <th style={{ padding: "12px 24px" }}>Total</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {order.items.map((item, idx) => (
//                   <tr key={idx} style={{ borderBottom: "1px solid #F2F4F7" }}>
//                     <td style={{ padding: "12px 24px", fontWeight: "500" }}>{item.rm_name}</td>
//                     <td style={{ padding: "12px 24px" }}>{item.qty} {item.unit}</td>
//                     <td style={{ padding: "12px 24px" }}>Rs. {item.unit_price}</td>
//                     <td style={{ padding: "12px 24px", color: "#101828", fontWeight: "600" }}>Rs. {item.price}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ))
//       )}
//     </div>
//   );
// };

// export default SupplierDetailView;