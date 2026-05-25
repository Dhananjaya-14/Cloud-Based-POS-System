const WelcomePanel = () => {
  const styles = {
    panel: {
      background: 'linear-gradient(135deg, #1a9e6e 0%, #1a7abf 50%, #2563eb 100%)',
      width: '40%',
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 30px',
      color: '#fff',
      position: 'relative',
      borderRadius: '12px 0 0 12px',
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '12px',
      textAlign: 'center',
      fontFamily: "'Segoe UI', sans-serif",
    },
    subtitle: {
      fontSize: '13px',
      opacity: 0.85,
      textAlign: 'center',
      marginBottom: '36px',
      lineHeight: '1.5',
    },
    buttonsRow: {
      display: 'flex',
      gap: '10px',
      marginBottom: '40px',
    },
    btn: {
      padding: '8px 16px',
      borderRadius: '20px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
    },
    btnPrimary: {
      background: '#fff',
      color: '#1a7abf',
    },
    btnOutline: {
      background: 'transparent',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.5)',
    },
    dotsRow: {
      display: 'flex',
      gap: '8px',
      marginTop: 'auto',
    },
    dot: {
      width: '28px',
      height: '8px',
      borderRadius: '4px',
      background: 'rgba(255,255,255,0.4)',
    },
    dotActive: {
      background: '#fff',
    },
    legalText: {
      fontSize: '10px',
      opacity: 0.6,
      marginTop: '14px',
      textAlign: 'center',
    },
  };

  return (
    <div style={styles.panel}>
      <h1 style={styles.title}>Welcome</h1>
      <p style={styles.subtitle}>Enter your details to get started</p>
      <div style={styles.buttonsRow}>
        <button style={{ ...styles.btn, ...styles.btnPrimary }}>Find a Shop</button>
        <button style={{ ...styles.btn, ...styles.btnOutline }}>Franchises</button>
        <button style={{ ...styles.btn, ...styles.btnOutline }}>Inquiries</button>
      </div>
      <div style={styles.dotsRow}>
        <div style={{ ...styles.dot, ...styles.dotActive }} />
        <div style={styles.dot} />
        <div style={styles.dot} />
      </div>
      <p style={styles.legalText}>Already have an account? <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Sign in</span></p>
    </div>
  );
};

export default WelcomePanel;