import { useState } from 'react';

const FormInput = ({ label, type = 'text', placeholder = '', value, onChange, showToggle = false }) => {
  const [showPassword, setShowPassword] = useState(false);

  const styles = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: '16px',
    },
    label: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '6px',
    },
    inputRow: {
      display: 'flex',
      alignItems: 'center',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '10px 12px',
      background: '#f9fafb',
      transition: 'border-color 0.2s',
    },
    input: {
      flex: 1,
      border: 'none',
      background: 'transparent',
      outline: 'none',
      fontSize: '13px',
      color: '#111827',
    },
    toggle: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      color: '#9ca3af',
      padding: '0',
    },
  };

  const inputType = showToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div style={styles.wrapper}>
      {label && <label style={styles.label}>{label}</label>}
      <div style={styles.inputRow}>
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={styles.input}
        />
        {showToggle && (
          <button style={styles.toggle} onClick={() => setShowPassword(!showPassword)} type="button">
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>
    </div>
  );
};

export default FormInput;