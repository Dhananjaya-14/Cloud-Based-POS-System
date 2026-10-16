import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../layout/header';

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
<<<<<<< HEAD
    <div style={outerContainer}>
      <Header variant="register" />
      <div style={mainContentWrapper}>
        <div style={contentInner}>
=======
    <div className="register-outer-container" style={outerContainer}>
      <Header />
      <div className="register-main-wrapper" style={mainContentWrapper}>
        <div className="register-content-inner" style={contentInner}>
>>>>>>> 01459dcbd45248d48fd6e61ada7dfe101f7cc90e
          {/* Left Side: Gradient Panel */}
          <div className="register-left-gradient" style={leftGradient}>
            <h1 className="register-gradient-title" style={{ fontSize: '3.2rem', fontWeight: '700', marginBottom: '10px' }}>Welcome</h1>
            <p style={{ fontSize: '1rem', opacity: 0.9 }}>Enter your details to get started.</p>

            <div className="register-pills-container" style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <span className="register-pill" style={pillStyle}>🔒 Secure Login</span>
              <span className="register-pill" style={pillStyle}>⚡ Fast Access</span>
              <span className="register-pill" style={pillStyle}>🛡️ Easy to Use</span>
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

            <div className="register-social-row" style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '15px' }}>
              <div style={socialCircle}>📧</div>
              <div style={socialCircle}>f</div>
              <div style={socialCircle}>💬</div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="register-form-card" style={rightFormCard}>
            <div className="register-form-inner" style={{ width: '100%', maxWidth: '420px' }}>
              {children}
              <p className="register-mobile-signin" style={{ marginTop: '20px', fontSize: '13px', color: '#666', textAlign: 'center', display: 'none' }}>
                Already have an Account?{' '}
                <span
                  onClick={() => navigate('/')}
                  style={{ color: '#0056A2', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Sign In
                </span>
              </p>
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








