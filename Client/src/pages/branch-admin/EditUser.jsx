import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import Button from "../../components/admin/Button";
import FormField from "../../components/admin/FormField";
import FormSelect from "../../components/admin/FormSelect";
import PasswordField from "../../components/admin/PasswordField";
import StatusToggle from "../../components/admin/StatusToggle";
import profileImage from "../../assets/images/Ellipse 11.png";
import plusImage from "../../assets/images/Plus circle.png";
import { getBranches, getRoles, getUserById, updateUser } from "../../services/api";

const EditUser = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        contactNumber: "",
        role: "",
        branch: "",
        password: "",
        confirmPassword: "",
        isActive: true,
    });
    const [roles, setRoles] = useState([]);
    const [branches, setBranches] = useState([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [toasts, setToasts] = useState([]);

    const accessibleRoles = useMemo(() => {
        return roles.filter((role) => !String(role.role_name || "").toLowerCase().includes("admin"));
    }, [roles]);

    const resolvedUserId = useMemo(() => {
        return String(userId || "").trim();
    }, [userId]);

    const updateField = (field, value) => {
        if (!isEditMode) {
            return;
        }

        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        if (toasts.length === 0) return undefined;

        const timer = setTimeout(() => {
            setToasts((prev) => prev.slice(1));
        }, 5000);

        return () => clearTimeout(timer);
    }, [toasts]);

    const showToastMessage = (message, type = "success") => {
        setToasts((prev) => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                message,
                type,
            },
        ]);
    };

    const removeToast = (toastId) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
    };

    useEffect(() => {
        const loadPageData = async () => {
            try {
                setErrorMessage("");
                setIsLoadingOptions(true);
                setIsLoadingUser(true);

                if (!resolvedUserId) {
                    const msg = "User id is missing. Open this page from User Management.";
                    setErrorMessage(msg);
                    showToastMessage(msg, "error");
                    return;
                }

                const [rolesData, branchesData, userData] = await Promise.all([
                    getRoles(),
                    getBranches(),
                    getUserById(resolvedUserId),
                ]);

                setRoles(rolesData || []);
                setBranches(branchesData || []);

                const allowedRoles = (rolesData || []).filter(
                    (role) => !String(role.role_name || "").toLowerCase().includes("admin")
                );

                const userRoleId = userData?.role_id ? String(userData.role_id) : "";
                if (userRoleId && !allowedRoles.some((role) => String(role.role_id) === userRoleId)) {
                    const msg = "This user role is not available in branch admin.";
                    setErrorMessage(msg);
                    showToastMessage(msg, "error");
                    return;
                }

                const defaultBranchValue =
                    branchesData?.length > 0
                        ? String(branchesData[0].B_id ?? branchesData[0].b_id ?? "")
                        : "";

                setFormData({
                    firstName: userData?.u_fname || "",
                    lastName: userData?.u_lname || "",
                    email: userData?.u_email || "",
                    contactNumber: userData?.u_connumber || "",
                    role: userRoleId,
                    branch: defaultBranchValue,
                    password: "",
                    confirmPassword: "",
                    isActive: userData?.u_status === true || 
            String(userData?.u_status).toLowerCase() === "true" ||
            String(userData?.u_status).toLowerCase() === "active",
                });
            } catch (error) {
                const msg = error?.response?.data?.message || "Failed to load user details";
                setErrorMessage(msg);
                showToastMessage(msg, "error");
            } finally {
                setIsLoadingOptions(false);
                setIsLoadingUser(false);
            }
        };

        loadPageData();
    }, [resolvedUserId]);

    const roleOptions = useMemo(() => {
        if (!accessibleRoles.length) {
            return [{ label: "No roles available", value: "" }];
        }

        return accessibleRoles.map((roleItem) => ({
            label: roleItem.role_name,
            value: String(roleItem.role_id),
        }));
    }, [accessibleRoles]);

    const branchOptions = useMemo(() => {
        if (!branches.length) {
            return [{ label: "No branches available", value: "" }];
        }

        return branches.map((branchItem) => ({
            label: branchItem.B_name ?? branchItem.b_name ?? "Branch",
            value: String(branchItem.B_id ?? branchItem.b_id ?? ""),
        }));
    }, [branches]);

    const submitUserUpdate = async () => {
        setErrorMessage("");

        if (!isEditMode) {
            return;
        }

        if (!resolvedUserId) {
            showToastMessage("User id is missing. Open this page from User Management.", "error");
            return;
        }

        if (!formData.firstName || !formData.lastName || !formData.email) {
            showToastMessage("First name, last name and email are required", "error");
            return;
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            showToastMessage("Password and confirm password do not match", "error");
            return;
        }

        if (!formData.role) {
            showToastMessage("Please select a user role", "error");
            return;
        }

        if (!accessibleRoles.some((role) => String(role.role_id) === String(formData.role))) {
            showToastMessage("Please select a supported role", "error");
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = {
                u_fname: formData.firstName,
                u_lname: formData.lastName,
                u_email: formData.email,
                u_connumber: formData.contactNumber || null,
                role_id: Number(formData.role),
                u_status: formData.isActive,
                };

            if (formData.password) {
                payload.u_pw = formData.password;
            }

            await updateUser(resolvedUserId, payload);

            // Show success toast immediately
            showToastMessage("User details updated successfully!", "success");
            
            setIsEditMode(false);
            // Show the success modal
            setShowSuccessToast(true);
            
        } catch (error) {
            const message = error?.response?.data?.message || "Failed to update user";
            setErrorMessage(message);
            showToastMessage(message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        await submitUserUpdate();
    };

    const handlePrimaryAction = async () => {
        setErrorMessage("");

        if (!isEditMode) {
            setIsEditMode(true);
            return;
        }

        await submitUserUpdate();
    };

    const isFormLocked = isLoadingOptions || isLoadingUser || !isEditMode;

    return (
        <div style={{ display: "flex", background: "#EEEEEE", minHeight: "100vh" }}>
            <Sidebar />

            <div style={{ flex: 1, marginLeft: "240px" }}>
                <Header title="User Management" />

                <div style={{ padding: "18px 24px 28px" }}>
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "#6A6A6A",
                            fontSize: "14px",
                            fontWeight: "500",
                            marginBottom: "14px",
                            cursor: "pointer",
                        }}
                        onClick={() => navigate("/branch-admin/users")}
                    >
                        <FaArrowLeft size={14} />
                        <span>Back to User Management</span>
                    </div>

                    <div style={{ maxWidth: "980px", margin: "0 auto" }}>
                       
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "160px 1fr",
                                gap: "26px",
                                alignItems: "start",
                            }}
                        >
                            <div
                                style={{
                                    width: "126px",
                                    height: "126px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                    marginTop: "6px",
                                }}
                            >
                                <img
                                    src={profileImage}
                                    alt="User profile"
                                    style={{ width: "126px", height: "126px", objectFit: "contain" }}
                                />
                                <img
                                    src={plusImage}
                                    alt="Add profile"
                                    style={{
                                        width: "30px",
                                        height: "30px",
                                        position: "absolute",
                                        bottom: "10px",
                                        right: "16px",
                                    }}
                                />
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "18px",
                                        opacity: isFormLocked ? 0.82 : 1,
                                        pointerEvents: isFormLocked ? "none" : "auto",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: "20px",
                                        }}
                                    >
                                        <FormField
                                            label="First Name"
                                            value={formData.firstName}
                                            onChange={(event) => updateField("firstName", event.target.value)}
                                        />
                                        <FormField
                                            label="Last Name"
                                            value={formData.lastName}
                                            onChange={(event) => updateField("lastName", event.target.value)}
                                        />
                                    </div>

                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: "20px",
                                        }}
                                    >
                                        <FormField
                                            label="Email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(event) => updateField("email", event.target.value)}
                                        />
                                        <FormField
                                            label="Contact Number"
                                            value={formData.contactNumber}
                                            onChange={(event) => updateField("contactNumber", event.target.value)}
                                        />
                                    </div>

                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr 190px",
                                            gap: "20px",
                                            alignItems: "start",
                                        }}
                                    >
                                        <FormSelect
                                            label="User Role"
                                            value={formData.role}
                                            onChange={(event) => updateField("role", event.target.value)}
                                            options={roleOptions}
                                        />
                                        <FormSelect
                                            label="Assigned Branch"
                                            value={formData.branch}
                                            onChange={(event) => updateField("branch", event.target.value)}
                                            options={branchOptions}
                                        />
                                        <StatusToggle
                                            checked={formData.isActive}
                                            onChange={(event) => updateField("isActive", event.target.checked)}
                                        />
                                    </div>

                                    <PasswordField
                                        label="Password"
                                        value={formData.password}
                                        width="62%"
                                        onChange={(event) => updateField("password", event.target.value)}
                                    />

                                    <PasswordField
                                        label="Confirm Password"
                                        value={formData.confirmPassword}
                                        width="62%"
                                        onChange={(event) => updateField("confirmPassword", event.target.value)}
                                    />
                                </div>

                                {(isLoadingOptions || isLoadingUser) && (
                                    <p style={{ margin: 0, color: "#5E5E5E", fontSize: "13px" }}>
                                        Loading user details...
                                    </p>
                                )}

                                {errorMessage && (
                                    <p style={{ margin: 0, color: "#C62828", fontSize: "13px" }}>{errorMessage}</p>
                                )}

                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                                    <Button
                                        label={!isEditMode ? "Edit User Details" : isSubmitting ? "Saving..." : "Save Changes"}
                                        type="button"
                                        onClick={handlePrimaryAction}
                                        disabled={isSubmitting || isLoadingOptions || isLoadingUser || !resolvedUserId}
                                        style={{
                                            width: "200px",
                                            height: "40px",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            background: "#50B748",
                                        }}
                                    />
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Messages */}
            {toasts.length > 0 && (
                <div
                    style={{
                        position: "fixed",
                        top: "82px",
                        right: "20px",
                        zIndex: 10000,
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        width: "min(380px, calc(100vw - 32px))",
                    }}
                >
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            style={{
                                background: toast.type === "error" ? "#FEF2F2" : "#F0FDF4",
                                borderLeft: `4px solid ${toast.type === "error" ? "#EF4444" : "#22C55E"}`,
                                borderRadius: "8px",
                                padding: "14px 16px",
                                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                                color: toast.type === "error" ? "#991B1B" : "#065F46",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "12px",
                            }}
                        >
                            <span style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.4 }}>{toast.message}</span>
                            <button
                                type="button"
                                onClick={() => removeToast(toast.id)}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "inherit",
                                    cursor: "pointer",
                                    opacity: 0.7,
                                    padding: "4px",
                                    display: "inline-flex",
                                }}
                                aria-label="Dismiss notification"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            
        </div>
    );
};

export default EditUser;