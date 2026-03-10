import React, { useState, useEffect } from 'react';

const Header = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 40px',
    background: 'linear-gradient(135deg, #0056A2 0%, #0056A2 50%, #50B748 100%)',
    color: 'white',
    fontSize: '12px',
    fontFamily: 'sans-serif'
  };

  return (
    <header style={headerStyle}>
      <div style={{ fontWeight: 'bold', fontSize: '18px' }}>pos</div>
      <div style={{ display: 'flex', gap: '15px' }}>
        <span>{formatDate(time)}</span> | 
        <span>{formatTime(time)}</span> | 
        <span>SIN</span> | 
        <span>EN</span> | 
        <span style={{ cursor: 'pointer' }}>Help</span>
      </div>
    </header>
  );
};

export default Header;