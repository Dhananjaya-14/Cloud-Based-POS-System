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

const AddBranchWizard = ({ onClose, onSuccess, com_id: propComId }) => {
  const [form, setForm] = useState({
    B_name: "",
    B_email: "",
    B_conNo: "",
    B_address: "",
    com_id: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const nameRef = useRef(null);

  // company id comes from authenticated user (or fallback prop)
  const currentUser = getCurrentUser();
  const effectiveComId = currentUser?.com_id ?? propComId ?? 1;
  const isSuperAdmin = currentUser?.role_id === 6;
  const [companies, setCompanies] = useState([]);

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
    if (
      !form.B_conNo?.trim() ||
      !/^\+?[0-9\s\-().]{7,20}$/.test(form.B_conNo.trim())
    )
      e.B_conNo = "Valid contact number required";
      
    if (isSuperAdmin && !form.com_id) {
      e.com_id = "Company selection is required";
    }
      
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((p) => ({ ...p, [e.target.name]: null }));
    setServerError("");
  };

  const handleSubmit = async () => {
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
            <h3 style={{ marginTop: 12 }}>Branch created</h3>
            <p style={{ color: "#64748B" }}>The branch was added successfully.</p>
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
            <h3 style={{ margin: 0 }}>Add New Branch</h3>
            <p style={{ margin: 0, color: "#64748B", fontSize: 13 }}>
              This branch will be created under your company (from your login).
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

          <label style={label}>Official Branch Name</label>
          <div style={inputWrapper}>
            <FaStore style={icon} />
            <input
              ref={nameRef}
              name="B_name"
              value={form.B_name}
              onChange={handleChange}
              placeholder="Colombo Central Branch"
              style={input}
            />
          </div>
          {errors.B_name && <div style={errTxt}>{errors.B_name}</div>}

          <label style={label}>Branch Email</label>
          <div style={inputWrapper}>
            <FaEnvelope style={icon} />
            <input
              name="B_email"
              value={form.B_email}
              onChange={handleChange}
              placeholder="branch@company.com"
              style={input}
            />
          </div>
          {errors.B_email && <div style={errTxt}>{errors.B_email}</div>}

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Branch Contact</label>
              <div style={inputWrapper}>
                <FaPhone style={icon} />
                <input
                  name="B_conNo"
                  value={form.B_conNo}
                  onChange={handleChange}
                  placeholder="+94 77 ..."
                  style={input}
                />
              </div>
              {errors.B_conNo && <div style={errTxt}>{errors.B_conNo}</div>}
            </div>

            {isSuperAdmin && (
              <div style={{ flex: 1 }}>
                <label style={label}>Company</label>
                <div style={inputWrapper}>
                  <FaBuilding style={icon} />
                  <select
                    name="com_id"
                    value={form.com_id}
                    onChange={handleChange}
                    style={{ ...input, appearance: "none" }}
                  >
                    <option value="" disabled>Select Company...</option>
                    {companies.map(c => (
                      <option key={c.com_id} value={c.com_id}>{c.com_name}</option>
                    ))}
                  </select>
                </div>
                {errors.com_id && <div style={errTxt}>{errors.com_id}</div>}
              </div>
            )}
          </div>

          <label style={label}>Physical Address</label>
          <div style={{ ...inputWrapper, alignItems: "flex-start" }}>
            <FaMapMarkerAlt style={{ ...icon, marginTop: 12 }} />
            <textarea
              name="B_address"
              value={form.B_address}
              onChange={handleChange}
              placeholder="Street, City"
              style={{ ...input, height: 80, resize: "none", paddingTop: 10 }}
            />
          </div>
          {errors.B_address && <div style={errTxt}>{errors.B_address}</div>}
        </div>

        <div style={footer}>
          <button onClick={onClose} style={secondaryBtn} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={isSubmitting ? disabledBtn : primaryBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating…" : "Create Branch"}
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
};
const modalStyle = {
  width: "100%",
  maxWidth: 680,
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
const body = { padding: 20, display: "flex", flexDirection: "column", gap: 12 };
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






































// import React, { useState, useEffect, useRef } from "react";
// import {
//   FaTimes,
//   FaStore,
//   FaEnvelope,
//   FaPhone,
//   FaMapMarkerAlt,
//   FaCheckCircle,
//   FaExclamationTriangle,
// } from "react-icons/fa";
// import { createBranch } from "../../services/api";

// const AddBranchWizard = ({ onClose, onSuccess, com_id }) => {
//   const [form, setForm] = useState({
//     B_name: "",
//     B_email: "",
//     B_conNo: "",
//     B_address: "",
//   });
//   const [errors, setErrors] = useState({});
//   const [serverError, setServerError] = useState("");
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isSuccess, setIsSuccess] = useState(false);
//   const nameRef = useRef(null);

//   useEffect(() => {
//     nameRef.current?.focus();
//   }, []);

//   const validate = () => {
//     const e = {};
//     if (!form.B_name?.trim()) e.B_name = "Branch name is required";
//     if (!form.B_address?.trim()) e.B_address = "Physical address is required";
//     if (
//       !form.B_email?.trim() ||
//       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.B_email.trim())
//     )
//       e.B_email = "Valid email required";
//     if (
//       !form.B_conNo?.trim() ||
//       !/^\+?[0-9\s\-().]{7,20}$/.test(form.B_conNo.trim())
//     )
//       e.B_conNo = "Valid contact number required";
//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const handleChange = (e) => {
//     setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//     if (errors[e.target.name]) setErrors((p) => ({ ...p, [e.target.name]: null }));
//     setServerError("");
//   };

//   const handleSubmit = async () => {
//     if (!validate()) return;
//     setIsSubmitting(true);
//     try {
//       const payload = { ...form, com_id: com_id ?? 1 };
//       const created = await createBranch(payload);
//       setIsSuccess(true);
//       onSuccess?.(created);
//       setTimeout(() => {
//         onClose();
//       }, 1200);
//     } catch (err) {
//       const msg =
//         err?.response?.data?.message || err?.message || "Failed to create branch.";
//       setServerError(msg);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (isSuccess) {
//     return (
//       <div style={overlayStyle}>
//         <div style={modalStyle}>
//           <div style={successBox}>
//             <FaCheckCircle size={48} color="#10B981" />
//             <h3 style={{ marginTop: 12 }}>Branch created</h3>
//             <p style={{ color: "#64748B" }}>The branch was added successfully.</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={overlayStyle}>
//       <div style={modalStyle}>
//         <div style={header}>
//           <div>
//             <h3 style={{ margin: 0 }}>Add New Branch</h3>
//             <p style={{ margin: 0, color: "#64748B", fontSize: 13 }}>
//               Create branch details only
//             </p>
//           </div>
//           <button onClick={onClose} style={closeBtn}>
//             <FaTimes />
//           </button>
//         </div>

//         <div style={body}>
//           {serverError && (
//             <div style={errorAlert}>
//               <FaExclamationTriangle /> <span style={{ marginLeft: 8 }}>{serverError}</span>
//             </div>
//           )}

//           <label style={label}>Official Branch Name</label>
//           <div style={inputWrapper}>
//             <FaStore style={icon} />
//             <input
//               ref={nameRef}
//               name="B_name"
//               value={form.B_name}
//               onChange={handleChange}
//               placeholder="Colombo Central Branch"
//               style={input}
//             />
//           </div>
//           {errors.B_name && <div style={errTxt}>{errors.B_name}</div>}

//           <label style={label}>Branch Email</label>
//           <div style={inputWrapper}>
//             <FaEnvelope style={icon} />
//             <input
//               name="B_email"
//               value={form.B_email}
//               onChange={handleChange}
//               placeholder="branch@company.com"
//               style={input}
//             />
//           </div>
//           {errors.B_email && <div style={errTxt}>{errors.B_email}</div>}

//           <div style={{ display: "flex", gap: 12 }}>
//             <div style={{ flex: 1 }}>
//               <label style={label}>Branch Contact</label>
//               <div style={inputWrapper}>
//                 <FaPhone style={icon} />
//                 <input
//                   name="B_conNo"
//                   value={form.B_conNo}
//                   onChange={handleChange}
//                   placeholder="+94 77 ..."
//                   style={input}
//                 />
//               </div>
//               {errors.B_conNo && <div style={errTxt}>{errors.B_conNo}</div>}
//             </div>

//             <div style={{ flex: 1 }}>
//               <label style={label}>Company (ID)</label>
//               <div style={inputWrapper}>
//                 <input
//                   readOnly
//                   value={com_id ?? "1"}
//                   style={{ ...input, paddingLeft: 14, background: "#fafafa" }}
//                 />
//               </div>
//             </div>
//           </div>

//           <label style={label}>Physical Address</label>
//           <div style={{ ...inputWrapper, alignItems: "flex-start" }}>
//             <FaMapMarkerAlt style={{ ...icon, marginTop: 12 }} />
//             <textarea
//               name="B_address"
//               value={form.B_address}
//               onChange={handleChange}
//               placeholder="Street, City"
//               style={{ ...input, height: 80, resize: "none", paddingTop: 10 }}
//             />
//           </div>
//           {errors.B_address && <div style={errTxt}>{errors.B_address}</div>}
//         </div>

//         <div style={footer}>
//           <button onClick={onClose} style={secondaryBtn} disabled={isSubmitting}>
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             style={isSubmitting ? disabledBtn : primaryBtn}
//             disabled={isSubmitting}
//           >
//             {isSubmitting ? "Creating…" : "Create Branch"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// /* --- Styles (kept inline for this component) --- */
// const overlayStyle = {
//   position: "fixed",
//   inset: 0,
//   background: "rgba(15,23,42,0.65)",
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
//   zIndex: 9999,
// };
// const modalStyle = {
//   width: "100%",
//   maxWidth: 680,
//   background: "#fff",
//   borderRadius: 14,
//   overflow: "hidden",
//   boxShadow: "0 20px 30px rgba(2,6,23,0.2)",
// };
// const header = {
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "space-between",
//   padding: "18px 20px",
//   borderBottom: "1px solid #EEF2F7",
// };
// const closeBtn = {
//   background: "#F1F5F9",
//   border: "none",
//   width: 36,
//   height: 36,
//   borderRadius: 10,
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
//   cursor: "pointer",
// };
// const body = { padding: 20, display: "flex", flexDirection: "column", gap: 12 };
// const footer = {
//   padding: 16,
//   display: "flex",
//   justifyContent: "flex-end",
//   gap: 12,
//   borderTop: "1px solid #EEF2F7",
//   background: "#FBFEFF",
// };
// const inputWrapper = { position: "relative", display: "flex", alignItems: "center" };
// const icon = { position: "absolute", left: 12, color: "#94a3b8" };
// const input = {
//   width: "100%",
//   padding: "12px 14px 12px 40px",
//   borderRadius: 10,
//   border: "1px solid #E6EEF7",
//   outline: "none",
//   fontSize: 14,
//   background: "#fff",
// };
// const label = {
//   fontSize: 12,
//   fontWeight: 700,
//   color: "#475569",
//   marginBottom: 6,
//   marginTop: 8,
// };
// const primaryBtn = {
//   background: "#0f172a",
//   color: "#fff",
//   padding: "10px 16px",
//   borderRadius: 10,
//   border: "none",
//   fontWeight: 700,
//   cursor: "pointer",
// };
// const disabledBtn = { ...primaryBtn, background: "#94a3b8", cursor: "not-allowed" };
// const secondaryBtn = {
//   background: "#fff",
//   color: "#475569",
//   padding: "10px 14px",
//   borderRadius: 10,
//   border: "1px solid #E6EEF7",
//   cursor: "pointer",
// };
// const errTxt = { color: "#EF4444", fontSize: 12, marginTop: 6 };
// const errorAlert = {
//   padding: 12,
//   background: "#FEF2F2",
//   border: "1px solid #FEE2E2",
//   color: "#991B1B",
//   borderRadius: 8,
//   display: "flex",
//   alignItems: "center",
//   gap: 8,
// };
// const successBox = { padding: 40, textAlign: "center" };

// export default AddBranchWizard;































// // import React, { useState } from "react";
// // import { 
// //   FaTimes, FaArrowRight, FaUserShield, FaStore, 
// //   FaChevronLeft, FaCheckCircle, FaExclamationTriangle,
// //   FaEye, FaEyeSlash, FaIdBadge, FaEnvelope, FaPhone, FaLock, FaMapMarkerAlt
// // } from "react-icons/fa";
// // import { setupBranchWithManager } from "../../services/api";

// // const AddBranchWizard = ({ onClose, onSuccess, com_id }) => {
// //   const [step, setStep] = useState(1);
// //   const [showPassword, setShowPassword] = useState(false);
// //   const [isSubmitting, setIsSubmitting] = useState(false);
// //   const [isSuccess, setIsSuccess] = useState(false);
// //   const [errors, setErrors] = useState({});
// //   const [serverError, setServerError] = useState("");

// //   const [form, setForm] = useState({
// //     u_fname: "", u_lname: "", u_email: "", u_pw: "", u_connumber: "", role_id: 1,
// //     B_name: "", B_email: "", B_conNo: "", B_address: "",
// //   });

// //   const handleChange = (e) => {
// //     setForm({ ...form, [e.target.name]: e.target.value });
// //     if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
// //     setServerError("");
// //   };

// //   const validateStep1 = () => {
// //     let errs = {};
// //     if (!form.u_fname) errs.u_fname = "First name required";
// //     if (!form.u_lname) errs.u_lname = "Last name required";
// //     if (!form.u_email.includes("@")) errs.u_email = "Valid email required";
// //     if (form.u_pw.length < 6) errs.u_pw = "Password (min 6 chars)";
// //     setErrors(errs);
// //     return Object.keys(errs).length === 0;
// //   };

// //   const handleNext = () => { if (validateStep1()) setStep(2); };

// //   const handleSubmit = async () => {
// //     if (!form.B_name || !form.B_address) {
// //       setServerError("Branch Name and Address are mandatory.");
// //       return;
// //     }
// //     setIsSubmitting(true);
// //     try {
// //       const payload = {
// //         manager: { ...form, role_id: form.role_id },
// //         branch: { B_name: form.B_name, B_email: form.B_email, B_conNo: form.B_conNo, B_address: form.B_address, com_id: com_id || 1 }
// //       };
// //       await setupBranchWithManager(payload);
// //       setIsSuccess(true);
// //       setTimeout(() => { onSuccess(); onClose(); }, 2000);
// //     } catch (err) {
// //       const msg = err.response?.data?.message || "Failed to complete setup.";
// //       setServerError(msg);
// //       if (msg.toLowerCase().includes("email")) setStep(1);
// //     } finally { setIsSubmitting(false); }
// //   };

// //   if (isSuccess) {
// //     return (
// //       <div style={overlayStyle}>
// //         <div style={successModalStyle}>
// //           <div style={successIconContainer}>
// //             <FaCheckCircle size={50} color="#fff" />
// //           </div>
// //           <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Setup Complete!</h2>
// //           <p style={{ color: '#64748b' }}>The branch and manager have been successfully registered.</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div style={overlayStyle}>
// //       <div style={modalStyle}>
        
// //         {/* Modern Step Indicator */}
// //         <div style={stepperContainer}>
// //           <div style={step === 1 ? activeStep : completedStep}>
// //             <div style={stepCircle(step === 1, step > 1)}>1</div>
// //             <span>Manager Identity</span>
// //           </div>
// //           <div style={step === 2 ? activeStep : pendingStep}>
// //             <div style={stepCircle(step === 2, false)}>2</div>
// //             <span>Branch Configuration</span>
// //           </div>
// //           <button onClick={onClose} style={closeBtn}><FaTimes size={16} /></button>
// //         </div>

// //         <div style={formBody}>
// //           {serverError && <div style={errorAlert}><FaExclamationTriangle /> {serverError}</div>}

// //           {step === 1 ? (
// //             <div style={animationWrapper}>
// //               <header style={stepHeader}>
// //                 <h4 style={sectionTitle}>Personal Details</h4>
// //                 <p style={sectionSub}>Set up the login credentials for the branch admin.</p>
// //               </header>

// //               <div style={rowStyle}>
// //                 <div style={{ flex: 1 }}>
// //                   <label style={labelStyle}>First Name</label>
// //                   <div style={inputWrapper}>
// //                     <FaIdBadge style={inputIcon} />
// //                     <input name="u_fname" style={{...inputStyle, borderColor: errors.u_fname ? '#ef4444' : '#e2e8f0'}} value={form.u_fname} onChange={handleChange} placeholder="John" />
// //                   </div>
// //                   {errors.u_fname && <span style={errTxt}>{errors.u_fname}</span>}
// //                 </div>
// //                 <div style={{ flex: 1 }}>
// //                   <label style={labelStyle}>Last Name</label>
// //                   <div style={inputWrapper}>
// //                     <input name="u_lname" style={{...inputStyle, paddingLeft: '15px', borderColor: errors.u_lname ? '#ef4444' : '#e2e8f0'}} value={form.u_lname} onChange={handleChange} placeholder="Doe" />
// //                   </div>
// //                   {errors.u_lname && <span style={errTxt}>{errors.u_lname}</span>}
// //                 </div>
// //               </div>

// //               <label style={labelStyle}>Email Address</label>
// //               <div style={inputWrapper}>
// //                 <FaEnvelope style={inputIcon} />
// //                 <input name="u_email" type="email" style={{...inputStyle, borderColor: errors.u_email ? '#ef4444' : '#e2e8f0'}} value={form.u_email} onChange={handleChange} placeholder="manager@pos.lk" />
// //               </div>
// //               {errors.u_email && <span style={errTxt}>{errors.u_email}</span>}

// //               <div style={rowStyle}>
// //                 <div style={{ flex: 1 }}>
// //                   <label style={labelStyle}>Contact</label>
// //                   <div style={inputWrapper}>
// //                     <FaPhone style={inputIcon} />
// //                     <input name="u_connumber" style={inputStyle} value={form.u_connumber} onChange={handleChange} placeholder="077..." />
// //                   </div>
// //                 </div>
// //                 <div style={{ flex: 1 }}>
// //                   <label style={labelStyle}>Password</label>
// //                   <div style={inputWrapper}>
// //                     <FaLock style={inputIcon} />
// //                     <input name="u_pw" type={showPassword ? "text" : "password"} style={{...inputStyle, borderColor: errors.u_pw ? '#ef4444' : '#e2e8f0'}} value={form.u_pw} onChange={handleChange} placeholder="••••••" />
// //                     <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtn}>
// //                       {showPassword ? <FaEyeSlash color="#94a3b8" /> : <FaEye color="#94a3b8" />}
// //                     </button>
// //                   </div>
// //                   {errors.u_pw && <span style={errTxt}>{errors.u_pw}</span>}
// //                 </div>
// //               </div>
// //             </div>
// //           ) : (
// //             <div style={animationWrapper}>
// //               <header style={stepHeader}>
// //                 <h4 style={sectionTitle}>Location Details</h4>
// //                 <p style={sectionSub}>Enter the physical and contact information for the branch.</p>
// //               </header>

// //               <label style={labelStyle}>Official Branch Name</label>
// //               <div style={inputWrapper}>
// //                 <FaStore style={inputIcon} />
// //                 <input name="B_name" style={inputStyle} value={form.B_name} onChange={handleChange} placeholder="Colombo Central Branch" />
// //               </div>

// //               <div style={rowStyle}>
// //                 <div style={{ flex: 1 }}>
// //                   <label style={labelStyle}>Branch Email</label>
// //                   <div style={inputWrapper}>
// //                     <FaEnvelope style={inputIcon} />
// //                     <input name="B_email" style={inputStyle} value={form.B_email} onChange={handleChange} placeholder="branch@pos.lk" />
// //                   </div>
// //                 </div>
// //                 <div style={{ flex: 1 }}>
// //                   <label style={labelStyle}>Branch Contact</label>
// //                   <div style={inputWrapper}>
// //                     <FaPhone style={inputIcon} />
// //                     <input name="B_conNo" style={inputStyle} value={form.B_conNo} onChange={handleChange} placeholder="011..." />
// //                   </div>
// //                 </div>
// //               </div>

// //               <label style={labelStyle}>Physical Address</label>
// //               <div style={{...inputWrapper, alignItems: 'flex-start'}}>
// //                 <FaMapMarkerAlt style={{...inputIcon, marginTop: '12px'}} />
// //                 <textarea name="B_address" style={{...inputStyle, height: '80px', resize: 'none', paddingTop: '10px'}} value={form.B_address} onChange={handleChange} placeholder="No, Street, City" />
// //               </div>
// //             </div>
// //           )}
// //         </div>

// //         <div style={footerStyle}>
// //           {step === 2 ? (
// //             <button style={backBtn} onClick={() => setStep(1)} disabled={isSubmitting}>
// //               <FaChevronLeft size={12} /> Back to Manager
// //             </button>
// //           ) : <div></div>}
          
// //           <button 
// //             style={isSubmitting ? disabledSubmitBtn : primaryBtn} 
// //             onClick={step === 1 ? handleNext : handleSubmit} 
// //             disabled={isSubmitting}
// //           >
// //             {isSubmitting ? "Finalizing Setup..." : step === 1 ? (
// //               <>Continue to Branch <FaArrowRight style={{ marginLeft: "8px" }} /></>
// //             ) : "Complete Registration"}
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // // --- UX Styled System ---

// // const overlayStyle = { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
// // const modalStyle = { width: "100%", maxWidth: "600px", background: "#fff", borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" };

// // // Stepper
// // const stepperContainer = { display: "flex", background: "#F8FAFC", padding: "10px 20px", borderBottom: "1px solid #E2E8F0", alignItems: "center", justifyContent: "space-between", position: "relative" };
// // const stepCircle = (active, completed) => ({
// //   width: "28px", height: "28px", borderRadius: "50%", background: completed ? "#10B981" : active ? "#3A4DBF" : "#CBD5E0",
// //   color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", marginRight: "10px", transition: "0.3s"
// // });
// // const activeStep = { display: "flex", alignItems: "center", padding: "15px", color: "#3A4DBF", fontWeight: "700", fontSize: "14px" };
// // const completedStep = { ...activeStep, color: "#10B981" };
// // const pendingStep = { ...activeStep, color: "#94A3B8", fontWeight: "500" };

// // // Form Parts
// // const formBody = { padding: "32px" };
// // const stepHeader = { marginBottom: "24px" };
// // const sectionTitle = { margin: 0, fontSize: "20px", fontWeight: "800", color: "#1E293B" };
// // const sectionSub = { margin: "4px 0 0", fontSize: "14px", color: "#64748B" };
// // const rowStyle = { display: "flex", gap: "20px", marginBottom: "16px" };
// // const inputGroupStyle = { marginBottom: "20px" };
// // const labelStyle = { display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.025em" };

// // // Inputs
// // const inputWrapper = { position: "relative", display: "flex", alignItems: "center", marginBottom: "16px" };
// // const inputIcon = { position: "absolute", left: "14px", color: "#94A3B8", fontSize: "14px" };
// // const inputStyle = { width: "100%", padding: "12px 14px 12px 42px", borderRadius: "12px", border: "1.5px solid #E2E8F0", outline: "none", fontSize: "15px", transition: "0.2s", background: "#FFF", color: "#1E293B" };
// // const eyeBtn = { position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" };

// // // Footer & Buttons
// // const footerStyle = { padding: "24px 32px", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #E2E8F0" };
// // const primaryBtn = { background: "#3A4DBF", color: "#fff", padding: "12px 28px", borderRadius: "14px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", transition: "0.2s", boxShadow: "0 4px 6px -1px rgba(58, 77, 191, 0.3)" };
// // const disabledSubmitBtn = { ...primaryBtn, background: "#94A3B8", boxShadow: "none", cursor: "not-allowed" };
// // const backBtn = { background: "none", border: "none", color: "#64748B", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" };
// // const closeBtn = { background: "#EDF2F7", border: "none", color: "#718096", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

// // // Alerts & Animations
// // const animationWrapper = { animation: "fadeIn 0.4s ease-out" };
// // const errTxt = { color: "#EF4444", fontSize: "12px", marginTop: "-12px", marginBottom: "12px", display: "block", fontWeight: "500" };
// // const errorAlert = { padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FEE2E2", color: "#991B1B", borderRadius: "12px", marginBottom: "20px", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px" };

// // // Success State
// // const successModalStyle = { ...modalStyle, textAlign: 'center', padding: '60px 40px' };
// // const successIconContainer = { width: "80px", height: "80px", background: "#10B981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 10px 15px -3px rgba(16, 185, 129, 0.4)" };

// // export default AddBranchWizard;





















































