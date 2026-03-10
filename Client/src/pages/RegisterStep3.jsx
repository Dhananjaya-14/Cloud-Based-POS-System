import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterLayout from '../components/register/RegisterLayout';
import Stepper from '../components/register/Stepper';

const RegisterStep3 = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
              type={showPassword ? 'text' : 'password'}
              style={inputStyle} 
              placeholder="● ● ● ● ● ●" 
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeButton}
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
        </div>

        <div style={{ ...inputGroup, textAlign: 'left', marginTop: '16px' }}>
          <label style={labelStyle}>Confirm Password</label>
          <div style={passwordInputWrapper}>
            <input 
              type={showConfirmPassword ? 'text' : 'password'}
              style={inputStyle} 
              placeholder="● ● ● ● ● ●" 
            />
            <button 
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={eyeButton}
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
        </div>

        <div style={buttonRow}>
          <button style={backBtn} onClick={() => navigate('/register/step-2')}>&lt; Back</button>
          <button style={primaryBtn} onClick={() => navigate('/login')}>Register</button>
        </div>
      </div>
    </RegisterLayout>
  );
};

const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' };
const dotStyle = { height: '8px', width: '8px', backgroundColor: '#4ade80', borderRadius: '50%' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#444' };
const inputStyle = { padding: '12px', paddingRight: '45px', borderRadius: '10px', border: '1px solid #ddd', width: '100%' };
const passwordInputWrapper = { position: 'relative', display: 'flex', alignItems: 'center' };
const eyeButton = { position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' };
const primaryBtn = { padding: '12px 28px', backgroundColor: '#0056A2', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' };
const backBtn = { padding: '12px 20px', background: 'transparent', border: 'none', color: '#333', cursor: 'pointer' };
const buttonRow = { display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '30px', alignItems: 'center' };

export default RegisterStep3;
