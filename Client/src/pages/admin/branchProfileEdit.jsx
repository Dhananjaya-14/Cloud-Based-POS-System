import React, { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaSave, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import StatusToggle from "../../components/admin/StatusToggle";
import { getBranchById, getUserById, updateBranch, updateUser } from "../../services/api";

const inputBase = {
  width: "100%",
  border: "1px solid #d8e0ed",
  borderRadius: "12px",
  padding: "10px 14px",
  color: "#30425f",
  background: "#ffffff",
  fontSize: "0.95rem",
  outline: "none",
};

const labelBase = {
  display: "block",
  marginBottom: "7px",
  color: "#303f60",
  fontWeight: 500,
  fontSize: "1rem",
};

const normalizeStatus = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "active" || normalized === "true" || normalized === "1";
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return true;
};

const splitFullName = (fullName, fallbackFirst = "", fallbackLast = "") => {
  const trimmed = fullName.trim();

  if (!trimmed) {
    return {
      firstName: fallbackFirst,
      lastName: fallbackLast,
    };
  }

  const parts = trimmed.split(/\s+/);
  const firstName = parts.shift() || fallbackFirst;
  const lastName = parts.join(" ") || fallbackLast;

  return { firstName, lastName };
};

const buildEmailFromUsername = (username, fallbackEmail) => {
  const trimmedUsername = username.trim();

  if (!trimmedUsername) {
    return fallbackEmail;
  }

  const fallbackDomain = fallbackEmail.includes("@") ? fallbackEmail.split("@").slice(1).join("@") : "";
  if (!fallbackDomain) {
    return fallbackEmail;
  }

  return `${trimmedUsername}@${fallbackDomain}`;
};

const BranchProfileEdit = () => {
  const { branchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [branch, setBranch] = useState(location.state?.branch || null);
  const [manager, setManager] = useState(location.state?.manager || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    B_name: "",
    B_email: "",
    B_address: "",
    B_conNo: "",
    managerName: "",
    username: "",
    password: "",
    status: true,
  });

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

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

        if (!mounted) {
          return;
        }

        setBranch(branchData);
        setManager(managerData);

        const fullName = [managerData?.u_fname || "", managerData?.u_lname || ""]
          .join(" ")
          .trim();

        setForm({
          B_name: branchData?.B_name || "",
          B_email: branchData?.B_email || "",
          B_address: branchData?.B_address || "",
          B_conNo: branchData?.B_conNo || "",
          managerName: fullName,
          username: managerData?.u_email ? managerData.u_email.split("@")[0] : "",
          password: "",
          status: normalizeStatus(branchData?.status ?? branchData?.B_status ?? branchData?.branch_status),
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

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [branchId, location.state]);

  const branchInitial = useMemo(() => {
    const name = form.B_name || branch?.B_name || "B";
    return name.charAt(0).toUpperCase();
  }, [form.B_name, branch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusToggle = (e) => {
    setForm((prev) => ({ ...prev, status: e.target.checked }));
  };

  const updateLocalState = (branchData, managerData) => {
    setBranch(branchData);
    setManager(managerData);

    const fullName = [managerData?.u_fname || "", managerData?.u_lname || ""].join(" ").trim();

    setForm({
      B_name: branchData?.B_name || "",
      B_email: branchData?.B_email || "",
      B_address: branchData?.B_address || "",
      B_conNo: branchData?.B_conNo || "",
      managerName: fullName,
      username: managerData?.u_email ? managerData.u_email.split("@")[0] : "",
      password: "",
      status: normalizeStatus(branchData?.status ?? branchData?.B_status ?? branchData?.branch_status),
    });
  };

  const goToProfile = () => {
    navigate(`/branch_profile/${branchId}`, {
      state: { branch, manager },
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!branchId) {
      setError("Branch id is missing.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const branchPayload = {
        B_name: form.B_name.trim(),
        B_email: form.B_email.trim(),
        B_address: form.B_address.trim(),
        B_conNo: form.B_conNo.trim(),
        status: form.status,
      };

      const updatedBranch = await updateBranch(branchId, branchPayload);

      let updatedManager = manager;
      if (manager?.u_id) {
        const { firstName, lastName } = splitFullName(
          form.managerName,
          manager?.u_fname || "",
          manager?.u_lname || "",
        );

        const managerPayload = {
          u_fname: firstName,
          u_lname: lastName,
          u_email: buildEmailFromUsername(form.username, manager?.u_email || ""),
        };

        if (form.password.trim()) {
          managerPayload.u_pw = form.password;
        }

        updatedManager = await updateUser(manager.u_id, managerPayload);
      }

      const nextBranch = {
        ...(branch || {}),
        ...updatedBranch,
        status: form.status,
      };

      updateLocalState(nextBranch, updatedManager);

      navigate(`/branch_profile/${branchId}`, {
        state: { branch: nextBranch, manager: updatedManager },
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save branch profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", background: "#eff1f5", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header />

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
                    <EditableField label="Username" name="username" value={form.username} onChange={handleChange} />
                    <EditableField label="Address" name="B_address" value={form.B_address} onChange={handleChange} />
                    <EditableField
                      label="Password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      type="password"
                      placeholder="Enter new password"
                    />
                    <div
                      style={{
                        display: "grid",
                        gridColumn: "1 / -2",
                        gridTemplateColumns: "minmax(26px, 1fr) auto",
                        gap: "18px",
                        alignItems: "end",
                      }}
                    >
                      <EditableField
                        label="Contact Number"
                        name="B_conNo"
                        value={form.B_conNo}
                        onChange={handleChange}
                      />
                      <StatusToggle checked={form.status} onChange={handleStatusToggle} />
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
                      background: saving ? "#8bc99a" : "#22ba3f",
                      fontWeight: 600,
                      fontSize: "1.05rem",
                    }}
                  >
                    <FaSave /> {saving ? "Saving..." : "Save"}
                  </button>

                  <button
                    type="button"
                    onClick={goToProfile}
                    style={{
                      border: "none",
                      width: "128px",
                      height: "44px",
                      borderRadius: "10px",
                      color: "white",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#f24848",
                      fontWeight: 600,
                      fontSize: "1.05rem",
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
