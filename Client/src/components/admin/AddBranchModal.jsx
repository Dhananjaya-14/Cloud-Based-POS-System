import React, { useState } from "react";
import { 
  FaTimes, FaArrowRight, FaUserShield, FaStore, 
  FaChevronLeft, FaCheckCircle, FaExclamationTriangle,
  FaEye, FaEyeSlash, FaIdBadge, FaEnvelope, FaPhone, FaLock, FaMapMarkerAlt
} from "react-icons/fa";
import { setupBranchWithManager } from "../../services/api";

const AddBranchWizard = ({ onClose, onSuccess, com_id }) => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  const [form, setForm] = useState({
    u_fname: "", u_lname: "", u_email: "", u_pw: "", u_connumber: "", role_id: 1,
    B_name: "", B_email: "", B_conNo: "", B_address: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
    setServerError("");
  };

  const validateStep1 = () => {
    let errs = {};
    if (!form.u_fname) errs.u_fname = "First name required";
    if (!form.u_lname) errs.u_lname = "Last name required";
    if (!form.u_email.includes("@")) errs.u_email = "Valid email required";
    if (form.u_pw.length < 6) errs.u_pw = "Password (min 6 chars)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => { if (validateStep1()) setStep(2); };

  const handleSubmit = async () => {
    if (!form.B_name || !form.B_address) {
      setServerError("Branch Name and Address are mandatory.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        manager: { ...form, role_id: form.role_id },
        branch: { B_name: form.B_name, B_email: form.B_email, B_conNo: form.B_conNo, B_address: form.B_address, com_id: com_id || 1 }
      };
      await setupBranchWithManager(payload);
      setIsSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 2000);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to complete setup.";
      setServerError(msg);
      if (msg.toLowerCase().includes("email")) setStep(1);
    } finally { setIsSubmitting(false); }
  };

  if (isSuccess) {
    return (
      <div style={overlayStyle}>
        <div style={successModalStyle}>
          <div style={successIconContainer}>
            <FaCheckCircle size={50} color="#fff" />
          </div>
          <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Setup Complete!</h2>
          <p style={{ color: '#64748b' }}>The branch and manager have been successfully registered.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        
        {/* Modern Step Indicator */}
        <div style={stepperContainer}>
          <div style={step === 1 ? activeStep : completedStep}>
            <div style={stepCircle(step === 1, step > 1)}>1</div>
            <span>Manager Identity</span>
          </div>
          <div style={step === 2 ? activeStep : pendingStep}>
            <div style={stepCircle(step === 2, false)}>2</div>
            <span>Branch Configuration</span>
          </div>
          <button onClick={onClose} style={closeBtn}><FaTimes size={16} /></button>
        </div>

        <div style={formBody}>
          {serverError && <div style={errorAlert}><FaExclamationTriangle /> {serverError}</div>}

          {step === 1 ? (
            <div style={animationWrapper}>
              <header style={stepHeader}>
                <h4 style={sectionTitle}>Personal Details</h4>
                <p style={sectionSub}>Set up the login credentials for the branch admin.</p>
              </header>

              <div style={rowStyle}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>First Name</label>
                  <div style={inputWrapper}>
                    <FaIdBadge style={inputIcon} />
                    <input name="u_fname" style={{...inputStyle, borderColor: errors.u_fname ? '#ef4444' : '#e2e8f0'}} value={form.u_fname} onChange={handleChange} placeholder="John" />
                  </div>
                  {errors.u_fname && <span style={errTxt}>{errors.u_fname}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Last Name</label>
                  <div style={inputWrapper}>
                    <input name="u_lname" style={{...inputStyle, paddingLeft: '15px', borderColor: errors.u_lname ? '#ef4444' : '#e2e8f0'}} value={form.u_lname} onChange={handleChange} placeholder="Doe" />
                  </div>
                  {errors.u_lname && <span style={errTxt}>{errors.u_lname}</span>}
                </div>
              </div>

              <label style={labelStyle}>Email Address</label>
              <div style={inputWrapper}>
                <FaEnvelope style={inputIcon} />
                <input name="u_email" type="email" style={{...inputStyle, borderColor: errors.u_email ? '#ef4444' : '#e2e8f0'}} value={form.u_email} onChange={handleChange} placeholder="manager@pos.lk" />
              </div>
              {errors.u_email && <span style={errTxt}>{errors.u_email}</span>}

              <div style={rowStyle}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Contact</label>
                  <div style={inputWrapper}>
                    <FaPhone style={inputIcon} />
                    <input name="u_connumber" style={inputStyle} value={form.u_connumber} onChange={handleChange} placeholder="077..." />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Password</label>
                  <div style={inputWrapper}>
                    <FaLock style={inputIcon} />
                    <input name="u_pw" type={showPassword ? "text" : "password"} style={{...inputStyle, borderColor: errors.u_pw ? '#ef4444' : '#e2e8f0'}} value={form.u_pw} onChange={handleChange} placeholder="••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtn}>
                      {showPassword ? <FaEyeSlash color="#94a3b8" /> : <FaEye color="#94a3b8" />}
                    </button>
                  </div>
                  {errors.u_pw && <span style={errTxt}>{errors.u_pw}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div style={animationWrapper}>
              <header style={stepHeader}>
                <h4 style={sectionTitle}>Location Details</h4>
                <p style={sectionSub}>Enter the physical and contact information for the branch.</p>
              </header>

              <label style={labelStyle}>Official Branch Name</label>
              <div style={inputWrapper}>
                <FaStore style={inputIcon} />
                <input name="B_name" style={inputStyle} value={form.B_name} onChange={handleChange} placeholder="Colombo Central Branch" />
              </div>

              <div style={rowStyle}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Branch Email</label>
                  <div style={inputWrapper}>
                    <FaEnvelope style={inputIcon} />
                    <input name="B_email" style={inputStyle} value={form.B_email} onChange={handleChange} placeholder="branch@pos.lk" />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Branch Contact</label>
                  <div style={inputWrapper}>
                    <FaPhone style={inputIcon} />
                    <input name="B_conNo" style={inputStyle} value={form.B_conNo} onChange={handleChange} placeholder="011..." />
                  </div>
                </div>
              </div>

              <label style={labelStyle}>Physical Address</label>
              <div style={{...inputWrapper, alignItems: 'flex-start'}}>
                <FaMapMarkerAlt style={{...inputIcon, marginTop: '12px'}} />
                <textarea name="B_address" style={{...inputStyle, height: '80px', resize: 'none', paddingTop: '10px'}} value={form.B_address} onChange={handleChange} placeholder="No, Street, City" />
              </div>
            </div>
          )}
        </div>

        <div style={footerStyle}>
          {step === 2 ? (
            <button style={backBtn} onClick={() => setStep(1)} disabled={isSubmitting}>
              <FaChevronLeft size={12} /> Back to Manager
            </button>
          ) : <div></div>}
          
          <button 
            style={isSubmitting ? disabledSubmitBtn : primaryBtn} 
            onClick={step === 1 ? handleNext : handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Finalizing Setup..." : step === 1 ? (
              <>Continue to Branch <FaArrowRight style={{ marginLeft: "8px" }} /></>
            ) : "Complete Registration"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- UX Styled System ---

const overlayStyle = { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalStyle = { width: "100%", maxWidth: "600px", background: "#fff", borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" };

// Stepper
const stepperContainer = { display: "flex", background: "#F8FAFC", padding: "10px 20px", borderBottom: "1px solid #E2E8F0", alignItems: "center", justifyContent: "space-between", position: "relative" };
const stepCircle = (active, completed) => ({
  width: "28px", height: "28px", borderRadius: "50%", background: completed ? "#10B981" : active ? "#3A4DBF" : "#CBD5E0",
  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", marginRight: "10px", transition: "0.3s"
});
const activeStep = { display: "flex", alignItems: "center", padding: "15px", color: "#3A4DBF", fontWeight: "700", fontSize: "14px" };
const completedStep = { ...activeStep, color: "#10B981" };
const pendingStep = { ...activeStep, color: "#94A3B8", fontWeight: "500" };

// Form Parts
const formBody = { padding: "32px" };
const stepHeader = { marginBottom: "24px" };
const sectionTitle = { margin: 0, fontSize: "20px", fontWeight: "800", color: "#1E293B" };
const sectionSub = { margin: "4px 0 0", fontSize: "14px", color: "#64748B" };
const rowStyle = { display: "flex", gap: "20px", marginBottom: "16px" };
const inputGroupStyle = { marginBottom: "20px" };
const labelStyle = { display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.025em" };

// Inputs
const inputWrapper = { position: "relative", display: "flex", alignItems: "center", marginBottom: "16px" };
const inputIcon = { position: "absolute", left: "14px", color: "#94A3B8", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "12px 14px 12px 42px", borderRadius: "12px", border: "1.5px solid #E2E8F0", outline: "none", fontSize: "15px", transition: "0.2s", background: "#FFF", color: "#1E293B" };
const eyeBtn = { position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" };

// Footer & Buttons
const footerStyle = { padding: "24px 32px", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #E2E8F0" };
const primaryBtn = { background: "#3A4DBF", color: "#fff", padding: "12px 28px", borderRadius: "14px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", transition: "0.2s", boxShadow: "0 4px 6px -1px rgba(58, 77, 191, 0.3)" };
const disabledSubmitBtn = { ...primaryBtn, background: "#94A3B8", boxShadow: "none", cursor: "not-allowed" };
const backBtn = { background: "none", border: "none", color: "#64748B", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" };
const closeBtn = { background: "#EDF2F7", border: "none", color: "#718096", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

// Alerts & Animations
const animationWrapper = { animation: "fadeIn 0.4s ease-out" };
const errTxt = { color: "#EF4444", fontSize: "12px", marginTop: "-12px", marginBottom: "12px", display: "block", fontWeight: "500" };
const errorAlert = { padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FEE2E2", color: "#991B1B", borderRadius: "12px", marginBottom: "20px", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px" };

// Success State
const successModalStyle = { ...modalStyle, textAlign: 'center', padding: '60px 40px' };
const successIconContainer = { width: "80px", height: "80px", background: "#10B981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 10px 15px -3px rgba(16, 185, 129, 0.4)" };

export default AddBranchWizard;






































// import React, { useState } from "react";
// import { 
//   FaTimes, FaArrowRight, FaUserShield, 
//   FaStore, FaChevronLeft, FaCheckCircle, FaExclamationTriangle 
// } from "react-icons/fa";
// import { setupBranchWithManager } from "../../services/api";

// const AddBranchWizard = ({ onClose, onSuccess, com_id }) => {
//   const [step, setStep] = useState(1);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isSuccess, setIsSuccess] = useState(false);
//   const [errors, setErrors] = useState({});
//   const [serverError, setServerError] = useState("");

//   // State mapped to match your User and Branch Controllers
//   const [form, setForm] = useState({
//     // User Table Fields
//     u_fname: "",
//     u_lname: "",
//     u_email: "",
//     u_pw: "",
//     u_connumber: "",
//     role_id: 1, // Defaulting to Manager Role

//     // Branch Table Fields
//     B_name: "",
//     B_email: "",
//     B_conNo: "",
//     B_address: "",
//     stations: [], // Optional field from your previous UI
//   });

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//     if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
//     setServerError("");
//   };

//   const validateStep1 = () => {
//     let errs = {};
//     if (!form.u_fname) errs.u_fname = "First name required";
//     if (!form.u_lname) errs.u_lname = "Last name required";
//     if (!form.u_email.includes("@")) errs.u_email = "Invalid email";
//     if (form.u_pw.length < 6) errs.u_pw = "Password (min 6 chars)";
    
//     setErrors(errs);
//     return Object.keys(errs).length === 0;
//   };

//   const handleNext = () => {
//     if (validateStep1()) setStep(2);
//   };

//   const handleSubmit = async () => {
//     // Basic Step 2 Validation
//     if (!form.B_name || !form.B_address) {
//       setServerError("Branch Name and Address are mandatory.");
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       // Orchestrate the two-step API call
//       const payload = {
//         manager: {
//           u_fname: form.u_fname,
//           u_lname: form.u_lname,
//           u_email: form.u_email,
//           u_pw: form.u_pw,
//           u_connumber: form.u_connumber,
//           role_id: form.role_id
//         },
//         branch: {
//           B_name: form.B_name,
//           B_email: form.B_email,
//           B_conNo: form.B_conNo,
//           B_address: form.B_address,
//           com_id: com_id || 1 // Fallback to 1 if not provided
//         }
//       };

//       await setupBranchWithManager(payload);
//       setIsSuccess(true);
      
//       setTimeout(() => {
//         onSuccess();
//         onClose();
//       }, 2000);

//     } catch (err) {
//       const msg = err.response?.data?.message || "Failed to complete setup. Check if email exists.";
//       setServerError(msg);
//       // If it's a user error, allow them to go back
//       if (msg.toLowerCase().includes("email")) setStep(1);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (isSuccess) {
//     return (
//       <div style={overlayStyle}>
//         <div style={{...modalStyle, textAlign: 'center', padding: '50px'}}>
//           <FaCheckCircle size={60} color="#10b981" />
//           <h2 style={{color: '#1e293b', marginTop: '20px'}}>Success!</h2>
//           <p style={{color: '#64748b'}}>Branch and Manager account created.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={overlayStyle}>
//       <div style={modalStyle}>
        
//         {/* Wizard Progress Header */}
//         <div style={wizardHeader}>
//           <div style={step === 1 ? activeTab : inactiveTab}>1. Manager Identity</div>
//           <div style={step === 2 ? activeTab : inactiveTab}>2. Branch Configuration</div>
//           <button onClick={onClose} style={closeBtn}><FaTimes /></button>
//         </div>

//         <div style={formBody}>
//           {serverError && <div style={errorAlert}><FaExclamationTriangle /> {serverError}</div>}

//           {step === 1 ? (
//             <div className="fade-in">
//               <h4 style={sectionTitle}><FaUserShield /> Create Manager Account</h4>
//               <div style={rowStyle}>
//                 <div style={{flex: 1}}>
//                   <label style={labelStyle}>First Name</label>
//                   <input name="u_fname" style={inputStyle} value={form.u_fname} onChange={handleChange} placeholder="First Name" />
//                   {errors.u_fname && <span style={errTxt}>{errors.u_fname}</span>}
//                 </div>
//                 <div style={{flex: 1}}>
//                   <label style={labelStyle}>Last Name</label>
//                   <input name="u_lname" style={inputStyle} value={form.u_lname} onChange={handleChange} placeholder="Last Name" />
//                   {errors.u_lname && <span style={errTxt}>{errors.u_lname}</span>}
//                 </div>
//               </div>
//               <div style={inputGroupStyle}>
//                 <label style={labelStyle}>Manager Email</label>
//                 <input name="u_email" type="email" style={inputStyle} value={form.u_email} onChange={handleChange} placeholder="email@pos.lk" />
//                 {errors.u_email && <span style={errTxt}>{errors.u_email}</span>}
//               </div>
//               <div style={rowStyle}>
//                 <div style={{flex: 1}}>
//                   <label style={labelStyle}>Contact</label>
//                   <input name="u_connumber" style={inputStyle} value={form.u_connumber} onChange={handleChange} placeholder="Phone" />
//                 </div>
//                 <div style={{flex: 1}}>
//                   <label style={labelStyle}>Password</label>
//                   <input name="u_pw" type="password" style={inputStyle} value={form.u_pw} onChange={handleChange} placeholder="••••••" />
//                   {errors.u_pw && <span style={errTxt}>{errors.u_pw}</span>}
//                 </div>
//               </div>
//             </div>
//           ) : (
//             <div className="fade-in">
//               <h4 style={sectionTitle}><FaStore /> Branch Details</h4>
//               <div style={inputGroupStyle}>
//                 <label style={labelStyle}>Branch Name</label>
//                 <input name="B_name" style={inputStyle} value={form.B_name} onChange={handleChange} placeholder="Galle Central" />
//               </div>
//               <div style={rowStyle}>
//                 <div style={{flex: 1}}>
//                   <label style={labelStyle}>Branch Email</label>
//                   <input name="B_email" style={inputStyle} value={form.B_email} onChange={handleChange} placeholder="branch@pos.lk" />
//                 </div>
//                 <div style={{flex: 1}}>
//                   <label style={labelStyle}>Branch Contact</label>
//                   <input name="B_conNo" style={inputStyle} value={form.B_conNo} onChange={handleChange} placeholder="011..." />
//                 </div>
//               </div>
//               <div style={inputGroupStyle}>
//                 <label style={labelStyle}>Physical Address</label>
//                 <textarea name="B_address" style={{...inputStyle, height: '60px', resize: 'none'}} value={form.B_address} onChange={handleChange} />
//               </div>
//             </div>
//           )}
//         </div>

//         <div style={footerStyle}>
//           {step === 2 && (
//             <button style={backBtn} onClick={() => setStep(1)} disabled={isSubmitting}>
//               <FaChevronLeft /> Previous
//             </button>
//           )}
//           <div style={{marginLeft: 'auto'}}>
//             {step === 1 ? (
//               <button style={primaryBtn} onClick={handleNext}>
//                 Next: Branch Details <FaArrowRight style={{marginLeft: '8px'}}/>
//               </button>
//             ) : (
//               <button style={primaryBtn} onClick={handleSubmit} disabled={isSubmitting}>
//                 {isSubmitting ? "Creating System..." : "Finish & Save"}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// // --- Updated Styles (Clean Dashboard Look) ---
// const overlayStyle = { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
// const modalStyle = { width: "100%", maxWidth: "550px", background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" };
// const wizardHeader = { display: "flex", borderBottom: "1px solid #f1f5f9", position: "relative" };
// const activeTab = { flex: 1, padding: "20px", textAlign: "center", fontWeight: "700", color: "#3A4DBF", borderBottom: "3px solid #3A4DBF", fontSize: "13px", background: "#f8faff" };
// const inactiveTab = { flex: 1, padding: "20px", textAlign: "center", fontWeight: "500", color: "#94a3b8", fontSize: "13px" };
// const sectionTitle = { fontSize: "16px", color: "#1e293b", display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" };
// const formBody = { padding: "30px" };
// const rowStyle = { display: "flex", gap: "15px", marginBottom: "15px" };
// const inputGroupStyle = { marginBottom: "15px" };
// const labelStyle = { display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "5px", textTransform: "uppercase" };
// const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", fontSize: "14px", boxSizing: "border-box", background: "#fcfcfc" };
// const footerStyle = { padding: "20px 30px", background: "#f8fafc", display: "flex", alignItems: "center" };
// const primaryBtn = { background: "#3A4DBF", color: "#fff", padding: "10px 24px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center" };
// const backBtn = { background: "none", border: "none", color: "#64748b", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" };
// const errTxt = { color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" };
// const errorAlert = { padding: "10px", background: "#fef2f2", border: "1px solid #fee2e2", color: "#991b1b", borderRadius: "8px", marginBottom: "15px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" };
// const closeBtn = { position: "absolute", right: "15px", top: "15px", background: "none", border: "none", color: "#cbd5e0", cursor: "pointer", zIndex: 10 };

// export default AddBranchWizard;















































