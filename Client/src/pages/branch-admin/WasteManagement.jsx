import React, { useState, useEffect } from "react";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";

const WasteManagement = () => {
  const [wasteRecords, setWasteRecords] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editRecordId, setEditRecordId] = useState(null);

  // Form state
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [wasteQty, setWasteQty] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // Update selected unit when material changes
  useEffect(() => {
    if (selectedMaterial) {
      const item = rawMaterials.find(m => m.dropdown_id === selectedMaterial);
      if (item) {
        setSelectedUnit(item.dropdown_unit);
      }
    }
  }, [selectedMaterial, rawMaterials]);

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

      // Fetch raw materials and branch products for dropdown
      let fetchedItems = [];
      const rmRes = await fetch("/api/raw-materials", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rmRes.ok) {
        const rmData = await rmRes.json();
        const rmArray = Array.isArray(rmData) ? rmData : rmData.data || [];
        fetchedItems = [...fetchedItems, ...rmArray.map(rm => ({
          ...rm,
          dropdown_id: `rm_${rm.rm_id || rm.id || rm._id}`,
          dropdown_name: rm.rm_name,
          dropdown_stock: rm.stock_qty,
          dropdown_unit: rm.unit,
          item_type: 'rm',
          item_id: rm.rm_id || rm.id || rm._id
        }))];
      }

      const bpRes = await fetch("/api/branch_products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (bpRes.ok) {
        const bpData = await bpRes.json();
        const bpArrayRaw = Array.isArray(bpData) ? bpData : bpData.data || [];
        const bpArray = bpArrayRaw.filter(bp => bp.product_type === 'finished');
        fetchedItems = [...fetchedItems, ...bpArray.map(bp => ({
          ...bp,
          dropdown_id: `pro_${bp.pro_id}`,
          dropdown_name: bp.pro_name,
          dropdown_stock: bp.pro_quantity,
          dropdown_unit: 'pcs',
          item_type: 'pro',
          item_id: bp.pro_id
        }))];
      }
      setRawMaterials(fetchedItems);
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
    return [baseUnit];
  };

  const calculateFinalQty = (qty, inputUnit, baseUnit) => {
    let finalQty = Number(qty);
    const from = String(inputUnit).toLowerCase();
    const to = String(baseUnit).toLowerCase();
    
    if (from === "g" && to === "kg") finalQty /= 1000;
    else if (from === "kg" && to === "g") finalQty *= 1000;
    else if (from === "ml" && to === "l") finalQty /= 1000;
    else if (from === "l" && to === "ml") finalQty *= 1000;
    
    return finalQty;
  };

  const openAddModal = () => {
    setEditMode(false);
    setEditRecordId(null);
    setSelectedMaterial("");
    setWasteQty("");
    setReason("");
    setFormError("");
    setShowAddModal(true);
  };

  const handleEditClick = (record) => {
    setEditMode(true);
    setEditRecordId(record.waste_id);
    setSelectedMaterial(record.pro_id ? `pro_${record.pro_id}` : `rm_${record.rm_id}`);
    setWasteQty(record.waste_qty);
    setReason(record.reason || "");
    setFormError("");
    setShowAddModal(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to delete this waste record? The quantity will be restored to stock.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/waste/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete waste record.");
      }
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddWaste = async (e) => {
    e.preventDefault();
    setFormError("");
    
    if (!selectedMaterial || !wasteQty) {
      setFormError("Ingredient and Quantity are required.");
      return;
    }

    const item = rawMaterials.find(m => m.dropdown_id === selectedMaterial);
    if (!item) {
      setFormError("Selected item not found.");
      return;
    }
    const finalWasteQty = calculateFinalQty(wasteQty, selectedUnit, item.dropdown_unit);

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      let res;
      
      if (editMode) {
        res = await fetch(`/api/waste/${editRecordId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            waste_qty: finalWasteQty,
            reason: reason
          }),
        });
      } else {
        res = await fetch("/api/waste", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            rm_id: item.item_type === 'rm' ? Number(item.item_id) : null,
            pro_id: item.item_type === 'pro' ? Number(item.item_id) : null,
            item_type: item.item_type,
            waste_qty: finalWasteQty,
            reason: reason
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (editMode ? "Failed to update wastage" : "Failed to add wastage"));
      }

      // Success
      setShowAddModal(false);
      setSelectedMaterial("");
      setWasteQty("");
      setReason("");
      fetchData(); // Refresh list
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <Header title="Waste Management" role="Branch Admin" />
        
        <div className="p-8 bg-gray-50 min-h-screen">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 m-0">Waste Records</h1>
              <p className="text-gray-500 mt-1.5 text-sm">
                View and manage inventory wastage and spoilage.
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <span>+</span> Add Wastage
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-red-600 mb-5 font-medium">
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <th className="px-6 py-4 font-semibold whitespace-nowrap w-[20%]">Date</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap w-[20%]">Ingredient</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap w-[20%]">Waste Quantity</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap w-[25%]">Reason</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap w-[15%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        Loading records...
                      </td>
                    </tr>
                  ) : wasteRecords.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-16 text-center text-gray-400">
                        <div className="text-4xl mb-3">🗑️</div>
                        <p className="font-semibold text-base mb-1">No waste records found</p>
                        <p className="text-sm">Click "Add Wastage" to record spoilage.</p>
                      </td>
                    </tr>
                  ) : (
                    wasteRecords.map((record) => (
                      <tr key={record.waste_id} className="hover:bg-gray-50 transition-colors bg-white">
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(record.recorded_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {record.rm_name}
                        </td>
                        <td className="px-6 py-4 font-bold text-red-600">
                          {record.waste_qty}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {record.reason || <span className="text-gray-400 italic">No reason provided</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEditClick(record)}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors mr-2 inline-flex items-center justify-center"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(record.waste_id)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors inline-flex items-center justify-center"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-[500px] max-w-full shadow-2xl">
            <h3 className="m-0 mb-2 text-gray-900 text-xl font-bold">{editMode ? "Edit Wastage" : "Record Wastage"}</h3>
            <p className="text-gray-500 text-sm mb-6">
              {editMode ? "Update the wasted quantity or reason. Stock will be adjusted accordingly." : "Select an ingredient and enter the wasted quantity. This will deduct from the current stock."}
            </p>

            {formError && (
              <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-red-600 mb-5 text-sm font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddWaste}>
              <div className="space-y-5 mb-6">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-2">Ingredient</label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border-2 border-gray-300 text-sm outline-none focus:border-indigo-500 transition-colors disabled:bg-gray-100 disabled:opacity-70"
                    required
                    disabled={editMode}
                  >
                    <option value="">-- Select Ingredient / Product --</option>
                    {rawMaterials.map(item => (
                      <option key={item.dropdown_id} value={item.dropdown_id}>
                        {item.dropdown_name} (Stock: {item.dropdown_stock} {item.dropdown_unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-2">Wasted Quantity</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={wasteQty}
                      onChange={(e) => setWasteQty(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border-2 border-gray-300 text-sm outline-none focus:border-indigo-500 transition-colors"
                      placeholder="e.g. 1.5"
                      required
                    />
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      className="w-[100px] px-3.5 py-2.5 rounded-lg border-2 border-gray-300 text-sm outline-none focus:border-indigo-500 transition-colors bg-gray-50 disabled:bg-gray-100 disabled:opacity-70"
                      disabled={editMode}
                    >
                      {selectedMaterial ? (
                        getAvailableUnits(rawMaterials.find(m => m.dropdown_id === selectedMaterial)?.dropdown_unit).map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))
                      ) : (
                        <option value="">-</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-2">Reason</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border-2 border-gray-300 text-sm outline-none focus:border-indigo-500 transition-colors"
                    placeholder="e.g. Spoiled food, Dropped, Expired"
                    maxLength={255}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-lg border-2 border-gray-300 bg-white font-semibold cursor-pointer text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg border-none bg-indigo-600 text-white font-semibold cursor-pointer hover:bg-indigo-700 transition-colors disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (editMode ? "Updating..." : "Recording...") : (editMode ? "Update Waste" : "Record Waste")}
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
