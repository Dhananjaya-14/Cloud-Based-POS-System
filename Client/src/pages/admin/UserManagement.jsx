import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCashRegister,
  FaFilter,
  FaPen,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUserCheck,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import {
  createUser,
  deleteUserById,
  getBranches,
  getRoles,
  getUsers,
} from "../../services/api";

const UserManagement = () => {
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

  const [newUser, setNewUser] = useState({
    u_fname: "",
    u_lname: "",
    u_email: "",
    u_pw: "",
    u_connumber: "",
    role_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [usersData, rolesData, branchesData] = await Promise.all([
        getUsers(),
        getRoles(),
        getBranches(),
      ]);

      setUsers(usersData || []);
      setRoles(rolesData || []);
      setBranches(branchesData || []);

      const defaultRole = rolesData?.[0]?.role_id ? String(rolesData[0].role_id) : "";
      setNewUser((prev) => ({ ...prev, role_id: prev.role_id || defaultRole }));
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

  const branchMapByUser = useMemo(() => {
    return branches.reduce((acc, branch) => {
      if (branch.U_id) {
        acc[String(branch.U_id)] = branch.B_name;
      }
      return acc;
    }, {});
  }, [branches]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const fullName = `${user.u_fname || ""} ${user.u_lname || ""}`.trim().toLowerCase();
      const email = (user.u_email || "").toLowerCase();
      const roleName = (roleMap[String(user.role_id)] || "Unknown").toLowerCase();
      const branchName = (branchMapByUser[String(user.u_id)] || "-").toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        fullName.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        roleName.includes(normalizedSearch) ||
        branchName.includes(normalizedSearch);

      const matchesRole = roleFilter === "all" || String(user.role_id) === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter, roleMap, branchMapByUser]);

  const visibleUsers = useMemo(() => filteredUsers.slice(0, 5), [filteredUsers]);

  const totalUsers = users.length;
  const branchAdminCount = users.filter((u) => (roleMap[String(u.role_id)] || "").toLowerCase().includes("branch")).length;
  const cashierCount = users.filter((u) => (roleMap[String(u.role_id)] || "").toLowerCase().includes("cashier")).length;
  const activeUsers = users.length;

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      await createUser({
        ...newUser,
        role_id: newUser.role_id ? Number(newUser.role_id) : null,
      });

      setIsAddModalOpen(false);
      setNewUser({
        u_fname: "",
        u_lname: "",
        u_email: "",
        u_pw: "",
        u_connumber: "",
        role_id: roles?.[0]?.role_id ? String(roles[0].role_id) : "",
      });

      fetchData();
    } catch (err) {
      window.alert(err?.response?.data?.message || "Failed to create user.");
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTargetUser?.u_id) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteUserById(deleteTargetUser.u_id);
      setDeleteTargetUser(null);
      fetchData();
    } catch (err) {
      window.alert(err?.response?.data?.message || "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", background: "#f0f3f9", height: "100vh", overflow: "hidden" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          marginLeft: "240px",
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header title="User Management" />

        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "14px 18px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ fontSize: "30px", margin: 0, fontWeight: 700, color: "#2f3d72", letterSpacing: "0.3px", lineHeight: 1 }}>
              User Management
            </h1>
            <button
              type="button"
              onClick={() => navigate("/users/add")}
              style={{
                border: "none",
                background: "#0b61b5",
                color: "#fff",
                height: "36px",
                padding: "0 16px",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontWeight: 600,
                boxShadow: "0 4px 10px rgba(11, 97, 181, 0.26)",
              }}
            >
              <FaPlus size={12} /> Add New User
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: "12px" }}>
            <StatCard icon={<FaUsers />} title="Total Users" value={totalUsers} bg="#b6e6bf" iconBg="#2bc454" />
            <StatCard icon={<FaUserShield />} title="Branch Admins" value={branchAdminCount} bg="#f6d2de" iconBg="#ef5a86" />
            <StatCard icon={<FaCashRegister />} title="Cashiers" value={cashierCount} bg="#bae2f4" iconBg="#4a91e2" />
            <StatCard icon={<FaUserCheck />} title="Active Users" value={activeUsers} bg="#f8dea5" iconBg="#ddb94b" />
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "12px",
              boxShadow: "0 4px 18px rgba(38, 62, 123, 0.08)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "10px",
                minWidth: 0,
              }}
            >
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <FaSearch
                  style={{ position: "absolute", top: "50%", left: "11px", transform: "translateY(-50%)", color: "#97a5c0" }}
                  size={12}
                />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by branch"
                  style={{
                    width: "100%",
                    height: "34px",
                    border: "1px solid #d8e0ed",
                    borderRadius: "7px",
                    padding: "0 12px 0 30px",
                    color: "#3d4f73",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "92px 140px",
                  gap: "8px",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  style={{
                    border: "1px solid #d8e0ed",
                    borderRadius: "7px",
                    height: "34px",
                    background: "#f7f9fd",
                    color: "#617090",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontWeight: 600,
                    boxSizing: "border-box",
                  }}
                >
                  <FaFilter size={11} /> Filter
                </button>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    border: "1px solid #d8e0ed",
                    borderRadius: "7px",
                    height: "34px",
                    color: "#3d4f73",
                    padding: "0 10px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                >
                  <option value="all">All Roles</option>
                  {roles.map((role) => (
                    <option key={role.role_id} value={String(role.role_id)}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <p style={{ textAlign: "center", color: "#607094", margin: "22px 0" }}>Loading users...</p>
            ) : error ? (
              <p style={{ textAlign: "center", color: "#cf3e3e", margin: "22px 0" }}>{error}</p>
            ) : (
              <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <Th width="18%">Role</Th>
                      <Th width="38%">Name</Th>
                      <Th width="18%">Branch</Th>
                      <Th width="16%">Status</Th>
                      <Th width="10%" align="center">Action</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleUsers.map((user) => {
                      const fullName = `${user.u_fname || ""} ${user.u_lname || ""}`.trim() || "Unknown User";
                      const initials = `${(user.u_fname || "U").charAt(0)}${(user.u_lname || "S").charAt(0)}`.toUpperCase();
                      const roleName = roleMap[String(user.role_id)] || "Unknown";
                      const branchName = branchMapByUser[String(user.u_id)] || "-";

                      return (
                        <tr key={user.u_id}>
                          <Td>
                            <span style={{ fontWeight: 600, color: "#1f2d4e" }}>{roleName}</span>
                          </Td>

                          <Td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "50%",
                                  background: "linear-gradient(135deg, #1f8df2, #0f5ea7)",
                                  color: "#fff",
                                  display: "grid",
                                  placeItems: "center",
                                  fontSize: "9px",
                                  fontWeight: 700,
                                }}
                              >
                                {initials}
                              </div>
                              <div style={{ color: "#1f2d4e", fontWeight: 500 }}>{fullName}</div>
                            </div>
                          </Td>

                          <Td>{branchName}</Td>

                          <Td>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "999px",
                                background: "#dff6e4",
                                color: "#20a048",
                                fontSize: "12px",
                                fontWeight: 700,
                              }}
                            >
                              Available
                            </span>
                          </Td>

                          <Td align="center">
                            <div style={{ display: "inline-flex", gap: "10px", justifyContent: "center" }}>
                              <button
                                type="button"
                                onClick={() => navigate(`/users/${user.u_id}/edit`)}
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  border: "1px solid #d6deee",
                                  background: "#f5f8fd",
                                  borderRadius: "8px",
                                  color: "#607094",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title="Edit user"
                              >
                                <FaPen size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTargetUser({ u_id: user.u_id, name: fullName })}
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  border: "1px solid #ffcfcf",
                                  background: "#fff3f3",
                                  borderRadius: "8px",
                                  color: "#ef4c4c",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title="Delete user"
                              >
                                <FaTrash size={11} />
                              </button>
                            </div>
                          </Td>
                        </tr>
                      );
                    })}

                    {visibleUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "#7183a8", padding: "18px 0" }}>
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <AddUserModal
          roles={roles}
          form={newUser}
          onChange={handleNewUserChange}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {deleteTargetUser && (
        <DeleteConfirmModal
          userName={deleteTargetUser.name}
          onClose={() => {
            if (!isDeleting) {
              setDeleteTargetUser(null);
            }
          }}
          onConfirm={confirmDeleteUser}
          loading={isDeleting}
        />
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value, bg, iconBg }) => {
  return (
    <div
      style={{
        background: bg,
        borderRadius: "16px",
        padding: "14px 16px",
        minHeight: "72px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          background: iconBg,
          color: "#0c1d3f",
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ color: "#121e3c", fontSize: "13px", fontWeight: 600 }}>{title}</div>
        <div style={{ color: "#121e3c", fontSize: "26px", fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      </div>
    </div>
  );
};

const Th = ({ children, align = "left", width }) => (
  <th
    style={{
      textAlign: align,
      color: "#7b8aa8",
      fontSize: "12px",
      letterSpacing: "0.6px",
      textTransform: "uppercase",
      padding: "10px 12px",
      fontWeight: 700,
      borderBottom: "1px solid #e6ebf5",
      width,
    }}
  >
    {children}
  </th>
);

const Td = ({ children, align }) => (
  <td
    style={{
      background: "#ffffff",
      color: "#4a5875",
      fontSize: "14px",
      padding: "12px",
      textAlign: align || "left",
      borderBottom: "1px solid #edf1f8",
      verticalAlign: "middle",
    }}
  >
    {children}
  </td>
);

const AddUserModal = ({ roles, form, onChange, onClose, onSubmit }) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(13, 21, 44, 0.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "min(620px, calc(100vw - 28px))",
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 18px 55px rgba(21, 32, 58, 0.28)",
          padding: "18px",
        }}
      >
        <h3 style={{ margin: 0, color: "#2f3d72", fontSize: "24px" }}>Add New User</h3>
        <p style={{ marginTop: "6px", color: "#6f7f9e" }}>Create a user account and assign a role.</p>

        <form onSubmit={onSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(200px, 1fr))", gap: "12px" }}>
            <Field label="First Name" name="u_fname" value={form.u_fname} onChange={onChange} required />
            <Field label="Last Name" name="u_lname" value={form.u_lname} onChange={onChange} required />
            <Field label="Email" name="u_email" value={form.u_email} onChange={onChange} type="email" required />
            <Field label="Password" name="u_pw" value={form.u_pw} onChange={onChange} type="password" required />
            <Field label="Contact Number" name="u_connumber" value={form.u_connumber} onChange={onChange} />

            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#334466", fontWeight: 600 }}>Role</label>
              <select
                name="role_id"
                value={form.role_id}
                onChange={onChange}
                required
                style={{
                  width: "100%",
                  height: "40px",
                  border: "1px solid #d8e0ed",
                  borderRadius: "10px",
                  padding: "0 10px",
                  color: "#334466",
                }}
              >
                {roles.map((role) => (
                  <option key={role.role_id} value={String(role.role_id)}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid #d6deee",
                background: "#fff",
                color: "#45567a",
                height: "38px",
                padding: "0 14px",
                borderRadius: "9px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                border: "none",
                background: "#236fd9",
                color: "#fff",
                height: "38px",
                padding: "0 14px",
                borderRadius: "9px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Save User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, name, value, onChange, type = "text", required = false }) => {
  return (
    <div>
      <label style={{ display: "block", marginBottom: "6px", color: "#334466", fontWeight: 600 }}>{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        required={required}
        style={{
          width: "100%",
          height: "40px",
          border: "1px solid #d8e0ed",
          borderRadius: "10px",
          padding: "0 10px",
          color: "#334466",
        }}
      />
    </div>
  );
};

const DeleteConfirmModal = ({ userName, onClose, onConfirm, loading }) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 20, 30, 0.62)",
        display: "grid",
        placeItems: "center",
        zIndex: 70,
      }}
    >
      <div
        style={{
          width: "min(430px, calc(100vw - 32px))",
          background: "#ffffff",
          borderRadius: "14px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.28)",
          padding: "22px 20px",
          textAlign: "center",
        }}
      >
        <h3 style={{ margin: "0 0 8px", color: "#111827", fontSize: "33px", fontWeight: 700 }}>
          Delete Confirmation
        </h3>
        <p style={{ margin: "0 0 18px", color: "#5f6778", fontSize: "16px", lineHeight: 1.35 }}>
          Are you sure you want
          <br />
          to delete this user?
          {userName ? (
            <>
              <br />
              <span style={{ color: "#374151", fontWeight: 600 }}>{userName}</span>
            </>
          ) : null}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "18px" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              minWidth: "112px",
              height: "42px",
              borderRadius: "10px",
              border: "1px solid #d5d8df",
              background: "#f3f4f6",
              color: "#dc2626",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.65 : 1,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              minWidth: "120px",
              height: "42px",
              borderRadius: "10px",
              border: "none",
              background: "#dc3d3d",
              color: "#ffffff",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
