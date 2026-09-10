import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterLayout from '../components/register/RegisterLayout';
import Stepper from '../components/register/Stepper';

const RegisterStep3 = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value, allValues = formData) => {
    let error = '';

    switch (name) {
      case 'password': {
        if (!value) {
          error = 'Password is required';
          break;
        }
        if (value.length < 8) {
          error = 'Password must be at least 8 characters';
          break;
        }
        if (value.length > 128) {
          error = 'Password must not exceed 128 characters';
          break;
        }
        if (!/[A-Z]/.test(value)) {
          error = 'Password must contain at least one uppercase letter';
          break;
        }
        if (!/[a-z]/.test(value)) {
          error = 'Password must contain at least one lowercase letter';
          break;
        }
        if (!/[0-9]/.test(value)) {
          error = 'Password must contain at least one number';
          break;
        }
        if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`;']/.test(value)) {
          error = 'Password must contain at least one special character';
          break;
        }
        if (/\s/.test(value)) {
          error = 'Password must not contain spaces';
          break;
        }
        break;
      }

      case 'confirmPassword': {
        if (!value) {
          error = 'Please confirm your password';
          break;
        }
        if (value !== allValues.password) {
          error = 'Passwords do not match';
          break;
        }
        break;
      }

      default:
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    if (touched[name]) {
      const error = validateField(name, value, updated);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }

    // Re-validate confirmPassword when password changes and it has been touched
    if (name === 'password' && touched.confirmPassword) {
      const confirmError = validateField('confirmPassword', updated.confirmPassword, updated);
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value, formData);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key], formData);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    setTouched({ password: true, confirmPassword: true });
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    if (!validateForm()) return;

    // Persist step 3 data (password) — merge into sessionStorage
    const existing = sessionStorage.getItem('registerStep3');
    const parsed = existing ? JSON.parse(existing) : {};
    sessionStorage.setItem(
      'registerStep3',
      JSON.stringify({ ...parsed, ...formData })
    );

    // Optionally clear all registration data after successful submit
    // sessionStorage.removeItem('registerStep1');
    // sessionStorage.removeItem('registerStep2');
    // sessionStorage.removeItem('registerStep3');

    navigate('/login');
  };

  const getInputStyle = (fieldName) => ({
    ...inputStyle,
    borderColor: touched[fieldName] && errors[fieldName] ? '#e53e3e' : '#ddd',
    outline: 'none',
  });

  // Password strength indicator (optional visual aid)
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', color: 'transparent', width: '0%' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`;']/.test(pwd)) score++;

    if (score <= 2) return { label: 'Weak', color: '#e53e3e', width: '33%' };
    if (score <= 4) return { label: 'Medium', color: '#f59e0b', width: '66%' };
    return { label: 'Strong', color: '#22c55e', width: '100%' };
  };

  const strength = getPasswordStrength(formData.password);

  return (
    <RegisterLayout>
      <div style={{ textAlign: 'center' }}>
        <div style={badgeStyle}><span style={dotStyle}></span>Hotel POS</div>
        <h2 style={{ fontSize: '28px', margin: '10px 0' }}>Create Your Account</h2>
        <p style={{ color: '#888' }}>Join thousands of users who trust our platform</p>

        <div style={{ margin: '40px 0' }}>
          <Stepper currentStep={3} />
        </div>

        <div style={{ ...inputGroup, textAlign: 'left', marginTop: '16px' }}>
          <label style={labelStyle}>Password</label>
          <div style={passwordInputWrapper}>
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              style={getInputStyle('password')}
              placeholder="● ● ● ● ● ●"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={128}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeButton}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              )}
            </button>
          </div>
          {formData.password && (
            <div style={strengthWrapper}>
              <div style={strengthBarBackground}>
                <div
                  style={{
                    ...strengthBarFill,
                    width: strength.width,
                    backgroundColor: strength.color,
                  }}
                />
              </div>
              <span style={{ ...strengthLabel, color: strength.color }}>
                {strength.label}
              </span>
            </div>
          )}
          {touched.password && errors.password && (
            <span style={errorStyle}>{errors.password}</span>
          )}
        </div>

        <div style={{ ...inputGroup, textAlign: 'left', marginTop: '16px' }}>
          <label style={labelStyle}>Confirm Password</label>
          <div style={passwordInputWrapper}>
            <input
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              style={getInputStyle('confirmPassword')}
              placeholder="● ● ● ● ● ●"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={128}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={eyeButton}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              )}
            </button>
          </div>
          {touched.confirmPassword && errors.confirmPassword && (
            <span style={errorStyle}>{errors.confirmPassword}</span>
          )}
        </div>

        <div style={buttonRow}>
          <button style={backBtn} onClick={() => navigate('/register/step-2')}>&lt; Back</button>
          <button style={primaryBtn} onClick={handleRegister}>Register</button>
        </div>
      </div>
    </RegisterLayout>
  );
};

const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' };
const dotStyle = { height: '8px', width: '8px', backgroundColor: '#4ade80', borderRadius: '50%' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#444' };
const inputStyle = { padding: '12px', paddingRight: '45px', borderRadius: '10px', border: '1px solid #ddd', width: '100%', transition: 'border-color 0.2s ease' };
const passwordInputWrapper = { position: 'relative', display: 'flex', alignItems: 'center' };
const eyeButton = { position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' };
const primaryBtn = { padding: '12px 28px', backgroundColor: '#0056A2', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' };
const backBtn = { padding: '12px 20px', background: 'transparent', border: 'none', color: '#333', cursor: 'pointer' };
const buttonRow = { display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '30px', alignItems: 'center' };
const errorStyle = { color: '#e53e3e', fontSize: '12px', marginTop: '2px' };
const strengthWrapper = { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' };
const strengthBarBackground = { flex: 1, height: '6px', backgroundColor: '#eee', borderRadius: '3px', overflow: 'hidden' };
const strengthBarFill = { height: '100%', transition: 'width 0.3s ease, background-color 0.3s ease' };
const strengthLabel = { fontSize: '12px', fontWeight: '600', minWidth: '50px', textAlign: 'right' };

export default RegisterStep3;