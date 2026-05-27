import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import LoginLayout from "../components/register/LoginLayout";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [u_email, setEmail] = useState("");
  const [u_pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
        try {
      const data = await login({ u_email, u_pw }); // { token, user }
      const roleId = Number(data.user?.role_id);
      // map role ids to routes
      if (roleId === 6) navigate("/admin/dashboard"); // super admin -> Admin Dashboard
      else if (roleId === 2) navigate("/branches"); // admin -> BranchManagement
      else if (roleId === 1) navigate("/branch-admin/products");
      else if (roleId === 3) navigate("/cashier/dashboard");
      else if (roleId === 9) navigate("/kitchen/orders");
      else navigate("/"); // fallback
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout>
      <div>
        <div style={badgeStyle}>
          <span style={dotStyle}></span>
          Hotel POS
        </div>

        <h2 style={{ fontSize: "26px", color: "#1a1a1a", margin: "12px 0 4px" }}>
          Login
        </h2>
        <p style={{ color: "#888", marginBottom: "28px", fontSize: "14px" }}>
          Welcome back! Please login to your account.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={inputGroup}>
            <label style={labelStyle}>Email</label>
            <div style={{ position: "relative" }}>
              <Mail size={18} style={iconStyle} />
              <input
                type="text"
                value={u_email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputWithIconStyle}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div style={{ ...inputGroup, marginTop: "18px" }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={iconStyle} />
              <input
                type={showPassword ? "text" : "password"}
                value={u_pw}
                onChange={(e) => setPw(e.target.value)}
                style={inputWithIconStyle}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={eyeButtonStyle}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={rowStyle}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#555" }}>
              <input type="checkbox" /> Remember Me
            </label>
            <span style={{ color: "#0056A2", fontSize: "13px", cursor: "pointer", fontWeight: "600" }}>
              Forgot Password?
            </span>
          </div>

          {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}

          <button type="submit" style={primaryBtn} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ marginTop: "20px", fontSize: "14px", color: "#666", textAlign: "center" }}>
          New Here?{" "}
          <span onClick={() => navigate("/register/step-1")} style={{ color: "#0056A2", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}>
            Sign Up
          </span>
        </p>

        <div style={socialRow}>
          <div style={socialCircle}>📧</div>
          <div style={socialCircle}>f</div>
          <div style={socialCircle}>💬</div>
        </div>
      </div>
    </LoginLayout>
  );
};

const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' };
const dotStyle = { height: '8px', width: '8px', backgroundColor: '#4ade80', borderRadius: '50%' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#444' };
const inputWithIconStyle = { width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' };
const iconStyle = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' };
const eyeButtonStyle = { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#999' };
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' };
const primaryBtn = { width: '100%', padding: '14px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', marginTop: '24px', cursor: 'pointer', letterSpacing: '0.3px' };
const socialRow = { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' };
const socialCircle = { width: '38px', height: '38px', backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0072ff', fontSize: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #eee', cursor: 'pointer' };

export default Login;

























// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { Mail, Lock, Eye, EyeOff } from "lucide-react";
// import LoginLayout from "../components/register/LoginLayout";
// import { login, setAuthToken } from "../services/api";

// const Login = () => {
//   const navigate = useNavigate();
//   const [showPassword, setShowPassword] = useState(false);
//   const [u_email, setEmail] = useState("");
//   const [u_pw, setPw] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setLoading(true);
//     try {
//       const data = await login({ u_email, u_pw });
//       // data: { token, user }
//       setAuthToken(data.token);
//       localStorage.setItem("user", JSON.stringify(data.user));
//       // navigate to appropriate route (adjust as needed)
//       navigate("/admin/dashboard");
//     } catch (err) {
//       setError(err.response?.data?.message || err.message || "Login failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <LoginLayout>
//       <div>
//         <div style={badgeStyle}>
//           <span style={dotStyle}></span>
//           Hotel POS
//         </div>

//         <h2 style={{ fontSize: "26px", color: "#1a1a1a", margin: "12px 0 4px" }}>
//           Login
//         </h2>
//         <p style={{ color: "#888", marginBottom: "28px", fontSize: "14px" }}>
//           Welcome back! Please login to your account.
//         </p>

//         <form onSubmit={handleSubmit}>
//           <div style={inputGroup}>
//             <label style={labelStyle}>Email</label>
//             <div style={{ position: "relative" }}>
//               <Mail size={18} style={iconStyle} />
//               <input
//                 type="text"
//                 value={u_email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 style={inputWithIconStyle}
//                 placeholder="Enter your email"
//                 required
//               />
//             </div>
//           </div>

//           <div style={{ ...inputGroup, marginTop: "18px" }}>
//             <label style={labelStyle}>Password</label>
//             <div style={{ position: "relative" }}>
//               <Lock size={18} style={iconStyle} />
//               <input
//                 type={showPassword ? "text" : "password"}
//                 value={u_pw}
//                 onChange={(e) => setPw(e.target.value)}
//                 style={inputWithIconStyle}
//                 placeholder="Enter your password"
//                 required
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword(!showPassword)}
//                 style={eyeButtonStyle}
//               >
//                 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
//               </button>
//             </div>
//           </div>

//           <div style={rowStyle}>
//             <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#555" }}>
//               <input type="checkbox" /> Remember Me
//             </label>
//             <span style={{ color: "#0056A2", fontSize: "13px", cursor: "pointer", fontWeight: "600" }}>
//               Forgot Password?
//             </span>
//           </div>

//           {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}

//           <button type="submit" style={primaryBtn} disabled={loading}>
//             {loading ? "Logging in..." : "Login"}
//           </button>
//         </form>

//         <p style={{ marginTop: "20px", fontSize: "14px", color: "#666", textAlign: "center" }}>
//           New Here?{" "}
//           <span onClick={() => navigate("/register/step-1")} style={{ color: "#0056A2", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}>
//             Sign Up
//           </span>
//         </p>

//         <div style={socialRow}>
//           <div style={socialCircle}>📧</div>
//           <div style={socialCircle}>f</div>
//           <div style={socialCircle}>💬</div>
//         </div>
//       </div>
//     </LoginLayout>
//   );
// };

// const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' };
// const dotStyle = { height: '8px', width: '8px', backgroundColor: '#4ade80', borderRadius: '50%' };
// const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
// const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#444' };
// const inputWithIconStyle = { width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' };
// const iconStyle = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' };
// const eyeButtonStyle = { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#999' };
// const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' };
// const primaryBtn = { width: '100%', padding: '14px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', marginTop: '24px', cursor: 'pointer', letterSpacing: '0.3px' };
// const socialRow = { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' };
// const socialCircle = { width: '38px', height: '38px', backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0072ff', fontSize: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #eee', cursor: 'pointer' };

// export default Login;




















// // import React, { useState } from 'react';
// // import { useNavigate } from 'react-router-dom';
// // import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
// // import LoginLayout from '../components/register/LoginLayout';

// // const Login = () => {
// //   const navigate = useNavigate();
// //   const [showPassword, setShowPassword] = useState(false);

// //   return (
// //     <LoginLayout>
// //       <div>
// //         {/* 1. Badge */}
// //         <div style={badgeStyle}>
// //           <span style={dotStyle}></span>
// //           Hotel POS
// //         </div>

// //         {/* 2. Heading */}
// //         <h2 style={{ fontSize: '26px', color: '#1a1a1a', margin: '12px 0 4px' }}>Login</h2>
// //         <p style={{ color: '#888', marginBottom: '28px', fontSize: '14px' }}>
// //           Welcome back! Please login to your account.
// //         </p>

// //         {/* 3. Form */}
// //         <form>
// //           {/* Username/Email */}
// //           <div style={inputGroup}>
// //             <label style={labelStyle}>Username or Email</label>
// //             <div style={{ position: 'relative' }}>
// //               <Mail size={18} style={iconStyle} />
// //               <input
// //                 type="text"
// //                 style={inputWithIconStyle}
// //                 placeholder="Enter your username or email"
// //               />
// //             </div>
// //           </div>

// //           {/* Password */}
// //           <div style={{ ...inputGroup, marginTop: '18px' }}>
// //             <label style={labelStyle}>Password</label>
// //             <div style={{ position: 'relative' }}>
// //               <Lock size={18} style={iconStyle} />
// //               <input
// //                 type={showPassword ? 'text' : 'password'}
// //                 style={inputWithIconStyle}
// //                 placeholder="Enter your password"
// //               />
// //               <button
// //                 type="button"
// //                 onClick={() => setShowPassword(!showPassword)}
// //                 style={eyeButtonStyle}
// //               >
// //                 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
// //               </button>
// //             </div>
// //           </div>

// //           {/* Remember & Forgot */}
// //           <div style={rowStyle}>
// //             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#555' }}>
// //               <input type="checkbox" /> Remember Me
// //             </label>
// //             <span style={{ color: '#0056A2', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>Forgot Password?</span>
// //           </div>

// //           {/* Login Button */}
// //           <button type="submit" style={primaryBtn}>
// //             Login
// //           </button>
// //         </form>

// //         {/* 4. Sign Up Link */}
// //         <p style={{ marginTop: '20px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
// //           New Here?{' '}
// //           <span
// //             onClick={() => navigate('/register/step-1')}
// //             style={{ color: '#0056A2', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
// //           >
// //             Sign Up
// //           </span>
// //         </p>

// //         {/* 5. Social Icons */}
// //         <div style={socialRow}>
// //           <div style={socialCircle}>📧</div>
// //           <div style={socialCircle}>f</div>
// //           <div style={socialCircle}>💬</div>
// //         </div>
// //       </div>
// //     </LoginLayout>
// //   );
// // };

// // // Styles
// // const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' };
// // const dotStyle = { height: '8px', width: '8px', backgroundColor: '#4ade80', borderRadius: '50%' };
// // const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
// // const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#444' };
// // const inputWithIconStyle = { width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' };
// // const iconStyle = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' };
// // const eyeButtonStyle = { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#999' };
// // const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' };
// // const primaryBtn = { width: '100%', padding: '14px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', marginTop: '24px', cursor: 'pointer', letterSpacing: '0.3px' };
// // const socialRow = { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' };
// // const socialCircle = { width: '38px', height: '38px', backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0072ff', fontSize: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #eee', cursor: 'pointer' };

// // export default Login;









