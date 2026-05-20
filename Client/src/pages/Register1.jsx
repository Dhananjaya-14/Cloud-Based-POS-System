import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterLayout from '../components/register/RegisterLayout';
import StepIndicator from '../components/register/StepIndicator';
import FormInput from '../components/register/FormInput';

const Register1 = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ businessName: '', businessType: '', email: '' });

  const handle = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const styles = {
    title: { fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '6px' },
    subtitle: { fontSize: '13px', color: '#6b7280', marginBottom: '28px' },
    row: { display: 'flex', gap: '14px' },
    halfInput: { flex: 1 },
    continueBtn: {
      width: '100%',
      padding: '12px',
      background: 'linear-gradient(90deg, #1a9e6e, #1a7abf)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '8px',
      letterSpacing: '0.3px',
    },
  };

  return (
    <RegisterLayout>
      <StepIndicator currentStep={1} />
      <h2 style={styles.title}>Create Your Account</h2>
      <p style={styles.subtitle}>Please fill out the details below to get started</p>

      <div style={styles.row}>
        <div style={styles.halfInput}>
          <FormInput label="Business Name" placeholder="Business name" value={form.businessName} onChange={handle('businessName')} />
        </div>
        <div style={styles.halfInput}>
          <FormInput label="Business Type" placeholder="Business type" value={form.businessType} onChange={handle('businessType')} />
        </div>
      </div>

      <FormInput label="Email" placeholder="Email address" type="email" value={form.email} onChange={handle('email')} />

      <button style={styles.continueBtn} onClick={() => navigate('/register/2')}>Continue</button>
    </RegisterLayout>
  );
};

export default Register1;