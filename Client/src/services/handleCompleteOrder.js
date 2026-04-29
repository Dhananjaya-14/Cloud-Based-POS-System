/**
 * Logic to complete an order using existing routes:
 * 1. PATCH /api/purchase-orders/:id/status
 * 2. POST /api/supplier-payments
 */
export const handleCompleteOrderLogic = async (order, supplierId, paymentMethod) => {
  const token = localStorage.getItem("token");

  // 1. Update Order Status to 'received'
  const statusRes = await fetch(`/api/purchase-orders/${order.po_id}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ status: 'received' })
  });

  if (!statusRes.ok) {
    const error = await statusRes.json();
    throw new Error(error.message || "Failed to update order status");
  }

  // 2. Create Payment Record
  // We calculate total from items if order.total_price isn't directly in the object
  const totalAmount = order.items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

  const payRes = await fetch(`/api/supplier-payments`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({
      sup_id: supplierId,
      po_id: order.po_id,
      amount: totalAmount,
      method: paymentMethod.toLowerCase(), // e.g., 'cash', 'card'
      payment_date: new Date().toISOString()
    })
  });

  if (!payRes.ok) {
    throw new Error("Order received, but payment record failed. Please record payment manually.");
  }

  return true;
};