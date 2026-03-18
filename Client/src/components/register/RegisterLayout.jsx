import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

const RegisterLayout = ({ children, disableScroll = false }) => {
  const navigate = useNavigate();

  const outerContainer = {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#EBF1F7',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    overflow: 'hidden'
  };

  const mainContentWrapper = {
    display: 'flex',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  };

  const contentInner = {
    display: 'flex',
    width: '100%',
    maxWidth: '1100px',
    height: '89vh',
    backgroundColor: 'white',
    borderRadius: '30px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  };

  const leftGradient = {
    flex: 0.9,
    background: 'linear-gradient(135deg, #00B4EB 0%, #0056A2 50%, #50B748 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    padding: '40px',
    position: 'relative',
  };

  const rightFormCard = {
    flex: 1.1,
    backgroundColor: 'white',
    padding: '50px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflowY: disableScroll ? 'hidden' : 'auto'
  };

  return (
    <div style={outerContainer}>
      <Header />
      <div style={mainContentWrapper}>
        <div style={contentInner}>
          {/* Left Side: Gradient Panel */}
          <div style={leftGradient}>
            <h1 style={{ fontSize: '3.2rem', fontWeight: '700', marginBottom: '10px' }}>Welcome</h1>
            <p style={{ fontSize: '1rem', opacity: 0.9 }}>Enter your details to get started.</p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <span style={pillStyle}>🔒 Secure Login</span>
              <span style={pillStyle}>⚡ Fast Access</span>
              <span style={pillStyle}>🛡️ Easy to Use</span>
            </div>

            <p style={{ marginTop: '40px', fontSize: '13px' }}>
              Already have an Account?{' '}
              <span
                onClick={() => navigate('/')}
                style={{ textDecoration: 'underline', cursor: 'pointer' }}
              >
                Sign In
              </span>
            </p>

            <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '15px' }}>
              <div style={socialCircle}>📧</div>
              <div style={socialCircle}>f</div>
              <div style={socialCircle}>💬</div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div style={rightFormCard}>
            <div style={{ width: '100%', maxWidth: '420px' }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const pillStyle = {
  padding: '6px 12px',
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderRadius: '20px',
  fontSize: '11px',
  border: '1px solid rgba(255,255,255,0.3)'
};

const socialCircle = {
  width: '38px',
  height: '38px',
  backgroundColor: 'white',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#0072ff',
  fontSize: '18px',
  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
  cursor: 'pointer'
};

export default RegisterLayout;








