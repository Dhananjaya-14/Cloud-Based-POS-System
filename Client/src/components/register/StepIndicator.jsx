const StepIndicator = ({ currentStep, totalSteps = 3 }) => {
  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      marginBottom: '28px',
    },
    stepWrapper: {
      display: 'flex',
      alignItems: 'center',
    },
    circle: (isActive, isCompleted) => ({
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '700',
      border: isActive ? 'none' : isCompleted ? 'none' : '2px solid #d1d5db',
      background: isCompleted ? '#1a7abf' : isActive ? '#1a7abf' : '#fff',
      color: isCompleted || isActive ? '#fff' : '#9ca3af',
      position: 'relative',
      zIndex: 1,
      transition: 'all 0.3s ease',
    }),
    connector: (isCompleted) => ({
      height: '2px',
      width: '60px',
      background: isCompleted ? '#1a7abf' : '#e5e7eb',
      transition: 'background 0.3s ease',
    }),
    checkmark: {
      fontSize: '16px',
    },
  };

  return (
    <div style={styles.container}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        return (
          <div key={step} style={styles.stepWrapper}>
            <div style={styles.circle(isActive, isCompleted)}>
              {isCompleted ? <span style={styles.checkmark}>✓</span> : step}
            </div>
            {step < totalSteps && (
              <div style={styles.connector(isCompleted)} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;