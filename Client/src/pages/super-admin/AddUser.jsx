import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import Sidebar from "../../components/super-admin/Sidebar";
import Header from "../../components/super-admin/Header";
import { getRoles, getBranches, createUser, setAuthToken, logout } from "../../services/api";

const AddUser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    userRole: "",
    assignedBranch: "",
    activeStatus: true,
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [rolesData, branchesData] = await Promise.all([
        getRoles(),
        getBranches(),
      ]);

      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusToggle = () => {
    setFormData((prev) => ({ ...prev, activeStatus: !prev.activeStatus }));
  };

  const handleSaveChanges = async () => {
    try {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.userRole || !formData.password) {
        alert("Please fill in all required fields.");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      const payload = {
        u_fname: formData.firstName,
        u_lname: formData.lastName,
        u_email: formData.email,
        u_connumber: formData.contactNumber,
        role_id: parseInt(formData.userRole),
        u_pw: formData.password,
        u_status: formData.activeStatus
      };

      await createUser(payload);
      alert("User successfully created!");
      navigate("/super-admin/users");
    } catch (err) {
      console.error("Error creating user:", err);
      alert(err.response?.data?.message || err.message || "Failed to create user.");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
        <Header title="User Management" />

        <div style={{ padding: "30px 40px", flex: 1, display: "flex", flexDirection: "column" }}>

          <div
            onClick={() => navigate("/super-admin/users")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, color: "#6B7280",
              fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 20
            }}
          >
            <FaArrowLeft size={14} /> Back to User Management
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "40px 60px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              maxWidth: 900,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 40 }}>
              Add New User
            </h2>

            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#6B7280" }}>Loading...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Profile Picture & Names */}
                <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: 100, height: 100, borderRadius: "50%", border: "2px solid #111827",
                      display: "flex", alignItems: "center", justifyContent: "center", background: "#F3F4F6"
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="#6B7280" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                      </svg>
                    </div>
                    <button style={{
                      position: "absolute", bottom: 0, right: 0, width: 28, height: 28,
                      borderRadius: "50%", background: "#fff", border: "2px solid #111827",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                      color: "#111827"
                    }}>
                      <FaPlus size={12} />
                    </button>
                  </div>

                  <div style={{ flex: 1, display: "flex", gap: 20 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>First Name</label>
                      <input name="firstName" value={formData.firstName} onChange={handleChange} style={inputStyle} type="text" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Last Name</label>
                      <input name="lastName" value={formData.lastName} onChange={handleChange} style={inputStyle} type="text" />
                    </div>
                  </div>
                </div>

                {/* Email & Contact Number */}
                <div style={{ display: "flex", gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Email</label>
                    <input name="email" value={formData.email} onChange={handleChange} style={inputStyle} type="email" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Contact Number</label>
                    <input name="contactNumber" value={formData.contactNumber} onChange={handleChange} style={inputStyle} type="text" />
                  </div>
                </div>

                {/* User Role, Assigned Branch, Active Status */}
                <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>User Role</label>
                    <select name="userRole" value={formData.userRole} onChange={handleChange} style={selectStyle}>
                      <option value="">Select Role</option>
                      {roles.map(r => (
                        <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Assigned Branch</label>
                    <select name="assignedBranch" value={formData.assignedBranch} onChange={handleChange} style={selectStyle}>
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b.B_id} value={b.B_id}>{b.B_name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 16px", border: "1px solid #D1D5DB", borderRadius: 8
                    }}>
                      <span style={{ fontSize: 14, color: "#374151" }}>Active Status</span>
                      <div
                        onClick={handleStatusToggle}
                        style={{
                          width: 44, height: 24, borderRadius: 12, background: formData.activeStatus ? "#22C55E" : "#E5E7EB",
                          position: "relative", cursor: "pointer", transition: "background 0.3s"
                        }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", background: "#fff",
                          position: "absolute", top: 3, left: formData.activeStatus ? 23 : 3, transition: "left 0.3s",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          {formData.activeStatus && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 4L3.5 6.5L9 1" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Password Fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ width: "66%" }}>
                    <label style={labelStyle}>Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        name="password" value={formData.password} onChange={handleChange}
                        style={pwdInputStyle} type={showPassword ? "text" : "password"}
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        style={eyeBtnStyle}
                      >
                        {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ width: "66%" }}>
                    <label style={labelStyle}>Confirm Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                        style={pwdInputStyle} type={showConfirmPassword ? "text" : "password"}
                      />
                      <button
                        type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={eyeBtnStyle}
                      >
                        {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                  <button
                    onClick={handleSaveChanges}
                    style={{
                      background: "#22C55E", color: "#fff", padding: "12px 32px", border: "none",
                      borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer"
                    }}
                  >
                    Save User
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #D1D5DB", outline: "none", fontSize: 14, boxSizing: "border-box", color: "#111827" };
const pwdInputStyle = { width: "100%", padding: "12px 40px 12px 14px", borderRadius: 8, border: "none", background: "#F9FAFB", outline: "none", fontSize: 14, boxSizing: "border-box", color: "#111827" };
const selectStyle = { ...inputStyle, cursor: "pointer", background: "#fff", appearance: "none" };
const eyeBtnStyle = {
  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
  background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer", display: "flex"
};

export default AddUser;
