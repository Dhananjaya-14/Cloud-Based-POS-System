import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes, FaEye, FaEyeSlash } from "react-icons/fa";
import { FiCheck, FiEdit, FiFilter, FiPlus, FiSearch, FiTag, FiTrash2, FiUser } from "react-icons/fi";
import { Banknote } from "lucide-react";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import { createUser, deleteUserById, getBranches, getRoles, getUsers } from "../../services/api";
import { connectSocket, getSocket, joinBranchUserRoom, SOCKET_EVENTS } from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
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
  const [currentUserBranch, setCurrentUserBranch] = useState(null);
  const [toasts, setToasts] = useState([]);
  const accessibleRoles = useMemo(() => {
    return roles.filter(role => {
      const roleName = String(role.role_name || "").toLowerCase();
      if (roleName.includes("admin")) return false;
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
    setupSocketConnection();
    return () => {
      // Cleanup socket listeners when component unmounts
      const socket = getSocket();
      if (socket) {
        socket.off(SOCKET_EVENTS.USER_CREATED);
        socket.off(SOCKET_EVENTS.USER_UPDATED);
        socket.off(SOCKET_EVENTS.USER_DELETED);
      }
    };
  }, []);
  const setupSocketConnection = () => {
const token = localStorage.getItem("token");
    if (!token) return;

    // Connect socket
    const socket = connectSocket();

    // Get user info from token
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const userData = JSON.parse(window.atob(base64));
      const branchId = userData.b_id;
      if (branchId) {
        setCurrentUserBranch(branchId);
        // Join branch user room for real-time updates
        joinBranchUserRoom(branchId);

        // Listen for user creation events
        socket.on(SOCKET_EVENTS.USER_CREATED, newUserData => {
          console.log("New user created:", newUserData);
          setUsers(prevUsers => {
            if (prevUsers.some(u => u.u_id === newUserData.u_id)) {
              return prevUsers;
            }
            return [...prevUsers, newUserData];
          });
        });

        // Listen for user update events
        socket.on(SOCKET_EVENTS.USER_UPDATED, updatedUserData => {
          console.log("User updated:", updatedUserData);
          setUsers(prevUsers => prevUsers.map(user => user.u_id === updatedUserData.u_id ? updatedUserData : user));
        });

        // Listen for user deletion events
        socket.on(SOCKET_EVENTS.USER_DELETED, ({
          u_id,
          userName
        }) => {
          console.log("User deleted:", u_id);
          setUsers(prevUsers => prevUsers.filter(user => user.u_id !== u_id));
        });
      }
    } catch (error) {
      console.error("Error setting up socket connection:", error);
    }
  };
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [usersData, rolesData, branchesData] = await Promise.all([getUsers(), getRoles(), getBranches()]);
      setUsers(usersData || []);
      setRoles(rolesData || []);
      setBranches(branchesData || []);
      const allowedRoles = (rolesData || []).filter(role => !String(role.role_name || "").toLowerCase().includes("admin"));
      const defaultRole = allowedRoles?.[0]?.role_id ? String(allowedRoles[0].role_id) : "";
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
  const accessibleRoleIds = useMemo(() => {
    return new Set(accessibleRoles.map(role => String(role.role_id)));
  }, [accessibleRoles]);
  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return users.filter(user => {
      if (!accessibleRoleIds.has(String(user.role_id))) {
        return false;
      }
      const fullName = `${user.u_fname || ""} ${user.u_lname || ""}`.trim().toLowerCase();
      const email = (user.u_email || "").toLowerCase();
      const roleName = (roleMap[String(user.role_id)] || "Unknown").toLowerCase();
      const branchName = branchMap[String(user.b_id)] || "-";
      const matchesSearch = !normalizedSearch || fullName.includes(normalizedSearch) || email.includes(normalizedSearch) || roleName.includes(normalizedSearch) || branchName.includes(normalizedSearch);
      const matchesRole = roleFilter === "all" || String(user.role_id) === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter, roleMap, branchMap, accessibleRoleIds]);
  const visibleUsers = useMemo(() => filteredUsers, [filteredUsers]);
  const totalUsers = filteredUsers.length;
  const branchAdminCount = filteredUsers.filter(u => !String(roleMap[String(u.role_id)] || "").toLowerCase().includes("cashier")).length;
  const cashierCount = filteredUsers.filter(u => (roleMap[String(u.role_id)] || "").toLowerCase().includes("cashier")).length;
  const activeUsers = filteredUsers.length;
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
  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [toasts]);
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
  const handleCreateUser = async e => {
    e.preventDefault();
    if (!accessibleRoleIds.has(String(newUser.role_id))) {
      showToastMessage("Please select a supported role.", "error");
      return;
    }
    
    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newUser.u_email && !emailRegex.test(newUser.u_email)) {
      showToastMessage("Please enter a valid email address", "error");
      return;
    }

    // Phone Validation
    if (newUser.u_connumber) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(newUser.u_connumber)) {
        showToastMessage("Please enter a valid numeric contact number", "error");
        return;
      }
    }

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
        role_id: accessibleRoles?.[0]?.role_id ? String(accessibleRoles[0].role_id) : ""
      });
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
    } catch (err) {
      showToastMessage(err?.response?.data?.message || "Failed to delete user.", "error");
    } finally {
      setIsDeleting(false);
    }
  };
  return <div className="flex min-h-screen bg-[#F7F5F0]">
      <Sidebar />

      <div className="ml-[240px] min-w-0 flex-1">
        <Header title={t("branch_admin.user_management", "User Management")} />

        <div className="px-9 py-8">
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

          {/* Page heading + Add button */}
          <div className="mb-[22px] flex items-start justify-between gap-4">
            <div>
              <h2 className="m-0 mb-1 font-space text-xl font-bold text-[#071E38]">{t("branch_admin.branch_staff", "Branch Staff")}</h2>
              <p className="m-0 text-[13px] text-[#5B6470]">{totalUsers} {totalUsers === 1 ? t("branch_admin.user_in_this_branch", "user in this branch") : t("branch_admin.users_in_this_branch", "users in this branch")}</p>
            </div>
            <button type="button" onClick={() => setIsAddModalOpen(true)} className="inline-flex cursor-pointer items-center gap-[7px] rounded-lg border-0 bg-[#071E38] px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#0F9B8E]">
              <FiPlus size={14} strokeWidth={2} />{t("branch_admin.add_new_user", "Add New User")}</button>
          </div>

          {/* Summary cards */}
          <div className="mb-[22px] grid grid-cols-2 gap-[18px] lg:grid-cols-4">
            <StatCard icon={<FiUser size={20} />} title={t("company_admin.total_users", "Total Users")} value={totalUsers} bg="rgba(11,46,79,0.08)" fg="#0B2E4F" />
            <StatCard icon={<FiTag size={20} />} title={t("company_admin.assignable_roles", "Assignable Roles")} value={branchAdminCount} bg="rgba(217,161,92,0.15)" fg="#D9A15C" />
            <StatCard icon={<Banknote size={20} strokeWidth={1.8} />} title={t("company_admin.cashiers", "Cashiers")} value={cashierCount} bg="rgba(15,155,142,0.1)" fg="#0F9B8E" />
            <StatCard icon={<FiCheck size={20} />} title={t("company_admin.active_users", "Active Users")} value={activeUsers} bg="rgba(60,174,73,0.1)" fg="#3CAE49" />
          </div>

          {/* Panel: toolbar + table */}
          <div className="overflow-hidden rounded-[14px] border border-[#E7E3D8] bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-[#E7E3D8] px-[22px] py-[18px]">
              <div className="relative min-w-[220px] flex-1">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" size={15} />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t("branch_admin.search_users", "Search users...")} className="w-full rounded-lg border-[1.5px] border-[#E7E3D8] bg-white py-2.5 pl-9 pr-3.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#0F9B8E]" />
              </div>

              <button type="button" className="inline-flex cursor-pointer items-center gap-[7px] rounded-lg border-[1.5px] border-[#E7E3D8] bg-white px-4 py-[9px] text-[13px] font-semibold text-[#071E38] transition-colors hover:border-[#0F9B8E] hover:text-[#0F9B8E]">
                <FiFilter size={14} />{t("branch_admin.filter", "Filter")}</button>

              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="cursor-pointer rounded-lg border-[1.5px] border-[#E7E3D8] bg-white px-3.5 py-2.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#0F9B8E]">
                <option value="all">{t("branch_admin.all_roles", "All Roles")}</option>
                {accessibleRoles.map(role => <option key={role.role_id} value={String(role.role_id)}>{role.role_name}</option>)}
              </select>
            </div>

            {loading ? <p className="m-0 px-6 py-10 text-center text-[13px] text-[#5B6470]">{t("branch_admin.loading_users", "Loading users...")}</p> : error ? <p className="m-0 px-6 py-10 text-center text-[13px] text-[#B91C1C]">{error}</p> : <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: "620px" }}>
                  <thead>
                    <tr>
                      <Th width="20%">{t("company_admin.role", "Role")}</Th>
                      <Th width="32%">{t("company_admin.name", "Name")}</Th>
                      <Th width="20%">{t("company_admin.branch", "Branch")}</Th>
                      <Th width="16%">{t("company_admin.status", "Status")}</Th>
                      <Th width="12%" align="right">{t("company_admin.action", "Action")}</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleUsers.map(user => {
                      const fullName = `${user.u_fname || ""} ${user.u_lname || ""}`.trim() || "Unknown User";
                      const initials = `${(user.u_fname || "U").charAt(0)}${(user.u_lname || "S").charAt(0)}`.toUpperCase();
                      const roleName = roleMap[String(user.role_id)] || "Unknown";
                      const branchName = branchMap[String(user.b_id)] || "-";
                      const avatarColor = roleName.toLowerCase().includes("cashier") ? "#0F9B8E" : "#0B2E4F";
                      return <tr key={user.u_id} className="hover:bg-[#FBFAF7] [&:last-child>td]:border-b-0">
                          <Td><span className="text-[13px] font-semibold text-[#071E38]">{roleName}</span></Td>

                          <Td>
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: avatarColor }}>{initials}</div>
                              <span className="truncate">{fullName}</span>
                            </div>
                          </Td>

                          <Td>{branchName}</Td>

                          <Td><span className="inline-flex rounded-full bg-[rgba(60,174,73,0.12)] px-[11px] py-1 text-[11px] font-bold text-[#3CAE49]">{t("company_admin.available", "Available")}</span></Td>

                          <Td>
                            <div className="flex justify-end gap-1.5">
                              <button type="button" title="Edit user" aria-label="Edit user" onClick={() => navigate(`/branch-admin/users/${user.u_id}/edit`)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[7px] border-[1.5px] border-[#E7E3D8] bg-white p-0 text-[#071E38] transition-colors hover:border-[#0F9B8E] hover:text-[#0F9B8E]">
                                <FiEdit size={14} />
                              </button>
                              <button type="button" title="Delete user" aria-label="Delete user" onClick={() => setDeleteTargetUser({
                                u_id: user.u_id,
                                name: fullName
                              })} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[7px] border-[1.5px] border-[rgba(224,101,79,0.3)] bg-white p-0 text-[#E0654F] transition-colors hover:bg-[#E0654F] hover:text-white">
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </Td>
                        </tr>;
                    })}

                    {visibleUsers.length === 0 && <tr>
                        <td colSpan={5} className="px-[22px] py-[18px] text-center text-[13.5px] text-[#5B6470]">{t("branch_admin.no_users_found", "No users found.")}</td>
                      </tr>}
                  </tbody>
                </table>
              </div>}
          </div>
        </div>
      </div>

      {isAddModalOpen && <AddUserModal roles={accessibleRoles} form={newUser} onChange={handleNewUserChange} onClose={() => setIsAddModalOpen(false)} onSubmit={handleCreateUser} />}

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
// ---------------------------------------------------------------------------
// Presentational helpers (styled to match the approved Branch Staff design)
// ---------------------------------------------------------------------------
const StatCard = ({ icon, title, value, bg, fg }) => <div className="flex items-center gap-3.5 rounded-[14px] border border-[#E7E3D8] bg-white p-5">
    <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px]" style={{ background: bg, color: fg }}>
      {icon}
    </div>
    <div>
      <div className="mb-[3px] text-[12.5px] text-[#5B6470]">{title}</div>
      <div className="font-space text-[22px] font-bold text-[#071E38]">{value}</div>
    </div>
  </div>;

const Th = ({ children, align = "left", width }) => <th className="border-b border-[#E7E3D8] bg-[#FBFAF7] px-[22px] py-3 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#5B6470]" style={{ textAlign: align, width }}>
    {children}
  </th>;

const Td = ({ children }) => <td className="border-b border-[#E7E3D8] px-[22px] py-3.5 align-middle text-[13.5px] text-[#1A1A1A]">
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
    zIndex: 50
  }}>
      <div style={{
      width: "min(620px, calc(100vw - 28px))",
      background: "#fff",
      borderRadius: "16px",
      boxShadow: "0 18px 55px rgba(21, 32, 58, 0.28)",
      padding: "18px"
    }}>
        <h3 style={{
        margin: 0,
        color: "#2f3d72",
        fontSize: "24px"
      }}>{t("branch_admin.add_new_user", "Add New User")}</h3>
        <p style={{
        marginTop: "6px",
        color: "#6f7f9e"
      }}>{t("branch_admin.create_a_user_account_and_assign_a_role", "Create a user account and assign a role.")}</p>

        <form onSubmit={onSubmit}>
          <div style={{
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
            }}>{t("branch_admin.role", "Role")}</label>
              <select name="role_id" value={form.role_id} onChange={onChange} required style={{
              width: "100%",
              height: "40px",
              border: "1px solid #d8e0ed",
              borderRadius: "10px",
              padding: "0 10px",
              color: "#334466"
            }}>
                {roles.map(role => <option key={role.role_id} value={String(role.role_id)}>
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
          }}>{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
            <button type="submit" style={{
            border: "none",
            background: "#236fd9",
            color: "#fff",
            height: "38px",
            padding: "0 14px",
            borderRadius: "9px",
            cursor: "pointer",
            fontWeight: 600
          }}>{t("branch_admin.save_user", "Save User")}</button>
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
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return <div style={{ position: "relative" }}>
      <label style={{
      display: "block",
      marginBottom: "6px",
      color: "#334466",
      fontWeight: 600
    }}>{label}</label>
      <input name={name} value={value} onChange={onChange} type={inputType} required={required} style={{
      width: "100%",
      height: "40px",
      border: "1px solid #d8e0ed",
      borderRadius: "10px",
      padding: "0 10px",
      paddingRight: isPassword ? "36px" : "10px",
      color: "#334466"
    }} />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: "absolute",
            right: "10px",
            top: "34px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6f7f9e",
            padding: "4px"
          }}
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
        </button>
      )}
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
      }}>{t("branch_admin.delete_confirmation", "Delete Confirmation")}</h3>
        <p style={{
        margin: "0 0 18px",
        color: "#5f6778",
        fontSize: "16px",
        lineHeight: 1.35
      }}>{t("branch_admin.are_you_sure_you_want", "Are you sure you want")}<br />{t("branch_admin.to_delete_this_user", "to delete this user?")}{userName ? <>
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
        }}>{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>

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