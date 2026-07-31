import React, { useState, useEffect } from "react";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";

const WasteManagement = () => {
  const [wasteRecords, setWasteRecords] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [branchProducts, setBranchProducts] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [selectedItem, setSelectedItem] = useState("");
  const [wasteQty, setWasteQty] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // Update selected unit when material/product changes
  useEffect(() => {
    if (selectedItem) {
      if (selectedItem.startsWith('rm_')) {
        const id = selectedItem.replace('rm_', '');
        const rm = rawMaterials.find(m => String(m.rm_id || m.id || m._id) === String(id));
        if (rm) setSelectedUnit(rm.unit);
      } else if (selectedItem.startsWith('pro_')) {
        setSelectedUnit('pcs'); // Products are usually in pcs
      }
    }
  }, [selectedItem, rawMaterials, branchProducts]);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      
      // Fetch waste records
      const wasteRes = await fetch("/api/waste", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!wasteRes.ok) throw new Error("Failed to load waste records");
      const wasteData = await wasteRes.json();
      setWasteRecords(Array.isArray(wasteData) ? wasteData : wasteData.data || []);

      // Fetch raw materials
      const rmRes = await fetch("/api/raw-materials", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rmRes.ok) {
        const rmData = await rmRes.json();
        setRawMaterials(Array.isArray(rmData) ? rmData : rmData.data || []);
      }
      
      // Fetch branch products
      const user = JSON.parse(localStorage.getItem("user"));
      const b_id = user?.B_id;
      
      const bpRes = await fetch(`/api/branch_products${b_id ? `?B_id=${b_id}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (bpRes.ok) {
        const bpData = await bpRes.json();
        const items = Array.isArray(bpData) ? bpData : bpData.data || [];
        // Only include external/finished products that can be wasted (not made-to-order which are made on the spot)
        setBranchProducts(items.filter(p => p.prep_type === 'external' || p.prep_type === 'premade'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableUnits = (baseUnit) => {
    const lower = String(baseUnit || "").toLowerCase();
    if (lower === "kg" || lower === "g") return ["kg", "g"];
    if (lower === "l" || lower === "ml") return ["l", "ml"];
    return [baseUnit || 'pcs'];
  };

  const calculateFinalQty = (qty, inputUnit, baseUnit) => {
    const q = parseFloat(qty);
    if (isNaN(q)) return 0;
    
    const iUnit = String(inputUnit).toLowerCase();
    const bUnit = String(baseUnit).toLowerCase();
    
    if (iUnit === bUnit) return q;
    
    if (iUnit === 'ml' && bUnit === 'l') return q / 1000;
    if (iUnit === 'g' && bUnit === 'kg') return q / 1000;
    
    if (iUnit === 'l' && bUnit === 'ml') return q * 1000;
    if (iUnit === 'kg' && bUnit === 'g') return q * 1000;
    
    return q;
  };

  const handleAddWaste = async (e) => {
    e.preventDefault();
    setFormError("");
    
    if (!selectedItem || !wasteQty) {
      setFormError("Item and Quantity are required.");
      return;
    }
    
    if (!selectedUnit) {
      setFormError("Please select a unit.");
      return;
    }

    setIsSubmitting(true);
    
    const isRawMaterial = selectedItem.startsWith('rm_');
    const actualId = selectedItem.replace(isRawMaterial ? 'rm_' : 'pro_', '');
    
    // Determine base unit for conversion
    let baseUnit = 'pcs';
    if (isRawMaterial) {
      const rm = rawMaterials.find(m => String(m.rm_id) === String(actualId));
      baseUnit = rm?.unit || 'pcs';
    }

    const finalQty = calculateFinalQty(wasteQty, selectedUnit, baseUnit);

    try {
      const token = localStorage.getItem("token");
      
      const payload = {
        waste_qty: finalQty,
        reason,
        unit: selectedUnit
      };
      
      if (isRawMaterial) {
        payload.rm_id = actualId;
      } else {
        payload.pro_id = actualId;
      }
      
      const res = await fetch("/api/waste", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add waste");

      setShowAddModal(false);
      setSelectedItem("");
      setWasteQty("");
      setReason("");
      setSelectedUnit("");
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this waste record? Stock will be restored.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/waste/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete waste record");
      }
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Determine the base unit of the currently selected item
  const selectedBaseUnit = selectedItem.startsWith('rm_') 
    ? (rawMaterials.find(m => String(m.rm_id) === String(selectedItem.replace('rm_', '')))?.unit || 'pcs')
    : 'pcs';

  return (
    <div className="font-sans bg-gray-50">
      <Sidebar />
      <div className="flex flex-col h-screen overflow-hidden" style={{ marginLeft: 240 }}>
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Waste Management</h1>
                <p className="text-sm text-gray-500 mt-1">Track and manage inventory wastage</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[#0E6DCF] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Record Waste
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Waste Records Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Item Name</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quantity Wasted</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Reason</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-400 text-sm">Loading records...</td>
                      </tr>
                    ) : wasteRecords.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-400 text-sm">No waste records found</td>
                      </tr>
                    ) : (
                      wasteRecords.map((record) => (
                        <tr key={record.waste_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="text-sm font-semibold text-gray-900">
                              {record.rm_name || record.pro_name || "Unknown Item"}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              record.rm_id ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            }`}>
                              {record.rm_id ? 'Ingredient' : 'Finished Product'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md">
                              {Number(record.waste_qty).toFixed(3)} {record.unit || (record.rm_id ? 'unit' : 'pcs')}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 truncate max-w-[200px] block" title={record.reason}>
                              {record.reason || <span className="text-gray-400 italic">No reason provided</span>}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                              {new Date(record.recorded_at).toLocaleDateString('en-GB')}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleDelete(record.waste_id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Add Waste Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Record Wastage</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddWaste} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>{formError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Select Item</label>
                  <select
                    className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] focus:border-transparent transition-shadow outline-none"
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    required
                  >
                    <option value="" disabled>Choose an item...</option>
                    <optgroup label="Ingredients (Raw Materials)">
                      {rawMaterials.map((m) => (
                        <option key={`rm_${m.rm_id || m.id}`} value={`rm_${m.rm_id || m.id}`}>
                          {m.rm_name || m.name} (In stock: {m.stock_qty} {m.unit})
                        </option>
                      ))}
                    </optgroup>
                    {branchProducts.length > 0 && (
                      <optgroup label="Finished Products (External/Premade)">
                        {branchProducts.map((p) => (
                          <option key={`pro_${p.pro_id}`} value={`pro_${p.pro_id}`}>
                            {p.pro_name} (In stock: {p.pro_quantity} pcs)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quantity</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] focus:border-transparent transition-shadow outline-none"
                      value={wasteQty}
                      onChange={(e) => setWasteQty(e.target.value)}
                      placeholder="e.g. 2.5"
                      required
                    />
                  </div>
                  
                  <div className="w-[120px]">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Unit</label>
                    <select
                      className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] focus:border-transparent transition-shadow outline-none bg-gray-50"
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      required
                      disabled={!selectedItem}
                    >
                      <option value="" disabled>Unit</option>
                      {selectedItem && getAvailableUnits(selectedBaseUnit).map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reason (Optional)</label>
                  <textarea
                    className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] focus:border-transparent transition-shadow outline-none resize-none"
                    rows="3"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why is this being recorded as waste?"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#0E6DCF] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : "Confirm Waste"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasteManagement;