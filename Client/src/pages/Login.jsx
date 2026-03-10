import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import RegisterLayout from '../components/register/RegisterLayout';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <RegisterLayout>
      <div style={{ textAlign: 'center' }}>
        {/* 1. Badge */}
        <div style={badgeStyle}>
          <span style={dotStyle}></span>
          Hotel POS
        </div>

        {/* 2. Heading */}
        <h2 style={{ fontSize: '28px', color: '#1a1a1a', margin: '10px 0' }}>Login</h2>
        <p style={{ color: '#888', marginBottom: '30px' }}>
          Welcome back! Please login to your account.
        </p>

        {/* 3. Form */}
        <form style={{ textAlign: 'left' }}>
          {/* Username/Email */}
          <div style={inputGroup}>
            <label style={labelStyle}>Username or Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={iconStyle} />
              <input 
                type="text" 
                style={inputWithIconStyle} 
                placeholder="Enter your username or email" 
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ ...inputGroup, marginTop: '20px' }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={iconStyle} />
              <input 
                type={showPassword ? "text" : "password"} 
                style={inputWithIconStyle} 
                placeholder="Enter your password" 
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

          {/* Remember & Forgot */}
          <div style={rowStyle}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
              <input type="checkbox" /> Remember Me
            </label>
            <span style={{ color: '#0056A2', fontSize: '14px', cursor: 'pointer' }}>Forgot Password?</span>
          </div>

          {/* Login Button */}
          <button type="submit" style={primaryBtn}>
            Login
          </button>
        </form>

        {/* 4. Sign Up Link */}
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          New Here?{" "}
          <span 
            onClick={() => navigate('/register/step-1')}
            style={{ color: '#0056A2', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sign Up
          </span>
        </p>
      </div>
    </RegisterLayout>
  );
};

// Consistent Internal Styles
const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#0056A2', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' };
const dotStyle = { height: '8px', width: '8px', backgroundColor: '#4ade80', borderRadius: '50%' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#444' };
const inputWithIconStyle = { width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' };
const iconStyle = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' };
const eyeButtonStyle = { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#999' };
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' };
const primaryBtn = { width: '100%', padding: '15px', backgroundColor: '#0056A2', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', marginTop: '25px', cursor: 'pointer' };

export default Login;

































// import { useState } from "react";
// import {
//   Mail,
//   Lock,
//   Eye,
//   EyeOff,
//   Shield,
//   Zap,
//   CheckCircle,
//   Home,
// } from "lucide-react";

// export default function App() {
//   const [showPassword, setShowPassword] = useState(false);
//   const [rememberMe, setRememberMe] = useState(false);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#e8f0f5] to-[#f5f5f5]">
//       {/* Top Navigation Bar */}
//       <div className="bg-gradient-to-r from-[#0a7fbf] via-[#1a9fc5] to-[#3dbc9d] px-6 py-3 flex justify-between items-center text-white text-sm">
//         <div className="flex items-center gap-2">
//           <Home size={16} />
//           <span>pos</span>
//         </div>
//         <div className="flex items-center gap-6">
//           <span>17 JAN 2026</span>
//           <span>08:32 AM</span>
//           <span>08:32 AM</span>
//           <span className="cursor-pointer">EN</span>
//           <span className="cursor-pointer">SIN</span>
//           <span className="cursor-pointer">Help</span>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="flex items-center justify-center px-4 py-12">
//         <div className="w-full max-w-5xl flex bg-white rounded-3xl shadow-2xl overflow-hidden">
//           {/* Left Side - Login Form */}
//           <div className="w-full md:w-1/2 p-12">
//             {/* Hotel POS Badge */}
//             <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0a7fbf] to-[#1a9fc5] text-white px-4 py-2 rounded-lg mb-8">
//               <Home size={18} />
//               <span className="font-medium">Hotel POS</span>
//             </div>

//             {/* Heading */}
//             <h1 className="text-3xl font-bold text-gray-900 mb-2">Login</h1>
//             <p className="text-gray-600 mb-8">
//               Welcome back! Please login to your account.
//             </p>

//             {/* Form */}
//             <form className="space-y-6">
//               {/* Username or Email */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Username or Email
//                 </label>
//                 <div className="relative">
//                   <Mail
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                     size={18}
//                   />
//                   <input
//                     type="text"
//                     placeholder="Enter your username or email"
//                     className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a7fbf] focus:border-transparent outline-none transition"
//                   />
//                 </div>
//               </div>

//               {/* Password */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Password
//                 </label>
//                 <div className="relative">
//                   <Lock
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                     size={18}
//                   />
//                   <input
//                     type={showPassword ? "text" : "password"}
//                     placeholder="Enter your password"
//                     className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a7fbf] focus:border-transparent outline-none transition"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                   >
//                     {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
//                   </button>
//                 </div>
//               </div>

//               {/* Remember Me & Forgot Password */}
//               <div className="flex items-center justify-between">
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input
//                     type="checkbox"
//                     checked={rememberMe}
//                     onChange={(e) => setRememberMe(e.target.checked)}
//                     className="w-4 h-4 rounded border-gray-300 text-[#0a7fbf] focus:ring-[#0a7fbf]"
//                   />
//                   <span className="text-sm text-gray-700">Remember Me</span>
//                 </label>
//                 <a
//                   href="#"
//                   className="text-sm text-[#0a7fbf] hover:underline"
//                 >
//                   Forgot Password?
//                 </a>
//               </div>

//               {/* Login Button */}
//               <button
//                 type="submit"
//                 className="w-full bg-gradient-to-r from-[#0a7fbf] to-[#1a9fc5] text-white py-3 rounded-lg font-medium hover:opacity-90 transition shadow-lg"
//               >
//                 Login
//               </button>

//               {/* Sign Up Link */}
//               <div className="text-center text-sm text-gray-600">
//                 New Here?{" "}
//                 <a
//                   href="#"
//                   className="text-[#0a7fbf] font-medium hover:underline"
//                 >
//                   Sign Up
//                 </a>
//               </div>

//               {/* Social Login Icons */}
//               <div className="flex items-center justify-center gap-4 pt-4">
//                 <button
//                   type="button"
//                   className="w-12 h-12 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"
//                 >
//                   <Mail size={20} className="text-red-500" />
//                 </button>
//                 <button
//                   type="button"
//                   className="w-12 h-12 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"
//                 >
//                   <svg
//                     className="w-5 h-5 text-blue-600"
//                     viewBox="0 0 24 24"
//                     fill="currentColor"
//                   >
//                     <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
//                   </svg>
//                 </button>
//                 <button
//                   type="button"
//                   className="w-12 h-12 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"
//                 >
//                   <svg
//                     className="w-5 h-5 text-green-500"
//                     viewBox="0 0 24 24"
//                     fill="currentColor"
//                   >
//                     <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
//                   </svg>
//                 </button>
//               </div>
//             </form>
//           </div>

//           {/* Right Side - Welcome Message */}
//           <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#0a7fbf] via-[#1a9fc5] to-[#3dbc9d] text-white p-12 flex-col items-center justify-center">
//             <div className="text-center space-y-6">
//               <h2 className="text-4xl font-bold">Welcome Back.</h2>
//               <p className="text-lg opacity-90">
//                 To the Management System,
//                 <br />
//                 Please log in.
//               </p>

//               {/* Feature Badges */}
//               <div className="flex gap-4 justify-center pt-8">
//                 <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
//                   <Shield size={18} />
//                   <span className="text-sm">Secure Login</span>
//                 </div>
//                 <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
//                   <Zap size={18} />
//                   <span className="text-sm">Fast Access</span>
//                 </div>
//                 <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
//                   <CheckCircle size={18} />
//                   <span className="text-sm">Easy to Use</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }