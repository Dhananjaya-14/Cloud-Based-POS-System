// Client/src/pages/super-admin/BranchManagement.jsx
import React, { useEffect, useState } from "react";
import { FaSearch, FaFilter, FaPlus, FaCodeBranch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/super-admin/Sidebar";
import Header from "../../components/super-admin/Header";
import AddBranchWizard from "../../components/admin/AddBranchModal";
import { getBranches, getCompanies, setAuthToken, logout } from "../../services/api";
import { connectSocket, joinBranchUpdatesRoom, SOCKET_EVENTS } from "../../services/socket";
import Spinner from "../../components/super-admin/Spinner";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";

const StatusBadge = ({ status }) => {
  const s = String(status || "").toLowerCase();
  const isActive = s === "active" || s === "true" || status === true;
  return (
    <span style={{
      padding: "4px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: isActive ? "#DCFCE7" : "#FEE2E2",
      color: isActive ? "#16A34A" : "#EF4444",
    }}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const normalizeStatus = (b) => {
  const raw = b.status ?? b.B_status ?? b.branch_status;
  const s = String(raw || "").toLowerCase();
  return s === "active" || s === "true" || raw === true;
};

const SuperAdminBranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [companyFilter, setCompanyFilter] = useState("All Companies");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { 
      navigate("/login"); 
      return; 
    }
    setAuthToken(token);
    
    // Connect to socket and join branch updates room
    const socket = connectSocket();
    joinBranchUpdatesRoom();
    
    fetchData();
    
    return () => {
      // Cleanup socket listeners
      if (socket) {
        socket.off(SOCKET_EVENTS.BRANCH_CREATED);
        socket.off(SOCKET_EVENTS.BRANCH_UPDATED);
        socket.off(SOCKET_EVENTS.BRANCH_DELETED);
      }
    };
  }, [navigate]);

  // Realtime socket updates
  useEffect(() => {
    const socket = connectSocket();
    
    // Handle branch created
    const handleCreated = (data) => {
      console.log("📡 Branch created event received:", data);
      setBranches((prev) => {
        // Check if branch already exists (prevent duplicates)
        const exists = prev.some(b => b.B_id === data.B_id);
        if (exists) return prev;
        return [data, ...prev];
      });
      // Show toast notification for the other admin
      if (data.actor_name) {
        toast.info(`New Branch Added`, `${data.actor_name} added "${data.B_name}"`);
      } else {
        toast.info(`New Branch Added`, `"${data.B_name}" was added to the system`);
      }
    };
    
    // Handle branch updated
    const handleUpdated = (data) => {
      console.log("📡 Branch updated event received:", data);
      setBranches((prev) => prev.map((x) => 
        x.B_id === data.B_id ? { ...x, ...data } : x
      ));
      // Show toast notification for the other admin
      if (data.actor_name) {
        toast.info(`Branch Updated`, `${data.actor_name} updated "${data.B_name}"`);
      } else {
        toast.info(`Branch Updated`, `"${data.B_name}" was updated`);
      }
    };
    
    // Handle branch deleted
    const handleDeleted = (payload) => {
      console.log("📡 Branch deleted event received:", payload);
      const id = payload?.B_id ?? payload?.b_id ?? null;
      if (id != null) {
        setBranches((prev) => prev.filter((x) => Number(x.B_id) !== Number(id)));
        // Show toast notification for the other admin
        if (payload.actor_name && payload.B_name) {
          toast.info(`Branch Deleted`, `${payload.actor_name} deleted "${payload.B_name}"`);
        } else {
          toast.info(`Branch Deleted`, `Branch #${id} was removed from the system`);
        }
      }
    };

    // Register event listeners
    socket.on(SOCKET_EVENTS.BRANCH_CREATED, handleCreated);
    socket.on(SOCKET_EVENTS.BRANCH_UPDATED, handleUpdated);
    socket.on(SOCKET_EVENTS.BRANCH_DELETED, handleDeleted);
    
    // Debug: Log all events
    socket.onAny((event, ...args) => {
      if (event.startsWith('branch:')) {
        console.log(`🔔 Branch event: ${event}`, args[0]);
      }
    });

    return () => {
      socket.off(SOCKET_EVENTS.BRANCH_CREATED, handleCreated);
      socket.off(SOCKET_EVENTS.BRANCH_UPDATED, handleUpdated);
      socket.off(SOCKET_EVENTS.BRANCH_DELETED, handleDeleted);
    };
  }, [toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bData, cData] = await Promise.all([getBranches(), getCompanies()]);
      setBranches(Array.isArray(bData) ? bData : []);
      setCompanies(Array.isArray(cData) ? cData : []);
    } catch (err) {
      console.error("fetch error:", err);
      if (err.response?.status === 401) { 
        logout(); 
        navigate("/login"); 
      }
      toast.error("Failed to load data", "Please refresh the page and try again.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = branches.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (b.B_name || "").toLowerCase().includes(q) ||
      (b.com_name || "").toLowerCase().includes(q) ||
      (b.B_email || "").toLowerCase().includes(q) ||
      (b.B_address || "").toLowerCase().includes(q);

    const isActive = normalizeStatus(b);
    const matchStatus =
      statusFilter === "All Status" ||
      (statusFilter === "Active" && isActive) ||
      (statusFilter === "Inactive" && !isActive);

    const matchCompany =
      companyFilter === "All Companies" ||
      (b.com_name || "") === companyFilter;

    return matchSearch && matchStatus && matchCompany;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when filters change
  const handleSearch = (v) => { setSearchQuery(v); setCurrentPage(1); };
  const handleStatus = (v) => { setStatusFilter(v); setCurrentPage(1); };
  const handleCompany = (v) => { setCompanyFilter(v); setCurrentPage(1); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
        <Header title="Branch Management" />

        <div style={{ padding: "30px 40px", flex: 1 }}>
          {/* Page Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, color: "#111827" }}>
              Branch Management
            </h1>
            <p style={{ margin: 0, color: "#4B5563", fontSize: 15 }}>
              Manage all branches across companies
            </p>
          </div>

          {/* Table Card */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>

            {/* Toolbar — matches HotelManagement style */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>

              {/* Search */}
              <div style={{ display: "flex", alignItems: "center", background: "#F3F4F6", padding: "10px 16px", borderRadius: 8, width: 280 }}>
                <FaSearch color="#9CA3AF" size={14} />
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ border: "none", background: "transparent", marginLeft: 10, outline: "none", width: "100%", fontSize: 14 }}
                />
              </div>

              {/* Filters + Add Button */}
              <div style={{ display: "flex", gap: 16 }}>

                {/* Company filter */}
                <div style={{ display: "flex", alignItems: "center", background: "#F3F4F6", padding: "10px 16px", borderRadius: 8, cursor: "pointer", gap: 8 }}>
                  <FaFilter color="#6B7280" size={14} />
                  <select
                    value={companyFilter}
                    onChange={(e) => handleCompany(e.target.value)}
                    style={{ border: "none", background: "transparent", outline: "none", color: "#374151", fontSize: 14, cursor: "pointer" }}
                  >
                    <option>All Companies</option>
                    {companies.map((c) => (
                      <option key={c.com_id} value={c.com_name}>{c.com_name}</option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div style={{ display: "flex", alignItems: "center", background: "#F3F4F6", padding: "10px 16px", borderRadius: 8, cursor: "pointer", gap: 8 }}>
                  <FaFilter color="#6B7280" size={14} />
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatus(e.target.value)}
                    style={{ border: "none", background: "transparent", outline: "none", color: "#374151", fontSize: 14, cursor: "pointer" }}
                  >
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>

                {/* Add Button */}
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "#0ea5e9", color: "#fff", border: "none",
                    padding: "10px 20px", borderRadius: 8, fontSize: 14,
                    fontWeight: 600, cursor: "pointer",
                  }}
                >
                  <FaPlus /> Add New Branch
                </button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                <Spinner size={36} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#6B7280" }}>
                <FaCodeBranch size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>No branches found</p>
                <p style={{ fontSize: 14, marginTop: 4, color: "#9CA3AF" }}>Try adjusting your search or filters.</p>
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                      {["Branch Name", "Company", "Email", "Contact", "Address", "Status"].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((b, i) => (
                      <tr
                        key={b.B_id || i}
                        style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        onClick={() => navigate(`/branch_profile/${b.B_id}`)}
                      >
                        <td style={tdStyle}><b style={{ color: "#111827" }}>{b.B_name || "—"}</b></td>
                        <td style={tdStyle}>{b.com_name || "—"}</td>
                        <td style={tdStyle}>{b.B_email || "—"}</td>
                        <td style={tdStyle}>{b.B_conNo || "—"}</td>
                        <td style={tdStyle}>{b.B_address || "—"}</td>
                        <td style={tdStyle}><StatusBadge status={b.status ?? b.B_status ?? b.branch_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16 }}>
                  <div style={{ color: "#6B7280", fontSize: 14 }}>
                    Showing <b>{Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}</b> to{" "}
                    <b>{Math.min(filtered.length, currentPage * itemsPerPage)}</b> of{" "}
                    <b>{filtered.length}</b> branches
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={{ ...pageBtnStyle, opacity: currentPage === 1 ? 0.5 : 1 }}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >Previous</button>
                    <button
                      style={{ ...pageBtnStyle, opacity: currentPage >= totalPages ? 0.5 : 1 }}
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >Next</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <AddBranchWizard
          onClose={() => setShowModal(false)}
          onSuccess={(newBranch) => {
            fetchData();
            toast.success("Branch Created", newBranch?.B_name ? `"${newBranch.B_name}" was added successfully.` : "New branch was added successfully.");
          }}
          onError={(error) => {
            toast.error("Failed to Create Branch", error?.message || "An error occurred while creating the branch.");
          }}
        />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

const thStyle = { padding: "16px 10px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#111827" };
const tdStyle = { padding: "16px 10px", fontSize: 14, color: "#4B5563", verticalAlign: "middle" };
const pageBtnStyle = { background: "#fff", border: "1px solid #E5E7EB", padding: "8px 16px", borderRadius: 6, fontSize: 14, color: "#374151", cursor: "pointer", fontWeight: 500 };

export default SuperAdminBranchManagement;