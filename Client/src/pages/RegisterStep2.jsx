import React from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterLayout from '../components/register/RegisterLayout';
import Stepper from '../components/register/Stepper';

const RegisterStep2 = () => {
  const navigate = useNavigate();

  return (
    <RegisterLayout disableScroll={true}>
      <div style={{ textAlign: 'center' }}>
        <div style={badgeStyle}><span style={dotStyle}></span>Hotel POS</div>
        <h2 style={{ fontSize: '28px', margin: '10px 0' }}>Create Your Account</h2>
        <p style={{ color: '#888' }}>Join thousands of users who trust our platform</p>

        <div style={{ margin: '40px 0' }}>
          <Stepper currentStep={2} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'left' }}>
          <div style={inputGroup}>
            <label style={labelStyle}>First Name</label>
            <input style={inputStyle} placeholder="First name" />
          </div>
          <div style={inputGroup}>
            <label style={labelStyle}>Last Name</label>
            <input style={inputStyle} placeholder="Last name" />
          </div>
        </div>

        <div style={{ ...inputGroup, textAlign: 'left', marginTop: '16px' }}>
          <label style={labelStyle}>Address</label>
          <input style={inputStyle} placeholder="Enter your address" />
        </div>

        <div style={{ ...inputGroup, textAlign: 'left', marginTop: '16px' }}>
          <label style={labelStyle}>Contact Number</label>
          <input style={inputStyle} placeholder="Phone number" />
        </div>

        <div style={buttonRow}>
          <button style={backBtn} onClick={() => navigate('/register/step-1')}>&lt; Back</button>
          <button style={primaryBtn} onClick={() => navigate('/register/step-3')}>Continue</button>
        </div>
      </div>
    </RegisterLayout>
  );
};

const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' };const dotStyle = { height: '8px', width: '8px', backgroundColor: '#4ade80', borderRadius: '50%' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#444' };
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #ddd' };
const primaryBtn = { padding: '12px 28px', backgroundColor: '#0056A2', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' };
const backBtn = { padding: '12px 20px', background: 'transparent', border: 'none', color: '#333', cursor: 'pointer' };
const buttonRow = { display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '12px', alignItems: 'center' };

export default RegisterStep2;
