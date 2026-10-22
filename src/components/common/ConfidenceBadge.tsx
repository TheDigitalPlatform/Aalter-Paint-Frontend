import React, { useState, useEffect } from 'react';

interface ConfidenceBadgeProps {
  value: number | null | undefined;
  threshold?: number;
  why?: string;
  showLabel?: boolean;
  delay?: number;
  scanKey?: string | number;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  value,
  threshold = 70,
  why = '',
  showLabel = false,
  delay = 200,
  scanKey,
}) => {
  if (value === null || value === undefined || isNaN(value)) {
    return (
      <span
        title="OCR and AI matching in progress"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '3px 8px 3px 7px',
          borderRadius: '2px',
          background: '#ECECEC',
          color: '#4D4D4D',
          fontFamily: "'Archivo', system-ui, sans-serif",
          fontSize: '13px',
          lineHeight: '18px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          cursor: 'help',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span
          style={{
            position: 'relative',
            display: 'block',
            width: '50px',
            height: '6px',
            background: 'rgba(0,0,0,0.10)',
            flex: 'none',
            overflow: 'hidden',
          }}
        >
          <span
            className="a-prog"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '40%',
              background: '#9A9A9A',
              display: 'block',
            }}
          />
        </span>
        <span>In progress</span>
        {showLabel && <span style={{ fontWeight: 600 }}>Processing</span>}
      </span>
    );
  }

  const low = value < threshold;
  const targetVal = Math.max(0, Math.min(100, Math.round(value)));
  const bg = low ? '#FDEBDD' : '#E3F2E9';
  const fg = low ? '#8A3405' : '#11603B';
  const bar = low ? '#E8590C' : '#1F9D55';
  const label = low ? 'Extra attention' : 'Normal inspection';
  const tip = (low ? 'Below threshold of ' : 'Above threshold of ') + threshold + '%. ' + why;

  const [displayVal, setDisplayVal] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return targetVal;
      }
    } catch {}
    return 0;
  });
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [animId, setAnimId] = useState<number>(0);

  useEffect(() => {
    let reduced = false;
    try {
      reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {}

    if (reduced) {
      setDisplayVal(targetVal);
      setIsScanning(false);
      return;
    }

    setDisplayVal(0);
    setIsScanning(true);
    setAnimId((n) => n + 1);

    let rafId: number;
    let startTime: number | null = null;
    const duration = 750;

    const timer = setTimeout(() => {
      const step = (now: number) => {
        if (!startTime) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Cubic ease-out: 1 - Math.pow(1 - progress, 3) matching apGrowX
        const factor = 1 - Math.pow(1 - progress, 3);
        setDisplayVal(Math.round(factor * targetVal));

        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          setDisplayVal(targetVal);
          setIsScanning(false);
        }
      };
      rafId = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [value, targetVal, delay, scanKey]);

  return (
    <span
      title={tip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '3px 8px 3px 7px',
        borderRadius: '2px',
        background: bg,
        color: fg,
        fontFamily: "'Archivo', system-ui, sans-serif",
        fontSize: '13px',
        lineHeight: '18px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        cursor: 'help',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'block',
          width: '50px',
          height: '6px',
          background: 'rgba(0,0,0,0.10)',
          flex: 'none',
          overflow: 'hidden',
          borderRadius: '1px',
        }}
      >
        <span
          key={`bar-${animId}`}
          className="a-barx"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${targetVal}%`,
            background: bar,
            display: 'block',
            animationDelay: `${delay}ms`,
            transformOrigin: 'left center',
            overflow: 'hidden',
          }}
        >
          {isScanning && (
            <>
              <span
                className="a-scan-shine"
                style={{
                  animationDelay: `${delay}ms`,
                }}
              />
              <span className="a-scan-head" />
            </>
          )}
        </span>
      </span>
      <span>{displayVal}%</span>
      {showLabel && <span style={{ fontWeight: 600 }}>{label}</span>}
    </span>
  );
};
