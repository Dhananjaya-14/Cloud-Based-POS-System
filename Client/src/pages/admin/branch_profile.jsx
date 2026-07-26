import React, { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaEdit, FaTrashAlt, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminHeader from "../../components/admin/Header";
import SuperAdminSidebar from "../../components/super-admin/Sidebar";
import SuperAdminHeader from "../../components/super-admin/Header";
import { deleteBranchById, getBranchById, getUserById } from "../../services/api";

const inputBase = {
  width: "100%",
  border: "1px solid #d8e0ed",
  borderRadius: "12px",
  padding: "10px 14px",
  color: "#6d7c96",
  background: "#f9fbff",
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

const BranchProfile = () => {
  const { branchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine if the current user is a Super Admin (role_id 6)
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = storedUser?.role_id === 6;
  const Sidebar = isSuperAdmin ? SuperAdminSidebar : AdminSidebar;
  const Header = isSuperAdmin ? SuperAdminHeader : AdminHeader;
  const backPath = isSuperAdmin ? "/super-admin/branches" : "/branches";
  const headerTitle = isSuperAdmin ? "Branch Management" : undefined;

  const [branch, setBranch] = useState(location.state?.branch || null);
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccessMessage("");

        let branchData = location.state?.branch || null;

        if (!branchData || String(branchData.B_id) !== String(branchId)) {
          branchData = await getBranchById(branchId);
        }

        if (!mounted) {
          return;
        }

        setBranch(branchData);

        if (branchData?.U_id) {
          try {
            const managerData = await getUserById(branchData.U_id);
            if (mounted) {
              setManager(managerData);
            }
          } catch {
            if (mounted) {
              setManager(null);
            }
          }
        } else {
          setManager(null);
        }
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

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const managerName = useMemo(() => {
    const first = manager?.u_fname || "";
    const last = manager?.u_lname || "";
    const full = `${first} ${last}`.trim();
    return full || "Not assigned";
  }, [manager]);

  const username = useMemo(() => {
    if (!manager?.u_email) {
      return "-";
    }
    return manager.u_email.split("@")[0];
  }, [manager]);

  const branchInitial = useMemo(() => {
    const name = branch?.B_name || "B";
    return name.charAt(0).toUpperCase();
  }, [branch]);

  const branchStatusLabel = useMemo(() => {
    const isActive = normalizeStatus(branch?.B_status ?? branch?.status ?? branch?.branch_status);
    return isActive ? "Active" : "Inactive";
  }, [branch]);

  const handleDeleteClick = () => {
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    if (deleting) {
      return;
    }
    setShowDeleteModal(false);
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      setDeleteError("");
      await deleteBranchById(branchId);
      
      // Set success message with branch name
      setSuccessMessage(`🗑️ Branch "${branch?.B_name || 'Branch'}" deleted successfully!`);
      
      // Close modal and navigate after short delay
      setShowDeleteModal(false);
      setTimeout(() => {
        navigate(backPath);
      }, 1500);
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Unable to delete branch. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", background: "#eff1f5", minHeight: "100vh" }}>
        <Sidebar />

        <div style={{ flex: 1, marginLeft: "240px" }}>
          {isSuperAdmin ? <Header title={headerTitle} /> : <Header />}

          <div style={{ padding: "0 20px 20px" }}>
            <div
              style={{
                minHeight: "calc(100vh - 90px)",
                background: "#ffffff",
                borderRadius: "0 0 10px 10px",
                padding: "28px 34px",
                position: "relative",
              }}
            >
              {/* Success Toast Message for Deletion */}
              {successMessage && (
                <div
                  style={{
                    position: "fixed",
                    top: "80px",
                    right: "20px",
                    zIndex: 9999,
                    backgroundColor: "#FEF2F2",
                    borderLeft: "4px solid #EF4444",
                    borderRadius: "8px",
                    padding: "14px 18px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    maxWidth: "380px",
                    width: "100%",
                    animation: "slideInRight 0.3s ease-out",
                  }}
                >
                  <div style={{ 
                    flex: 1,
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#991B1B",
                    lineHeight: "1.5"
                  }}>
                    {successMessage}
                  </div>
                  <button
                    onClick={() => setSuccessMessage("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#991B1B",
                      cursor: "pointer",
                      padding: "4px",
                      marginLeft: "12px",
                      fontSize: "16px",
                      opacity: 0.6,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "0.6";
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate(backPath)}
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
                <FaArrowLeft /> Back to Branches
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
                Branch Profile
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
                  Profile
                </span>
              </div>

              {loading ? (
                <p style={{ color: "#5f6d8a", textAlign: "center", marginTop: "32px" }}>Loading branch profile...</p>
              ) : error ? (
                <p style={{ color: "#c0392b", textAlign: "center", marginTop: "32px" }}>{error}</p>
              ) : (
                <>
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
                        boxShadow: "0 6px 15px rgba(100, 52, 18, 0.25)",
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
                      <Field label="Branch Name" value={branch?.B_name} />
                      <Field label="Branch Admin Name" value={managerName} />
                      <Field label="Email" value={branch?.B_email} />
                      <Field label="Username" value={username} />
                      <Field label="Address" value={branch?.B_address} />
                      <Field label="Password" value="**********" />
                      <Field label="Contact Number" value={branch?.B_conNo} />
                      <Field label="Status" value={branchStatusLabel} />
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
                      type="button"
                      onClick={() =>
                        navigate(`/branch_profile/${branchId}/edit`, {
                          state: { branch, manager },
                        })
                      }
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
                        background: "#22ba3f",
                        fontWeight: 600,
                        fontSize: "1.05rem",
                      }}
                    >
                      <FaEdit /> Edit
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteClick}
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
                      <FaTrashAlt /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.62)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1500,
            padding: "16px",
          }}
        >
          <div style={{ width: "100%", maxWidth: "380px" }}>
            <p
              style={{
                margin: "0 0 10px",
                color: "#4a4a4a",
                fontSize: "1.2rem",
                fontWeight: 500,
              }}
            >
              Delete branch
            </p>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "10px",
                padding: "22px 24px 20px",
                boxShadow: "0 14px 34px rgba(0, 0, 0, 0.3)",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  textAlign: "center",
                  color: "#101828",
                  fontSize: "1.85rem",
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}
              >
                Delete Confirmation
              </h2>

              <p
                style={{
                  margin: "10px 0 16px",
                  textAlign: "center",
                  color: "#4b5563",
                  fontSize: "1.05rem",
                  lineHeight: 1.25,
                }}
              >
                Are you sure you want
                <br />
                to delete this branch?
              </p>

              {deleteError ? (
                <p
                  style={{
                    margin: "0 0 12px",
                    textAlign: "center",
                    color: "#dc2626",
                    fontSize: "0.92rem",
                  }}
                >
                  {deleteError}
                </p>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  style={{
                    border: "1px solid #d1d5db",
                    background: "#f3f4f6",
                    color: "#dc2626",
                    borderRadius: "8px",
                    height: "44px",
                    fontWeight: 500,
                    fontSize: "1rem",
                    cursor: deleting ? "not-allowed" : "pointer",
                    opacity: deleting ? 0.75 : 1,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  style={{
                    border: "none",
                    background: "#dc2626",
                    color: "#ffffff",
                    borderRadius: "8px",
                    height: "44px",
                    fontWeight: 600,
                    fontSize: "1rem",
                    cursor: deleting ? "not-allowed" : "pointer",
                    opacity: deleting ? 0.75 : 1,
                  }}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
};

const Field = ({ label, value }) => {
  return (
    <div>
      <label style={labelBase}>{label}</label>
      <input value={value ?? "-"} readOnly style={inputBase} />
    </div>
  );
};

export default BranchProfile;