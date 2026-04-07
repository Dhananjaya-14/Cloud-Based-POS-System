import React, { useState, useEffect } from 'react';

const VALID_UNITS = ["kg", "g", "l", "ml", "pcs", "units", "box", "pack"];

const ReorderModal = ({ material, onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    sup_id: '',
    quantity: '',
    unit: material?.unit || 'pcs',
    unitPrice: ''
  });
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    fetchSuppliers();
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();
      setSuppliers(data);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Create Purchase Order
      // Backend expects sup_id and B_id. Using 1 for B_id as per your branch logic.
      const orderRes = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sup_id: parseInt(formData.sup_id),
          B_id: 6, 
          status: 'pending'
        })
      });

      if (!orderRes.ok) throw new Error('Order creation failed');
      const order = await orderRes.json();

      // Step 2: Create Purchase Item
      // Matching purchaseItemController.js expectations
      const itemRes = await fetch('/api/purchase-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: order.po_id,
          rm_id: material.rm_id,
          qty: parseFloat(formData.quantity),
          unit_price: parseFloat(formData.unitPrice),
          price: parseFloat(formData.quantity) * parseFloat(formData.unitPrice)
        })
      });

      if (!itemRes.ok) {
        const errData = await itemRes.json();
        throw new Error(errData.message || 'Item creation failed');
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Reorder Error:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        {isSuccess ? (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
            <h2 className="text-2xl font-bold text-gray-800">Order Placed!</h2>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Reorder: {material?.rm_name}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Supplier Selection */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Select Supplier</label>
                <select 
                  className="w-full border-gray-200 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  value={formData.sup_id}
                  onChange={(e) => setFormData({...formData, sup_id: e.target.value})}
                >
                  <option value="">Choose a supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.sup_id} value={s.sup_id}>{s.sup_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Quantity</label>
                  <input 
                    type="number"
                    className="w-full border-gray-200 border rounded-xl p-3"
                    required
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  />
                </div>
                {/* Unit Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Unit</label>
                  <select 
                    className="w-full border-gray-200 border rounded-xl p-3"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    {VALID_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Unit Price (LKR)</label>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full border-gray-200 border rounded-xl p-3"
                  required
                  onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
                />
              </div>

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-500 font-semibold">Cancel</button>
                <button 
                  type="submit"
                  disabled={loading || !formData.sup_id}
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl disabled:bg-blue-300"
                >
                  {loading ? 'Ordering...' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ReorderModal;
















