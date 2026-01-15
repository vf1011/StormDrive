import React, { useEffect } from 'react';

const Logo = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://db.onlinewebfonts.com/c/479db221f0230d8e10c5bf8c95695c7c?family=Magistral+W01+Bold';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);
  return (
    <h1
      style={{
        fontFamily: '"Magistral W01 Bold", sans-serif',
        fontSize: '1.5rem',
        fontWeight: 900, // Stronger bold
        letterSpacing: '0.1em',
        margin: '0',
        padding: '0',
        lineHeight: '1.2',
        color:'var(--text-primary)',
      }}
    >
      STORMDRIVE
    </h1>
  );
}

export default Logo;
