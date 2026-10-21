import React from 'react';

interface LogoProps {
  className?: string;
  light?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', light = false, size = 'md' }) => {
  const sizes = {
    sm: { width: 90, padding: '8px 14px' },
    md: { width: 120, padding: '12px 18px' },
    lg: { width: 160, padding: '18px 26px' },
  };

  const config = sizes[size];

  if (light) {
    return (
      <div 
        className={`inline-flex items-center justify-center select-none ${className}`}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: config.padding,
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src="/logo.png"
            alt="Aalterpaint"
            style={{
              width: `${config.width}px`,
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <img
        src="/logo.png"
        alt="Aalterpaint"
        style={{
          width: `${config.width}px`,
          height: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};
