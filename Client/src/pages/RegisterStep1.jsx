import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterLayout from '../components/register/RegisterLayout';
import Stepper from '../components/register/Stepper';

const RegisterStep1 = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    email: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'businessName':
        if (!value.trim()) {
          error = 'Business name is required';
        } else if (value.trim().length < 2) {
          error = 'Business name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          error = 'Business name must not exceed 100 characters';
        } else if (!/^[a-zA-Z0-9\s&'.,-]+$/.test(value.trim())) {
          error = 'Business name contains invalid characters';
        }
        break;

      case 'businessType':
        if (!value) {
          error = 'Please select a business type';
        }
        break;

      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          error = 'Please enter a valid email address';
        } else if (value.trim().length > 254) {
          error = 'Email must not exceed 254 characters';
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
    setTouched({ businessName: true, businessType: true, email: true });
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      // Optionally persist to sessionStorage/localStorage for later steps
      sessionStorage.setItem('registerStep1', JSON.stringify(formData));
      navigate('/register/step-2');
    }
  };

  const getInputStyle = (fieldName) => ({
    ...inputStyle,
    borderColor: touched[fieldName] && errors[fieldName] ? '#e53e3e' : '#ddd',
    outline: 'none',
  });

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
            <input
              name="businessName"
              style={getInputStyle('businessName')}
              placeholder="Enter name"
              value={formData.businessName}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={100}
            />
            {touched.businessName && errors.businessName && (
              <span style={errorStyle}>{errors.businessName}</span>
            )}
          </div>
          <div style={inputGroup}>
            <label style={labelStyle}>Business Type</label>
            <select
              name="businessType"
              style={getInputStyle('businessType')}
              value={formData.businessType}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <option value="">Select type</option>
              <option value="Hotel">Hotel</option>
              <option value="Bar">Bar</option>
              <option value="Restaurant">Restaurant</option>
            </select>
            {touched.businessType && errors.businessType && (
              <span style={errorStyle}>{errors.businessType}</span>
            )}
          </div>
        </div>
        <div style={{ ...inputGroup, textAlign: 'left', marginTop: '20px' }}>
          <label style={labelStyle}>Email</label>
          <input
            name="email"
            type="email"
            style={getInputStyle('email')}
            placeholder="Enter your business email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={254}
          />
          {touched.email && errors.email && (
            <span style={errorStyle}>{errors.email}</span>
          )}
        </div>
        <button style={primaryBtn} onClick={handleContinue}>Continue</button>
      </div>
    </RegisterLayout>
  );
};

const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 100%)', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' };
const dotStyle = { height: '8px', width: '8px', backgroundColor: '#4ade80', borderRadius: '50%' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#444' };
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #ddd', transition: 'border-color 0.2s ease' };
const primaryBtn = { width: '100%', padding: '15px', backgroundColor: '#0056A2', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginTop: '30px', cursor: 'pointer' };
const errorStyle = { color: '#e53e3e', fontSize: '12px', marginTop: '2px' };

export default RegisterStep1;