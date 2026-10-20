import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import {
  getUsers,
  getRoles,
  getCompanies,
  updateUser,
  deleteUserById,
  setAuthToken,
  logout,
} from "../../services/api";
import ToggleSwitch from "../../components/super-admin/ToggleSwitch";
import Spinner from "../../components/super-admin/Spinner";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
import { connectSocket, subscribeToUserUpdates } from "../../services/socket";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
} from "lucide-react";

// Helper to get 2-letter initials
const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

// Helper for Avatar colors based on initials
const getAvatarColor = (initials) => {
  const colors = [
    "#1E293B", // dark navy
    "#64748B", // slate gray
    "#0F766E", // teal
    "#D97706", // amber
    "#475569", // blue slate
    "#EA580C", // terracotta / orange
    "#0F172A", // black slate
    "#0D9488", // emerald
  ];
  const charCode = (initials.charCodeAt(0) || 0) + (initials.charCodeAt(1) || 0);
  return colors[charCode % colors.length];
};

// Role badge component with exact styling matching design
const RoleBadge = ({ role }) => {
  const r = (role || "").toLowerCase().trim();

  let badgeStyle = "bg-[#F1F3F5] text-[#64748B]";

  if (r === "super admin" || r === "superadmin") {
    badgeStyle = "bg-[#0B192C] text-white";
  } else if (r === "admin" || r === "company admin") {
    badgeStyle = "bg-[#E8F8F5] text-[#0D9488]";
  } else if (r === "branch admin" || r === "branchadmin") {
    badgeStyle = "bg-[#FEF3E8] text-[#D97706]";
  } else if (r === "cashier") {
    badgeStyle = "bg-[#E8F8F5] text-[#0D9488]";
  } else if (r.includes("kitchen")) {
    badgeStyle = "bg-[#F1F3F5] text-[#64748B]";
  }

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold inline-block whitespace-nowrap ${badgeStyle}`}
    >
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
  const itemsPerPage = 12;
  const totalPages = Math.max(1, Math.ceil(totalUsersCount / itemsPerPage));

  // Connect to socket and subscribe to user updates
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);

    connectSocket();

    const unsubscribe = subscribeToUserUpdates({
      onUserCreated: (newUser) => {
        setUsers((prevUsers) => {
          const exists = prevUsers.some((u) => u.u_id === newUser.u_id);
          if (exists) return prevUsers;
          return [...prevUsers, newUser];
        });
        toast.success(
          "New User Added",
          `${newUser.u_fname} ${newUser.u_lname} was added`
        );
      },
      onUserUpdated: (updatedUser) => {
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.u_id === updatedUser.u_id ? { ...u, ...updatedUser } : u
          )
        );
        toast.info(
          "User Updated",
          `${updatedUser.u_fname} ${updatedUser.u_lname} was updated`
        );
      },
      onUserDeleted: (deletedUser) => {
        setUsers((prevUsers) =>
          prevUsers.filter((u) => u.u_id !== deletedUser.u_id)
        );
        toast.info(
          "User Deleted",
          `${deletedUser.userName || "A user"} was deleted`
        );
      },
    });

    if (location.state?.successMessage) {
      toast.success("Success", location.state.successMessage);
      window.history.replaceState({}, document.title);
    }

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
        roleId: selectedRole,
      };
      const countParams = {
        countOnly: "true",
        search: searchQuery,
        companyId: selectedCompany,
        roleId: selectedRole,
      };

      const [usersData, countData, rolesData, companiesData] = await Promise.all([
        getUsers(params),
        getUsers(countParams),
        getRoles().catch(() => []),
        getCompanies().catch(() => []),
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

      setUsers((prev) =>
        prev.map((u) => (u.u_id === userId ? { ...u, u_status: nextStatus } : u))
      );

      await updateUser(userId, { u_status: nextStatus });
      toast.success("Status Updated", "User status was successfully updated.");
    } catch (err) {
      console.error("Error toggling user status:", err);
      fetchData();
      toast.error(
        "Error",
        err.response?.data?.message || err.message || "Failed to update status"
      );
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
      setErrorMessage(
        err.response?.data?.message || err.message || "Failed to delete user."
      );
      toast.error(
        "Error",
        err.response?.data?.message || err.message || "Failed to delete user."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export functionality
  const handleExport = () => {
    if (!users || users.length === 0) {
      toast.info("No Data", "There are no users to export.");
      return;
    }
    const headers = ["Name", "Email", "Company/Branch", "Role", "Status"];
    const rows = users.map((u) => [
      `"${(`${u.u_fname || ""} ${u.u_lname || ""}`).trim()}"`,
      `"${u.u_email || ""}"`,
      `"${u.company_name || u.branch_name || "—"}"`,
      `"${u.role_name || "User"}"`,
      `"${
        String(u.u_status).toLowerCase() === "active" ||
        String(u.u_status).toLowerCase() === "true" ||
        u.u_status === true
          ? "Active"
          : "Inactive"
      }"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `users_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export Complete", "Users list downloaded successfully.");
  };

  const companiesCount =
    companies.filter((c) => c.c_status !== false).length || companies.length || 0;

  if (loading && users.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F0]">
        <Sidebar />
        <div className="sa-main-content flex-1 ml-[240px] flex flex-col">
          <Header title="User Management" />
          <div className="flex-1 flex justify-center items-center min-h-[calc(100vh-70px)]">
            <div className="flex flex-col items-center gap-4">
              <Spinner size={44} />
              <p className="m-0 text-slate-500 font-medium text-sm">Loading Users...</p>
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
        <Header title="User Management" />

        <div className="p-6 md:p-8 space-y-6">
          {/* Top Bar: Title, Subtitle, and Add User Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 m-0">All Users</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 m-0">
                {totalUsersCount} user{totalUsersCount === 1 ? "" : "s"} across{" "}
                {companiesCount} compan{companiesCount === 1 ? "y" : "ies"}
              </p>
            </div>

            <button
              onClick={() => navigate("/super-admin/users/add")}
              className="bg-[#0B192C] text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add New User</span>
            </button>
          </div>

          {/* Search and Export Toolbar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>

            <button
              onClick={handleExport}
              className="border border-slate-200/90 bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition-colors"
            >
              <Sparkles size={14} className="text-slate-500" />
              <span>Export</span>
            </button>
          </div>

          {/* Main Users Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      USER
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      COMPANY / BRANCH
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      ROLE
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      STATUS
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user, i) => {
                      const fullName = `${user.u_fname || ""} ${user.u_lname || ""}`.trim() || "User";
                      const initials = getInitials(fullName);
                      const avatarColor = getAvatarColor(initials);
                      const s = String(user.u_status || "").toLowerCase();
                      const isActive =
                        s === "active" || s === "true" || user.u_status === true;

                      return (
                        <tr
                          key={user.u_id || i}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                        >
                          {/* Column 1: USER (Avatar + Name & Email) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div
                                style={{ backgroundColor: avatarColor }}
                                className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                              >
                                {initials}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-slate-900 leading-tight truncate">
                                  {fullName}
                                </span>
                                <span className="text-xs text-slate-400 mt-0.5 leading-tight truncate">
                                  {user.u_email || "Not Provided"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: COMPANY / BRANCH */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-700">
                              {user.company_name || user.branch_name || "—"}
                            </span>
                          </td>

                          {/* Column 3: ROLE */}
                          <td className="px-6 py-4">
                            <RoleBadge role={user.role_name} />
                          </td>

                          {/* Column 4: STATUS (Toggle Switch) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <ToggleSwitch
                                checked={isActive}
                                onChange={() =>
                                  handleToggleStatus(user.u_id, user.u_status)
                                }
                                disabled={togglingId === user.u_id}
                              />
                              {togglingId === user.u_id && (
                                <Spinner size={14} />
                              )}
                            </div>
                          </td>

                          {/* Column 5: ACTIONS (Edit & Delete) */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() =>
                                  navigate(`/super-admin/users/${user.u_id}/edit`)
                                }
                                title="Edit User"
                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
                              >
                                <Pencil size={13} strokeWidth={2} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(user)}
                                title="Delete User"
                                className="w-7 h-7 rounded-lg border border-red-200/80 flex items-center justify-center text-red-500 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-colors bg-white cursor-pointer"
                              >
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <span className="text-xs text-slate-500">
                Showing{" "}
                <b className="text-slate-700">
                  {totalUsersCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                </b>{" "}
                to{" "}
                <b className="text-slate-700">
                  {Math.min(currentPage * itemsPerPage, totalUsersCount)}
                </b>{" "}
                of <b className="text-slate-700">{totalUsersCount}</b> users
              </span>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 m-0 mb-1.5">
              Delete User?
            </h3>
            <p className="text-xs text-slate-500 m-0 mb-6 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-slate-700 font-semibold">
                "{userToDelete?.u_fname} {userToDelete?.u_lname}"
              </strong>
              ? This action cannot be undone.
            </p>

            {errorMessage && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs mb-4">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDeleting && <Spinner size={14} color="#fff" />}
                <span>{isDeleting ? "Deleting..." : "Delete User"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default UserManagement;