import React, { useEffect, useState } from "react";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import { getPackages, createPackage, updatePackage, deletePackage } from "../../services/api";
import Spinner from "../../components/super-admin/Spinner";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  XCircle,
  X,
} from "lucide-react";

const AVAILABLE_MODULES = [
  { id: "has_inventory", label: "Inventory Management" },
  { id: "has_kitchen", label: "Kitchen Display (KOT)" },
  { id: "has_waiter", label: "Waiter POS Module" },
  { id: "has_reports", label: "Advanced Reports" },
  { id: "has_promotions", label: "Promotions & Discounts" },
];

const PackageManagement = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts, removeToast, toast } = useToast();

  const defaultForm = () => ({
    package_id: null,
    package_name: "",
    max_users: 10,
    max_branches: 1,
    selected_modules: ["has_inventory", "has_kitchen"],
  });

  const [formData, setFormData] = useState(defaultForm());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await getPackages();
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData(defaultForm());
    setModalMode("add");
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (pkg) => {
    const feats = pkg.features || {};
    const modules = Object.keys(feats).filter(
      (k) => k.startsWith("has_") && feats[k] === true
    );

    setFormData({
      package_id: pkg.package_id,
      package_name: pkg.package_name,
      max_users: feats.max_users ?? 10,
      max_branches: feats.max_branches ?? 1,
      selected_modules: modules,
    });
    setModalMode("edit");
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.package_name.trim()) {
      setModalError("Please enter a package name.");
      return;
    }
    setIsSaving(true);
    setModalError("");
    try {
      const featuresObj = {
        max_users: parseInt(formData.max_users, 10) || 1,
        max_branches: parseInt(formData.max_branches, 10) || 1,
      };
      formData.selected_modules.forEach((m) => {
        featuresObj[m] = true;
      });

      const payload = {
        package_name: formData.package_name,
        features: featuresObj,
      };

      if (modalMode === "add") {
        await createPackage(payload);
        toast.success("Package Created Successfully");
      } else {
        await updatePackage(formData.package_id, payload);
        toast.success("Package Updated Successfully");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.error || err.message || "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const initiateDelete = (pkg) => {
    setPackageToDelete(pkg);
    setDeleteModalOpen(true);
  };

  const confirmDeletePackage = async () => {
    if (!packageToDelete) return;
    setIsDeleting(true);
    try {
      await deletePackage(packageToDelete.package_id);
      toast.success("Package deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.error || err.message || "Failed to delete package."
      );
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setPackageToDelete(null);
    }
  };

  const toggleModule = (id) => {
    setFormData((f) => {
      const exists = f.selected_modules.includes(id);
      return {
        ...f,
        selected_modules: exists
          ? f.selected_modules.filter((m) => m !== id)
          : [...f.selected_modules, id],
      };
    });
  };

  const filteredPackages = packages.filter((p) =>
    (p.package_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F0]">
        <Sidebar />
        <div className="sa-main-content flex-1 ml-[240px] flex flex-col">
          <Header title="Package Management" />
          <div className="flex-1 flex justify-center items-center min-h-[calc(100vh-70px)]">
            <div className="flex flex-col items-center gap-4">
              <Spinner size={44} />
              <p className="m-0 text-slate-500 font-medium text-sm">Loading Packages...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F6F0]">
      <Sidebar />

      <div className="sa-main-content flex-1 ml-[240px] flex flex-col min-w-0">
        <Header title="Package Management" />

        <div className="p-6 md:p-8 space-y-6">
          {/* Header Title & Subtitle */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 m-0">Packages</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 m-0">
              {packages.length} package{packages.length === 1 ? "" : "s"} configured across your platform
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            />
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {filteredPackages.map((pkg) => {
              const feats = pkg.features || {};

              return (
                <div
                  key={pkg.package_id}
                  className="bg-white rounded-2xl p-6 flex flex-col justify-between relative transition-all duration-200 hover:shadow-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                >

                  <div>
                    {/* Header Row: Title & Action Buttons */}
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="text-lg font-bold text-slate-900 m-0">
                        {pkg.package_name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(pkg)}
                          title="Edit Package"
                          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
                        >
                          <Pencil size={13} strokeWidth={2} />
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => initiateDelete(pkg)}
                          title="Delete Package"
                          className="w-7 h-7 rounded-lg border border-red-200/80 flex items-center justify-center text-red-500 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-colors bg-white cursor-pointer"
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {/* Subtitle / Package Description */}
                    <p className="text-xs text-slate-400 m-0 mb-5">
                      Comprehensive Package
                    </p>

                    {/* Max Branches & Max Users Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-[#F8F9FA] rounded-xl p-3">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          MAX BRANCHES
                        </span>
                        <span className="text-xl font-bold text-slate-900 leading-tight">
                          {feats.max_branches ?? "1"}
                        </span>
                      </div>
                      <div className="bg-[#F8F9FA] rounded-xl p-3">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          MAX USERS
                        </span>
                        <span className="text-xl font-bold text-slate-900 leading-tight">
                          {feats.max_users ?? "10"}
                        </span>
                      </div>
                    </div>

                    {/* Included Features List */}
                    <div>
                      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                        INCLUDED FEATURES
                      </span>
                      <div className="space-y-2.5">
                        {AVAILABLE_MODULES.map((m) => {
                          const isIncluded = feats[m.id] === true;
                          return (
                            <div
                              key={m.id}
                              className="flex items-center gap-2.5 text-xs"
                            >
                              {isIncluded ? (
                                <Check
                                  size={15}
                                  strokeWidth={2.5}
                                  className="text-[#0D9488] shrink-0"
                                />
                              ) : (
                                <XCircle
                                  size={15}
                                  strokeWidth={1.5}
                                  className="text-slate-300 shrink-0"
                                />
                              )}
                              <span
                                className={
                                  isIncluded
                                    ? "text-slate-700 font-medium"
                                    : "text-slate-400 font-normal"
                                }
                              >
                                {m.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* "Add New Package" Card */}
            <div
              onClick={openAddModal}
              className="border-2 border-dashed border-slate-200/90 rounded-2xl min-h-[380px] flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:border-teal-500 hover:bg-white/60 transition-all group bg-transparent"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-105 group-hover:bg-[#E6F7F5] group-hover:text-[#0D9488] transition-all mb-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <Plus size={22} strokeWidth={2} />
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-teal-700 transition-colors">
                Add New Package
              </span>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* ─── Create / Edit Package Modal ─────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 m-0 mb-1">
              {modalMode === "add" ? "Create New Package" : "Edit Package"}
            </h2>
            <p className="text-xs text-slate-500 m-0 mb-5">
              Configure package features and capacity limits.
            </p>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs mb-4">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              {/* Package Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Package Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Basic, Standard, Premium"
                  value={formData.package_name}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, package_name: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>

              {/* Max Branches & Max Users */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Max Branches
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_branches}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, max_branches: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Max Users
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_users}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, max_users: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>

              {/* Included Features / Modules Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Included Features
                </label>
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  {AVAILABLE_MODULES.map((m) => {
                    const isSelected = formData.selected_modules.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModule(m.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-white border-teal-500/40 shadow-xs"
                            : "bg-white/40 border-slate-200 hover:bg-white"
                        }`}
                      >
                        <span
                          className={`text-xs font-medium ${
                            isSelected ? "text-slate-900 font-semibold" : "text-slate-500"
                          }`}
                        >
                          {m.label}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isSelected
                              ? "bg-[#0D9488] border-[#0D9488] text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check size={13} strokeWidth={2.5} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                disabled={isSaving}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="h-10 px-5 rounded-xl bg-[#0D9488] text-white text-xs font-semibold hover:bg-teal-700 cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving && <Spinner size={14} color="#fff" />}
                <span>{isSaving ? "Saving..." : "Save Package"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ───────────────────────────────── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 m-0 mb-1.5">
              Delete Package?
            </h3>
            <p className="text-xs text-slate-500 m-0 mb-6 leading-relaxed">
              Are you sure you want to delete the package{" "}
              <strong className="text-slate-700 font-semibold">
                "{packageToDelete?.package_name}"
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => !isDeleting && setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePackage}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDeleting && <Spinner size={14} color="#fff" />}
                <span>{isDeleting ? "Deleting..." : "Delete Package"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageManagement;
