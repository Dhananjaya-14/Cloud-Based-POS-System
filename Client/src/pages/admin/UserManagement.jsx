import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCashRegister, FaFilter, FaPen, FaPlus, FaSearch, FaTimes, FaTrash, FaUserCheck, FaUserShield, FaUsers } from "react-icons/fa";
import { FiChevronDown, FiFilter, FiSearch } from "react-icons/fi";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import { createUser, deleteUserById, getBranches, getRoles, getUsers } from "../../services/api";
import { connectSocket, getSocket, SOCKET_EVENTS } from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
/* ===== Design components (User Management redesign) ===== */
const UM_STAT_TONES = {
  green: "bg-[#EAF9EC] text-[#3CAE49]",
  red: "bg-[#FDECEC] text-[#EF4444]",
  blue: "bg-[#EAF6FD] text-[#14A6E0]",
  amber: "bg-[#FFF6E6] text-[#F59E0B]"
};
const UmUsersIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
const UmAdminIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21C4 16.6 7.6 13 12 13C16.4 13 20 16.6 20 21" /><path d="M17 8L19 10L22 6.5" /></svg>;
const UmCashierIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>;
const UmUserIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21C4 16.6 7.6 13 12 13C16.4 13 20 16.6 20 21" /></svg>;
const UmEditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3A2.83 2.83 0 0121 7L7 21H3V17Z" /></svg>;
const UmDeleteIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7H20M9 7V4H15V7M6 7L7 20H17L18 7" /></svg>;

// Role pill colours from the design
const roleTone = roleName => {
  const role = String(roleName || "").toLowerCase();
  if (role.includes("branch")) return "bg-[#EAF6FD] text-[#0E6FA8]";
  if (role.includes("admin")) return "bg-[#F3EDFE] text-[#6D28D9]";
  if (role.includes("kitchen")) return "bg-[#FFF6E6] text-[#B45309]";
  if (role.includes("cashier")) return "bg-[#E6F7F5] text-[#0F766E]";
  if (role.includes("waiter")) return "bg-[#EAF9EC] text-[#15803D]";
  return "bg-[#F3F4F6] text-[#374151]";
};

function UmPageHeading({ title, subtitle, buttonLabel, onButtonClick }) {
  return (
    <div className="admin-user-toolbar mb-[22px] flex items-start justify-between gap-4">
      <div>
        <h2 className="mb-1 font-space text-2xl font-bold text-[#111827]">{title}</h2>
        <p className="text-[13px] text-[#6B7280]">{subtitle}</p>
      </div>
      <button type="button" onClick={onButtonClick} className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-[9px] bg-[#071E38] px-5 py-[11px] text-[13.5px] font-bold text-white shadow-[0_8px_18px_rgba(7,30,56,0.25)] hover:bg-[#0D2B4D]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5V19M5 12H19" /></svg>
        {buttonLabel}
      </button>
    </div>
  );
}

function UmStatCard({ icon, tone, value, label }) {
  return (
    <div className="flex items-center gap-[15px] rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-[18px] shadow-[0_2px_10px_rgba(7,30,56,0.03)]">
      <div className={`flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl ${UM_STAT_TONES[tone]}`}>{icon}</div>
      <div>
        <div className="font-space text-[22px] font-bold leading-tight text-[#071E38]">{value}</div>
        <div className="text-xs font-semibold text-[#6B7280]">{label}</div>
      </div>
    </div>
  );
}
/* ===== End of design components ===== */

const UserManagement = () => {
  const { t } = useTranslation();
const {
    features
  } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const accessibleRoles = useMemo(() => {
    return roles.filter(role => {
      if (Number(role.role_id) === 6) return false;
      const roleName = String(role.role_name || "").toLowerCase();
      if (roleName.includes("waiter") && features?.has_waiter !== true) return false;
      if (roleName.includes("kitchen") && features?.has_kitchen !== true) return false;
      return true;
    });
  }, [roles, features]);
  const [newUser, setNewUser] = useState({
    u_fname: "",
    u_lname: "",
    u_email: "",
    u_pw: "",
    u_connumber: "",
    role_id: ""
  });
  useEffect(() => {
    fetchData();
    const cleanupSocketConnection = setupSocketConnection();
    return () => {
      cleanupSocketConnection?.();
    };
  }, []);
  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [toasts]);
  const setupSocketConnection = () => {
const token = localStorage.getItem("token");
    if (!token) return undefined;
    const socket = connectSocket();
    const handleUserCreated = newUserData => {
      console.log("New user created (admin):", newUserData);
      setUsers(prevUsers => {
        if (prevUsers.some(u => u.u_id === newUserData.u_id)) {
          return prevUsers;
        }
        return [...prevUsers, newUserData];
      });
    };
    const handleUserUpdated = updatedUserData => {
      console.log("User updated (admin):", updatedUserData);
      setUsers(prevUsers => prevUsers.map(user => user.u_id === updatedUserData.u_id ? updatedUserData : user));
    };
    const handleUserDeleted = ({
      u_id
    }) => {
      console.log("User deleted (admin):", u_id);
      setUsers(prevUsers => prevUsers.filter(user => user.u_id !== u_id));
    };
    socket.on(SOCKET_EVENTS.USER_CREATED, handleUserCreated);
    socket.on(SOCKET_EVENTS.USER_UPDATED, handleUserUpdated);
    socket.on(SOCKET_EVENTS.USER_DELETED, handleUserDeleted);
    return () => {
      const activeSocket = getSocket();
      if (!activeSocket) return;
      activeSocket.off(SOCKET_EVENTS.USER_CREATED, handleUserCreated);
      activeSocket.off(SOCKET_EVENTS.USER_UPDATED, handleUserUpdated);
      activeSocket.off(SOCKET_EVENTS.USER_DELETED, handleUserDeleted);
    };
  };
  const showToastMessage = (message, type = "success") => {
setToasts(prev => [...prev, {
      id: Date.now() + Math.random(),
      message,
      type
    }]);
  };
  const removeToast = toastId => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [usersData, rolesData, branchesData] = await Promise.all([getUsers(), getRoles(), getBranches()]);
      setUsers(usersData || []);
      setRoles(rolesData || []);
      setBranches(branchesData || []);
      const defaultRole = rolesData?.[0]?.role_id ? String(rolesData[0].role_id) : "";
      setNewUser(prev => ({
        ...prev,
        role_id: prev.role_id || defaultRole
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load user management data.");
    } finally {
      setLoading(false);
    }
  };
  const roleMap = useMemo(() => {
    return roles.reduce((acc, role) => {
      acc[String(role.role_id)] = role.role_name;
      return acc;
    }, {});
  }, [roles]);
  const branchMap = useMemo(() => {
    return branches.reduce((acc, branch) => {
      acc[String(branch.B_id)] = branch.B_name;
      return acc;
    }, {});
  }, [branches]);
  const roleCounts = useMemo(() => {
    return users.reduce((counts, user) => {
      const roleId = String(user.role_id);
      counts[roleId] = (counts[roleId] || 0) + 1;
      return counts;
    }, {});
  }, [users]);

  // Evaluates filters seamlessly across the entire user array
  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return users.filter(user => {
      const fullName = `${user.u_fname || ""} ${user.u_lname || ""}`.trim().toLowerCase();
      const email = (user.u_email || "").toLowerCase();
      const roleName = (roleMap[String(user.role_id)] || "Unknown").toLowerCase();
      const branchName = (branchMap[String(user.b_id)] || "-").toLowerCase();
      const matchesSearch = !normalizedSearch || fullName.includes(normalizedSearch) || email.includes(normalizedSearch) || roleName.includes(normalizedSearch) || branchName.includes(normalizedSearch);
      const matchesRole = roleFilter === "all" || String(user.role_id) === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter, roleMap, branchMap]);
  const visibleUsers = filteredUsers;
  const totalUsers = users.length;
  const branchAdminCount = users.filter(u => (roleMap[String(u.role_id)] || "").toLowerCase().includes("branch")).length;
  const cashierCount = users.filter(u => (roleMap[String(u.role_id)] || "").toLowerCase().includes("cashier")).length;
  const activeUsers = users.length;
  const handleNewUserChange = e => {
    const {
      name,
      value
    } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleCreateUser = async e => {
    e.preventDefault();
    try {
      await createUser({
        ...newUser,
        role_id: newUser.role_id ? Number(newUser.role_id) : null
      });
      setIsAddModalOpen(false);
      setNewUser({
        u_fname: "",
        u_lname: "",
        u_email: "",
        u_pw: "",
        u_connumber: "",
        role_id: roles?.[0]?.role_id ? String(roles[0].role_id) : ""
      });

      // No need to call fetchData() as socket event will update the list
      showToastMessage("User created successfully.", "success");
    } catch (err) {
      showToastMessage(err?.response?.data?.message || "Failed to create user.", "error");
    }
  };
  const confirmDeleteUser = async () => {
    if (!deleteTargetUser?.u_id) {
      return;
    }
    try {
      setIsDeleting(true);
      await deleteUserById(deleteTargetUser.u_id);
      showToastMessage(`User deleted successfully${deleteTargetUser.name ? `: ${deleteTargetUser.name}` : ""}.`, "success");
      setDeleteTargetUser(null);
      // No need to call fetchData() as socket event will update the list
    } catch (err) {
      showToastMessage(err?.response?.data?.message || "Failed to delete user.", "error");
    } finally {
      setIsDeleting(false);
    }
  };
  return <div className="admin-page-root" style={{
    display: "flex",
    background: "#F3F4F6",
    minHeight: "100vh"
  }}>
      <Sidebar />

      <div className="admin-main-content" style={{
      flex: 1,
      marginLeft: "240px",
      minWidth: 0,
      display: "flex",
      flexDirection: "column"
    }}>
        <Header title={t("company_admin.user_management", "User Management")} />

        <div className="admin-user-content-container px-8 pb-10 pt-7">
          {toasts.length > 0 && <div style={{
          position: "fixed",
          top: "82px",
          right: "20px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "min(380px, calc(100vw - 32px))"
        }}>
              {toasts.map(toast => <div key={toast.id} style={{
            background: toast.type === "error" ? "#FEF2F2" : "#F0FDF4",
            borderLeft: `4px solid ${toast.type === "error" ? "#EF4444" : "#22C55E"}`,
            borderRadius: "8px",
            padding: "14px 16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            color: toast.type === "error" ? "#991B1B" : "#065F46",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            animation: "slideInRight 0.3s ease-out"
          }}>
                  <span style={{
              fontSize: "14px",
              fontWeight: 600,
              lineHeight: 1.4
            }}>{toast.message}</span>
                  <button type="button" onClick={() => removeToast(toast.id)} style={{
              border: "none",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              opacity: 0.7,
              padding: "4px",
              display: "inline-flex"
            }} aria-label="Dismiss notification">
                    <FaTimes />
                  </button>
                </div>)}
            </div>}

          <UmPageHeading
            title={t("company_admin.user_management", "User Management")}
            subtitle={t("company_admin.user_management_subtitle", "Manage staff accounts, roles, and branch access")}
            buttonLabel={t("company_admin.add_new_user", "Add New User")}
            onButtonClick={() => navigate("/users/add")}
          />

          <div className="mb-[22px] grid grid-cols-2 gap-4 lg:grid-cols-4">
            <UmStatCard tone="green" icon={<UmUsersIcon />} value={totalUsers} label={t("company_admin.total_users", "Total Users")} />
            <UmStatCard tone="red" icon={<UmAdminIcon />} value={branchAdminCount} label={t("company_admin.branch_admins", "Branch Admins")} />
            <UmStatCard tone="blue" icon={<UmCashierIcon />} value={cashierCount} label={t("company_admin.cashiers", "Cashiers")} />
            <UmStatCard tone="amber" icon={<UmUserIcon />} value={activeUsers} label={t("company_admin.active_users", "Active Users")} />
          </div>

          {/* Search, Filter and role dropdown */}
          <div className="mb-[18px] flex flex-wrap gap-2.5">
            <div className="relative min-w-[280px] flex-1">
              <FiSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t("company_admin.search_by_name_email_role_or_branch", "Search by name, email, role or branch")}
                className="w-full rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white py-3 pl-10 pr-4 text-[13px] text-[#111827] outline-none focus:border-[#14A6E0]"
              />
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white px-4 py-3 text-[13px] font-bold text-[#111827]">
              <FiFilter size={14} />{t("company_admin.filter", "Filter")}
            </button>
            <div className="relative">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                aria-label="Role"
                className="cursor-pointer appearance-none rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white py-3 pl-3.5 pr-9 text-[12.5px] font-semibold text-[#111827] outline-none focus:border-[#14A6E0]"
              >
                <option value="all">{t("company_admin.all_roles", "All Roles")} ({totalUsers})</option>
                {roles.filter(role => Number(role.role_id) !== 6).map(role => <option key={role.role_id} value={String(role.role_id)}>
                    {role.role_name} ({roleCounts[String(role.role_id)] || 0})
                  </option>)}
              </select>
              <FiChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#111827]" />
            </div>
          </div>

          {loading ? <p className="my-5 text-sm text-[#6B7280]">{t("company_admin.loading_users", "Loading users...")}</p> : error ? <p className="my-5 text-sm text-[#B91C1C]">{error}</p> : <>
            {/* Desktop table: grows with its rows, no fixed height or inner scroll */}
            <div className="admin-user-table-desktop overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(7,30,56,0.04)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr>
                      {[t("company_admin.role", "Role"), t("company_admin.name", "Name"), t("company_admin.branch", "Branch"), t("company_admin.status", "Status"), t("company_admin.action", "Action")].map(col => (
                        <th key={col} className="border-b border-[#E5E7EB] bg-[#FAFAFB] px-[22px] py-3.5 text-left text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#9CA3AF]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map(user => {
                  const fullName = `${user.u_fname || ""} ${user.u_lname || ""}`.trim() || "Unknown User";
                  const initials = `${(user.u_fname || "U").charAt(0)}${(user.u_lname || "S").charAt(0)}`.toUpperCase();
                  const roleName = roleMap[String(user.role_id)] || "Unknown";
                  const branchName = branchMap[String(user.b_id)] || "";
                  return <tr key={user.u_id} className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#FAFBFC]">
                          <td className="px-[22px] py-[13px]">
                            <span className={`inline-block rounded-full px-[11px] py-[5px] text-[11px] font-bold ${roleTone(roleName)}`}>{roleName}</span>
                          </td>
                          <td className="px-[22px] py-[13px]">
                            <div className="flex items-center gap-[11px]">
                              <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#14A6E0] to-[#3CAE49] font-space text-[11.5px] font-bold text-white">{initials}</span>
                              <span className="text-[13.5px] font-bold capitalize text-[#071E38]">{fullName}</span>
                            </div>
                          </td>
                          <td className={`px-[22px] py-[13px] text-[13.5px] ${branchName ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>{branchName || "—"}</td>
                          <td className="px-[22px] py-[13px]">
                            <span className="inline-flex items-center gap-[5px] rounded-full bg-[#EAF9EC] px-3 py-[5px] text-[11px] font-bold text-[#15803D]">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                              {t("company_admin.available", "Available")}
                            </span>
                          </td>
                          <td className="px-[22px] py-[13px]">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => navigate(`/users/${user.u_id}/edit`)} title="Edit user" aria-label={`Edit ${fullName}`} className="flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-[#E5E7EB] bg-white text-[#14A6E0] transition-colors hover:border-[#14A6E0] hover:bg-[#EAF6FD]">
                                <UmEditIcon />
                              </button>
                              <button type="button" onClick={() => setDeleteTargetUser({
                          u_id: user.u_id,
                          name: fullName
                        })} title="Delete user" aria-label={`Delete ${fullName}`} className="flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-[#E5E7EB] bg-white text-[#EF4444] transition-colors hover:border-[#EF4444] hover:bg-[#FDECEC]">
                                <UmDeleteIcon />
                              </button>
                            </div>
                          </td>
                        </tr>;
                })}

                    {visibleUsers.length === 0 && <tr>
                        <td colSpan={5} className="px-[22px] py-12 text-center text-sm text-[#9CA3AF]">{t("company_admin.no_users_found_matching_the_selected_cri", "No users found matching the selected criteria.")}</td>
                      </tr>}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-[#E5E7EB] px-[22px] py-3.5 text-xs text-[#6B7280]">
                {t("company_admin.showing", "Showing")} {visibleUsers.length} {t("company_admin.of", "of")} {totalUsers} {t("company_admin.registered_users", "registered users")}
              </div>
            </div>

              {/* Mobile Stacked Card View */}
              <div className="admin-user-cards-mobile">
                {visibleUsers.map(user => {
                  const fullName = `${user.u_fname || ""} ${user.u_lname || ""}`.trim() || "Unknown User";
                  const initials = `${(user.u_fname || "U").charAt(0)}${(user.u_lname || "S").charAt(0)}`.toUpperCase();
                  const roleName = roleMap[String(user.role_id)] || "Unknown";
                  const branchName = branchMap[String(user.b_id)] || "-";
                  const email = user.u_email || "";
                  return (
                    <div key={user.u_id} className="admin-user-mobile-card">
                      <div className="admin-user-mobile-card-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                          <div style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #1f8df2, #0f5ea7)",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "11px",
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ color: "#1f2d4e", fontWeight: 600, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName}</div>
                            {email && <div style={{ color: "#7b8aa8", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>}
                          </div>
                        </div>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "999px",
                          background: "#dff6e4",
                          color: "#20a048",
                          fontSize: "11px",
                          fontWeight: 700,
                          flexShrink: 0
                        }}>{t("company_admin.available", "Available")}</span>
                      </div>

                      <div className="admin-user-mobile-card-body">
                        <div className="admin-user-mobile-info-row">
                          <span className="admin-user-mobile-label">{t("company_admin.role", "Role")}:</span>
                          <span className="admin-user-mobile-value" style={{ fontWeight: 600, color: "#1f2d4e" }}>{roleName}</span>
                        </div>
                        <div className="admin-user-mobile-info-row">
                          <span className="admin-user-mobile-label">{t("company_admin.branch", "Branch")}:</span>
                          <span className="admin-user-mobile-value">{branchName}</span>
                        </div>
                      </div>

                      <div className="admin-user-mobile-card-footer">
                        <button
                          type="button"
                          onClick={() => navigate(`/users/${user.u_id}/edit`)}
                          className="admin-user-mobile-action-btn edit"
                          title="Edit user"
                        >
                          <FaPen size={11} /> {t("buttons.edit", "Edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetUser({
                            u_id: user.u_id,
                            name: fullName
                          })}
                          className="admin-user-mobile-action-btn delete"
                          title="Delete user"
                        >
                          <FaTrash size={11} /> {t("buttons.delete", "Delete")}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {visibleUsers.length === 0 && (
                  <div style={{ textAlign: "center", color: "#7183a8", padding: "18px 0", fontSize: "14px" }}>
                    {t("company_admin.no_users_found_matching_the_selected_cri", "No users found matching the selected criteria.")}
                  </div>
                )}
              </div>
            </>}
        </div>
      </div>

      {isAddModalOpen && <AddUserModal roles={roles} form={newUser} onChange={handleNewUserChange} onClose={() => setIsAddModalOpen(false)} onSubmit={handleCreateUser} />}

      {deleteTargetUser && <DeleteConfirmModal userName={deleteTargetUser.name} onClose={() => {
      if (!isDeleting) {
        setDeleteTargetUser(null);
      }
    }} onConfirm={confirmDeleteUser} loading={isDeleting} />}

      {/* Add animation styles */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>;
};

// Child presentational layout elements
const StatCard = ({
  icon,
  title,
  value,
  bg,
  iconBg
}) => {
return <div className="admin-user-card" style={{
    background: bg,
    borderRadius: "16px",
    padding: "14px 16px",
    minHeight: "72px",
    display: "flex",
    alignItems: "center",
    gap: "12px"
  }}>
      <div style={{
      width: "34px",
      height: "34px",
      borderRadius: "50%",
      background: iconBg,
      color: "#0c1d3f",
      display: "grid",
      placeItems: "center",
      flexShrink: 0
    }}>
        {icon}
      </div>
      <div>
        <div style={{
        color: "#121e3c",
        fontSize: "13px",
        fontWeight: 600
      }}>{title}</div>
        <div style={{
        color: "#121e3c",
        fontSize: "26px",
        fontWeight: 700,
        lineHeight: 1.1
      }}>{value}</div>
      </div>
    </div>;
};
const Th = ({
  children,
  align = "left",
  width
}) => <th style={{
  textAlign: align,
  color: "#7b8aa8",
  fontSize: "12px",
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  padding: "10px 12px",
  fontWeight: 700,
  borderBottom: "1px solid #e6ebf5",
  width
}}>
    {children}
  </th>;
const Td = ({
  children,
  align
}) => <td style={{
  background: "#ffffff",
  color: "#4a5875",
  fontSize: "14px",
  padding: "12px",
  textAlign: align || "left",
  borderBottom: "1px solid #edf1f8",
  verticalAlign: "middle"
}}>
    {children}
  </td>;
const AddUserModal = ({
  roles,
  form,
  onChange,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation();
return <div style={{
    position: "fixed",
    inset: 0,
    background: "rgba(13, 21, 44, 0.4)",
    display: "grid",
    placeItems: "center",
    zIndex: 50,
    padding: "16px",
    boxSizing: "border-box"
  }}>
      <div style={{
      width: "min(620px, calc(100vw - 28px))",
      maxHeight: "90vh",
      overflowY: "auto",
      background: "#fff",
      borderRadius: "16px",
      boxShadow: "0 18px 55px rgba(21, 32, 58, 0.28)",
      padding: "18px",
      boxSizing: "border-box"
    }}>
        <h3 style={{
        margin: 0,
        color: "#2f3d72",
        fontSize: "24px"
      }}>{t("company_admin.add_new_user", "Add New User")}</h3>
        <p style={{
        marginTop: "6px",
        color: "#6f7f9e"
      }}>{t("company_admin.create_a_user_account_and_assign_a_role", "Create a user account and assign a role.")}</p>

        <form onSubmit={onSubmit}>
          <div className="admin-modal-grid-2col" style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(200px, 1fr))",
          gap: "12px"
        }}>
            <Field label={t("fields.first_name", "First Name")} name="u_fname" value={form.u_fname} onChange={onChange} required />
            <Field label={t("fields.last_name", "Last Name")} name="u_lname" value={form.u_lname} onChange={onChange} required />
            <Field label={t("fields.email", "Email")} name="u_email" value={form.u_email} onChange={onChange} type="email" required />
            <Field label={t("fields.password", "Password")} name="u_pw" value={form.u_pw} onChange={onChange} type="password" required />
            <Field label={t("fields.contact_number", "Contact Number")} name="u_connumber" value={form.u_connumber} onChange={onChange} />

            <div>
              <label style={{
              display: "block",
              marginBottom: "6px",
              color: "#334466",
              fontWeight: 600
            }}>{t("company_admin.role", "Role")}</label>
              <select name="role_id" value={form.role_id} onChange={onChange} required style={{
              width: "100%",
              height: "40px",
              border: "1px solid #d8e0ed",
              borderRadius: "10px",
              padding: "0 10px",
              color: "#334466"
            }}>
                {accessibleRoles.map(role => <option key={role.role_id} value={String(role.role_id)}>
                    {role.role_name}
                  </option>)}
              </select>
            </div>
          </div>

          <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginTop: "18px"
        }}>
            <button type="button" onClick={onClose} style={{
            border: "1px solid #d6deee",
            background: "#fff",
            color: "#45567a",
            height: "38px",
            padding: "0 14px",
            borderRadius: "9px",
            cursor: "pointer",
            fontWeight: 600
          }}>{t("company_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
            <button type="submit" style={{
            border: "none",
            background: "#236fd9",
            color: "#fff",
            height: "38px",
            padding: "0 14px",
            borderRadius: "9px",
            cursor: "pointer",
            fontWeight: 600
          }}>{t("company_admin.save_user", "Save User")}</button>
          </div>
        </form>
      </div>
    </div>;
};
const Field = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false
}) => {
return <div>
      <label style={{
      display: "block",
      marginBottom: "6px",
      color: "#334466",
      fontWeight: 600
    }}>{label}</label>
      <input name={name} value={value} onChange={onChange} type={type} required={required} style={{
      width: "100%",
      height: "40px",
      border: "1px solid #d8e0ed",
      borderRadius: "10px",
      padding: "0 10px",
      color: "#334466"
    }} />
    </div>;
};
const DeleteConfirmModal = ({
  userName,
  onClose,
  onConfirm,
  loading
}) => {
  const { t } = useTranslation();
return <div style={{
    position: "fixed",
    inset: 0,
    background: "rgba(15, 20, 30, 0.62)",
    display: "grid",
    placeItems: "center",
    zIndex: 70
  }}>
      <div style={{
      width: "min(430px, calc(100vw - 32px))",
      background: "#ffffff",
      borderRadius: "14px",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.28)",
      padding: "22px 20px",
      textAlign: "center"
    }}>
        <h3 style={{
        margin: "0 0 8px",
        color: "#111827",
        fontSize: "33px",
        fontWeight: 700
      }}>{t("company_admin.delete_confirmation", "Delete Confirmation")}</h3>
        <p style={{
        margin: "0 0 18px",
        color: "#5f6778",
        fontSize: "16px",
        lineHeight: 1.35
      }}>{t("company_admin.are_you_sure_you_want", "Are you sure you want")}<br />{t("company_admin.to_delete_this_user", "to delete this user?")}{userName ? <>
              <br />
              <span style={{
            color: "#374151",
            fontWeight: 600
          }}>{userName}</span>
            </> : null}
        </p>

        <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "18px"
      }}>
          <button type="button" onClick={onClose} disabled={loading} style={{
          minWidth: "112px",
          height: "42px",
          borderRadius: "10px",
          border: "1px solid #d5d8df",
          background: "#f3f4f6",
          color: "#dc2626",
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.65 : 1
        }}>{t("company_admin.cancel", t("buttons.cancel", "Cancel"))}</button>

          <button type="button" onClick={onConfirm} disabled={loading} style={{
          minWidth: "120px",
          height: "42px",
          borderRadius: "10px",
          border: "none",
          background: "#dc3d3d",
          color: "#ffffff",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1
        }}>
            {loading ? t("buttons.deleting", "Deleting...") : t("buttons.delete", "Delete")}
          </button>
        </div>
      </div>
    </div>;
};
export default UserManagement;