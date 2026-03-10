import React from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterLayout from '../components/register/RegisterLayout';
import Stepper from '../components/register/Stepper';

const RegisterStep1 = () => {
  const navigate = useNavigate();

  return (
    <RegisterLayout>
      <div style={{ textAlign: 'center' }}>
        <div style={badgeStyle}><span style={dotStyle}></span>Hotel POS</div>
        <h2 style={{ fontSize: '28px', margin: '10px 0' }}>Create Your Account</h2>
        <p style={{ color: '#888' }}>Join thousands of users who trust our platform</p>

        {/* STEPPER PLACED HERE */}
        <div style={{ margin: '40px 0' }}>
          <Stepper currentStep={1} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', textAlign: 'left' }}>
          <div style={inputGroup}>
            <label style={labelStyle}>Business Name</label>
            <input style={inputStyle} placeholder="Enter name" />
          </div>
          <div style={inputGroup}>
            <label style={labelStyle}>Business Type</label>
            <select style={inputStyle}><option>Hotel</option></select>
          </div>
        </div>
        <div style={{ ...inputGroup, textAlign: 'left', marginTop: '20px' }}>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} placeholder="Enter your business email" />
        </div>
        <button style={primaryBtn} onClick={() => navigate('/register/step-2')}>Continue</button>
      </div>
    </RegisterLayout>
  );
};

const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#0056A2', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' };
const dotStyle = { height: '8px', width: '8px', backgroundColor: '#4ade80', borderRadius: '50%' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#444' };
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #ddd' };
const primaryBtn = { width: '100%', padding: '15px', backgroundColor: '#0056A2', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginTop: '30px', cursor: 'pointer' };

export default RegisterStep1;




