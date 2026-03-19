import React, { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaHotel, FaEdit, FaTrashAlt } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import { getBranchById, getUserById } from "../../services/api";

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

const BranchProfile = () => {
  const { branchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [branch, setBranch] = useState(location.state?.branch || null);
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

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
              onClick={() => navigate("/branches")}
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
                      background: "linear-gradient(145deg, #cf7c2e 0%, #734118 100%)",
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
                    <Field label="Status" value="Active" />
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
