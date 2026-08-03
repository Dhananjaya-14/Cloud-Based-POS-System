import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import Sidebar from "../../components/super-admin/Sidebar";
import Header from "../../components/super-admin/Header";
import { getRoles, getBranches, getCompanies, createUser, setAuthToken, logout } from "../../services/api";
import Spinner from "../../components/super-admin/Spinner";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
import { connectSocket } from "../../services/socket";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^07[0-9]{8}$/;

const AddUser = () => {
  const navigate = useNavigate();
  const { toast, toasts, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef(null);
  const [profileImage, setProfileImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    userRole: "",
    assignedBranch: "",
    assignedCompany: "",
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
    // Connect to socket for real-time updates
    connectSocket();
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [rolesData, branchesData, companiesData] = await Promise.all([
        getRoles(),
        getBranches(),
        getCompanies(),
      ]);

      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStatusToggle = () => {
    setFormData((prev) => ({ ...prev, activeStatus: !prev.activeStatus }));
  };

  const handleSaveChanges = async () => {
    setErrorMessage("");
    setEmailError("");
    setPhoneError("");

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.userRole || !formData.password) {
      const msg = "Please fill in all required fields.";
      setErrorMessage(msg);
      toast.error("Error", msg);
      return;
    }

    if (!EMAIL_RE.test(formData.email.trim())) {
      const msg = "Please enter a valid email address (e.g. name@example.com).";
      setEmailError(msg);
      toast.error("Error", msg);
      return;
    }

    if (formData.contactNumber && !PHONE_RE.test(formData.contactNumber.trim())) {
      const msg = "Phone number must be 10 digits and start with 07 (e.g. 0771234567).";
      setPhoneError(msg);
      toast.error("Error", msg);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      const msg = "Passwords do not match.";
      setErrorMessage(msg);
      toast.error("Error", msg);
      return;
    }

    const roleId = parseInt(formData.userRole);
    
    if (roleId === 6) {
      // Super Admin needs no company or branch
    } else if (roleId === 2 && !formData.assignedCompany) {
      const msg = "Please select an Assigned Company/Hotel for the Admin role.";
      setErrorMessage(msg);
      toast.error("Error", msg);
      return;
    } else if (roleId !== 2 && !formData.assignedBranch) {
      const msg = "Please select an Assigned Branch.";
      setErrorMessage(msg);
      toast.error("Error", msg);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        u_fname: formData.firstName,
        u_lname: formData.lastName,
        u_email: formData.email,
        u_connumber: formData.contactNumber || null,
        role_id: roleId,
        u_pw: formData.password,
        u_status: formData.activeStatus,
        com_id: roleId === 2 && formData.assignedCompany ? parseInt(formData.assignedCompany) : null,
        b_id: roleId !== 2 && roleId !== 6 && formData.assignedBranch ? parseInt(formData.assignedBranch) : null,
      };

      await createUser(payload);
      toast.success("Success", "User successfully created!");
      navigate("/super-admin/users", { state: { successMessage: "User successfully created!" } });
    } catch (err) {
      console.error("Error creating user:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to create user.";
      setErrorMessage(errorMsg);
      toast.error("Error", errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column" }}>
          <Header title="User Management" />
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 70px)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <Spinner size={44} />
              <p style={{ margin: 0, color: "#6B7280", fontWeight: 600, fontSize: 16 }}>Loading User Form...</p>
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

            {errorMessage && (
              <div style={{
                padding: "12px 18px", background: "#FEF2F2", border: "1px solid #FEE2E2",
                color: "#EF4444", borderRadius: 8, fontSize: 14, fontWeight: 600,
                marginBottom: 24, display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                {errorMessage}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Profile Picture & Names */}
              <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <div
                    onClick={handleImageClick}
                    style={{
                      width: 100, height: 100, borderRadius: "50%", border: "2px solid #111827",
                      display: "flex", alignItems: "center", justifyContent: "center", background: "#F3F4F6",
                      cursor: "pointer", overflow: "hidden"
                    }}>
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="#6B7280" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                      </svg>
                    )}
                  </div>
                  <button
                    onClick={handleImageClick}
                    style={{
                      position: "absolute", bottom: 0, right: 0, width: 28, height: 28,
                      borderRadius: "50%", background: "#fff", border: "2px solid #111827",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                      color: "#111827"
                    }}>
                    <FaPlus size={12} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                    accept="image/*"
                  />
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
                  <input
                    name="email"
                    value={formData.email}
                    onChange={(e) => { handleChange(e); setEmailError(""); }}
                    style={{ ...inputStyle, borderColor: emailError ? "#EF4444" : "#D1D5DB" }}
                    type="email"
                    autoComplete="off"
                  />
                  {emailError && <p style={{ color: "#EF4444", fontSize: 12, margin: "4px 0 0" }}>{emailError}</p>}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Contact Number</label>
                  <input
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                      setFormData((prev) => ({ ...prev, contactNumber: digitsOnly }));
                      setPhoneError("");
                    }}
                    style={{ ...inputStyle, borderColor: phoneError ? "#EF4444" : "#D1D5DB" }}
                    type="text"
                    placeholder="07XXXXXXXX"
                    maxLength={10}
                  />
                  {phoneError && <p style={{ color: "#EF4444", fontSize: 12, margin: "4px 0 0" }}>{phoneError}</p>}
                </div>
              </div>

              {/* User Role, Assigned Branch / Company, Active Status */}
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
                  {formData.userRole === "6" ? (
                    <>
                      <label style={labelStyle}>Assigned Scope</label>
                      <input
                        disabled
                        value="Universal Access (All Hotels & Branches)"
                        style={{ ...inputStyle, background: "#E5E7EB", color: "#6B7280", cursor: "not-allowed" }}
                      />
                    </>
                  ) : formData.userRole === "2" ? (
                    <>
                      <label style={labelStyle}>Assigned Company / Hotel</label>
                      <select name="assignedCompany" value={formData.assignedCompany} onChange={handleChange} style={selectStyle}>
                        <option value="">Select Company</option>
                        {companies.map(c => (
                          <option key={c.com_id} value={c.com_id}>
                            {c.com_name}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <label style={labelStyle}>Assigned Branch</label>
                      <select name="assignedBranch" value={formData.assignedBranch} onChange={handleChange} style={selectStyle}>
                        <option value="">Select Branch</option>
                        {branches.map(b => (
                          <option key={b.B_id} value={b.B_id}>
                            {b.B_name} {b.com_name ? `(${b.com_name})` : ""}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
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
                      style={pwdInputStyle}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
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
                      style={pwdInputStyle}
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
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
                  disabled={isSaving}
                  style={{
                    background: "#22C55E", color: "#fff", padding: "12px 32px", border: "none",
                    borderRadius: 8, fontSize: 15, fontWeight: 600,
                    cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  {isSaving && <Spinner size={14} color="#ffffff" />}
                  {isSaving ? "Saving..." : "Save User"}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
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