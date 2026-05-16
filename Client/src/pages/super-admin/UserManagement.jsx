import React, { useEffect, useState } from "react";
import { FaSearch, FaPlus, FaPen, FaTrash } from "react-icons/fa";
import Sidebar from "../../components/super-admin/Sidebar";
import Header from "../../components/super-admin/Header";
import { getUsers, getRoles, createUser, deleteUserById, setAuthToken, logout } from "../../services/api";
import { useNavigate } from "react-router-dom";

// Helper to get initials
const getInitials = (name) => {
  if (!name) return "U";
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
};

// Helper for Avatar colors based on initials
const getAvatarColor = (initials) => {
  const colors = ["#0284C7", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e"];
  const charCode = initials.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

const RoleBadge = ({ role }) => {
  const roleName = role?.toLowerCase() || "user";
  let bg = "#F3F4F6", color = "#6B7280";

  if (roleName.includes("admin")) {
    bg = "#FEF3C7"; color = "#D97706";
  } else if (roleName.includes("manager")) {
    bg = "#DBEAFE"; color = "#2563EB";
  } else if (roleName.includes("cashier")) {
    bg = "#E0E7FF"; color = "#4F46E5";
  } else if (roleName.includes("waiter")) {
    bg = "#D1FAE5"; color = "#059669";
  }

  return (
    <span style={{
      padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600,
      background: bg, color: color
    }}>
      {role || "User"}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const s = String(status || "").toLowerCase();
  const isActive = s === "active" || s === "true" || status === true;
  return (
    <span style={{
      padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600,
      background: isActive ? "#DCFCE7" : "#FEE2E2",
      color: isActive ? "#16A34A" : "#EF4444",
      display: "inline-flex", alignItems: "center", gap: 6
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "#16A34A" : "#EF4444" }} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);
    fetchData();
  }, [navigate]);

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const fetchData = async () => {
    try {
      const [usersData, rolesData] = await Promise.all([
        getUsers(),
        getRoles()
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
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

  const handleDeleteUser = async () => {
    if (!userToDelete?.u_id) return;
    try {
      await deleteUserById(userToDelete.u_id);
      setIsDeleteModalOpen(false);
      fetchData();
      alert("User successfully deleted!");
    } catch (err) {
      console.error("Error deleting user:", err);
      alert(err.response?.data?.message || err.message || "Failed to delete user.");
    }
  };

  const filteredUsers = users.filter(
    (u) => {
      const search = searchQuery.toLowerCase();
      const fullName = `${u.u_fname} ${u.u_lname}`.toLowerCase();
      const email = (u.u_email || "").toLowerCase();
      const role = (u.role_name || "").toLowerCase();
      return fullName.includes(search) || email.includes(search) || role.includes(search);
    }
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
        <Header title="User Management" />

        <div style={{ padding: "30px 40px", flex: 1 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, color: "#111827" }}>
              User Management
            </h1>
            <p style={{ margin: 0, color: "#4B5563", fontSize: 15 }}>
              Manage all users and their permissions
            </p>
          </div>

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
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  padding: "10px 16px",
                  borderRadius: 8,
                  width: 400,
                }}
              >
                <FaSearch color="#9CA3AF" size={14} />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
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

              <button
                onClick={() => navigate('/super-admin/users/add')}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#0284C7",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <FaPlus /> Add User
              </button>
            </div>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                  <th style={thStyle}>NAME</th>
                  <th style={thStyle}>EMAIL</th>
                  <th style={thStyle}>ROLE</th>
                  <th style={thStyle}>STATUS</th>
                  <th style={thStyle}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ padding: 20, textAlign: "center" }}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user, i) => {
                    const fullName = `${user.u_fname} ${user.u_lname}`;
                    const initials = getInitials(fullName);
                    const avatarColor = getAvatarColor(initials);

                    return (
                      <tr
                        key={user.u_id || i}
                        onClick={() => navigate(`/super-admin/users/${user.u_id}/edit`)}
                        style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer", transition: "background 0.2s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 8, background: avatarColor,
                              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 14, fontWeight: 600
                            }}>
                              {initials}
                            </div>
                            <span style={{ fontWeight: 600, color: "#111827" }}>{fullName}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>{user.u_email || "—"}</td>
                        <td style={tdStyle}>
                          <RoleBadge role={user.role_name} />
                        </td>
                        <td style={tdStyle}>
                          {/* Fallback to active if no status available, adjusting to API */}
                          <StatusBadge status={user.u_status !== undefined ? user.u_status : "Active"} />
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 10 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/super-admin/users/${user.u_id}/edit`);
                              }}
                              style={iconButtonStyle}
                            >
                              <FaPen size={12} color="#0EA5E9" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(user);
                              }}
                              style={{ ...iconButtonStyle, background: "#FEF2F2" }}
                            >
                              <FaTrash size={12} color="#EF4444" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: 20, textAlign: "center" }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Placeholder */}
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
                Showing <b>{filteredUsers.length}</b> of <b>{filteredUsers.length}</b> users
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={pageBtnStyle}>Previous</button>
                <button style={pageBtnStyle}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete User Modal */}
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
              style={{ position: "absolute", top: 16, right: 16, background: "#F3F4F6", border: "none", borderRadius: "8px", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, color: "#6B7280", lineHeight: 1 }}>&times;</span>
            </button>

            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700, color: "#111827" }}>Delete User</h2>

            <p style={{ margin: "0 0 32px", fontSize: 14, color: "#4B5563", lineHeight: 1.5 }}>
              Are you sure you want to delete this user?<br />
              This action cannot be undone and will permanently remove all user data.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#111827", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button
                onClick={handleDeleteUser}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Delete
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
  fontSize: 12,
  fontWeight: 700,
  color: "#6B7280",
  letterSpacing: "0.5px"
};

const tdStyle = {
  padding: "16px 10px",
  fontSize: 14,
  color: "#4B5563",
  verticalAlign: "middle",
};

const iconButtonStyle = {
  background: "#F0F9FF",
  border: "1px solid #E0F2FE",
  borderRadius: 6,
  width: 32,
  height: 32,
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

const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.5px", marginBottom: 6 };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #D1D5DB", outline: "none", fontSize: 14, boxSizing: "border-box", color: "#111827" };

export default UserManagement;
