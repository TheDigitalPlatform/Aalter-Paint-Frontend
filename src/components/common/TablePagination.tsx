import React, { useState, useRef, useEffect } from 'react';
import { type Language } from './LanguageToggle';

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  language?: Language;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemLabel,
  language = 'NL',
}) => {
  const isNl = language === 'NL';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (safePage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();
  const defaultLabel = isNl ? 'bestellingen' : 'orders';
  const labelToUse = itemLabel || defaultLabel;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px 16px',
        padding: '12px 16px',
        background: '#FFFFFF',
        borderTop: '1px solid #EBEBEB',
        userSelect: 'none',
      }}
    >
      {/* Left side: Rows per page + Range counter */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#6B6B6B',
          }}
        >
          {isNl ? 'RIJEN PER PAGINA' : 'ROWS PER PAGE'}
        </span>

        {/* Rows per page dropdown trigger */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label={isNl ? 'Rijen per pagina selecteren' : 'Select rows per page'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 10px',
              background: '#FFFFFF',
              color: '#1A1A1A',
              borderRadius: '4px',
              border: dropdownOpen ? '1px solid #E20714' : '1px solid #C9C9C9',
              boxShadow: dropdownOpen ? '0 0 0 1px #E20714' : 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!dropdownOpen) e.currentTarget.style.borderColor = '#1A1A1A';
            }}
            onMouseLeave={(e) => {
              if (!dropdownOpen) e.currentTarget.style.borderColor = '#C9C9C9';
            }}
          >
            <span>{pageSize}</span>
            <svg
              viewBox="0 0 24 24"
              style={{
                width: '13px',
                height: '13px',
                stroke: '#4D4D4D',
                fill: 'none',
                strokeWidth: 2.2,
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>

          {/* Popup menu (styled to match Aalter Paint cards and dropdowns) */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 5px)',
                left: 0,
                background: '#FFFFFF',
                borderRadius: '6px',
                border: '1px solid #DADADA',
                padding: '4px 0',
                minWidth: '76px',
                boxShadow: '0 8px 24px rgba(18, 18, 18, 0.12)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {pageSizeOptions.map((opt) => {
                const isSelected = opt === pageSize;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onPageSizeChange(opt);
                      onPageChange(1);
                      setDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '7px 12px',
                      background: isSelected ? '#FEF2F2' : 'transparent',
                      border: 0,
                      color: isSelected ? '#E20714' : '#242424',
                      fontSize: '13px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#F5F5F5';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{opt}</span>
                    {isSelected && (
                      <svg
                        viewBox="0 0 24 24"
                        style={{
                          width: '13px',
                          height: '13px',
                          stroke: '#E20714',
                          fill: 'none',
                          strokeWidth: 2.5,
                        }}
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <span
          style={{
            display: 'inline-block',
            width: '1px',
            height: '16px',
            background: '#DADADA',
            margin: '0 2px',
          }}
        />

        {/* Range counter */}
        <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
          {isNl
            ? `Toont ${startItem} tot ${endItem} van ${totalItems} ${labelToUse}`
            : `Showing ${startItem} to ${endItem} of ${totalItems} ${labelToUse}`}
        </span>
      </div>

      {/* Right side: Page navigation buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label={isNl ? 'Vorige pagina' : 'Previous page'}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            border: '1px solid #DADADA',
            background: '#FFFFFF',
            color: '#4D4D4D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
            opacity: safePage <= 1 ? 0.35 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (safePage > 1) {
              e.currentTarget.style.background = '#F5F5F5';
              e.currentTarget.style.borderColor = '#1A1A1A';
              e.currentTarget.style.color = '#1A1A1A';
            }
          }}
          onMouseLeave={(e) => {
            if (safePage > 1) {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#DADADA';
              e.currentTarget.style.color = '#4D4D4D';
            }
          }}
        >
          <svg
            viewBox="0 0 24 24"
            style={{ width: '15px', height: '15px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Page Number Buttons */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  width: '24px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  color: '#8E8E93',
                  fontWeight: 600,
                }}
              >
                ...
              </span>
            );
          }

          const pageNum = p as number;
          const isActive = pageNum === safePage;

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-label={isNl ? `Pagina ${pageNum}` : `Page ${pageNum}`}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                border: isActive ? '1px solid #E20714' : '1px solid #EBEBEB',
                background: isActive ? '#E20714' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#4D4D4D',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#F5F5F5';
                  e.currentTarget.style.borderColor = '#DADADA';
                  e.currentTarget.style.color = '#1A1A1A';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#EBEBEB';
                  e.currentTarget.style.color = '#4D4D4D';
                }
              }}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label={isNl ? 'Volgende pagina' : 'Next page'}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            border: '1px solid #DADADA',
            background: '#FFFFFF',
            color: '#4D4D4D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
            opacity: safePage >= totalPages ? 0.35 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (safePage < totalPages) {
              e.currentTarget.style.background = '#F5F5F5';
              e.currentTarget.style.borderColor = '#1A1A1A';
              e.currentTarget.style.color = '#1A1A1A';
            }
          }}
          onMouseLeave={(e) => {
            if (safePage < totalPages) {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#DADADA';
              e.currentTarget.style.color = '#4D4D4D';
            }
          }}
        >
          <svg
            viewBox="0 0 24 24"
            style={{ width: '15px', height: '15px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
};
