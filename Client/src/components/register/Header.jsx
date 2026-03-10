import React, { useState, useEffect } from 'react';
import { Home, Calendar, Clock, HelpCircle } from 'lucide-react';

const Header = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const wrapper = { width: '100%' };
  const bar = {
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    background: 'linear-gradient(90deg, #0056A2 0%, #00B4EB 50%, #50B748 100%)',
    color: 'white',
    fontSize: '12px',
    boxSizing: 'border-box'
  };

  const left = { display: 'flex', alignItems: 'center', gap: '10px' };
  const logoBox = { width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const posText = { fontWeight: 700, letterSpacing: '0.3px' };

  const right = { display: 'flex', alignItems: 'center', gap: '14px', color: '#fff', opacity: 0.95 };
  const item = { display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' };
  const clickable = { cursor: 'pointer', color: '#fff' };

  return (
    <div style={wrapper}>
      <div style={bar}>
        <div style={left}>
          <div style={logoBox}><Home size={16} /></div>
          <div style={posText}>pos</div>
        </div>

        <div style={right}>
          <div style={item}><Calendar size={14} /> <span>{formatDate(now)}</span></div>
          <div style={item}><Clock size={14} /> <span>{formatTime(now)}</span></div>
          <div style={item}><span style={{ fontSize: '12px' }}>EN</span></div>
          <div style={item}><span style={{ fontSize: '12px' }}>SIN</span></div>
          <div style={item}><span style={clickable}><HelpCircle size={14} /></span></div>
        </div>
      </div>
    </div>
  );
};

export default Header;