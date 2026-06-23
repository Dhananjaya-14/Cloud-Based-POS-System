import React, { useEffect, useState } from "react";
import { FaSearch, FaFilter, FaPlus, FaPen, FaTrash } from "react-icons/fa";
import Sidebar from "../../components/super-admin/Sidebar";
import Header from "../../components/super-admin/Header";
import { getCompanies, createCompany, updateCompany, deleteCompany, getCurrentUser, setAuthToken, logout } from "../../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import ToggleSwitch from "../../components/super-admin/ToggleSwitch";
import Spinner from "../../components/super-admin/Spinner";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^07[0-9]{8}$/;

const StatusBadge = ({ status }) => {
  const statusStr = String(status || "").toLowerCase();
  const isActive = statusStr === "active" || statusStr === "true";
  return (
    <span
      style={{
        padding: "4px 14px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: isActive ? "#DCFCE7" : "#FEE2E2",
        color: isActive ? "#16A34A" : "#EF4444",
      }}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const HotelManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [togglingId, setTogglingId] = useState(null);
  const { toasts, removeToast, toast } = useToast();
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    location: "",
    email: "",
    phone: "",
    date: "",
    status: true,
  });
  const navigate = useNavigate();
  const location = useLocation();

  const handleToggleStatus = async (companyId, currentStatus) => {
    setTogglingId(companyId);
    try {
      const statusStr = String(currentStatus || "").toLowerCase();
      const isActive = statusStr === "active" || statusStr === "true" || currentStatus === true;
      const nextStatus = !isActive;

      // Optimistic update locally
      setCompanies((prev) =>
        prev.map((c) =>
          c.com_id === companyId ? { ...c, c_status: nextStatus } : c
        )
      );

      // Call API
      await updateCompany(companyId, { c_status: nextStatus });
    } catch (err) {
      console.error("Error toggling company status:", err);
      // Revert on error
      fetchData();
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    } finally {
      setTogglingId(null);
    }
  };

  const openAddModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFormData({ id: null, name: "", location: "", email: "", phone: "", date: today, status: true });
    setModalMode("add");
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (company) => {
    setFormData({
      id: company.com_id,
      name: company.com_name || "",
      location: company.location || "",
      email: company.c_email || "",
      phone: company.phone || "",
      date: company.reg_date ? new Date(company.reg_date).toISOString().slice(0, 10) : "",
      status: company.c_status === true || String(company.c_status).toLowerCase() === "active",
    });
    setModalMode("edit");
    setModalError("");
    setIsModalOpen(true);
  };

  const openDeleteModal = (company) => {
    setCompanyToDelete(company);
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);
    fetchData();

    if (location.state?.openAddModal) {
      openAddModal();
      window.history.replaceState({}, document.title);
    }
  }, [navigate, location.state]);

  const fetchData = async () => {
    try {
      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setEmailError("");
    setPhoneError("");

   if (!formData.name.trim()) {
  setModalError("Please fill in company name.");
  return;
}

if (!formData.location.trim()) {
  setModalError("Please fill in company location.");
  return;
}

if (!formData.email.trim()) {
  setEmailError("Please enter a contact email address.");
  return;
}

if (!EMAIL_RE.test(formData.email.trim())) {
  setEmailError("Please enter a valid email address (e.g. name@example.com).");
  return;
}

if (!formData.phone.trim()) {
  setPhoneError("Please enter a phone number.");
  return;
}

if (!PHONE_RE.test(formData.phone.trim())) {
  setPhoneError("Phone number must be 10 digits and start with 07 (e.g. 0771234567).");
  return;
}
const today = new Date().toISOString().slice(0, 10);
if (modalMode === "add" && formData.date < today) {
  setModalError("Registered date cannot be in the past.");
  return;
}
setIsSaving(true);

    setIsSaving(true);
    setModalError("");
    try {
      const payload = {
        com_name: formData.name,
        location: formData.location,
        phone: formData.phone,
        c_status: !!formData.status,
        c_email: formData.email,
        reg_date: formData.date || new Date().toISOString().slice(0, 10),
      };

      if (modalMode === "add") {
        await createCompany(payload);
        toast.success("Company Created", `"${formData.name}" was successfully added.`);
      } else {
        await updateCompany(formData.id, payload);
        toast.success("Company Updated", `"${formData.name}" details were saved.`);
      }
      
      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error saving company:", err);
      setModalError(err.response?.data?.message || err.message || "Failed to save company.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCompanies = companies.filter(
    (c) => {
      const searchName = (c.com_name|| "").toLowerCase().includes(searchQuery.toLowerCase());
      const searchLocation=(c.location|| "").toLowerCase().includes(searchQuery.toLowerCase());
      const searchEmail=(c.c_email|| "").toLowerCase().includes(searchQuery.toLowerCase());
      const searchPhone=(c.phone|| "").toLowerCase().includes(searchQuery.toLowerCase());
      const searchMatch=searchName||searchLocation||searchEmail||searchPhone;

      const s = String(c.c_status || "").toLowerCase();
      const isActive = s === "active" || s === "true" || c.c_status === true;
      
      const statusMatch = statusFilter === "All Status" || 
                         (statusFilter === "Active" && isActive) || 
                         (statusFilter === "Inactive" && !isActive);
                         
      return searchMatch && statusMatch;
    }
  );

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const currentCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = async () => {
    if (!companyToDelete?.com_id) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteCompany(companyToDelete.com_id);
      setIsDeleteModalOpen(false);
      fetchData();
      toast.success("Company Deleted", `"${companyToDelete?.com_name}" was removed.`);
    } catch (err) {
      console.error("Error deleting company:", err);
      setDeleteError(err.response?.data?.message || err.message || "Failed to delete company.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
          <Header title="Company Management" />
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 70px)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <Spinner size={44} />
              <p style={{ margin: 0, color: "#6B7280", fontWeight: 600, fontSize: 16 }}>Loading Company Management...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
        <Header title="Company Management" />

        <div style={{ padding: "30px 40px", flex: 1 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, color: "#111827" }}>
              Company Management
            </h1>
            <p style={{ margin: 0, color: "#4B5563", fontSize: 15 }}>
              Manage all companies and their subscriptions
            </p>
          </div>

          {successMessage && (
            <div style={{
              padding: "12px 18px",
              background: successMessage.toLowerCase().includes("deleted") ? "#FEF2F2" : "#ECFDF5",
              border: successMessage.toLowerCase().includes("deleted") ? "1px solid #FEE2E2" : "1px solid #A7F3D0",
              color: successMessage.toLowerCase().includes("deleted") ? "#EF4444" : "#065F46",
              borderRadius: 8, fontSize: 14, fontWeight: 600,
              marginBottom: 20, display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ fontSize: 16 }}>{successMessage.toLowerCase().includes("deleted") ? "🗑️" : "✓"}</span>
              {successMessage}
            </div>
          )}

          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            {/* Toolbar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#F3F4F6",
                  padding: "10px 16px",
                  borderRadius: 8,
                  width: 320,
                }}
              >
                <FaSearch color="#9CA3AF" size={14} />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    marginLeft: 10,
                    outline: "none",
                    width: "100%",
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "#F3F4F6",
                    padding: "10px 16px",
                    borderRadius: 8,
                    cursor: "pointer",
                    gap: 8,
                  }}
                >
                  <FaFilter color="#6B7280" size={14} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      color: "#374151",
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>

                <button
                  onClick={openAddModal}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#0ea5e9",
                    color: "#fff",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <FaPlus /> Add New Company
                </button>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                  <th style={thStyle}>Company Name</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Registered Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: 20 }}>
                      <Spinner />
                    </td>
                  </tr>
                ) : filteredCompanies.length > 0 ? (
                  currentCompanies.map((company, i) => (
                    <tr key={company.com_id || i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={tdStyle}>{company.com_name || "—"}</td>
                      <td style={tdStyle}>{company.location || "—"}</td>
                      <td style={tdStyle}>
                        <div style={{ color: "#374151" }}>{company.c_email || "—"}</div>
                        <div style={{ color: "#9CA3AF", fontSize: 13, marginTop: 4 }}>
                          {company.phone || "—"}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {company.reg_date
                          ? new Date(company.reg_date).toISOString().slice(0, 10).split('-').reverse().join('-')
                          : "—"}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ToggleSwitch
                            checked={String(company.c_status || "").toLowerCase() === "active" || String(company.c_status || "").toLowerCase() === "true" || company.c_status === true}
                            onChange={() => handleToggleStatus(company.com_id, company.c_status)}
                            disabled={togglingId === company.com_id}
                          />
                          {togglingId === company.com_id && <Spinner size={16} />}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => openEditModal(company)} style={iconButtonStyle}>
                            <FaPen size={12} color="#6B7280" />
                          </button>
                          <button 
                            onClick={() => openDeleteModal(company)}
                            style={{ ...iconButtonStyle, background: "#FEE2E2" }}
                          >
                            <FaTrash size={12} color="#EF4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: 20, textAlign: "center" }}>
                      No companies found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 24,
                paddingTop: 16,
              }}
            >
              <div style={{ color: "#6B7280", fontSize: 14 }}>
                Showing <b>{Math.min(filteredCompanies.length, (currentPage - 1) * itemsPerPage + 1)}</b> to <b>{Math.min(filteredCompanies.length, currentPage * itemsPerPage)}</b> of <b>{filteredCompanies.length}</b> companies
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  style={{...pageBtnStyle, opacity: currentPage === 1 ? 0.5 : 1}} 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Previous
                </button>
                <button 
                  style={{...pageBtnStyle, opacity: currentPage >= totalPages ? 0.5 : 1}} 
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#fff", width: 500, borderRadius: 16, padding: "24px 32px",
            position: "relative", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "#F3F4F6", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, color: "#6B7280", lineHeight: 1 }}>&times;</span>
            </button>

            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
              {modalMode === "add" ? "Add New Company" : "Edit Company"}
            </h2>

            {modalError && (
              <div style={{
                padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FEE2E2",
                color: "#EF4444", borderRadius: 8, fontSize: 13, marginBottom: 16
              }}>
                {modalError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input type="text" placeholder="Enter company name" style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input type="text" placeholder="Enter location" style={inputStyle} value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Contact Email</label>
                <input
                  type="email"
                  placeholder="Enter email"
                  style={{ ...inputStyle, borderColor: emailError ? "#EF4444" : "#D1D5DB" }}
                  value={formData.email}
                  onChange={e => { setFormData({...formData, email: e.target.value}); setEmailError(""); }}
                />
                {emailError && <p style={{ color: "#EF4444", fontSize: 12, margin: "4px 0 0" }}>{emailError}</p>}
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="text"
                  placeholder="07XXXXXXXX"
                  maxLength={10}
                  style={{ ...inputStyle, borderColor: phoneError ? "#EF4444" : "#D1D5DB" }}
                  value={formData.phone}
                  onChange={e => {
                    const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({...formData, phone: digitsOnly});
                    setPhoneError("");
                  }}
                />
                {phoneError && <p style={{ color: "#EF4444", fontSize: 12, margin: "4px 0 0" }}>{phoneError}</p>}
              </div>
              <div>
                <label style={labelStyle}>Registered Date</label>
                <input type="date" style={inputStyle} value={formData.date}  min={new Date().toISOString().slice(0, 10)} 
                onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                {modalMode === "add" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                    <div 
                      onClick={() => setFormData({...formData, status: !formData.status})}
                      style={{
                      width: 44, height: 24, borderRadius: 12, background: formData.status ? "#111827" : "#E5E7EB",
                      position: "relative", cursor: "pointer", transition: "background 0.3s"
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", background: "#fff",
                        position: "absolute", top: 3, left: formData.status ? 23 : 3, transition: "left 0.3s"
                      }} />
                    </div>
                    <span style={{ fontSize: 14, color: "#4B5563" }}>{formData.status ? "Active" : "Inactive"}</span>
                  </div>
                ) : (
                  <select 
                    style={{ ...inputStyle, cursor: "pointer", color: "#374151" }}
                    value={formData.status ? "Active" : "Inactive"}
                    onChange={(e) => setFormData({...formData, status: e.target.value === "Active"})}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32 }}>
              <button
                onClick={() => !isSaving && setIsModalOpen(false)}
                disabled={isSaving}
                style={{ ...cancelBtnStyle, cursor: isSaving ? "not-allowed" : "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  ...saveBtnStyle,
                  background: "#3B82F6",
                  cursor: isSaving ? "not-allowed" : "pointer",
                  opacity: isSaving ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                {isSaving && <Spinner size={14} color="#ffffff" />}
                {isSaving ? "Saving..." : modalMode === "add" ? "Save Company" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#fff", width: 440, borderRadius: 16, padding: "24px 32px",
            position: "relative", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "#F3F4F6", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, color: "#6B7280", lineHeight: 1 }}>&times;</span>
            </button>

            <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: "#111827" }}>Delete Company</h2>

            {deleteError && (
              <div style={{
                padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FEE2E2",
                color: "#EF4444", borderRadius: 8, fontSize: 13, marginBottom: 16
              }}>
                {deleteError}
              </div>
            )}

            <p style={{ margin: "0 0 32px", fontSize: 14, color: "#4B5563", lineHeight: 1.5 }}>
              Are you sure you want to delete <b>{companyToDelete?.com_name || "this company"}</b>?<br/>
              This action cannot be undone and will permanently remove all company data.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                style={{ ...cancelBtnStyle, cursor: isDeleting ? "not-allowed" : "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  ...saveBtnStyle,
                  background: "#EF4444",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                {isDeleting && <Spinner size={14} color="#ffffff" />}
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle = {
  padding: "16px 10px",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 700,
  color: "#111827",
};

const tdStyle = {
  padding: "16px 10px",
  fontSize: 14,
  color: "#4B5563",
  verticalAlign: "middle",
};

const iconButtonStyle = {
  background: "#F3F4F6",
  border: "none",
  borderRadius: 6,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const pageBtnStyle = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  padding: "8px 16px",
  borderRadius: 6,
  fontSize: 14,
  color: "#374151",
  cursor: "pointer",
  fontWeight: 500,
};

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #D1D5DB", outline: "none", fontSize: 14, boxSizing: "border-box" };
const cancelBtnStyle = { padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const saveBtnStyle = { padding: "10px 20px", borderRadius: 8, border: "none", background: "#3B82F6", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" };

export default HotelManagement;
