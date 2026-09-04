import React, { useEffect, useState } from "react";
import { FaSearch, FaPlus, FaPen, FaTrash } from "react-icons/fa";
import Sidebar from "../../components/super-admin/Sidebar";
import Header from "../../components/super-admin/Header";
import { getUsers, getRoles, getCompanies, createUser, updateUser, deleteUserById, setAuthToken, logout } from "../../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import ToggleSwitch from "../../components/super-admin/ToggleSwitch";
import Spinner from "../../components/super-admin/Spinner";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
import { connectSocket, subscribeToUserUpdates } from "../../services/socket";

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

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [togglingId, setTogglingId] = useState(null);
  const { toast, toasts, removeToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(totalUsersCount / itemsPerPage));

  // Connect to socket and subscribe to user updates
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);
    
    // Connect to socket
    const socket = connectSocket();
    
    // Subscribe to user updates
    const unsubscribe = subscribeToUserUpdates({
      onUserCreated: (newUser) => {
        console.log("🆕 New user created via socket:", newUser);
        setUsers(prevUsers => {
          // Check if user already exists (prevent duplicates)
          const exists = prevUsers.some(u => u.u_id === newUser.u_id);
          if (exists) return prevUsers;
          return [...prevUsers, newUser];
        });
        toast.success("New User Added", `${newUser.u_fname} ${newUser.u_lname} was added by ${newUser.actor_name || 'an admin'}`);
      },
      onUserUpdated: (updatedUser) => {
        console.log("✏️ User updated via socket:", updatedUser);
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.u_id === updatedUser.u_id ? { ...u, ...updatedUser } : u
          )
        );
        toast.info("User Updated", `${updatedUser.u_fname} ${updatedUser.u_lname} was updated by ${updatedUser.actor_name || 'an admin'}`);
      },
      onUserDeleted: (deletedUser) => {
        console.log("🗑️ User deleted via socket:", deletedUser);
        setUsers(prevUsers => 
          prevUsers.filter(u => u.u_id !== deletedUser.u_id)
        );
        toast.info("User Deleted", `${deletedUser.userName || 'A user'} was deleted by ${deletedUser.actor_name || 'an admin'}`);
      }
    });

    if (location.state?.successMessage) {
      toast.success("Success", location.state.successMessage);
      window.history.replaceState({}, document.title);
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigate, location.state]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        search: searchQuery,
        companyId: selectedCompany,
        roleId: selectedRole
      };
      const countParams = {
        countOnly: "true",
        search: searchQuery,
        companyId: selectedCompany,
        roleId: selectedRole
      };

      const [usersData, countData, rolesData, companiesData] = await Promise.all([
        getUsers(params),
        getUsers(countParams),
        getRoles(),
        getCompanies().catch(() => [])
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setTotalUsersCount(countData?.count ?? 0);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
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

  useEffect(() => {
    fetchData();
  }, [currentPage, searchQuery, selectedCompany, selectedRole]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCompany, selectedRole]);

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setErrorMessage("");
    setIsDeleteModalOpen(true);
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    setTogglingId(userId);
    try {
      const s = String(currentStatus || "").toLowerCase();
      const isActive = s === "active" || s === "true" || currentStatus === true;
      const nextStatus = !isActive;

      // Optimistic update locally
      setUsers((prev) =>
        prev.map((u) =>
          u.u_id === userId ? { ...u, u_status: nextStatus } : u
        )
      );

      // Call API
      await updateUser(userId, { u_status: nextStatus });
      toast.success("Status Updated", "User status was successfully updated.");
    } catch (err) {
      console.error("Error toggling user status:", err);
      // Revert on error
      fetchData();
      toast.error("Error", err.response?.data?.message || err.message || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete?.u_id) return;
    setIsDeleting(true);
    setErrorMessage("");
    try {
      await deleteUserById(userToDelete.u_id);
      setIsDeleteModalOpen(false);
      toast.success("User Deleted", "The user was permanently removed.");
      fetchData();
    } catch (err) {
      console.error("Error deleting user:", err);
      setErrorMessage(err.response?.data?.message || err.message || "Failed to delete user.");
      toast.error("Error", err.response?.data?.message || err.message || "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users;

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
          <Header title="User Management" />
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 70px)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <Spinner size={44} />
              <p style={{ margin: 0, color: "#6B7280", fontWeight: 600, fontSize: 16 }}>Loading User Management...</p>
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
                gap: 16,
                flexWrap: "wrap"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                  minWidth: 300,
                  flexWrap: "wrap"
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
                    width: "100%",
                    maxWidth: 320,
                  }}
                >
                  <FaSearch color="#9CA3AF" size={14} />
                  <input
                    type="text"
                    placeholder="Search users..."
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

                {/* Company Filter Dropdown */}
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 14,
                    background: "#F9FAFB",
                    color: "#374151",
                    outline: "none",
                    minWidth: 160,
                    cursor: "pointer"
                  }}
                >
                  <option value="">All Companies</option>
                  {companies.filter(c => c.c_status !== false).map((c) => (
                    <option key={c.com_id} value={String(c.com_id)}>
                      {c.com_name}
                    </option>
                  ))}
                </select>

                {/* Role Filter Dropdown */}
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 14,
                    background: "#F9FAFB",
                    color: "#374151",
                    outline: "none",
                    minWidth: 160,
                    cursor: "pointer"
                  }}
                >
                  <option value="">All Roles</option>
                  {roles.map((r) => (
                    <option key={r.role_id} value={String(r.role_id)}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
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
                  <th style={thStyle}>COMPANY</th>
                  <th style={thStyle}>ROLE</th>
                  <th style={thStyle}>STATUS</th>
                  <th style={thStyle}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: 20 }}>
                      <Spinner />
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
                        <td style={tdStyle}>{user.company_name || "—"}</td>
                        <td style={tdStyle}>
                          <RoleBadge role={user.role_name} />
                        </td>
                        <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <ToggleSwitch
                              checked={String(user.u_status !== undefined ? user.u_status : "Active").toLowerCase() === "active" || String(user.u_status).toLowerCase() === "true" || user.u_status === true}
                              onChange={() => handleToggleStatus(user.u_id, user.u_status)}
                              disabled={togglingId === user.u_id}
                            />
                            {togglingId === user.u_id && <Spinner size={16} />}
                          </div>
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
                    <td colSpan="6" style={{ padding: 20, textAlign: "center" }}>
                      No users found
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
                Showing <b>{totalUsersCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</b> to <b>{Math.min(currentPage * itemsPerPage, totalUsersCount)}</b> of <b>{totalUsersCount}</b> users
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  style={{ ...pageBtnStyle, opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </button>
                <button 
                  style={{ ...pageBtnStyle, opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                </button>
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
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
              disabled={isDeleting}
              style={{ position: "absolute", top: 16, right: 16, background: "#F3F4F6", border: "none", borderRadius: "8px", width: 32, height: 32, cursor: isDeleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, color: "#6B7280", lineHeight: 1 }}>&times;</span>
            </button>

            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700, color: "#111827" }}>Delete User</h2>

            {errorMessage && (
              <div style={{
                padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FEE2E2",
                color: "#EF4444", borderRadius: 8, fontSize: 13, marginBottom: 16
              }}>
                {errorMessage}
              </div>
            )}

            <p style={{ margin: "0 0 32px", fontSize: 14, color: "#4B5563", lineHeight: 1.5 }}>
              Are you sure you want to delete this user?<br />
              This action cannot be undone and will permanently remove all user data.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#111827", fontSize: 14, fontWeight: 600, cursor: isDeleting ? "not-allowed" : "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                style={{
                  padding: "10px 20px", borderRadius: 8, border: "none",
                  background: "#EF4444", color: "#fff", fontSize: 14, fontWeight: 600,
                  cursor: isDeleting ? "not-allowed" : "pointer", opacity: isDeleting ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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

      <ToastContainer toasts={toasts} removeToast={removeToast} />
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

export default UserManagement;