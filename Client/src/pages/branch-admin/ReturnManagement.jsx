import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useMemo } from "react";
import { FaTrashAlt } from "react-icons/fa";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import ToastMessage from "../../components/branch-admin/ToastMessage";
const ReturnManagement = () => {
  const { t } = useTranslation();
const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all | pending | fulfilled
  const [typeFilter, setTypeFilter] = useState("all"); // all | rm | pro
  const [searchTerm, setSearchTerm] = useState("");

  // Add Return modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [branchProducts, setBranchProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [addQty, setAddQty] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [addReason, setAddReason] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");
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
  const [editTarget, setEditTarget] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editStatus, setEditStatus] = useState("pending");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    fetchReturns();
    fetchItemsForReturn();
  }, []);
  useEffect(() => {
    if (selectedItem) {
      if (selectedItem.startsWith('rm_')) {
        const id = selectedItem.replace('rm_', '');
        const rm = rawMaterials.find(m => String(m.rm_id) === String(id));
        if (rm) setSelectedUnit(rm.unit);
      } else if (selectedItem.startsWith('pro_')) {
        setSelectedUnit('pcs');
      }
    }
  }, [selectedItem, rawMaterials]);
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
  const fetchReturns = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/returns", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load return records");
      const data = await res.json();
      setReturns(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchItemsForReturn = async () => {
    try {
      const token = localStorage.getItem("token");
      const rmRes = await fetch("/api/raw-materials", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (rmRes.ok) {
        const rmData = await rmRes.json();
        setRawMaterials(Array.isArray(rmData) ? rmData : rmData.data || []);
      }
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
        setBranchProducts(items.filter(p => p.product_type === 'finished'));
      }
      const supRes = await fetch("/api/suppliers", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (supRes.ok) {
        const supData = await supRes.json();
        setSuppliers(Array.isArray(supData) ? supData : supData.data || []);
      }
    } catch (err) {
      console.error("Failed to load items for return", err);
    }
  };
  const handleAddReturn = async e => {
    e.preventDefault();
    setAddError("");
    if (!selectedItem || !addQty) {
      setAddError("Item and Quantity are required.");
      return;
    }
    const qty = parseFloat(addQty);
    if (isNaN(qty) || qty <= 0) {
      setAddError("Quantity must be a positive number.");
      return;
    }
    if (!selectedUnit) {
      setAddError("Please select a unit.");
      return;
    }
    setIsAdding(true);
    const isRawMaterial = selectedItem.startsWith('rm_');
    const actualId = selectedItem.replace(isRawMaterial ? 'rm_' : 'pro_', '');
    let baseUnit = 'pcs';
    if (isRawMaterial) {
      const rm = rawMaterials.find(m => String(m.rm_id) === String(actualId));
      baseUnit = rm?.unit || 'pcs';
    }
    const finalQty = calculateFinalQty(qty, selectedUnit, baseUnit);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        qty_returned: finalQty,
        reason: addReason
      };
      if (isRawMaterial) payload.rm_id = actualId;else payload.pro_id = actualId;
      if (selectedSupplier) payload.sup_id = selectedSupplier;
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to record return");
      setShowAddModal(false);
      setSelectedItem("");
      setSelectedSupplier("");
      setAddQty("");
      setSelectedUnit("");
      setAddReason("");
      showToast("Return recorded successfully");
      fetchReturns();
      fetchItemsForReturn();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setIsAdding(false);
    }
  };
  const filteredReturns = useMemo(() => {
    let list = returns;
    if (activeFilter !== "all") list = list.filter(r => r.status === activeFilter);
    if (typeFilter === "rm") list = list.filter(r => r.rm_id);
    if (typeFilter === "pro") list = list.filter(r => r.pro_id);
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(r => {
        const name = (r.item_name || "").toLowerCase();
        const supplier = (r.sup_name || "").toLowerCase();
        const reasonText = (r.reason || "").toLowerCase();
        return name.includes(term) || supplier.includes(term) || reasonText.includes(term);
      });
    }
    return list;
  }, [returns, activeFilter, typeFilter, searchTerm]);
  const pendingCount = returns.filter(r => r.status === "pending").length;
  const fulfilledCount = returns.filter(r => r.status === "fulfilled").length;
  const openEditModal = ret => {
    setEditTarget(ret);
    setEditQty(ret.qty_returned);
    setEditReason(ret.reason || "");
    setEditStatus(ret.status);
    setFormError("");
  };
  const handleSaveEdit = async e => {
    e.preventDefault();
    setFormError("");
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty <= 0) {
      setFormError("Quantity must be a positive number.");
      return;
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/returns/${editTarget.return_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          qty_returned: qty,
          reason: editReason,
          status: editStatus
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update return record");
      }
      setEditTarget(null);
      showToast("Return record updated successfully");
      fetchReturns();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/returns/${deleteTarget.return_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete return record");
      }
      setDeleteTarget(null);
      showToast("Return record deleted");
      fetchReturns();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };
  return <div className="font-sans bg-gray-50">
      <Sidebar />
      {toast.show && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({
      ...toast,
      show: false
    })} />}
      <div className="flex flex-col h-screen overflow-hidden" style={{
      marginLeft: 240
    }}>
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("branch_admin.return_management", "Return Management")}</h1>
                <p className="text-sm text-gray-500 mt-1">{t("branch_admin.items_returned_to_suppliers_due_to_damag", "Items returned to suppliers due to damage or delivery issues")}</p>
              </div>
              <button onClick={() => setShowAddModal(true)} className="bg-[#0E6DCF] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>{t("branch_admin.record_return", "Record Return")}</button>
            </div>

            {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>}

            <div className="flex gap-3">
              <button onClick={() => setActiveFilter("all")} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeFilter === "all" ? "bg-[#0E6DCF] text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{t("branch_admin.all", "All (")}{returns.length})
              </button>
              <button onClick={() => setActiveFilter("pending")} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeFilter === "pending" ? "bg-amber-500 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{t("branch_admin.pending", "Pending (")}{pendingCount})
              </button>
              <button onClick={() => setActiveFilter("fulfilled")} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeFilter === "fulfilled" ? "bg-emerald-500 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{t("branch_admin.fulfilled", "Fulfilled (")}{fulfilledCount})
              </button>

              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 outline-none">
                <option value="all">{t("branch_admin.all_types", "All Types")}</option>
                <option value="rm">{t("branch_admin.ingredients", "Ingredients")}</option>
                <option value="pro">{t("branch_admin.finished_products", "Finished Products")}</option>
              </select>
            </div>

            {/* Search bar */}
            <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-2.5 max-w-md">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <input type="text" placeholder={t("branch_admin.search_by_item_supplier_or_reason", "Search by item, supplier, or reason...")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full text-sm outline-none text-gray-700 placeholder-gray-400" />
              {searchTerm && <button onClick={() => setSearchTerm("")} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.item", "Item")}</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.type", "Type")}</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.supplier", "Supplier")}</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.qty_returned", "Qty Returned")}</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.reason", "Reason")}</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.status", "Status")}</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("branch_admin.date", "Date")}</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">{t("branch_admin.actions", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? <tr><td colSpan="8" className="py-8 text-center text-gray-400 text-sm">{t("branch_admin.loading_records", "Loading records...")}</td></tr> : filteredReturns.length === 0 ? <tr>
                        <td colSpan="8" className="py-8 text-center text-gray-400 text-sm">
                          {returns.length === 0 ? "No return records found" : "No records match your search/filter"}
                        </td>
                      </tr> : filteredReturns.map(r => <tr key={r.return_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="text-sm font-semibold text-gray-900">{r.item_name || "Unknown Item"}</span>
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-700">
                            {r.rm_id ? 'Ingredient' : 'Finished Product'}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600">{r.sup_name || "—"}</td>
                          <td className="py-4 px-6 text-sm text-gray-700">
                            {Number(r.qty_returned).toFixed(3)} {r.unit}
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 truncate max-w-[200px] block" title={r.reason}>
                              {r.reason || <span className="text-gray-400 italic">{t("branch_admin.no_reason_provided", "No reason provided")}</span>}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${r.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {r.status === "pending" ? "Pending" : "Fulfilled"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">
                            {new Date(r.recorded_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-3">
                              <button onClick={() => openEditModal(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit / Change Status">
                                ✏️
                              </button>
                              <button onClick={() => setDeleteTarget(r)} className="text-gray-400 hover:text-red-500 transition-colors" title={t("buttons.delete", "Delete")}>
                                <FaTrashAlt size={15} />
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

      {/* Edit Modal */}
      {editTarget && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">{t("branch_admin.edit_return", "Edit Return")}</h2>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {formError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{formError}</div>}
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">{editTarget.item_name}</p>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.quantity_returned", "Quantity Returned")}</label>
                <input type="number" step="0.001" min="0.001" className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none" value={editQty} onChange={e => setEditQty(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.reason", "Reason")}</label>
                <textarea className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none resize-none" rows="3" value={editReason} onChange={e => setEditReason(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.status", "Status")}</label>
                <select className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none bg-white" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  <option value="pending">{t("branch_admin.pending", "Pending")}</option>
                  <option value="fulfilled">{t("branch_admin.fulfilled", "Fulfilled")}</option>
                </select>
                {editStatus !== editTarget.status && <p className="mt-2 text-xs text-gray-500">
                    {editStatus === "fulfilled" ? "This will add the returned quantity to stock." : "This will remove the returned quantity from stock."}
                  </p>}
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50">{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
                <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-[#0E6DCF] hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-70">
                  {isSaving ? t("buttons.saving", "Saving...") : t("buttons.save_changes", "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>}

      {/* Add Return Modal */}
      {showAddModal && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">{t("branch_admin.record_return", "Record Return")}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReturn} className="p-6 space-y-5">
              {addError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{addError}</div>}

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.select_item", "Select Item")}</label>
                <select className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none" value={selectedItem} onChange={e => setSelectedItem(e.target.value)} required>
                  <option value="" disabled>{t("branch_admin.choose_an_item", "Choose an item...")}</option>
                  <optgroup label="Ingredients (Raw Materials)">
                    {rawMaterials.map(m => <option key={`rm_${m.rm_id}`} value={`rm_${m.rm_id}`}>
                        {m.rm_name}{t("branch_admin.in_stock", "(In stock:")}{m.stock_qty} {m.unit})
                      </option>)}
                  </optgroup>
                  {branchProducts.length > 0 && <optgroup label="External Products">
                      {branchProducts.map(p => <option key={`pro_${p.pro_id}`} value={`pro_${p.pro_id}`}>
                          {p.pro_name}{t("branch_admin.in_stock", "(In stock:")}{p.pro_quantity}{t("branch_admin.pcs", "pcs)")}</option>)}
                    </optgroup>}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.supplier_optional", "Supplier (optional)")}</label>
                <select className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none bg-white" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                  <option value="">{t("branch_admin.no_supplier_selected", "— No supplier selected —")}</option>
                  {suppliers.map(s => <option key={s.sup_id} value={s.sup_id}>{s.sup_name}</option>)}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.quantity", "Quantity")}</label>
                  <input type="number" step="0.001" min="0.001" className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder={t("branch_admin.e_g_2", "e.g. 2")} required />
                </div>

                <div className="w-[120px]">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.unit", "Unit")}</label>
                  <select className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none bg-gray-50" value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} required disabled={!selectedItem}>
                    <option value="" disabled>{t("branch_admin.unit", "Unit")}</option>
                    {selectedItem && getAvailableUnits(selectedItem.startsWith('rm_') ? rawMaterials.find(m => String(m.rm_id) === String(selectedItem.replace('rm_', '')))?.unit || 'pcs' : 'pcs').map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-2">{t("branch_admin.this_quantity_will_be_removed_from_stock", "This quantity will be removed from stock until the return is marked as fulfilled.")}</p>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.reason", "Reason")}</label>
                <textarea className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none resize-none" rows="3" value={addReason} onChange={e => setAddReason(e.target.value)} placeholder={t("branch_admin.why_is_this_being_returned_to_the_suppli", "Why is this being returned to the supplier?")} />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50">{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
                <button type="submit" disabled={isAdding} className="flex-1 px-4 py-2.5 bg-[#0E6DCF] hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-70">
                  {isAdding ? t("buttons.saving", "Saving...") : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>}

      {/* Delete Confirmation */}
      {deleteTarget && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
              <FaTrashAlt size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t("branch_admin.delete_return_record", "Delete Return Record?")}</h3>
            <p className="text-sm text-gray-500 mb-6">{t("branch_admin.this_will_remove_the_return_record_for", "This will remove the return record for")}<span className="font-semibold">{deleteTarget.item_name}</span>.
              {deleteTarget.status === "fulfilled" && <>{t("branch_admin.since_it_was_already_fulfilled_its_quant", "Since it was already fulfilled, its quantity will be removed from stock.")}</>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-xl">{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl disabled:opacity-70">
                {isDeleting ? t("buttons.deleting", "Deleting...") : t("buttons.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>}
    </div>;
};
export default ReturnManagement;