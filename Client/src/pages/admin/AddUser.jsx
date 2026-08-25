import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import Button from "../../components/admin/Button";
import FormField from "../../components/admin/FormField";
import FormSelect from "../../components/admin/FormSelect";
import PasswordField from "../../components/admin/PasswordField";
import StatusToggle from "../../components/admin/StatusToggle";
import profileImage from "../../assets/images/Ellipse 11.png";
import plusImage from "../../assets/images/Plus circle.png";
import { createUser, getBranches, getRoles } from "../../services/api";
import { Link } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
const PHONE_RE = /^07[0-9]{8}$/;
function getComIdFromToken() {
try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const userData = JSON.parse(window.atob(base64));
    return userData.com_id || null;
  } catch {
    return null;
  }
}
const AddUser = () => {
  const { t } = useTranslation();
const {
    features
  } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    role: "",
    branch: "",
    password: "",
    confirmPassword: "",
    isActive: true
  });
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toasts, setToasts] = useState([]);
  const isAdminRole = roles.find(r => String(r.role_id) === String(formData.role))?.role_name?.toLowerCase().includes("admin") && !roles.find(r => String(r.role_id) === String(formData.role))?.role_name?.toLowerCase().includes("branch");
  const updateField = (field, value) => {
setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setIsLoadingOptions(true);
        const [rolesData, branchesData] = await Promise.all([getRoles(), getBranches()]);
        setRoles(rolesData || []);
        setBranches(branchesData || []);
        setFormData(prev => ({
          ...prev,
          role: prev.role || (rolesData?.length > 0 ? String(rolesData[0].role_id) : ""),
          branch: prev.branch || (branchesData?.length > 0 ? String(branchesData[0].B_id ?? branchesData[0].b_id ?? "") : "")
        }));
      } catch (error) {
        setErrorMessage(error?.response?.data?.message || "Failed to load roles and branches");
      } finally {
        setIsLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);
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
  const setSubmitError = message => {
    setErrorMessage(message);
    showToastMessage(message, "error");
  };
  const roleOptions = useMemo(() => {
    if (!roles.length) {
      return [{
        label: "No roles available",
        value: ""
      }];
    }
    return roles.filter(roleItem => {
      if (Number(roleItem.role_id) === 6) return false;
      const roleName = String(roleItem.role_name || "").toLowerCase();
      if (roleName.includes("waiter") && features?.has_waiter !== true) return false;
      if (roleName.includes("kitchen") && features?.has_kitchen !== true) return false;
      return true;
    }).map(roleItem => ({
      label: roleItem.role_name,
      value: String(roleItem.role_id)
    }));
  }, [roles, features]);
  const branchOptions = useMemo(() => {
    if (!branches.length) {
      return [{
        label: "No branches available",
        value: ""
      }];
    }
    return branches.map(branchItem => ({
      label: branchItem.B_name ?? branchItem.b_name ?? "Branch",
      value: String(branchItem.B_id ?? branchItem.b_id ?? "")
    }));
  }, [branches]);
  const handleSubmit = async event => {
    event.preventDefault();
    setErrorMessage("");
    setPhoneError("");
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setSubmitError("First name, last name, email and password are required");
      return;
    }
    if (formData.contactNumber && !PHONE_RE.test(formData.contactNumber.trim())) {
      setPhoneError("Phone number must be 10 digits and start with 07 (e.g. 0771234567).");
      showToastMessage("Phone number must be 10 digits and start with 07.", "error");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setSubmitError("Password and confirm password do not match");
      return;
    }
    if (!formData.role) {
      setSubmitError("Please select a user role");
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        u_fname: formData.firstName,
        u_lname: formData.lastName,
        u_email: formData.email,
        u_pw: formData.password,
        u_connumber: formData.contactNumber || null,
        role_id: Number(formData.role)
      };

      // If Admin role → send com_id automatically from token
      if (isAdminRole) {
        const com_id = getComIdFromToken();
        if (!com_id) {
          setSubmitError("Could not determine company. Please re-login.");
          return;
        }
        payload.com_id = com_id;
      } else {
        // Other roles → send branch id
        payload.b_id = formData.branch ? Number(formData.branch) : null;
      }
      await createUser(payload);
      showToastMessage("User account created successfully.", "success");
      setFormData(prev => ({
        ...prev,
        firstName: "",
        lastName: "",
        email: "",
        contactNumber: "",
        password: "",
        confirmPassword: ""
      }));
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to create user";
      setErrorMessage(message);
      showToastMessage(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div style={{
    display: "flex",
    background: "#EEEEEE",
    minHeight: "100vh"
  }}>
			<Sidebar />

			<div style={{
      flex: 1,
      marginLeft: "240px"
    }}>
				<Header title={t("company_admin.user_management", "User Management")} />

				<div style={{
        padding: "18px 24px 28px"
      }}>
					<a href="/users">	<div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#6A6A6A",
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "14px",
            cursor: "pointer"
          }}>

						<FaArrowLeft size={14} />
						<span>{t("company_admin.back_to_user_management", "Back to User Management")}</span>



					</div>
					</a>
					<div style={{
          maxWidth: "980px",
          margin: "0 auto"
        }}>
						<h1 style={{
            margin: "0 0 22px",
            textAlign: "center",
            fontSize: "42px",
            fontWeight: "700",
            color: "#111"
          }}>{t("company_admin.add_new_user", "Add New User")}</h1>

						<div style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            gap: "26px",
            alignItems: "start"
          }}>
							<div style={{
              width: "126px",
              height: "126px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              marginTop: "6px"
            }}>
								<img src={profileImage} alt="User profile" style={{
                width: "126px",
                height: "126px",
                objectFit: "contain"
              }} />
								<img src={plusImage} alt="Add profile" style={{
                width: "30px",
                height: "30px",
                position: "absolute",
                bottom: "10px",
                right: "16px"
              }} />
							</div>

							<form onSubmit={handleSubmit} style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px"
            }}>
								<div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px"
              }}>
									<FormField label={t("fields.first_name", "First Name")} value={formData.firstName} onChange={event => updateField("firstName", event.target.value)} />
									<FormField label={t("fields.last_name", "Last Name")} value={formData.lastName} onChange={event => updateField("lastName", event.target.value)} />
								</div>

								<div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px"
              }}>
									<FormField label={t("fields.email", "Email")} type="email" value={formData.email} onChange={event => updateField("email", event.target.value)} />
									<div>
										<FormField label={t("fields.contact_number", "Contact Number")} placeholder={t("company_admin.07xxxxxxxx", "07XXXXXXXX")} value={formData.contactNumber} onChange={event => {
                    const digitsOnly = event.target.value.replace(/[^0-9]/g, "");
                    updateField("contactNumber", digitsOnly);
                    setPhoneError("");
                  }} />
										{phoneError && <p style={{
                    margin: "4px 0 0",
                    color: "#C62828",
                    fontSize: "13px"
                  }}>
												{phoneError}
											</p>}
									</div>
								</div>

								<div style={{
                display: "grid",
                gridTemplateColumns: isAdminRole ? "1fr 190px" : "1fr 1fr 190px",
                gap: "20px",
                alignItems: "start"
              }}>
									<FormSelect label={t("fields.user_role", "User Role")} value={formData.role} onChange={event => updateField("role", event.target.value)} options={roleOptions} />
									{!isAdminRole && <FormSelect label={t("fields.assigned_branch", "Assigned Branch")} value={formData.branch} onChange={event => updateField("branch", event.target.value)} options={branchOptions} />}
									<StatusToggle checked={formData.isActive} onChange={event => updateField("isActive", event.target.checked)} />
								</div>
								<PasswordField label={t("fields.password", "Password")} value={formData.password} width="62%" onChange={event => updateField("password", event.target.value)} />

								<PasswordField label={t("fields.confirm_password", "Confirm Password")} value={formData.confirmPassword} width="62%" onChange={event => updateField("confirmPassword", event.target.value)} />

								{isLoadingOptions && <p style={{
                margin: 0,
                color: "#5E5E5E",
                fontSize: "13px"
              }}>{t("company_admin.loading_roles_and_branches", "Loading roles and branches...")}</p>}

								{errorMessage && <p style={{
                margin: 0,
                color: "#C62828",
                fontSize: "13px"
              }}>{errorMessage}</p>}

								<div style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "8px"
              }}>
									<Button label={isSubmitting ? t("buttons.creating", "Creating...") : t("buttons.create_user_account", "Create User Account")} type="submit" disabled={isSubmitting || isLoadingOptions} style={{
                  width: "200px",
                  height: "40px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  background: "#3C4CB9"
                }} />
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>

			{toasts.length > 0 && <div style={{
      position: "fixed",
      top: "82px",
      right: "20px",
      zIndex: 10000,
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
        gap: "12px"
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

			{showSuccessToast && <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999
    }}>
					<div style={{
        width: "min(92vw, 430px)",
        height: "min(70vw, 350px)",
        background: "#EBEBEB",
        borderRadius: "22px",
        padding: "14px 20px 14px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center"
      }}>
						<div style={{
          width: "62px",
          height: "62px",
          borderRadius: "50%",
          background: "#0E5BA8",
          margin: "0 auto 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
							<FaCheck size={30} color="#fff" />
						</div>

						<h2 style={{
          margin: "0",
          fontSize: "18px",
          lineHeight: 1.2,
          fontWeight: "600",
          color: "#0E5BA8"
        }}>{t("company_admin.new_user_has_been", "New User has been")}<br />{t("company_admin.added", "Added")}<br />{t("company_admin.successfully", "Successfully")}</h2>

						<button onClick={() => setShowSuccessToast(false)} style={{
          marginTop: "16px",
          width: "100%",
          height: "52px",
          border: "none",
          borderRadius: "12px",
          background: "#0E5BA8",
          color: "#fff",
          fontSize: "15px",
          fontWeight: "500",
          cursor: "pointer"
        }}>{t("company_admin.countinue", "Countinue")}</button>
					</div>
				</div>}
		</div>;
};
export default AddUser;