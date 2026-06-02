import React, { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaSave, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import SuperAdminSidebar from "../../components/super-admin/Sidebar";
import SuperAdminHeader from "../../components/super-admin/Header";
import { getBranchById, getUserById, getCompanies, updateBranch, updateUser } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ToggleSwitch from "../../components/super-admin/ToggleSwitch";

const inputBase = {
  width: "100%",
  border: "1px solid #d8e0ed",
  borderRadius: "12px",
  padding: "10px 14px",
  color: "#30425f",
  background: "#ffffff",
  fontSize: "0.95rem",
  outline: "none",
  boxSizing: "border-box",
};

const labelBase = {
  display: "block",
  marginBottom: "7px",
  color: "#303f60",
  fontWeight: 500,
  fontSize: "1rem",
};

const BranchProfileEdit = () => {
  const { branchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [branch, setBranch] = useState(location.state?.branch || null);
  const [manager, setManager] = useState(location.state?.manager || null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    B_name: "",
    B_email: "",
    B_address: "",
    B_conNo: "",
    com_id: "",
    managerName: "",
    password: "",
    status: true,
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        // 1. Fetch lookups
        let companiesData = [];

        if (user?.role_id === 6) {
          companiesData = await getCompanies();
        }

        if (!mounted) return;
        setCompanies(companiesData || []);

        // 2. Fetch branch profile
        let branchData = location.state?.branch || null;
        let managerData = location.state?.manager || null;

        if (!branchData || String(branchData.B_id) !== String(branchId)) {
          branchData = await getBranchById(branchId);
        }

        if (branchData?.U_id && !managerData) {
          try {
            managerData = await getUserById(branchData.U_id);
          } catch {
            managerData = null;
          }
        }

        if (!mounted) return;
        setBranch(branchData);
        setManager(managerData);

        const managerFullName = managerData
          ? `${managerData.u_fname || ""} ${managerData.u_lname || ""}`.trim()
          : "";

        setForm({
          B_name: branchData?.B_name || "",
          B_email: branchData?.B_email || "",
          B_address: branchData?.B_address || "",
          B_conNo: branchData?.B_conNo || "",
          com_id: branchData?.com_id ? String(branchData.com_id) : "",
          managerName: managerFullName,
          password: "",
          status: branchData?.B_status !== false,
        });
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.message || "Unable to load branch profile.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [branchId, location.state]);

  const branchInitial = useMemo(() => {
    const name = form.B_name || branch?.B_name || "B";
    return name.charAt(0).toUpperCase();
  }, [form.B_name, branch]);


  const handleStatusToggle = (newVal) => {
    setForm((prev) => ({ ...prev, status: newVal }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const goToProfile = () => {
    navigate(`/branch_profile/${branchId}`, {
      state: { branch, manager },
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      const branchPayload = {
        B_name: form.B_name,
        B_email: form.B_email,
        B_conNo: form.B_conNo,
        B_address: form.B_address,
        com_id: form.com_id ? Number(form.com_id) : null,
        B_status: form.status,
      };

      await updateBranch(branchId, branchPayload);

      const nameParts = form.managerName.trim().split(/\s+/);
      const u_fname = nameParts[0] || "";
      const u_lname = nameParts.slice(1).join(" ") || "";

      const currentManagerId = branch?.U_id || manager?.u_id;

      if (currentManagerId) {
        const managerPayload = {
          u_fname,
          u_lname,
          role_id: 1,
        };
        if (form.password) {
          managerPayload.u_pw = form.password;
        }
        await updateUser(currentManagerId, managerPayload);
      }

      // Return to Profile with state cleared so it does a fresh backend fetch
      navigate(`/branch_profile/${branchId}`, { state: null });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update branch profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", background: "#eff1f5", minHeight: "100vh" }}>
      {user?.role_id === 6 ? <SuperAdminSidebar /> : <Sidebar />}

      <div style={{ flex: 1, marginLeft: "240px" }}>
        {user?.role_id === 6 ? <SuperAdminHeader title="Branch Management" /> : <Header title="Branch Management" />}

        <div style={{ padding: "0 20px 20px" }}>
          <div
            style={{
              minHeight: "calc(100vh - 90px)",
              background: "#ffffff",
              borderRadius: "0 0 10px 10px",
              padding: "28px 34px",
            }}
          >
            <button
              type="button"
              onClick={goToProfile}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                border: "none",
                background: "transparent",
                color: "#5a5f6a",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.98rem",
                marginBottom: "20px",
              }}
            >
              <FaArrowLeft /> Back to Branch Profile
            </button>

            <h1
              style={{
                textAlign: "center",
                margin: "0",
                color: "#2d3d73",
                fontWeight: 700,
                fontSize: "40px",
                lineHeight: 1,
              }}
            >
              Edit Branch Profile
            </h1>

            <div style={{ marginTop: "22px", borderBottom: "1px solid #e5e9f2" }}>
              <span
                style={{
                  color: "#2f3cff",
                  fontWeight: 500,
                  fontSize: "1rem",
                  padding: "0 10px 10px",
                  display: "inline-block",
                  borderBottom: "3px solid #2f3cff",
                }}
              >
                Edit Profile
              </span>
            </div>

            {loading ? (
              <p style={{ color: "#5f6d8a", textAlign: "center", marginTop: "32px" }}>Loading branch profile...</p>
            ) : error ? (
              <p style={{ color: "#c0392b", textAlign: "center", marginTop: "32px" }}>{error}</p>
            ) : (
              <form onSubmit={handleSave}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 1fr",
                    gap: "24px",
                    alignItems: "start",
                    marginTop: "34px",
                  }}
                >
                  <div
                    style={{
                      width: "92px",
                      height: "92px",
                      borderRadius: "50%",
                      background: "linear-gradient(145deg, #4b84ff 0%, #1e3f9a 100%)",
                      display: "grid",
                      placeItems: "center",
                      color: "#ffffff",
                      fontSize: "2.2rem",
                      fontWeight: 700,
                      marginTop: "18px",
                      boxShadow: "0 6px 15px rgba(30, 63, 154, 0.35)",
                    }}
                  >
                    {branchInitial}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "14px 18px",
                    }}
                  >
                    <EditableField label="Branch Name" name="B_name" value={form.B_name} onChange={handleChange} />
                    
                    <EditableField
                      label="Branch Admin Name"
                      name="managerName"
                      value={form.managerName}
                      onChange={handleChange}
                    />

                    <EditableField label="Email" name="B_email" value={form.B_email} onChange={handleChange} />

                    {/* Company selector */}
                    <div>
                      <label style={labelBase}>Company</label>
                      {user?.role_id === 6 ? (
                        <select
                          name="com_id"
                          value={form.com_id}
                          onChange={handleChange}
                          style={inputBase}
                        >
                          <option value="">Select Company</option>
                          {companies.map((c) => (
                            <option key={c.com_id} value={String(c.com_id)}>
                              {c.com_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={branch?.com_name || user?.com_name || user?.companyName || "Assigned Company"}
                          readOnly
                          style={{ ...inputBase, background: "#f9fbff", color: "#6d7c96" }}
                        />
                      )}
                    </div>

                    <EditableField label="Address" name="B_address" value={form.B_address} onChange={handleChange} />
                    
                    <EditableField
                      label="Password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      type="password"
                      placeholder="Enter new password"
                    />
                    
                    <EditableField label="Contact Number" name="B_conNo" value={form.B_conNo} onChange={handleChange} />
                    
                    <div>
                      <label style={labelBase}>Status</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                        <ToggleSwitch
                          checked={form.status}
                          onChange={handleStatusToggle}
                        />
                        <span style={{ fontSize: "0.95rem", color: "#30425f", fontWeight: 500 }}>
                          {form.status ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "20px",
                    marginTop: "84px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      border: "none",
                      width: "128px",
                      height: "44px",
                      borderRadius: "10px",
                      color: "white",
                      cursor: saving ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#22ba3f",
                      fontWeight: 600,
                      fontSize: "1.05rem",
                      opacity: saving ? 0.75 : 1,
                    }}
                  >
                    <FaSave /> {saving ? "Saving..." : "Save"}
                  </button>

                  <button
                    type="button"
                    onClick={goToProfile}
                    disabled={saving}
                    style={{
                      border: "none",
                      width: "128px",
                      height: "44px",
                      borderRadius: "10px",
                      color: "white",
                      cursor: saving ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#f24848",
                      fontWeight: 600,
                      fontSize: "1.05rem",
                      opacity: saving ? 0.75 : 1,
                    }}
                  >
                    <FaTimes /> Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EditableField = ({ label, name, value, onChange, type = "text", placeholder }) => {
  return (
    <div>
      <label style={labelBase}>{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        style={inputBase}
      />
    </div>
  );
};

export default BranchProfileEdit;
