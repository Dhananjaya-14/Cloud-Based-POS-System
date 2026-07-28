import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSuppliers } from '../../services/api';

const VALID_UNITS = ["kg", "g", "l", "ml", "pcs", "units", "box", "pack"];

const ReorderModal = ({ material, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extractArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.suppliers)) return data.suppliers;
    return [];
  };

  const fetchSuppliers = async () => {
    try {
      // getSuppliers with no params — backend uses JWT b_id for branch admins
      const data = await getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
      setSuppliers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ensure we have branch id from logged-in user
      const branchId = user?.b_id ?? user?.B_id ?? null;
      if (!branchId) {
        alert('Branch id missing for current user. Cannot create purchase order.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';

      const orderRes = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          sup_id: parseInt(formData.sup_id, 10),
          B_id: Number(branchId),
          status: 'pending'
        })
      });

      if (orderRes.status === 401) {
        navigate('/login');
        return;
      }

      if (!orderRes.ok) {
        // try to read response body for better debugging
        let text = '';
        try { text = await orderRes.text(); } catch {}
        console.error('Order creation failed', orderRes.status, text);
        // if server returned JSON { message }, try to parse it
        try {
          const errJson = JSON.parse(text || '{}');
          throw new Error(errJson.message || 'Order creation failed');
        } catch {
          throw new Error('Order creation failed');
        }
      }

      const order = await orderRes.json();

      const itemRes = await fetch('/api/purchase-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          po_id: order.po_id,
          ...(material.rm_id ? { rm_id: material.rm_id } : { pro_id: material._original?.pro_id || material.pro_id }),
          qty: parseFloat(formData.quantity),
          unit_price: parseFloat(formData.unitPrice),
          price: parseFloat(formData.quantity) * parseFloat(formData.unitPrice)
        })
      });

      if (itemRes.status === 401) {
        navigate('/login');
        return;
      }
      if (!itemRes.ok) {
        const errData = await itemRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Item creation failed');
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Reorder Error:", err);
      alert(err?.message || 'An error occurred');
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
              <h2 className="text-xl font-bold text-gray-800">Reorder: {material?.rm_name || material?.name || material?.pro_name}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Select Supplier</label>
                <select
                  className="w-full border-gray-200 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  value={formData.sup_id}
                  onChange={(e) => setFormData({ ...formData, sup_id: e.target.value })}
                >
                  <option value="">Choose a supplier...</option>
                  {Array.isArray(suppliers) && suppliers.length > 0 ? (
                    suppliers.map(s => (
                      <option key={s.sup_id ?? s.id ?? s._id} value={s.sup_id ?? s.id ?? s._id}>
                        {s.sup_name ?? s.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No suppliers available</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    className="w-full border-gray-200 border rounded-xl p-3"
                    required
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Unit</label>
                  <select
                    className="w-full border-gray-200 border rounded-xl p-3"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
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






















