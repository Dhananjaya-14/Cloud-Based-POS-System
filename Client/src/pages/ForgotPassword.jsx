import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import LoginLayout from "../components/register/LoginLayout";
import { requestPasswordReset, resetPassword } from "../services/api";

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setResetUrl("");
    setError("");
    setLoading(true);

    try {
      if (token) {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        if (password !== confirmation) {
          throw new Error("Passwords do not match");
        }
        await resetPassword({ token, password });
        setMessage("Your password has been reset. You can now log in.");
        setPassword("");
        setConfirmation("");
      } else {
        const response = await requestPasswordReset(email.trim());
        setMessage(response.message);
        if (response.resetUrl) {
          setResetUrl(response.resetUrl);
        }
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout>
      <div>
        <h2 style={headingStyle}>{token ? "Set a new password" : "Forgot Password?"}</h2>
        <p style={subheadingStyle}>
          {token
            ? "Choose a new password for your account."
            : "Enter your email and we will help you reset your password."}
        </p>

        <form onSubmit={handleSubmit}>
          {!token ? (
            <div style={inputGroup}>
              <label style={labelStyle} htmlFor="reset-email">Email</label>
              <div style={inputWrapperStyle}>
                <Mail size={18} style={iconStyle} />
                <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} placeholder="Enter your email" required />
              </div>
            </div>
          ) : (
            <>
              <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} />
              <PasswordField id="confirm-password" label="Confirm password" value={confirmation} onChange={setConfirmation} />
            </>
          )}

          {error && <div style={errorStyle}>{error}</div>}
          {message && <div style={successStyle}>{message}</div>}
          {resetUrl && <a href={resetUrl} style={resetLinkStyle}>Open reset link</a>}
          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Processing..." : token ? "Reset Password" : "Send Reset Link"}
          </button>
        </form>

        <Link to="/login" style={backLinkStyle}>Back to Login</Link>
      </div>
    </LoginLayout>
  );
};

const PasswordField = ({ id, label, value, onChange }) => (
  <div style={{ ...inputGroup, marginTop: "18px" }}>
    <label style={labelStyle} htmlFor={id}>{label}</label>
    <div style={inputWrapperStyle}>
      <Lock size={18} style={iconStyle} />
      <input id={id} type="password" value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} required minLength={8} />
    </div>
  </div>
);

const headingStyle = { fontSize: "26px", color: "#1a1a1a", margin: "12px 0 4px" };
const subheadingStyle = { color: "#888", marginBottom: "28px", fontSize: "14px" };
const inputGroup = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle = { fontSize: "14px", fontWeight: "600", color: "#444" };
const inputWrapperStyle = { position: "relative" };
const inputStyle = { width: "100%", padding: "12px 12px 12px 40px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "14px" };
const iconStyle = { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#999" };
const buttonStyle = { width: "100%", padding: "14px", background: "linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)", color: "white", border: "none", borderRadius: "15px", fontWeight: "bold", fontSize: "16px", marginTop: "24px", cursor: "pointer" };
const errorStyle = { color: "#b42318", marginTop: 12, fontSize: "14px" };
const successStyle = { color: "#087443", marginTop: 12, fontSize: "14px" };
const resetLinkStyle = { display: "block", marginTop: "12px", color: "#0056A2", fontSize: "14px", fontWeight: "600" };
const backLinkStyle = { display: "block", marginTop: "20px", textAlign: "center", color: "#0056A2", fontSize: "14px", fontWeight: "600" };

export default ForgotPassword;