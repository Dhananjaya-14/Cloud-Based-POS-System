import React, { useState } from 'react';

const EditMaterialModal = ({ material, onClose, onSuccess, setMaterials }) => {
  const [formData, setFormData] = useState({
    rm_name: material.rm_name,
    unit: material.unit,
    record_level: material.record_level,
    stock_qty: material.stock_qty, // Added stock_qty to initial state
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // --- OPTIMIZED DELETE CLICK HANDLER ---
  const handleDeleteInitialClick = () => {
    // Instant Frontend Check: 
    // If stock is > 0, show the error immediately without calling the API
    if (parseFloat(material.stock_qty) > 0) {
      setDeleteError(`Cannot delete raw material while it still has stock. Set stock to 0 first.`);
      return;
    }

    // If stock is 0, show the confirmation immediately
    setShowDeleteConfirm(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMaterials(prev => prev.map(m => 
      m.rm_id === material.rm_id 
        ? { 
            ...m, 
            ...formData, 
            // Updated to use the new formData.stock_qty for the low stock check
            low_stock: Number(formData.stock_qty) <= Number(formData.record_level) 
          } 
        : m
    ));
    onClose(); 

    try {
      const response = await fetch(`/api/raw-materials/${material.rm_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error();
      onSuccess(); 
    } catch (err) {
      onSuccess(); 
    }
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/raw-materials/${material.rm_id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        setDeleteError(error.message || "Cannot delete this item.");
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      setDeleteError("A network error occurred.");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 transition-all">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/20 relative overflow-hidden">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Update Item Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Material Name</label>
            <input 
              className="w-full border-gray-200 border rounded-xl p-3 mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={formData.rm_name}
              onChange={(e) => setFormData({...formData, rm_name: e.target.value})}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Unit</label>
              <select 
                className="w-full border-gray-200 border rounded-xl p-3 mt-1 outline-none"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="pcs">pcs</option>
                <option value="units">units</option>
                <option value="box">box</option>
                <option value="pack">pack</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Stock Quantity</label>
              <input 
                type="number"
                step="0.001"
                className="w-full border-gray-200 border rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.stock_qty}
                onChange={(e) => setFormData({...formData, stock_qty: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Reorder Level</label>
            <input 
              type="number"
              step="0.001"
              className="w-full border-gray-200 border rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.record_level}
              onChange={(e) => setFormData({...formData, record_level: e.target.value})}
              required
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all active:scale-95">
              Save Changes
            </button>
            <button 
              type="button" 
              onClick={handleDeleteInitialClick}
              className="w-full py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete Material
            </button>
          </div>
        </form>

        {/* VIEW 1: DELETE CONFIRMATION */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center p-8 z-[1001] animate-in fade-in duration-200">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">🗑️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Item?</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to remove <span className="font-bold">{material.rm_name}</span>?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 font-semibold rounded-xl">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-xl">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: BLOCKED ACTION (Instant Frontend Response) */}
        {deleteError && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center p-8 z-[1002] animate-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">🚫</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Deletion Blocked</h3>
              <p className="text-sm text-gray-600 mb-1 leading-relaxed">
                {deleteError}
              </p>
              <p className="text-[12px] text-gray-400 mb-6 italic">
                Current Stock: {material.stock_qty} {material.unit}
              </p>
              <button 
                onClick={() => setDeleteError(null)} 
                className="w-full px-4 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EditMaterialModal;





