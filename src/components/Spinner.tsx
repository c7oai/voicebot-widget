import React from 'react';

export const Spinner = () => {
  const spinnerStyle = {
    width: '25px',
    height: '25px',
    border: '5px solid transparent',
    borderTop: '5px solid white',
    borderRadius: '50%',
    opacity: 1,
    animation: 'spin 1s linear infinite',
  };

  return (<>
        <style>{keyframes}</style>
        <div style={spinnerStyle} />
    </>
  );
};

const keyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
