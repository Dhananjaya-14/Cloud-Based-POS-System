import React, { useState } from 'react';

const ReorderModal = ({ material, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    supplierName: '', // In a real app, you'd fetch existing suppliers here
    email: '',
    quantity: '',
    unitPrice: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Create or Get Supplier (Simplified logic)
      // Note: In your backend, you need a sup_id. 
      // For this demo, let's assume we use a default Branch ID (B_id: 1)
      
      const orderPayload = {
        sup_id: 1, // This should come from a supplier selection dropdown in production
        B_id: 1, 
        status: 'pending'
      };

      const orderRes = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const order = await orderRes.json();

      // Step 2: Create Purchase Item
      const itemPayload = {
        po_id: order.po_id,
        rm_id: material.rm_id,
        qty: parseFloat(formData.quantity),
        unit_price: parseFloat(formData.unitPrice),
        price: parseFloat(formData.quantity) * parseFloat(formData.unitPrice)
      };

      const itemRes = await fetch('/api/purchase-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemPayload)
      });

      if (itemRes.ok) {
        alert("Purchase Order Created Successfully!");
        onSuccess();
        onClose();
      }
    } catch (err) {
      alert("Error creating reorder: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-1">Reorder Item</h2>
        <p className="text-gray-500 mb-6">Item: {material?.rm_name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
            <input 
              className="w-full border rounded-lg p-2 mt-1"
              required
              onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity to Order ({material?.unit})</label>
            <input 
              type="number"
              className="w-full border rounded-lg p-2 mt-1"
              required
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estimated Unit Price</label>
            <input 
              type="number"
              step="0.01"
              className="w-full border rounded-lg p-2 mt-1"
              required
              onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
            />
          </div>

          <div className="flex gap-3 mt-8">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Processing...' : 'Submit Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReorderModal;