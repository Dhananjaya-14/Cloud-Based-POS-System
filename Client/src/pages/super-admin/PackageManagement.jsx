import React, { useEffect, useState } from "react";
import { FaSearch, FaPlus, FaPen, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import Sidebar from "../../components/super-admin/Sidebar";
import Header from "../../components/super-admin/Header";
import { getPackages, createPackage, updatePackage } from "../../services/api";
import Spinner from "../../components/super-admin/Spinner";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";

const AVAILABLE_MODULES = [
  { id: "has_inventory",  label: "Inventory Management" },
  { id: "has_kitchen",    label: "Kitchen Display (KOT)" },
  { id: "has_waiter",     label: "Waiter POS Module" },
  { id: "has_suppliers",  label: "Suppliers Management" },
  { id: "has_reports",    label: "Advanced Reports" },
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
  const [moduleToAdd, setModuleToAdd] = useState("");
  const { toasts, removeToast, toast } = useToast();

  const defaultForm = () => ({
    package_id: null,
    package_name: "",
    max_users: 10,
    max_branches: 1,
    selected_modules: ["has_inventory", "has_kitchen"],
  });

  const [formData, setFormData] = useState(defaultForm());

  useEffect(() => { fetchData(); }, []);

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
    setModuleToAdd("");
    setModalMode("add");
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (pkg) => {
    const feats = pkg.features || {};
    const modules = Object.keys(feats).filter(k => k.startsWith("has_") && feats[k] === true);
    setFormData({
      package_id: pkg.package_id,
      package_name: pkg.package_name,
      max_users: feats.max_users ?? 10,
      max_branches: feats.max_branches ?? 1,
      selected_modules: modules,
    });
    setModuleToAdd("");
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
        max_users: parseInt(formData.max_users, 10),
        max_branches: parseInt(formData.max_branches, 10),
      };
      formData.selected_modules.forEach(m => { featuresObj[m] = true; });

      const payload = { package_name: formData.package_name, features: featuresObj };

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

  const addModule = () => {
    if (moduleToAdd && !formData.selected_modules.includes(moduleToAdd)) {
      setFormData(f => ({ ...f, selected_modules: [...f.selected_modules, moduleToAdd] }));
      setModuleToAdd("");
    }
  };

  const removeModule = (id) => {
    setFormData(f => ({ ...f, selected_modules: f.selected_modules.filter(m => m !== id) }));
  };

  const filteredPackages = packages.filter(p =>
    (p.package_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
        <Header title="Package Management" />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Spinner size={44} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
        <Header title="Package Management" />

        <div style={{ padding: "30px 40px", flex: 1 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, color: "#111827" }}>Package Management</h1>
            <p style={{ margin: 0, color: "#4B5563", fontSize: 15 }}>Create and manage Packages and their feature sets</p>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", background: "#F3F4F6", padding: "10px 16px", borderRadius: 8, width: 320 }}>
                <FaSearch color="#9CA3AF" size={14} />
                <input type="text" placeholder="Search packages..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ border: "none", background: "transparent", marginLeft: 10, outline: "none", width: "100%", fontSize: 14 }} />
              </div>
              <button onClick={openAddModal}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#0ea5e9", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                <FaPlus /> Add New Package
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
              {filteredPackages.length > 0 ? filteredPackages.map(pkg => (
                <div key={pkg.package_id} style={{
                  background: "#fff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "default"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.05)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#111827" }}>{pkg.package_name}</h3>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#6B7280" }}>Comprehensive Package</p>
                    </div>
                    <button onClick={() => openEditModal(pkg)} style={iconBtnStyle} title="Edit Package">
                      <FaPen size={14} color="#6B7280" />
                    </button>
                  </div>
                  
                  <div style={{ display: "flex", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ flex: 1, background: "#ecf1f7b1", borderRadius: 8, padding: 8 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#9CA3AF", letterSpacing: 0.5 }}>Max Branches</p>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#3730A3" }}>{pkg.features?.max_branches ?? "—"}</p>
                    </div>
                    <div style={{ flex: 1, background: "#ecf1f7b1", borderRadius: 8, padding: 8 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#9CA3AF", letterSpacing: 0.5 }}>Max Users</p>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#3730A3" }}>{pkg.features?.max_users ?? "—"}</p>
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#374151" }}>Included Features</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {AVAILABLE_MODULES.map(m => {
                        const hasModule = pkg.features?.[m.id] === true;
                        return (
                          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {hasModule ? (
                              <FaCheckCircle size={16} color="#10B981" />
                            ) : (
                              <FaTimesCircle size={16} color="#D1D5DB" />
                            )}
                            <span style={{ fontSize: 14, color: hasModule ? "#374151" : "#9CA3AF", fontWeight: hasModule ? 500 : 400 }}>
                              {m.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: 40, textAlign: "center", color: "#6B7280", gridColumn: "1 / -1", background: "#F9FAFB", borderRadius: 12, border: "2px dashed #E5E7EB" }}>
                  <FaBox size={40} color="#D1D5DB" style={{ marginBottom: 16 }} />
                  <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600, color: "#374151" }}>No Packages Found</h3>
                  <p style={{ margin: 0, fontSize: 14 }}>Try adjusting your search or add a new package.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 520, borderRadius: 16, padding: "28px 32px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setIsModalOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "#F3F4F6", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, color: "#6B7280" }}>&times;</span>
            </button>

            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
              {modalMode === "add" ? "Create New Package" : "Edit Package"}
            </h2>

            {modalError && (
              <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FEE2E2", color: "#EF4444", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {modalError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Package Name</label>
                <input type="text" placeholder="e.g. Basic, Standard, Premium" style={inputStyle}
                  value={formData.package_name} onChange={e => setFormData(f => ({ ...f, package_name: e.target.value }))} />
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Max Branches</label>
                  <input type="number" min="1" style={inputStyle} value={formData.max_branches}
                    onChange={e => setFormData(f => ({ ...f, max_branches: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Max Users</label>
                  <input type="number" min="1" style={inputStyle} value={formData.max_users}
                    onChange={e => setFormData(f => ({ ...f, max_users: e.target.value }))} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Included Modules</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <select style={{ ...inputStyle, flex: 1 }} value={moduleToAdd} onChange={e => setModuleToAdd(e.target.value)}>
                    <option value="">— Select a module to add —</option>
                    {AVAILABLE_MODULES.filter(m => !formData.selected_modules.includes(m.id)).map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <button onClick={addModule}
                    style={{ background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "0 18px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                    Add
                  </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12, background: "#F9FAFB", borderRadius: 8, minHeight: 44 }}>
                  {formData.selected_modules.length === 0
                    ? <span style={{ fontSize: 13, color: "#9CA3AF" }}>No modules selected</span>
                    : formData.selected_modules.map(id => {
                      const mod = AVAILABLE_MODULES.find(m => m.id === id);
                      return (
                        <div key={id} style={{ display: "flex", alignItems: "center", background: "#E0E7FF", color: "#3730A3", padding: "5px 10px", borderRadius: 20, fontSize: 13, fontWeight: 500, gap: 6 }}>
                          <span>{mod ? mod.label : id}</span>
                          <button onClick={() => removeModule(id)}
                            style={{ background: "transparent", border: "none", color: "#3730A3", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>&times;</button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 28 }}>
              <button onClick={() => !isSaving && setIsModalOpen(false)} disabled={isSaving}
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving}
                style={{width: 160,height: 42, display: "flex",alignItems: "center",justifyContent: "center",gap: 8,borderRadius: 8,border: "none",background: "#3B82F6", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1, flexShrink: 0 }}
              >
                {isSaving && <Spinner size={14} color="#fff" />}
                {isSaving ? "Saving..." : "Save Package"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle = { padding: "14px 10px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#111827" };
const tdStyle = { padding: "14px 10px", fontSize: 14, color: "#4B5563", verticalAlign: "middle" };
const iconBtnStyle = { background: "#F3F4F6", border: "none", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #D1D5DB", outline: "none", fontSize: 14, boxSizing: "border-box" };

export default PackageManagement;
