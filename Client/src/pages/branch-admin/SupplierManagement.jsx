import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import ToastMessage from "../../components/branch-admin/ToastMessage";
import { connectSocket, getSocket, SOCKET_EVENTS } from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
import { getSuppliers, createSupplier, updateSupplier } from "../../services/api";
import SupplierDetailView from "../../components/branch-admin/SupplierDetailView";
import { FaExclamationTriangle } from "react-icons/fa";
import { validateSupplierContact } from "../../utils/supplierValidation";

// ─── Modal & Field Components ────────────────────────────────────────────────
const Modal = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-[540px] max-w-full max-h-[90vh] flex flex-col shadow-2xl">
      <div className="flex justify-between items-start px-8 pt-8 pb-4 shrink-0">
        <div>
          <h2 className="m-0 text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="m-0 mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <button
          onClick={onClose}
          className="bg-gray-100 hover:bg-gray-200 border-none rounded-lg w-9 h-9 flex items-center justify-center cursor-pointer text-lg text-gray-500 transition-colors shrink-0 ml-4"
        >
          ×
        </button>
      </div>
      <div className="overflow-y-auto px-8 pb-8 flex-1">{children}</div>
    </div>
  </div>
);

const Field = ({ label, required, error, children }) => (
  <div className="mb-4">
    <div className="flex justify-between items-center mb-1.5 gap-2 flex-wrap">
      <label className="block text-sm font-semibold text-gray-700 m-0">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {error && (
        <span className="text-xs font-semibold text-red-500 inline-flex items-center gap-1">
          <FaExclamationTriangle size={11} /> {error}
        </span>
      )}
    </div>
    {children}
    {error && (
      <span className="text-xs font-medium text-red-500 mt-1 block">
        {error}
      </span>
    )}
  </div>
);

const inputClass = "w-full px-3.5 py-2.5 rounded-lg border-2 border-gray-300 text-sm text-gray-900 outline-none transition-colors focus:border-[#2E3E8F]";
const inputErrorClass = "w-full px-3.5 py-2.5 rounded-lg border-2 border-red-500 bg-red-50 text-sm text-gray-900 outline-none transition-colors focus:border-red-600 focus:ring-1 focus:ring-red-500";
const btnClass = "px-5 py-2.5 rounded-lg border-none cursor-pointer font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed";
const btnPrimary = `${btnClass} bg-[#2E3E8F] text-white`;
const btnSecondary = `${btnClass} bg-gray-100 text-gray-700`;

// ─── Main Branch Admin Supplier Page ──────────────────────────────────────────
const SupplierManagement = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success"
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form & validation state
  const [form, setForm] = useState({
    sup_name: "",
    sup_email: "",
    sup_contact: "",
    sup_address: ""
  });
  const [contactError, setContactError] = useState("");
  const [contactTouched, setContactTouched] = useState(false);

  const { user } = useAuth();

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      try {
        const data = await getSuppliers();
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (apiError) {
        console.warn("API service failed, trying direct fetch:", apiError);
        const token = localStorage.getItem("token");
        const res = await fetch("/api/suppliers", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error(`Failed to fetch suppliers (${res.status})`);
        const data = await res.json();
        const suppliersList = Array.isArray(data) ? data : data.suppliers || [];
        setSuppliers(suppliersList);
        localStorage.setItem("cached_suppliers", JSON.stringify(suppliersList));
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load suppliers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showToast = (message, type = "success") => {
    setToast({
      show: true,
      message,
      type
    });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  };

  // Socket setup
  useEffect(() => {
    const companyId = user?.com_id;
    if (!companyId) return;

    const socket = connectSocket();
    const handleConnect = () => {
      console.log("Socket connected in Branch Admin SupplierManagement");
      setSocketConnected(true);
    };
    const handleDisconnect = () => {
      console.log("Socket disconnected in Branch Admin SupplierManagement");
      setSocketConnected(false);
    };

    const handleSupplierCreated = newSupplier => {
      setSuppliers(prev => {
        const exists = prev.some(s => s.sup_id === newSupplier.sup_id || s.sup_email?.toLowerCase() === newSupplier.sup_email?.toLowerCase());
        if (exists) return prev;
        const updated = [newSupplier, ...prev];
        localStorage.setItem("cached_suppliers", JSON.stringify(updated));
        showToast(`New supplier "${newSupplier.sup_name}" added!`, "success");
        return updated;
      });
    };

    const handleSupplierUpdated = updatedSupplier => {
      setSuppliers(prev => {
        const updated = prev.map(s => s.sup_id === updatedSupplier.sup_id ? { ...s, ...updatedSupplier } : s);
        localStorage.setItem("cached_suppliers", JSON.stringify(updated));
        showToast(`Supplier "${updatedSupplier.sup_name}" updated`, "info");
        return updated;
      });
      setSelectedSupplier(prev => prev && prev.sup_id === updatedSupplier.sup_id ? { ...prev, ...updatedSupplier } : prev);
    };

    const handleSupplierDeleted = data => {
      setSuppliers(prev => {
        const deletedSupplier = prev.find(s => s.sup_id === data.sup_id);
        const updated = prev.filter(s => s.sup_id !== data.sup_id);
        localStorage.setItem("cached_suppliers", JSON.stringify(updated));
        if (deletedSupplier) {
          showToast(`Supplier "${deletedSupplier.sup_name}" deleted`, "info");
        }
        if (selectedSupplier?.sup_id === data.sup_id) {
          setSelectedSupplier(null);
        }
        return updated;
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("supplier:created", handleSupplierCreated);
    socket.on("supplier:updated", handleSupplierUpdated);
    socket.on("supplier:deleted", handleSupplierDeleted);

    if (socket.connected) {
      handleConnect();
    }

    fetchSuppliers();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("supplier:created", handleSupplierCreated);
      socket.off("supplier:updated", handleSupplierUpdated);
      socket.off("supplier:deleted", handleSupplierDeleted);
    };
  }, [user?.com_id, fetchSuppliers, selectedSupplier?.sup_id]);

  // Modal open/close handlers
  const openCreate = () => {
    setForm({
      sup_name: "",
      sup_email: "",
      sup_contact: "",
      sup_address: ""
    });
    setContactError("");
    setContactTouched(false);
    setShowCreate(true);
  };

  const openEdit = (sup, e) => {
    e?.stopPropagation?.();
    setForm({
      sup_name: sup.sup_name || "",
      sup_email: sup.sup_email || "",
      sup_contact: sup.sup_contact || "",
      sup_address: sup.sup_address || ""
    });
    setContactError("");
    setContactTouched(false);
    setEditSupplier(sup);
  };

  const handleContactChange = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, sup_contact: val }));
    const err = validateSupplierContact(val);
    if (contactTouched || contactError) {
      setContactError(err);
    }
  };

  const handleContactBlur = () => {
    setContactTouched(true);
    const err = validateSupplierContact(form.sup_contact);
    setContactError(err);
  };

  const handleSave = async () => {
    setContactTouched(true);
    const contactErr = validateSupplierContact(form.sup_contact);
    if (contactErr) {
      setContactError(contactErr);
      return;
    }

    if (!form.sup_name?.trim()) {
      showToast("Supplier name is required", "error");
      return;
    }
    if (!form.sup_email?.trim()) {
      showToast("Supplier email is required", "error");
      return;
    }

    setSaving(true);
    try {
      if (editSupplier) {
        await updateSupplier(editSupplier.sup_id, {
          sup_name: form.sup_name.trim(),
          sup_email: form.sup_email.trim(),
          sup_contact: form.sup_contact.trim(),
          sup_address: form.sup_address?.trim() || ""
        });
        showToast("Supplier updated successfully!", "success");
        setEditSupplier(null);
      } else {
        const branchId = user?.b_id || user?.B_id;
        await createSupplier({
          sup_name: form.sup_name.trim(),
          sup_email: form.sup_email.trim(),
          sup_contact: form.sup_contact.trim(),
          sup_address: form.sup_address?.trim() || "",
          b_id: branchId ? Number(branchId) : undefined
        });
        showToast("Supplier created successfully!", "success");
        setShowCreate(false);
      }
      setContactError("");
      setContactTouched(false);
      fetchSuppliers();
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || err.message || "Failed to save supplier";
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Filter suppliers by search
  const filtered = suppliers.filter(s => {
    const searchLower = (search || "").toLowerCase().trim();
    if (!searchLower) return true;
    return (
      s.sup_name?.toLowerCase().includes(searchLower) ||
      s.sup_email?.toLowerCase().includes(searchLower) ||
      s.sup_contact?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <Header title={t("branch_admin.suppliers", "Suppliers")} role="Branch Admin" />
        {toast.show && (
          <ToastMessage
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(t => ({ ...t, show: false }))}
          />
        )}

        {/* Socket connection indicator */}
        {socketConnected && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs shadow-lg z-50">
            {t("branch_admin.live_updates_active", "Live Updates Active")}
          </div>
        )}

        <div className="p-8 max-w-[1200px] mx-auto">
          {selectedSupplier ? (
            <SupplierDetailView
              supplier={selectedSupplier}
              onBack={() => setSelectedSupplier(null)}
              showToast={showToast}
              onEditSupplier={() => openEdit(selectedSupplier)}
            />
          ) : (
            <>
              {/* Header + Add Supplier Button */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 m-0">
                    {t("branch_admin.supplier_directory", "Supplier Directory")}
                  </h1>
                  <p className="text-gray-500 mt-1.5 text-sm">
                    {t("branch_admin.suppliers_assigned_to_your_branch_contac", "Suppliers assigned to your branch.")}
                  </p>
                </div>
                <button onClick={openCreate} className={btnPrimary}>
                  {t("company_admin.add_supplier", "+ Add Supplier")}
                </button>
              </div>

              {/* Search Filter */}
              <div className="mb-6">
                <input
                  placeholder={t("company_admin.search_by_name_email_or_contact", "Search by name, email or contact...")}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`${inputClass} max-w-[340px]`}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-red-600 mb-5 font-medium">
                  {error}
                </div>
              )}

              {isLoading ? (
                <p className="text-gray-500">{t("branch_admin.loading_suppliers", "Loading suppliers...")}</p>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <div className="text-5xl mb-3">🏢</div>
                  <p className="font-semibold text-base mb-1">
                    {search ? "No suppliers match your search" : t("branch_admin.no_suppliers_assigned_to_this_branch", "No suppliers assigned to this branch")}
                  </p>
                  <p className="text-sm">
                    {search ? "Try a different search term." : "Click '+ Add Supplier' above to create a new supplier."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filtered.map(sup => (
                    <div
                      key={sup.sup_id}
                      className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-200 flex items-center justify-center text-xl shrink-0">
                            🏢
                          </div>
                          <h3 className="m-0 text-base font-bold text-gray-900 truncate">{sup.sup_name}</h3>
                        </div>

                        <div className="text-sm text-gray-600 flex flex-col gap-2">
                          <div className="flex gap-2">📧 <span className="truncate">{sup.sup_email}</span></div>
                          <div className="flex gap-2">📞 <span>{sup.sup_contact}</span></div>
                          <div className="flex gap-2">📍 <span className="text-xs mt-0.5 truncate">{sup.sup_address || "No address provided"}</span></div>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2">
                        <button
                          onClick={(e) => openEdit(sup, e)}
                          className="flex-1 py-1.5 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-semibold text-xs cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          {t("buttons.edit", "Edit")}
                        </button>
                        <button
                          onClick={() => setSelectedSupplier(sup)}
                          className="flex-1 py-1.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 text-indigo-600 font-semibold text-xs cursor-pointer hover:bg-indigo-100 transition-colors"
                        >
                          {t("branch_admin.view_orders", "View Orders")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Add New Supplier Modal ── */}
      {showCreate && (
        <Modal
          title="Add New Supplier"
          subtitle="Add a supplier to this branch"
          onClose={() => {
            setShowCreate(false);
            setContactError("");
            setContactTouched(false);
          }}
        >
          <Field label={t("fields.supplier_name", "Supplier Name")} required>
            <input
              className={inputClass}
              value={form.sup_name}
              onChange={e => setForm(f => ({ ...f, sup_name: e.target.value }))}
              placeholder={t("company_admin.e_g_fresh_farms_ltd", "e.g. Fresh Farms Ltd.")}
            />
          </Field>
          <Field label={t("fields.email", "Email")} required>
            <input
              className={inputClass}
              type="email"
              value={form.sup_email}
              onChange={e => setForm(f => ({ ...f, sup_email: e.target.value }))}
              placeholder={t("company_admin.supplier_email_com", "supplier@email.com")}
            />
          </Field>
          <Field
            label={t("fields.contact_number", "Contact Number")}
            required
            error={contactTouched ? contactError : ""}
          >
            <input
              className={contactTouched && contactError ? inputErrorClass : inputClass}
              value={form.sup_contact}
              onChange={handleContactChange}
              onBlur={handleContactBlur}
              placeholder={t("company_admin.94_77_000_0000", "+94 77 000 0000")}
            />
          </Field>
          <Field label={t("fields.address", "Address")}>
            <input
              className={inputClass}
              value={form.sup_address}
              onChange={e => setForm(f => ({ ...f, sup_address: e.target.value }))}
              placeholder={t("company_admin.123_main_st_colombo", "123, Main St, Colombo")}
            />
          </Field>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setShowCreate(false);
                setContactError("");
                setContactTouched(false);
              }}
              className={`${btnSecondary} flex-1`}
            >
              {t("buttons.cancel", "Cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (contactTouched && Boolean(contactError))}
              className={`${btnPrimary} flex-1 ${
                contactTouched && contactError
                  ? "opacity-60 cursor-not-allowed bg-gray-400 hover:bg-gray-400"
                  : ""
              }`}
            >
              {saving ? t("buttons.saving", "Saving...") : "Create Supplier"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Supplier Modal ── */}
      {editSupplier && (
        <Modal
          title="Edit Supplier"
          subtitle={`Editing: ${editSupplier.sup_name}`}
          onClose={() => {
            setEditSupplier(null);
            setContactError("");
            setContactTouched(false);
          }}
        >
          <Field label={t("fields.supplier_name", "Supplier Name")} required>
            <input
              className={inputClass}
              value={form.sup_name}
              onChange={e => setForm(f => ({ ...f, sup_name: e.target.value }))}
            />
          </Field>
          <Field label={t("fields.email", "Email")} required>
            <input
              className={inputClass}
              type="email"
              value={form.sup_email}
              onChange={e => setForm(f => ({ ...f, sup_email: e.target.value }))}
            />
          </Field>
          <Field
            label={t("fields.contact_number", "Contact Number")}
            required
            error={contactTouched ? contactError : ""}
          >
            <input
              className={contactTouched && contactError ? inputErrorClass : inputClass}
              value={form.sup_contact}
              onChange={handleContactChange}
              onBlur={handleContactBlur}
              placeholder="+94 77 000 0000"
            />
          </Field>
          <Field label={t("fields.address", "Address")}>
            <input
              className={inputClass}
              value={form.sup_address}
              onChange={e => setForm(f => ({ ...f, sup_address: e.target.value }))}
            />
          </Field>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setEditSupplier(null);
                setContactError("");
                setContactTouched(false);
              }}
              className={`${btnSecondary} flex-1`}
            >
              {t("buttons.cancel", "Cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (contactTouched && Boolean(contactError))}
              className={`${btnPrimary} flex-1 ${
                contactTouched && contactError
                  ? "opacity-60 cursor-not-allowed bg-gray-400 hover:bg-gray-400"
                  : ""
              }`}
            >
              {saving ? t("buttons.saving", "Saving...") : t("buttons.save_changes", "Save Changes")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SupplierManagement;