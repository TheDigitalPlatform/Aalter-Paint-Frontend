import React from 'react';

export type Language = 'EN' | 'NL' | 'GB';

interface LanguageToggleProps {
  language: Language;
  onChange: (lang: Language) => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ language, onChange }) => {
  const isEn = language === 'EN' || language === 'GB';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#242424',
        borderRadius: '8px',
        padding: '3px',
        boxSizing: 'border-box',
        height: '36px',
        userSelect: 'none',
      }}
    >
      <button
        type="button"
        onClick={() => onChange('EN')}
        style={{
          border: 0,
          cursor: 'pointer',
          width: '30px',
          height: '30px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: "'Archivo', system-ui, sans-serif",
          lineHeight: 1,
          background: isEn ? '#E20714' : 'transparent',
          color: isEn ? '#FFFFFF' : '#8E8E93',
          transition: 'background-color 0.2s ease, color 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        aria-label="Switch to English"
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => onChange('NL')}
        style={{
          border: 0,
          cursor: 'pointer',
          width: '30px',
          height: '30px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: "'Archivo', system-ui, sans-serif",
          lineHeight: 1,
          background: language === 'NL' ? '#E20714' : 'transparent',
          color: language === 'NL' ? '#FFFFFF' : '#8E8E93',
          transition: 'background-color 0.2s ease, color 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        aria-label="Switch to Dutch"
      >
        NL
      </button>
    </div>
  );
};
