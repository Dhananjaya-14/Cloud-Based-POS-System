import React from 'react';
import Header from './Header';

const RegisterLayout = ({ children }) => {
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
    // REMOVED GAP HERE to join the containers
    backgroundColor: 'white', // Ensures the whole card looks unified
    borderRadius: '30px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
    overflow: 'hidden' // This clips the children to the card's rounded corners
  };

  const leftSidebar = {
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
    overflowY: 'auto'
  };

  return (
    <div style={outerContainer}>
      <Header />
      <div style={mainContentWrapper}>
        <div style={contentInner}>
          {/* Left Side: Gradient Section */}
          <div style={leftSidebar}>
            <h1 style={{ fontSize: '3.2rem', marginBottom: '10px' }}>Welcome</h1>
            <p style={{ fontSize: '1rem', opacity: 0.9 }}>Enter your details to get started.</p>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <span style={pillStyle}>🔒 Secure Login</span>
              <span style={pillStyle}>⚡ Fast Access</span>
              <span style={pillStyle}>🛡️ Easy to Use</span>
            </div>

            <p style={{ marginTop: '40px', fontSize: '13px' }}>
                Already have an Account? <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Sign In</span>
            </p>

            <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '15px' }}>
               <div style={socialCircle}>📧</div>
               <div style={socialCircle}>f</div>
               <div style={socialCircle}>💬</div>
            </div>
          </div>

          {/* Right Side: Form Section */}
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

export default RegisterLayout;








