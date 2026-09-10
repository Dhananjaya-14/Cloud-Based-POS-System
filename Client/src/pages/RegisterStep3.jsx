import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterLayout from '../components/register/RegisterLayout';
import Stepper from '../components/register/Stepper';

const RegisterStep3 = () => {
  const navigate = useNavigate();

  // Step 3 has two phases:
  // 'password' -> user sets password
  // 'verification' -> user verifies email with OTP
  const [phase, setPhase] = useState('password');

  // Password phase state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Verification phase state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpSentTo, setOtpSentTo] = useState('');
  const otpInputsRef = useRef([]);

  // Pull email from step 1 (if available)
  useEffect(() => {
    try {
      const step1 = sessionStorage.getItem('registerStep1');
      if (step1) {
        const parsed = JSON.parse(step1);
        if (parsed?.email) setOtpSentTo(parsed.email);
      }
    } catch {
      // ignore
    }
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => {
      setResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  /* -------------------- PASSWORD PHASE -------------------- */

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

  const validatePasswordForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key], formData);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    setTouched({ password: true, confirmPassword: true });
    return Object.keys(newErrors).length === 0;
  };

  const getInputStyle = (fieldName) => ({
    ...inputStyle,
    borderColor: touched[fieldName] && errors[fieldName] ? '#e53e3e' : '#ddd',
    outline: 'none',
  });

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

  /* -------------------- VERIFICATION PHASE -------------------- */

  const sendOtp = async () => {
    setOtpError('');
    setOtpSuccess('');
    setIsSendingOtp(true);

    try {
      // Replace with real API call, e.g.:
      // await fetch('/api/auth/send-otp', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: otpSentTo }),
      // });

      // Mock delay
      await new Promise((r) => setTimeout(r, 800));

      setOtpSuccess(`A 6-digit verification code has been sent to ${otpSentTo || 'your email'}.`);
      setResendTimer(30);
      // Focus first OTP input
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err) {
      setOtpError('Failed to send verification code. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index, value) => {
    // Accept only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);
    setOtpError('');

    // Auto-advance
    if (digit && index < otp.length - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < otp.length - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) updated[i] = pasted[i];
    setOtp(updated);
    setOtpError('');
    const lastIndex = Math.min(pasted.length, otp.length - 1);
    otpInputsRef.current[lastIndex]?.focus();
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the complete 6-digit code.');
      return;
    }

    setOtpError('');
    setIsVerifying(true);

    try {
      // Replace with real API call, e.g.:
      // const res = await fetch('/api/auth/verify-otp', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: otpSentTo, otp: code }),
      // });
      // if (!res.ok) throw new Error('Invalid code');

      // Mock verification (any 6-digit code other than 000000 passes)
      await new Promise((r) => setTimeout(r, 900));
      if (code === '000000') {
        throw new Error('Invalid code');
      }

      // Persist step 3 data on success
      const existing = sessionStorage.getItem('registerStep3');
      const parsed = existing ? JSON.parse(existing) : {};
      sessionStorage.setItem(
        'registerStep3',
        JSON.stringify({ ...parsed, ...formData, emailVerified: true })
      );

      navigate('/login');
    } catch (err) {
      setOtpError('Invalid or expired verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProceedToVerification = async () => {
    if (!validatePasswordForm()) return;

    // Persist password data (still unverified)
    const existing = sessionStorage.getItem('registerStep3');
    const parsed = existing ? JSON.parse(existing) : {};
    sessionStorage.setItem(
      'registerStep3',
      JSON.stringify({ ...parsed, ...formData, emailVerified: false })
    );

    setPhase('verification');
    await sendOtp();
  };

  const handleBack = () => {
    if (phase === 'verification') {
      setPhase('password');
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setOtpSuccess('');
      return;
    }
    navigate('/register/step-2');
  };

  /* -------------------- RENDER -------------------- */

  return (
    <RegisterLayout>
      <div style={{ textAlign: 'center' }}>
        <div style={badgeStyle}><span style={dotStyle}></span>Hotel POS</div>
        <h2 style={{ fontSize: '28px', margin: '10px 0' }}>Create Your Account</h2>
        <p style={{ color: '#888' }}>Join thousands of users who trust our platform</p>

        <div style={{ margin: '40px 0' }}>
          <Stepper currentStep={3} />
        </div>

        {phase === 'password' ? (
          <>
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
              <button style={backBtn} onClick={handleBack}>&lt; Back</button>
              <button style={primaryBtn} onClick={handleProceedToVerification}>
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>
              Enter the 6-digit code sent to{' '}
              <strong>{otpSentTo || 'your email'}</strong> to verify your account.
            </p>

            <div style={otpWrapper} onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputsRef.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  style={{
                    ...otpInputStyle,
                    borderColor: otpError ? '#e53e3e' : '#ddd',
                  }}
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>

            {otpSuccess && !otpError && (
              <span style={successStyle}>{otpSuccess}</span>
            )}
            {otpError && <span style={errorStyle}>{otpError}</span>}

            <div style={resendRow}>
              <span style={{ fontSize: '13px', color: '#666' }}>
                Didn&apos;t receive the code?
              </span>
              <button
                type="button"
                onClick={sendOtp}
                disabled={isSendingOtp || resendTimer > 0}
                style={{
                  ...linkButton,
                  opacity: isSendingOtp || resendTimer > 0 ? 0.5 : 1,
                  cursor: isSendingOtp || resendTimer > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isSendingOtp
                  ? 'Sending...'
                  : resendTimer > 0
                  ? `Resend in ${resendTimer}s`
                  : 'Resend code'}
              </button>
            </div>

            <div style={buttonRow}>
              <button style={backBtn} onClick={handleBack} disabled={isVerifying}>
                &lt; Back
              </button>
              <button
                style={{
                  ...primaryBtn,
                  opacity: isVerifying ? 0.7 : 1,
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                }}
                onClick={verifyOtp}
                disabled={isVerifying}
              >
                {isVerifying ? 'Verifying...' : 'Verify & Register'}
              </button>
            </div>
          </>
        )}
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
const errorStyle = { color: '#e53e3e', fontSize: '12px', marginTop: '6px', display: 'block' };
const successStyle = { color: '#22c55e', fontSize: '12px', marginTop: '6px', display: 'block' };
const strengthWrapper = { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' };
const strengthBarBackground = { flex: 1, height: '6px', backgroundColor: '#eee', borderRadius: '3px', overflow: 'hidden' };
const strengthBarFill = { height: '100%', transition: 'width 0.3s ease, background-color 0.3s ease' };
const strengthLabel = { fontSize: '12px', fontWeight: '600', minWidth: '50px', textAlign: 'right' };
const otpWrapper = { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '24px', marginBottom: '8px' };
const otpInputStyle = { width: '52px', height: '58px', textAlign: 'center', fontSize: '22px', fontWeight: '600', borderRadius: '10px', border: '1px solid #ddd', outline: 'none', transition: 'border-color 0.2s ease' };
const resendRow = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '14px' };
const linkButton = { background: 'none', border: 'none', color: '#0056A2', fontWeight: '600', fontSize: '13px', padding: 0 };

export default RegisterStep3;