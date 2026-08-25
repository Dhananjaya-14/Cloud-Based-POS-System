import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import ToastMessage from "../../components/branch-admin/ToastMessage";
import { connectSocket, subscribeToWasteUpdates } from "../../services/socket";

const WasteManagement = () => {
  const { t } = useTranslation();
  const [wasteRecords, setWasteRecords] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [branchProducts, setBranchProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success"
  });
  const showToast = (message, type = "success") => {
    setToast({
      show: true,
      message,
      type
    });
    setTimeout(() => setToast(t => ({
      ...t,
      show: false
    })), 4000);
  };

  // Search & filter
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all | rm | pro

  // Form state
  const [selectedItem, setSelectedItem] = useState("");
  const [wasteQty, setWasteQty] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit modal state
  const [editTarget, setEditTarget] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Set up WebSocket connection and real-time listeners for waste records
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const b_id = user?.B_id || user?.b_id;
    if (!b_id) return;

    connectSocket();

    const handleWasteRefresh = () => {
      console.log("WebSocket event: refreshing waste inventory data...");
      setRefreshTrigger((prev) => prev + 1);
    };

    const unsubscribe = subscribeToWasteUpdates(b_id, {
      onWasteCreated: handleWasteRefresh,
      onWasteUpdated: handleWasteRefresh,
      onWasteDeleted: handleWasteRefresh,
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

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
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!wasteRes.ok) throw new Error("Failed to load waste records");
      const wasteData = await wasteRes.json();
      setWasteRecords(Array.isArray(wasteData) ? wasteData : wasteData.data || []);

      // Fetch raw materials
      const rmRes = await fetch("/api/raw-materials", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (rmRes.ok) {
        const rmData = await rmRes.json();
        setRawMaterials(Array.isArray(rmData) ? rmData : rmData.data || []);
      }

      // Fetch branch products
      const user = JSON.parse(localStorage.getItem("user"));
      const b_id = user?.B_id;
      const bpRes = await fetch(`/api/branch_products${b_id ? `?B_id=${b_id}` : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (bpRes.ok) {
        const bpData = await bpRes.json();
        const items = Array.isArray(bpData) ? bpData : bpData.data || [];
        // Only include external/finished products that can be wasted (not made-to-order which are made on the spot)
        setBranchProducts(items.filter(p => p.product_type === 'finished'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  const getAvailableUnits = baseUnit => {
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
  const handleAddWaste = async e => {
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add waste");
      setShowAddModal(false);
      setSelectedItem("");
      setWasteQty("");
      setReason("");
      setSelectedUnit("");
      showToast("Waste recorded successfully");
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/waste/${deleteTarget.waste_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete waste record");
      }
      setDeleteTarget(null);
      showToast("Waste record deleted, stock restored");
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };
  const openEditModal = record => {
    setEditTarget(record);
    setEditQty(record.waste_qty);
    setEditReason(record.reason || "");
    setEditError("");
  };
  const handleEditSubmit = async e => {
    e.preventDefault();
    setEditError("");
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty <= 0) {
      setEditError("Quantity must be a positive number.");
      return;
    }
    setIsEditing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/waste/${editTarget.waste_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          waste_qty: qty,
          reason: editReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update waste record");
      setEditTarget(null);
      showToast("Waste record updated successfully");
      fetchData();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setIsEditing(false);
    }
  };

  // Determine the base unit of the currently selected item
  const selectedBaseUnit = selectedItem.startsWith('rm_') ? rawMaterials.find(m => String(m.rm_id) === String(selectedItem.replace('rm_', '')))?.unit || 'pcs' : 'pcs';
  const filteredRecords = useMemo(() => {
    let list = wasteRecords;
    if (typeFilter === "rm") list = list.filter(r => r.rm_id);
    if (typeFilter === "pro") list = list.filter(r => r.pro_id);
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(r => {
        const name = (r.rm_name || r.pro_name || "").toLowerCase();
        const reasonText = (r.reason || "").toLowerCase();
        return name.includes(term) || reasonText.includes(term);
      });
    }
    return list;
  }, [wasteRecords, searchTerm, typeFilter]);
  const rmCount = wasteRecords.filter(r => r.rm_id).length;
  const proCount = wasteRecords.filter(r => r.pro_id).length;
  return <div className="font-sans bg-gray-50">
    <Sidebar />
    {toast.show && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({
      ...toast,
      show: false
    })} />}
    <div className="flex flex-col h-screen overflow-hidden" style={{
      marginLeft: 240
    }}>
      <Header title={t("branch_admin.waste_management", "Waste Management")} />
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t("branch_admin.waste_management", "Waste Management")}</h1>
              <p className="text-sm text-gray-500 mt-1">{t("branch_admin.track_and_manage_inventory_wastage", "Track and manage inventory wastage")}</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="bg-[#0E6DCF] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>{t("branch_admin.record_waste", "Record Waste")}</button>
          </div>

          {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>}

          {/* Filter tabs */}
          <div className="flex gap-3">
            <button onClick={() => setTypeFilter("all")} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${typeFilter === "all" ? "bg-[#0E6DCF] text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{t("branch_admin.all", "All (")}{wasteRecords.length})
            </button>
            <button onClick={() => setTypeFilter("rm")} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${typeFilter === "rm" ? "bg-amber-500 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{t("branch_admin.ingredients", "Ingredients (")}{rmCount})
            </button>
            <button onClick={() => setTypeFilter("pro")} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${typeFilter === "pro" ? "bg-emerald-500 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{t("branch_admin.finished_products", "Finished Products (")}{proCount})
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-2.5 max-w-md">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input type="text" placeholder={t("branch_admin.search_by_item_name_or_reason", "Search by item name or reason...")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full text-sm outline-none text-gray-700 placeholder-gray-400" />
            {searchTerm && <button onClick={() => setSearchTerm("")} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>}
          </div>

          {/* Waste Records Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.item_name", "Item Name")}</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.type", "Type")}</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.quantity_wasted", "Quantity Wasted")}</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.reason", "Reason")}</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.date", "Date")}</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">{t("branch_admin.actions", "Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400 text-sm">{t("branch_admin.loading_records", "Loading records...")}</td>
                  </tr> : filteredRecords.length === 0 ? <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400 text-sm">
                      {wasteRecords.length === 0 ? "No waste records found" : "No records match your search/filter"}
                    </td>
                  </tr> : filteredRecords.map(record => <tr key={record.waste_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-gray-900">
                        {record.rm_name || record.pro_name || "Unknown Item"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {record.rm_id ? 'Ingredient' : 'Finished Product'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {Number(record.waste_qty).toFixed(3)} {record.unit || (record.rm_id ? 'unit' : 'pcs')}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-600 truncate max-w-[200px] block" title={record.reason}>
                        {record.reason || <span className="text-gray-400 italic">{t("branch_admin.no_reason_provided", "No reason provided")}</span>}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {new Date(record.recorded_at).toLocaleDateString('en-GB')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(record)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Record">
                          ✏️
                        </button>
                        <button onClick={() => setDeleteTarget(record)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Record">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>

    {/* Add Waste Modal */}
    {showAddModal && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">{t("branch_admin.record_wastage", "Record Wastage")}</h2>
          <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleAddWaste} className="p-6 space-y-5">
          {formError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{formError}</p>
          </div>}

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.select_item", "Select Item")}</label>
              <select className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] focus:border-transparent transition-shadow outline-none" value={selectedItem} onChange={e => setSelectedItem(e.target.value)} required>
                <option value="" disabled>{t("branch_admin.choose_an_item", "Choose an item...")}</option>
                <optgroup label="Ingredients (Raw Materials)">
                  {rawMaterials.map(m => <option key={`rm_${m.rm_id || m.id}`} value={`rm_${m.rm_id || m.id}`}>
                    {m.rm_name || m.name}{t("branch_admin.in_stock", "(In stock:")}{m.stock_qty} {m.unit})
                  </option>)}
                </optgroup>
                {branchProducts.length > 0 && <optgroup label="External Products">
                  {branchProducts.map(p => <option key={`pro_${p.pro_id}`} value={`pro_${p.pro_id}`}>
                    {p.pro_name}{t("branch_admin.in_stock", "(In stock:")}{p.pro_quantity}{t("branch_admin.pcs", "pcs)")}</option>)}
                </optgroup>}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.quantity", "Quantity")}</label>
                <input type="number" step="0.001" min="0.001" className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] focus:border-transparent transition-shadow outline-none" value={wasteQty} onChange={e => setWasteQty(e.target.value)} placeholder={t("branch_admin.e_g_2_5", "e.g. 2.5")} required />
              </div>

              <div className="w-[120px]">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.unit", "Unit")}</label>
                <select className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] focus:border-transparent transition-shadow outline-none bg-gray-50" value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} required disabled={!selectedItem}>
                  <option value="" disabled>{t("branch_admin.unit", "Unit")}</option>
                  {selectedItem && getAvailableUnits(selectedBaseUnit).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.reason_optional", "Reason (Optional)")}</label>
              <textarea className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] focus:border-transparent transition-shadow outline-none resize-none" rows="3" value={reason} onChange={e => setReason(e.target.value)} placeholder={t("branch_admin.why_is_this_being_recorded_as_waste", "Why is this being recorded as waste?")} />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors">{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-[#0E6DCF] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
              {isSubmitting ? <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>{t("branch_admin.saving", t("buttons.saving", "Saving..."))}</> : t("branch_admin.confirm_waste", "Confirm Waste")}
            </button>
          </div>
        </form>
      </div>
    </div>}

    {/* Delete Confirmation */}
    {deleteTarget && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">🗑️</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{t("branch_admin.delete_waste_record", "Delete Waste Record?")}</h3>
        <p className="text-sm text-gray-500 mb-6">{t("branch_admin.this_will_remove_the_waste_record_for", "This will remove the waste record for")}{" "}
          <span className="font-semibold">{deleteTarget.rm_name || deleteTarget.pro_name}</span>{t("branch_admin.and_restore", "and restore")}{" "}{Number(deleteTarget.waste_qty).toFixed(3)} {deleteTarget.unit || 'unit'}{t("branch_admin.back_to_stock", "back to stock.")}</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-xl">{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
          <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl disabled:opacity-70">
            {isDeleting ? t("buttons.deleting", "Deleting...") : t("buttons.delete", "Delete")}
          </button>
        </div>
      </div>
    </div>}

    {/* Edit Waste Modal */}
    {editTarget && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">{t("branch_admin.edit_waste_record", "Edit Waste Record")}</h2>
          <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
          {editError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{editError}</div>}

          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3">
              {editTarget.rm_name || editTarget.pro_name}
            </p>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.quantity_wasted", "Quantity Wasted (")}{editTarget.unit || (editTarget.rm_id ? 'unit' : 'pcs')})
            </label>
            <input type="number" step="0.001" min="0.001" className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none" value={editQty} onChange={e => setEditQty(e.target.value)} required />
            <p className="mt-2 text-xs text-gray-400">{t("branch_admin.increasing_this_removes_more_from_stock_", "Increasing this removes more from stock; decreasing it adds the difference back.")}</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.reason", "Reason")}</label>
            <textarea className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none resize-none" rows="3" value={editReason} onChange={e => setEditReason(e.target.value)} />
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={() => setEditTarget(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50">{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
            <button type="submit" disabled={isEditing} className="flex-1 px-4 py-2.5 bg-[#0E6DCF] hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-70">
              {isEditing ? t("buttons.saving", "Saving...") : t("buttons.save_changes", "Save Changes")}
            </button>
          </div>
        </form>
      </div>
    </div>}
  </div>;
};
export default WasteManagement;