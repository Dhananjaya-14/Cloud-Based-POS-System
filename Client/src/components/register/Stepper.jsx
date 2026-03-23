import React from 'react';

const Stepper = ({ currentStep }) => {
  const steps = ['Profile', 'Account', 'Verification'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', width: '100%' }}>
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isActive = currentStep >= stepNum;
        const isCompleted = currentStep > stepNum;

        return (
          <React.Fragment key={stepNum}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: isActive ? '#0056A2' : '#e0e0e0',
                color: isActive ? 'white' : '#999',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', border: isActive ? 'none' : '2px solid #ccc'
              }}>
                {isCompleted ? '✓' : stepNum}
              </div>
              <span style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>{label}</span>
            </div>
            {index < steps.length - 1 && (
              <div style={{
                width: '50px', height: '2px', backgroundColor: isCompleted ? '#0056A2' : '#e0e0e0',
                margin: '0 10px', marginBottom: '20px'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;