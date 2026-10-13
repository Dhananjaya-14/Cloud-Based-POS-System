import React from 'react';
import Header from './Header';

const LoginLayout = ({ children }) => {
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

  const leftFormCard = {
    flex: 1.1,
    backgroundColor: 'white',
    padding: '50px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflowY: 'auto'
  };

  const rightGradient = {
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

  return (
    <div className="login-outer-container" style={outerContainer}>
      <Header />
      <div className="login-main-wrapper" style={mainContentWrapper}>
        <div className="login-content-inner" style={contentInner}>
          {/* Left Side: Form */}
          <div className="login-form-card" style={leftFormCard}>
            <div className="login-form-inner" style={{ width: '100%', maxWidth: '420px' }}>
              {children}
            </div>
          </div>

          {/* Right Side: Gradient Panel */}
          <div className="login-right-gradient" style={rightGradient}>
            <h1 className="login-gradient-title" style={{ fontSize: '3rem', marginBottom: '10px' }}>Welcome Back.</h1>
            <p style={{ fontSize: '1rem', opacity: 0.9 }}>To the Management System, </p>
            <p style={{ fontSize: '1rem', opacity: 0.9 }}>Please log in.</p>

            <div className="login-pills-container" style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <span className="login-pill" style={pillStyle}>🔒 Secure Login</span>
              <span className="login-pill" style={pillStyle}>⚡ Fast Access</span>
              <span className="login-pill" style={pillStyle}>🛡️ Easy to Use</span>
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
  width: '35px',
  height: '35px',
  backgroundColor: 'white',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#0072ff',
  fontSize: '18px',
  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
};

export default LoginLayout;
