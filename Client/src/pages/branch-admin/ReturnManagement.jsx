import React, { useState, useEffect } from "react";
import { FaTrashAlt } from "react-icons/fa";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";

const ReturnManagement = () => {
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all | pending | fulfilled

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
  }, []);

  const fetchReturns = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/returns", {
        headers: { Authorization: `Bearer ${token}` },
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

  const filteredReturns = returns.filter((r) => {
    if (activeFilter === "all") return true;
    return r.status === activeFilter;
  });

  const pendingCount = returns.filter((r) => r.status === "pending").length;
  const fulfilledCount = returns.filter((r) => r.status === "fulfilled").length;

  const openEditModal = (ret) => {
    setEditTarget(ret);
    setEditQty(ret.qty_returned);
    setEditReason(ret.reason || "");
    setEditStatus(ret.status);
    setFormError("");
  };

  const handleSaveEdit = async (e) => {
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qty_returned: qty, reason: editReason, status: editStatus }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update return record");
      }

      setEditTarget(null);
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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete return record");
      }

      setDeleteTarget(null);
      fetchReturns();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="font-sans bg-gray-50">
      <Sidebar />
      <div className="flex flex-col h-screen overflow-hidden" style={{ marginLeft: 240 }}>
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Return Management</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Items returned to suppliers due to damage or delivery issues
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  activeFilter === "all" ? "bg-[#0E6DCF] text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                All ({returns.length})
              </button>
              <button
                onClick={() => setActiveFilter("pending")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  activeFilter === "pending" ? "bg-amber-500 text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setActiveFilter("fulfilled")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  activeFilter === "fulfilled" ? "bg-emerald-500 text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                Fulfilled ({fulfilledCount})
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Supplier</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Qty Returned</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Reason</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr><td colSpan="8" className="py-8 text-center text-gray-400 text-sm">Loading records...</td></tr>
                    ) : filteredReturns.length === 0 ? (
                      <tr><td colSpan="8" className="py-8 text-center text-gray-400 text-sm">No return records found</td></tr>
                    ) : (
                      filteredReturns.map((r) => (
                        <tr key={r.return_id} className="hover:bg-gray-50/50 transition-colors">
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
                              {r.reason || <span className="text-gray-400 italic">No reason provided</span>}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                              r.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {r.status === "pending" ? "Pending" : "Fulfilled"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">
                            {new Date(r.recorded_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => openEditModal(r)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit / Change Status"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setDeleteTarget(r)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <FaTrashAlt size={15} />
                              </button>
                            </div>
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

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Edit Return</h2>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{formError}</div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">{editTarget.item_name}</p>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quantity Returned</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reason</label>
                <textarea
                  className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none resize-none"
                  rows="3"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Status</label>
                <select
                  className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E6DCF] outline-none bg-white"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
                {editStatus !== editTarget.status && (
                  <p className="mt-2 text-xs text-gray-500">
                    {editStatus === "fulfilled"
                      ? "This will add the returned quantity to stock."
                      : "This will remove the returned quantity from stock."}
                  </p>
                )}
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-[#0E6DCF] hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
              <FaTrashAlt size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Return Record?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will remove the return record for <span className="font-semibold">{deleteTarget.item_name}</span>.
              {deleteTarget.status === "fulfilled" && (
                <> Since it was already fulfilled, its quantity will be removed from stock.</>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl disabled:opacity-70"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnManagement;