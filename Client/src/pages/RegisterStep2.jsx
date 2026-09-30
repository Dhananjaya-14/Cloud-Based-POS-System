import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterLayout from '../components/register/RegisterLayout';
import Stepper from '../components/register/Stepper';

const RegisterStep2 = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    contactNumber: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    let error = '';
    const trimmed = value.trim();

    switch (name) {
      case 'firstName':
        if (!trimmed) {
          error = 'First name is required';
        } else if (trimmed.length < 2) {
          error = 'First name must be at least 2 characters';
        } else if (trimmed.length > 50) {
          error = 'First name must not exceed 50 characters';
        } else if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
          error = 'First name can only contain letters, spaces, hyphens, and apostrophes';
        }
        break;

      case 'lastName':
        if (!trimmed) {
          error = 'Last name is required';
        } else if (trimmed.length < 2) {
          error = 'Last name must be at least 2 characters';
        } else if (trimmed.length > 50) {
          error = 'Last name must not exceed 50 characters';
        } else if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
          error = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
        }
        break;

      case 'address':
        if (!trimmed) {
          error = 'Address is required';
        } else if (trimmed.length < 5) {
          error = 'Address must be at least 5 characters';
        } else if (trimmed.length > 200) {
          error = 'Address must not exceed 200 characters';
        }
        break;

      case 'contactNumber':
        if (!trimmed) {
          error = 'Contact number is required';
        } else if (!/^[+]?[\d\s()-]{7,20}$/.test(trimmed)) {
          error = 'Please enter a valid phone number (7-20 digits)';
        } else {
          const digitsOnly = trimmed.replace(/\D/g, '');
          if (digitsOnly.length < 7) {
            error = 'Phone number must have at least 7 digits';
          } else if (digitsOnly.length > 15) {
            error = 'Phone number must not exceed 15 digits';
          }
        }
        break;

      default:
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    setTouched({
      firstName: true,
      lastName: true,
      address: true,
      contactNumber: true,
    });
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      // Merge with step 1 data if present
      const existing = sessionStorage.getItem('registerStep2');
      const parsed = existing ? JSON.parse(existing) : {};
      sessionStorage.setItem('registerStep2', JSON.stringify({ ...parsed, ...formData }));
      navigate('/register/step-3');
    }
  };

  const getInputStyle = (fieldName) => ({
    ...inputStyle,
    borderColor: touched[fieldName] && errors[fieldName] ? '#e53e3e' : '#ddd',
    outline: 'none',
  });

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
            <input
              name="firstName"
              style={getInputStyle('firstName')}
              placeholder="First name"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={50}
            />
            {touched.firstName && errors.firstName && (
              <span style={errorStyle}>{errors.firstName}</span>
            )}
          </div>
          <div style={inputGroup}>
            <label style={labelStyle}>Last Name</label>
            <input
              name="lastName"
              style={getInputStyle('lastName')}
              placeholder="Last name"
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={50}
            />
            {touched.lastName && errors.lastName && (
              <span style={errorStyle}>{errors.lastName}</span>
            )}
          </div>
        </div>

        <div style={{ ...inputGroup, textAlign: 'left', marginTop: '16px' }}>
          <label style={labelStyle}>Address</label>
          <input
            name="address"
            style={getInputStyle('address')}
            placeholder="Enter your address"
            value={formData.address}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={200}
          />
          {touched.address && errors.address && (
            <span style={errorStyle}>{errors.address}</span>
          )}
        </div>

        <div style={{ ...inputGroup, textAlign: 'left', marginTop: '16px' }}>
          <label style={labelStyle}>Contact Number</label>
          <input
            name="contactNumber"
            type="tel"
            style={getInputStyle('contactNumber')}
            placeholder="Phone number"
            value={formData.contactNumber}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={20}
          />
          {touched.contactNumber && errors.contactNumber && (
            <span style={errorStyle}>{errors.contactNumber}</span>
          )}
        </div>

        <div style={buttonRow}>
          <button style={backBtn} onClick={() => navigate('/register/step-1')}>&lt; Back</button>
          <button style={primaryBtn} onClick={handleContinue}>Continue</button>
        </div>
      </div>
    </RegisterLayout>
  );
};

const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' };const dotStyle = { height: '8px', width: '8px', backgroundColor: '#4ade80', borderRadius: '50%' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#444' };
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #ddd', transition: 'border-color 0.2s ease' };
const primaryBtn = { padding: '12px 28px', backgroundColor: '#0056A2', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' };
const backBtn = { padding: '12px 20px', background: 'transparent', border: 'none', color: '#333', cursor: 'pointer' };
const buttonRow = { display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '12px', alignItems: 'center' };
const errorStyle = { color: '#e53e3e', fontSize: '12px', marginTop: '2px' };

export default RegisterStep2;