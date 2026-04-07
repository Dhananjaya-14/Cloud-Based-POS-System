import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheck } from "react-icons/fa";
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
        const loadPageData = async () => {
            try {
                setErrorMessage("");
                setIsLoadingOptions(true);
                setIsLoadingUser(true);

                if (!resolvedUserId) {
                    setErrorMessage("User id is missing. Open this page from User Management.");
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
                    setErrorMessage("This user role is not available in branch admin.");
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
                    isActive: true,
                });
            } catch (error) {
                setErrorMessage(error?.response?.data?.message || "Failed to load user details");
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
            setErrorMessage("User id is missing. Open this page from User Management.");
            return;
        }

        if (!formData.firstName || !formData.lastName || !formData.email) {
            setErrorMessage("First name, last name and email are required");
            return;
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            setErrorMessage("Password and confirm password do not match");
            return;
        }

        if (!formData.role) {
            setErrorMessage("Please select a user role");
            return;
        }

        if (!accessibleRoles.some((role) => String(role.role_id) === String(formData.role))) {
            setErrorMessage("Please select a supported role");
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
            };

            if (formData.password) {
                payload.u_pw = formData.password;
            }

            await updateUser(resolvedUserId, payload);

            setShowSuccessToast(true);
            setFormData((prev) => ({
                ...prev,
                password: "",
                confirmPassword: "",
            }));
            setIsEditMode(false);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Failed to update user");
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
                        <h1
                            style={{
                                margin: "0 0 22px",
                                textAlign: "center",
                                fontSize: "42px",
                                fontWeight: "700",
                                color: "#111",
                            }}
                        >
                            User Details
                        </h1>

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

            {showSuccessToast && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                >
                    <div
                        style={{
                            width: "min(92vw, 430px)",
                            height: "min(70vw, 350px)",
                            background: "#EBEBEB",
                            borderRadius: "22px",
                            padding: "14px 20px 14px",
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                        }}
                    >
                        <div
                            style={{
                                width: "62px",
                                height: "62px",
                                borderRadius: "50%",
                                background: "#0E5BA8",
                                margin: "0 auto 10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <FaCheck size={30} color="#fff" />
                        </div>

                        <h2
                            style={{
                                margin: "0",
                                fontSize: "18px",
                                lineHeight: 1.2,
                                fontWeight: "600",
                                color: "#0E5BA8",
                            }}
                        >
                            User details
                            <br />
                            updated
                            <br />
                            Successfully
                        </h2>

                        <button
                            onClick={() => {
                                setShowSuccessToast(false);
                                navigate("/branch-admin/users");
                            }}
                            style={{
                                marginTop: "16px",
                                width: "100%",
                                height: "52px",
                                border: "none",
                                borderRadius: "12px",
                                background: "#0E5BA8",
                                color: "#fff",
                                fontSize: "15px",
                                fontWeight: "500",
                                cursor: "pointer",
                            }}
                        >
                            Countinue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditUser;
