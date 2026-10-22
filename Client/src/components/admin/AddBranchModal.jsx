
import React, { useState, useEffect, useRef } from "react";
import {
  FaTimes,
  FaStore,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBuilding,
} from "react-icons/fa";
import { createBranch, getCurrentUser, getCompanies } from "../../services/api";
import { useTranslation } from "react-i18next";
import { validateBranchContact } from "../../utils/branchValidation";

const AddBranchWizard = ({ onClose, onSuccess, com_id: propComId }) => {
  const [form, setForm] = useState({
    B_name: "",
    B_email: "",
    B_conNo: "",
    B_address: "",
    com_id: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const nameRef = useRef(null);

  // company id comes from authenticated user (or fallback prop)
  const currentUser = getCurrentUser();
  const effectiveComId = currentUser?.com_id ?? propComId ?? 1;
  const isSuperAdmin = currentUser?.role_id === 6;
  const [companies, setCompanies] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    nameRef.current?.focus();
    if (isSuperAdmin) {
      getCompanies().then(setCompanies).catch(console.error);
    }
  }, [isSuperAdmin]);

  const validate = () => {
    const e = {};
    if (!form.B_name?.trim()) e.B_name = "Branch name is required";
    if (!form.B_address?.trim()) e.B_address = "Physical address is required";
    if (
      !form.B_email?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.B_email.trim())
    )
      e.B_email = "Valid email required";

    const contactErr = validateBranchContact(form.B_conNo);
    if (contactErr) {
      e.B_conNo = contactErr;
    }
      
    if (isSuperAdmin && !form.com_id) {
      e.com_id = "Company selection is required";
    }
      
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setServerError("");

    if (name === "B_conNo") {
      const err = validateBranchContact(value);
      setErrors((prev) => ({ ...prev, B_conNo: err }));
    } else if (errors[name]) {
      setErrors((p) => ({ ...p, [name]: null }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (name === "B_conNo") {
      const err = validateBranchContact(value);
      setErrors((prev) => ({ ...prev, B_conNo: err }));
    }
  };

  const handleSubmit = async () => {
    setTouched({
      B_name: true,
      B_email: true,
      B_conNo: true,
      B_address: true,
      com_id: true,
    });
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      // use company id from form if super admin, else from authenticated user
      const payload = { 
        ...form, 
        com_id: isSuperAdmin ? form.com_id : effectiveComId 
      };
      const created = await createBranch(payload);
      setIsSuccess(true);
      onSuccess?.(created);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to create branch.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={successBox}>
            <FaCheckCircle size={48} color="#10B981" />
            <h3 style={{ marginTop: 12 }}>{t("company_admin.branch_created", "Branch created")}</h3>
            <p style={{ color: "#64748B" }}>{t("company_admin.branch_added_successfully", "The branch was added successfully.")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={header}>
          <div>
            <h3 style={{ margin: 0 }}>{t("company_admin.add_new_branch", "Add New Branch")}</h3>
            <p style={{ margin: 0, color: "#64748B", fontSize: 13 }}>
              {t("company_admin.branch_created_under_company", "This branch will be created under your company (from your login).")}
            </p>
          </div>
          <button onClick={onClose} style={closeBtn}>
            <FaTimes />
          </button>
        </div>

        <div style={body}>
          {serverError && (
            <div style={errorAlert}>
              <FaExclamationTriangle />{" "}
              <span style={{ marginLeft: 8 }}>{serverError}</span>
            </div>
          )}

          {isSuperAdmin && (
            <div style={{ marginBottom: 12 }}>
              <label style={label}>{t("company_admin.company", "Company")}</label>
              <div style={inputWrapper}>
                <FaBuilding style={icon} />
                <select
                  name="com_id"
                  value={form.com_id}
                  onChange={handleChange}
                  style={{ ...input, appearance: "none" }}
                >
                  <option value="" disabled>{t("company_admin.select_company", "Select Company...")}</option>
                  {companies.map(c => (
                    <option key={c.com_id} value={c.com_id}>{c.com_name}</option>
                  ))}
                </select>
              </div>
              {errors.com_id && <div style={errTxt}>{errors.com_id}</div>}
            </div>
          )}

          <label style={label}>{t("company_admin.official_branch_name", "Official Branch Name")}</label>
          <div style={inputWrapper}>
            <FaStore style={icon} />
            <input
              ref={nameRef}
              name="B_name"
              value={form.B_name}
              onChange={handleChange}
              placeholder={t("company_admin.colombo_central_branch", "Colombo Central Branch")}
              style={input}
            />
          </div>
          {errors.B_name && <div style={errTxt}>{errors.B_name}</div>}

          <label style={label}>{t("company_admin.branch_email", "Branch Email")}</label>
          <div style={inputWrapper}>
            <FaEnvelope style={icon} />
            <input
              name="B_email"
              value={form.B_email}
              onChange={handleChange}
              placeholder={t("company_admin.branch_email_placeholder", "branch@company.com")}
              style={input}
            />
          </div>
          {errors.B_email && <div style={errTxt}>{errors.B_email}</div>}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, marginTop: 8 }}>
            <label style={{ ...label, margin: 0 }}>
              {t("company_admin.branch_contact", "Branch Contact")}
            </label>
            {errors.B_conNo && (
              <span style={{ color: "#EF4444", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <FaExclamationTriangle size={11} /> {errors.B_conNo}
              </span>
            )}
          </div>
          <div style={{
            ...inputWrapper,
            border: errors.B_conNo ? "1.5px solid #EF4444" : "1px solid #E6EEF7",
            borderRadius: 10,
            background: errors.B_conNo ? "#FEF2F2" : "#fff",
            transition: "all 0.2s ease"
          }}>
            <FaPhone style={{ ...icon, color: errors.B_conNo ? "#EF4444" : "#94a3b8" }} />
            <input
              name="B_conNo"
              value={form.B_conNo}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t("company_admin.branch_contact_placeholder", "+94 77 ...")}
              style={{ ...input, border: "none", background: "transparent" }}
            />
          </div>
          {errors.B_conNo && <div style={errTxt}>{errors.B_conNo}</div>}

          <label style={label}>{t("company_admin.physical_address", "Physical Address")}</label>
          <div style={{ ...inputWrapper, alignItems: "flex-start" }}>
            <FaMapMarkerAlt style={{ ...icon, marginTop: 12 }} />
            <textarea
              name="B_address"
              value={form.B_address}
              onChange={handleChange}
              placeholder={t("company_admin.street_city", "Street, City")}
              style={{ ...input, height: 80, resize: "none", paddingTop: 10 }}
            />
          </div>
          {errors.B_address && <div style={errTxt}>{errors.B_address}</div>}
        </div>

        <div style={footer}>
          <button onClick={onClose} style={secondaryBtn} disabled={isSubmitting}>
            {t("company_admin.cancel", "Cancel")}
          </button>
          <button
            onClick={handleSubmit}
            style={isSubmitting || (touched.B_conNo && Boolean(errors.B_conNo)) ? disabledBtn : primaryBtn}
            disabled={isSubmitting || (touched.B_conNo && Boolean(errors.B_conNo))}
          >
            {isSubmitting ? t("company_admin.creating", "Creating...") : t("company_admin.create_branch", "Create Branch")}
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Styles (kept inline for this component) --- */
const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
  boxSizing: "border-box",
};
const modalStyle = {
  width: "100%",
  maxWidth: 680,
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  background: "#fff",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 20px 30px rgba(2,6,23,0.2)",
};
const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 20px",
  borderBottom: "1px solid #EEF2F7",
};
const closeBtn = {
  background: "#F1F5F9",
  border: "none",
  width: 36,
  height: 36,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
const body = { padding: 20, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 };
const footer = {
  padding: 16,
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  borderTop: "1px solid #EEF2F7",
  background: "#FBFEFF",
};
const inputWrapper = { position: "relative", display: "flex", alignItems: "center" };
const icon = { position: "absolute", left: 12, color: "#94a3b8" };
const input = {
  width: "100%",
  padding: "12px 14px 12px 40px",
  borderRadius: 10,
  border: "1px solid #E6EEF7",
  outline: "none",
  fontSize: 14,
  background: "#fff",
  boxSizing: "border-box",
};
const label = {
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  marginBottom: 6,
  marginTop: 8,
};
const primaryBtn = {
  background: "#0f172a",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
};
const disabledBtn = { ...primaryBtn, background: "#94a3b8", cursor: "not-allowed" };
const secondaryBtn = {
  background: "#fff",
  color: "#475569",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #E6EEF7",
  cursor: "pointer",
};
const errTxt = { color: "#EF4444", fontSize: 12, marginTop: 6 };
const errorAlert = {
  padding: 12,
  background: "#FEF2F2",
  border: "1px solid #FEE2E2",
  color: "#991B1B",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  gap: 8,
};
const successBox = { padding: 40, textAlign: "center" };

export default AddBranchWizard;

