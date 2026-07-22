import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
  assignSupplierToBranch,
  removeSupplierFromBranch,
  getSupplierBranches,
  getBranches,
} from "../../services/api";

// -----Toast ─---------------
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-xl flex items-center gap-2.5 font-semibold text-sm shadow-xl border-2 ${
    type === "error"
      ? "bg-red-50 border-red-300 text-red-600"
      : "bg-green-50 border-green-300 text-green-600"
  }`}>
    <span>{type === "error" ? "✕" : "✓"}</span>
    {message}
    <button onClick={onClose} className="ml-2 bg-transparent border-none cursor-pointer text-base text-inherit hover:opacity-75">×</button>
  </div>
);

const Modal = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-[540px] max-w-full max-h-[90vh] flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex justify-between items-start px-8 pt-8 pb-4 shrink-0">
        <div>
          <h2 className="m-0 text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="m-0 mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 border-none rounded-lg w-9 h-9 flex items-center justify-center cursor-pointer text-lg text-gray-500 transition-colors shrink-0 ml-4">×</button>
      </div>
      <div className="overflow-y-auto px-8 pb-8 flex-1">{children}</div>
    </div>
  </div>
);

const Field = ({ label, required, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

const BranchCheckbox = ({ branch, checked, onChange, badge, badgeColor }) => (
  <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
    checked ? "border-gray-200 bg-gray-50 " : "border-gray-200 bg-gray-50 hover:border-gray-300"
  }`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 accent-indigo-600 cursor-pointer"
    />
    <span className="text-base">🏬</span>
    <span className="font-medium text-gray-800 text-sm flex-1">{branch.b_name || branch.B_name}</span>
    {badge && (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>{badge}</span>
    )}
  </label>
);

const inputClass = "w-full px-3.5 py-2.5 rounded-lg border-2 border-gray-300 text-sm text-gray-900 outline-none transition-colors focus:border-[#2E3E8F]";
const btnClass = "px-5 py-2.5 rounded-lg border-none cursor-pointer font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed";
const btnPrimary   = `${btnClass} bg-[#2E3E8F] text-white`;
const btnSecondary = `${btnClass} bg-gray-100 text-gray-700`;
const btnDanger    = `${btnClass} bg-red-600 text-white`;
const btnSuccess   = `${btnClass} bg-green-600 text-white`;

// ----------------- Main Page-----------------
const AdminSupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  // Manage Branches Modal
  const [assignTarget, setAssignTarget] = useState(null);
  const [initialAssignBids, setInitialAssignBids] = useState([]); 
  const [selectedAssignBids, setSelectedAssignBids] = useState([]); 
  const [assignLoading, setAssignLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "", b_id: "" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...(filterBranch ? { b_id: filterBranch } : {}),
        ...(showDeleted ? { status: "inactive" } : {}),
      };
      
      // Fetch branches independently so a supplier 403 doesn't break the dropdown
      try {
        const branchList = await getBranches();
        setBranches(Array.isArray(branchList) ? branchList : []);
      } catch (err) {
        console.error("Failed to fetch branches", err);
        setBranches([]);
      }

      try {
        const supList = await getSuppliers(params);
        setSuppliers(Array.isArray(supList) ? supList : []);
      } catch (err) {
        showToast(err?.response?.data?.message || "Failed to load suppliers", "error");
        setSuppliers([]);
      }
      
    } finally {
      setLoading(false);
    }
  }, [filterBranch, showDeleted]);

  useEffect(() => { loadData(); }, [loadData]);

  // -------------------─ Open Manage Branches Modal -------------------
  const openAssign = async (sup) => {
    setAssignTarget(sup);
    setSelectedAssignBids([]);
    setInitialAssignBids([]);
    setAssignLoading(true);
    try {
      const assigned = await getSupplierBranches(sup.sup_id);
      const assignedIds = (Array.isArray(assigned) ? assigned : []).map(b => b.b_id);
      setSelectedAssignBids(assignedIds);
      setInitialAssignBids(assignedIds);
    } catch {
      showToast("Failed to load branch data", "error");
    } finally {
      setAssignLoading(false);
    }
  };

  const toggleAssignBid = (b_id) => {
    setSelectedAssignBids(prev =>
      prev.includes(b_id) ? prev.filter(id => id !== b_id) : [...prev, b_id]
    );
  };

  const handleAssign = async () => {
    setAssigning(true);
    try {
      const addedBids = selectedAssignBids.filter(id => !initialAssignBids.includes(id));
      const removedBids = initialAssignBids.filter(id => !selectedAssignBids.includes(id));

      const promises = [
        ...addedBids.map(b_id => assignSupplierToBranch(assignTarget.sup_id, b_id)),
        ...removedBids.map(b_id => removeSupplierFromBranch(assignTarget.sup_id, b_id))
      ];

      await Promise.all(promises);
      
      showToast(`Branch assignments updated successfully!`);
      setAssignTarget(null);
      setSelectedAssignBids([]);
      setInitialAssignBids([]);
      setSuppliers((prev) =>
          prev.map((supplier) =>
            supplier.sup_id === assignTarget.sup_id
              ? {
                  ...supplier,
                  branches: selectedAssignBids,
                }
              : supplier
          )
        );
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update branch assignments", "error");
    } finally {
      setAssigning(false);
    }
  };

  // -----------------CRUD -----------------------
  const openCreate = () => {
    setForm({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "", b_id: "" });
    setShowCreate(true);
  };

  const openEdit = (sup) => {
    setForm({ sup_name: sup.sup_name, sup_email: sup.sup_email, sup_contact: sup.sup_contact, sup_address: sup.sup_address || "", b_id: "" });
    setEditSupplier(sup);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editSupplier) {
        await updateSupplier(editSupplier.sup_id, {
          sup_name: form.sup_name, sup_email: form.sup_email,
          sup_contact: form.sup_contact, sup_address: form.sup_address,
        });
        showToast("Supplier updated successfully!");
        setEditSupplier(null);
      } else {
        await createSupplier({
          sup_name: form.sup_name, sup_email: form.sup_email,
          sup_contact: form.sup_contact, sup_address: form.sup_address,
          b_id: Number(form.b_id),
        });
        showToast("Supplier created and assigned to branch!");
        setShowCreate(false);
      }
      loadData();
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || "Failed to save supplier";
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteSupplier(deleteTarget.sup_id);
      showToast(`"${deleteTarget.sup_name}" has been deactivated.`);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to deactivate supplier", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    setSaving(true);
    try {
      await restoreSupplier(restoreTarget.sup_id);
      showToast(`"${restoreTarget.sup_name}" has been restored!`);
      setRestoreTarget(null);
      loadData();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to restore supplier", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = suppliers.filter(s =>
    s.sup_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.sup_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.sup_contact?.includes(search)
  );

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <Header title="Supplier Management" />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="px-9 py-8 max-w-[1200px] mx-auto w-full">
          {/* Page header */}
          <div className="flex justify-between items-start mb-7">
            <div>
              <h1 className="m-0 text-3xl font-bold text-gray-900">Suppliers</h1>
              <p className="m-0 mt-2 text-gray-500 text-sm">
                {showDeleted
                  ? "Showing deactivated suppliers. Restore them to make them available again."
                  : "Create suppliers and assign them to branches. "}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowDeleted(v => !v); setSearch(""); setFilterBranch(""); }}
                className={`px-4 py-2.5 rounded-lg border-2 font-semibold text-sm cursor-pointer transition-colors ${
                  showDeleted
                    ? "border-red-400 bg-red-50 text-red-600 hover:bg-red-100"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {showDeleted ? "🗑 Viewing Deleted" : "🗑 View Deleted"}
              </button>
              {!showDeleted && (
                <button onClick={openCreate} className={btnPrimary}>+ Add Supplier</button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <input
              placeholder="Search by name, email or contact..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${inputClass} max-w-[340px]`}
            />
            {!showDeleted && (
              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className={`${inputClass} max-w-[220px]`}
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.B_id} value={b.B_id}>{b.B_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Cards */}
          {loading ? (
            <p className="text-gray-500">Loading suppliers...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">{showDeleted ? "🗑" : "🏢"}</div>
              <p className="font-semibold text-base mb-1">
                {showDeleted ? "No deleted suppliers found" : "No suppliers found"}
              </p>
              <p className="text-sm">
                {showDeleted ? "All suppliers are currently active." : "Create a supplier and assign it to a branch."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 justify-center">
              {filtered.map(sup => (
                <div key={sup.sup_id} className={`bg-white rounded-2xl border p-6 shadow-sm transition-shadow ${
                  showDeleted ? "border-red-200 opacity-80 hover:opacity-100" : "border-gray-200 hover:shadow-md"
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                      showDeleted ? "bg-gradient-to-br from-red-50 to-red-100" : "bg-gradient-to-br from-indigo-50 to-indigo-200"
                    }`}>🏢</div>
                    <div className="flex justify-between items-center w-full gap-2">
                      <h3 className="m-0 text-base font-bold text-gray-900 truncate">{sup.sup_name}</h3>
                      {showDeleted ? (
                        <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 whitespace-nowrap">Inactive</span>
                      ) : (
                        <button onClick={() => setDeleteTarget(sup)} className="shrink-0 px-2.5 py-1.5 rounded-lg border-2 border-red-200 bg-red-50 text-red-600 font-bold text-xs cursor-pointer hover:bg-red-100 transition-colors">✕</button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 flex flex-col gap-2 mb-5">
                    <div>📧 {sup.sup_email}</div>
                    <div>📞 {sup.sup_contact}</div>
                    <div>📍 {sup.sup_address || "No address"}</div>
                  </div>
                  {showDeleted ? (
                    <button onClick={() => setRestoreTarget(sup)} className="w-full py-2 rounded-lg border-2 border-green-400 bg-green-50 text-green-700 font-semibold text-sm cursor-pointer hover:bg-green-100 transition-colors">
                      ♻ Restore Supplier
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(sup)} className="flex-1 py-1.5 rounded-lg border-2 border-gray-300 bg-white text-gray-500 font-semibold text-sm cursor-pointer hover:bg-gray-50 transition-colors">Edit</button>
                        <button onClick={() => openAssign(sup)} className="flex-1 py-1.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 text-indigo-500 font-semibold text-sm cursor-pointer hover:bg-indigo-100 transition-colors">Manage Branches</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------
          MANAGE BRANCHES MODAL  — multi-select checklist (Assign/Remove)
         ------------------------------------------------------------------ */}
      {assignTarget && (
        <Modal
          title={`Manage Branches`}
          subtitle={`Supplier: ${assignTarget.sup_name}`}
          onClose={() => { setAssignTarget(null); setSelectedAssignBids([]); setInitialAssignBids([]); }}
        >
          {assignLoading ? (
            <div className="py-8 text-center text-gray-400">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-sm">Loading available branches...</p>
            </div>
          ) : branches.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🚫</div>
              <p className="font-semibold text-sm">No branches found</p>
            </div>
          ) : (
            <>
              {/* Select All / Deselect All */}
              <div className="flex justify-between items-center mb-3">
                <button
                  onClick={() =>
                    selectedAssignBids.length === branches.length
                      ? setSelectedAssignBids([])
                      : setSelectedAssignBids(branches.map(b => b.B_id))
                  }
                  className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 cursor-pointer bg-none border-none p-0 whitespace-nowrap ml-2"
                >
                  {selectedAssignBids.length === branches.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {/* Branch list */}
              <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1 mb-5">
                {branches.map(b => (
                  <BranchCheckbox
                    key={b.B_id}
                    branch={b}
                    checked={selectedAssignBids.includes(b.B_id)}
                    onChange={() => toggleAssignBid(b.B_id)}
                  />
                ))}
              </div>

              {/* Selected count pill */}
              {selectedAssignBids.length > 0 && (
                <div className="mb-4 flex items-center gap-2 text-sm text-indigo-500 font-semibold">
                  <span className="bg-indigo-100 border border-indigo-200 rounded-full px-2.5 py-0.5 text-xs">{selectedAssignBids.length}</span>
                  branch{selectedAssignBids.length > 1 ? "es" : ""} selected
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 mt-2">
            <button  onClick={() => { setAssignTarget(null); setSelectedAssignBids([]); setInitialAssignBids([]); }} className={`${btnSecondary} flex-1`}>Cancel</button>
            <button
              onClick={handleAssign}
              disabled={assigning}
              className={`${btnPrimary} flex-1`}
            >
              {assigning ? "Saving..." : `Save Changes`}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Create Supplier Modal ── */}
      {showCreate && (
        <Modal title="Add New Supplier" onClose={() => setShowCreate(false)}>
          <Field label="Supplier Name" required>
            <input className={inputClass} value={form.sup_name} onChange={e => setForm(f => ({ ...f, sup_name: e.target.value }))} placeholder="e.g. Fresh Farms Ltd." />
          </Field>
          <Field label="Email" required>
            <input className={inputClass} type="email" value={form.sup_email} onChange={e => setForm(f => ({ ...f, sup_email: e.target.value }))} placeholder="supplier@email.com" />
          </Field>
          <Field label="Contact Number" required>
            <input className={inputClass} value={form.sup_contact} onChange={e => setForm(f => ({ ...f, sup_contact: e.target.value }))} placeholder="+94 77 000 0000" />
          </Field>
          <Field label="Address">
            <input className={inputClass} value={form.sup_address} onChange={e => setForm(f => ({ ...f, sup_address: e.target.value }))} placeholder="123, Main St, Colombo" />
          </Field>
          <Field label="Initial Branch" required>
            <select className={inputClass} value={form.b_id} onChange={e => setForm(f => ({ ...f, b_id: e.target.value }))}>
              <option value="">Select a branch...</option>
              {branches.map(b => (
                <option key={b.B_id} value={b.B_id}>{b.B_name}</option>
              ))}
            </select>
          </Field>
          <div className="flex gap-3 mt-3">
            <button onClick={() => setShowCreate(false)} className={`${btnSecondary} flex-1`}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className={`${btnPrimary} flex-1`}>
              {saving ? "Saving..." : "Create Supplier"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Supplier Modal ── */}
      {editSupplier && (
        <Modal title="Edit Supplier" onClose={() => setEditSupplier(null)}>
          <Field label="Supplier Name" required>
            <input className={inputClass} value={form.sup_name} onChange={e => setForm(f => ({ ...f, sup_name: e.target.value }))} />
          </Field>
          <Field label="Email" required>
            <input className={inputClass} type="email" value={form.sup_email} onChange={e => setForm(f => ({ ...f, sup_email: e.target.value }))} />
          </Field>
          <Field label="Contact Number" required>
            <input className={inputClass} value={form.sup_contact} onChange={e => setForm(f => ({ ...f, sup_contact: e.target.value }))} />
          </Field>
          <Field label="Address">
            <input className={inputClass} value={form.sup_address} onChange={e => setForm(f => ({ ...f, sup_address: e.target.value }))} />
          </Field>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setEditSupplier(null)} className={`${btnSecondary} flex-1`}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className={`${btnPrimary} flex-1`}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Deactivate Confirm Modal ── */}
      {deleteTarget && (
        <Modal title="Deactivate Supplier" onClose={() => setDeleteTarget(null)}>
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="m-0 font-semibold text-amber-800 text-sm">Do you want to deactivate this supplier?</p>
              <p className="m-0 mt-1 text-amber-700 text-xs">The supplier will be deactivated and hidden from all branches.</p>
            </div>
          </div>
          <p className="text-gray-600 text-base m-0 mb-6">Deactivate <strong>{deleteTarget.sup_name}</strong>?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className={`${btnSecondary} flex-1`}>Cancel</button>
            <button onClick={handleDelete} disabled={saving} className={`${btnDanger} flex-1`}>
              {saving ? "Deactivating..." : "Deactivate"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Restore Confirm Modal ── */}
      {restoreTarget && (
        <Modal title="Restore Supplier" onClose={() => setRestoreTarget(null)}>
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-5">
            <span className="text-2xl">♻️</span>
            <div>
              <p className="m-0 font-semibold text-green-800 text-sm">Restore this supplier</p>
              <p className="m-0 mt-1 text-green-700 text-xs">The supplier will become active again and will be visible to their previously assigned branches.</p>
            </div>
          </div>
          <p className="text-gray-600 text-base m-0 mb-6">Restore <strong>{restoreTarget.sup_name}</strong>?</p>
          <div className="flex gap-3">
            <button onClick={() => setRestoreTarget(null)} className={`${btnSecondary} flex-1`}>Cancel</button>
            <button onClick={handleRestore} disabled={saving} className={`${btnSuccess} flex-1`}>
              {saving ? "Restoring..." : "Restore"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminSupplierManagement;
