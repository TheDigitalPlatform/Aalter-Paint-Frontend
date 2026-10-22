import React, { useState } from 'react';
import { toast } from 'sonner';
import { INITIAL_ORDERS, type OrderItem, type OrderLine } from '../../data/mockData';
import { useTranslation } from '../../context/LanguageContext';
import type { Language } from '../../locales/loadLocale';

interface ExceptionsViewProps {
  language?: Language;
  userName?: string;
  onOpenOrder?: (nr: string) => void;
  onNavigateToOrders?: () => void;
}

export const ExceptionsView: React.FC<ExceptionsViewProps> = ({
  language: propLang,
  userName = 'Bart Van Damme',
  onOpenOrder,
  onNavigateToOrders: _onNavigateToOrders,
}) => {
  const { language: ctxLang, t } = useTranslation();
  const lang = propLang || ctxLang || 'NL';
  const isNl = lang === 'NL';

  // Manage orders state locally for interactive retries and corrections
  const [orders, setOrders] = useState<OrderItem[]>(() => INITIAL_ORDERS);
  const [fixOrderNr, setFixOrderNr] = useState<string | null>(null);
  const [syncingNrs, setSyncingNrs] = useState<Set<string>>(new Set());

  // Filter approved orders (all with outcomes in Business Central)
  const approvedAll = orders.filter(
    (o) => o.st === 'gesync' || o.st === 'syncfout' || o.st === 'goedgekeurd'
  );
  const failedOrders = orders.filter((o) => o.st === 'syncfout');
  const okCount = approvedAll.filter((o) => o.st === 'gesync').length;
  const busyCount = approvedAll.filter((o) => o.st === 'goedgekeurd').length;
  const failCount = failedOrders.length;

  // Selected order for the correction dialog
  const fixOrder = fixOrderNr ? orders.find((o) => o.nr === fixOrderNr) : null;

  // Retry Business Central synchronization
  const handleRetry = (nr: string) => {
    setSyncingNrs((prev) => new Set(prev).add(nr));
    setOrders((prev) =>
      prev.map((o) => (o.nr === nr ? { ...o, st: 'goedgekeurd' } : o))
    );

    toast.info(
      isNl
        ? `Opnieuw versturen naar Business Central gestart voor ${nr}`
        : `Resending to Business Central started for ${nr}`
    );

    setTimeout(() => {
      setOrders((prev) => {
        return prev.map((o) => {
          if (o.nr !== nr) return o;

          // Check if blocked article exists
          const hasBlockedArt = o.lines.some((l: OrderLine) => l.art === 'PZN00220-20KG');
          const isUnknownCust = o.unknownCustomer;

          if (hasBlockedArt || isUnknownCust) {
            const err = hasBlockedArt
              ? isNl
                ? 'Artikel PZN00220-20KG is geblokkeerd in Business Central.'
                : 'Item PZN00220-20KG is blocked in Business Central.'
              : o.syncErr;
            toast.error(
              isNl
                ? `BC-sync mislukt voor ${nr}. Zie uitzonderingen.`
                : `BC sync failed for ${nr}. See exceptions.`
            );
            return {
              ...o,
              st: 'syncfout',
              syncErr: err,
              attempts: (o.attempts || 1) + 1,
            };
          } else {
            const newVo = o.vo || `VO-26-00${nr.replace(/\D/g, '').slice(-4)}`;
            const nowTime = new Date().toLocaleDateString('nl-BE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            toast.success(
              isNl
                ? `Verkooporder ${newVo} aangemaakt in Business Central`
                : `Sales order ${newVo} created in Business Central`
            );
            return {
              ...o,
              st: 'gesync',
              vo: newVo,
              syncAt: nowTime,
              syncErr: '',
              attempts: (o.attempts || 1) + 1,
            };
          }
        });
      });

      setSyncingNrs((prev) => {
        const next = new Set(prev);
        next.delete(nr);
        return next;
      });
    }, 1500);
  };

  // Apply proposed fix and re-synchronize
  const handleApplyFix = (nr: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.nr !== nr) return o;
        const updatedLines = o.lines.map((l: OrderLine) =>
          l.art === 'PZN00220-20KG'
            ? { ...l, art: 'PZN00221-20KG', corrected: true, confirmed: true, by: userName }
            : l
        );
        return {
          ...o,
          lines: updatedLines,
          unknownCustomer: false,
        };
      })
    );

    setFixOrderNr(null);
    toast.success(
      isNl
        ? `Correctie toegepast voor ${nr}. Opnieuw verzenden...`
        : `Correction applied for ${nr}. Resending...`
    );

    // Trigger retry immediately after applying fix
    handleRetry(nr);
  };

  return (
    <div className="a-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Archivo', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '32px',
            lineHeight: 1.15,
            color: '#1A1A1A',
          }}
        >
          {t('exceptions.title', 'Uitzonderingen en BC-sync')}
        </h1>
        <p style={{ margin: 0, color: '#4D4D4D' }}>
          {t(
            'exceptions.subtitle',
            'Goedgekeurde orders en hun resultaat in Business Central. Mislukte of onvolledige inzendingen staan bovenaan voor opvolging.'
          )}
        </p>
      </div>

      {/* KPI 3-Column Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
          gap: '12px',
        }}
      >
        {/* Card 1: Gesynchroniseerd */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            borderRadius: 0,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#4D4D4D',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                background: '#1F9D55',
                borderRadius: '50%',
                display: 'block',
              }}
            />
            {t('exceptions.synced', 'Gesynchroniseerd')}
          </span>
          <span
            style={{
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '34px',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {okCount}
          </span>
        </div>

        {/* Card 2: Bezig met synchroniseren */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            borderRadius: 0,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#4D4D4D',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                background: busyCount > 0 ? '#E20714' : '#9A9A9A',
                borderRadius: '50%',
                display: 'block',
              }}
              className={busyCount > 0 ? 'a-pulse' : ''}
            />
            {t('exceptions.syncing', 'Bezig met synchroniseren')}
          </span>
          <span
            style={{
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '34px',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {busyCount}
          </span>
        </div>

        {/* Card 3: Op te volgen */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            borderRadius: 0,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#4D4D4D',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                background: failCount > 0 ? '#A61B1B' : '#1F9D55',
                borderRadius: '50%',
                display: 'block',
              }}
            />
            {t('exceptions.follow_up', 'Op te volgen')}
          </span>
          <span
            style={{
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '34px',
              lineHeight: 1,
              color: failCount > 0 ? '#A61B1B' : '#11603B',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {failCount}
          </span>
        </div>
      </div>

      {/* ============ SECTION 1: OPVOLGING NODIG ============ */}
      <section
        aria-label={t('exceptions.needs_follow_up_section', 'Opvolging nodig')}
        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "'Archivo', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '19px',
            letterSpacing: 0,
            color: '#1A1A1A',
          }}
        >
          {t('exceptions.needs_follow_up_section', 'Opvolging nodig')}
        </h2>

        {/* Failed items list */}
        {failedOrders.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {failedOrders.map((o, idx) => {
              const isSyncingThis = syncingNrs.has(o.nr);
              const attemptsText =
                (o.attempts || 1) === 1
                  ? t('exceptions.attempt_singular', '1 poging')
                  : t('exceptions.attempt_plural', `${o.attempts || 1} pogingen`, {
                      count: o.attempts || 1,
                    });

              return (
                <div
                  key={o.nr}
                  className="a-stag"
                  style={{
                    animationDelay: `${80 + idx * 80}ms`,
                    background: '#FFFFFF',
                    border: '1px solid #DADADA',
                    borderRadius: 0,
                    padding: '16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px 24px',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      flex: '1 1 340px',
                      minWidth: 0,
                    }}
                  >
                    <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px' }}>
                      <button
                        onClick={() => onOpenOrder && onOpenOrder(o.nr)}
                        className="lk"
                        style={{
                          border: 0,
                          background: 'transparent',
                          padding: 0,
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#E20714',
                          cursor: 'pointer',
                        }}
                      >
                        {o.nr}
                      </button>
                      <span style={{ fontWeight: 700, color: '#1A1A1A', fontSize: '15px' }}>
                        {o.klant}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          background: '#FCE8E8',
                          color: '#A61B1B',
                          borderRadius: '2px',
                        }}
                      >
                        {t('exceptions.sync_failed', 'Sync mislukt')}
                      </span>
                    </span>

                    <span style={{ fontSize: '14px', color: '#1A1A1A' }}>
                      <span style={{ fontWeight: 700 }}>
                        {t('exceptions.reason_label', 'Reden: ')}
                      </span>
                      {o.syncErr || 'Onbekende synchronisatiefout in Business Central.'}
                    </span>

                    <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
                      {t(
                        'exceptions.approved_by_on',
                        `Goedgekeurd door ${o.approvedBy || userName} op ${o.approvedAt || '07/10/2026 17:05'} · ${attemptsText}`,
                        {
                          name: o.approvedBy || userName,
                          date: o.approvedAt || '07/10/2026 17:05',
                          attempts: attemptsText,
                        }
                      )}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="bg"
                      onClick={() => handleRetry(o.nr)}
                      disabled={isSyncingThis}
                      style={{
                        minHeight: '44px',
                        padding: '0 16px',
                        border: '1px solid #1A1A1A',
                        background: '#FFFFFF',
                        borderRadius: 0,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        fontSize: '13px',
                        cursor: isSyncingThis ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isSyncingThis && (
                        <span
                          className="a-pulse"
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#E20714',
                            display: 'block',
                          }}
                        />
                      )}
                      {t('exceptions.retry', 'Opnieuw proberen')}
                    </button>

                    <button
                      className="bd"
                      onClick={() => setFixOrderNr(o.nr)}
                      style={{
                        minHeight: '44px',
                        padding: '0 16px',
                        border: '1px solid #E20714',
                        background: '#FFFFFF',
                        color: '#E20714',
                        borderRadius: 0,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {t('exceptions.correct', 'Corrigeren')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: '20px',
              background: '#E3F2E9',
              color: '#11603B',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            {t(
              'exceptions.none_failed',
              'Geen openstaande uitzonderingen. Alle goedgekeurde orders staan in Business Central.'
            )}
          </div>
        )}
      </section>

      {/* ============ SECTION 2: ALLE GOEDGEKEURDE ORDERS ============ */}
      <section
        aria-label={t('exceptions.all_approved_section', 'Alle goedgekeurde orders')}
        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "'Archivo', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '19px',
            letterSpacing: 0,
            color: '#1A1A1A',
          }}
        >
          {t('exceptions.all_approved_section', 'Alle goedgekeurde orders')}
        </h2>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            overflowX: 'auto',
            borderRadius: 0,
          }}
        >
          <div style={{ minWidth: '880px' }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(112px, 0.8fr) minmax(150px, 1.2fr) minmax(160px, 1.1fr) 128px 140px minmax(170px, 1.4fr)',
                gap: '12px',
                padding: '10px 16px',
                borderBottom: '1px solid #DADADA',
                background: '#FAFAFA',
                fontSize: '13px',
                fontWeight: 600,
                color: '#6B6B6B',
                alignItems: 'center',
              }}
            >
              <span>{t('exceptions.order_col', 'Order')}</span>
              <span>{t('exceptions.customer_col', 'Klant')}</span>
              <span>{t('exceptions.approved_by_col', 'Goedgekeurd door en op')}</span>
              <span>{t('exceptions.bc_order_col', 'BC-verkooporder')}</span>
              <span>{t('exceptions.sync_status_col', 'Syncstatus')}</span>
              <span>{t('exceptions.result_col', 'Resultaat')}</span>
            </div>

            {/* Table Rows */}
            {approvedAll
              .slice()
              .sort((a, b) => (b.min || 0) - (a.min || 0))
              .map((o) => {
                const isSyncingThis = syncingNrs.has(o.nr);
                const isFail = o.st === 'syncfout';
                const isOk = o.st === 'gesync';

                const chipBg = isOk ? '#E3F2E9' : isFail ? '#FCE8E8' : '#F5F5F5';
                const chipFg = isOk ? '#11603B' : isFail ? '#A61B1B' : '#4D4D4D';
                const chipBd = isOk ? '#C2E2CF' : isFail ? '#F5C6C6' : '#DADADA';
                const chipLabel = isOk
                  ? t('statuses.gesync', 'Gesynchroniseerd')
                  : isFail
                  ? t('statuses.syncfout', 'Syncfout')
                  : t('statuses.goedgekeurd', 'In verwerking');

                const resultTxt = isOk
                  ? t('exceptions.result_sales_order_created', 'Verkooporder aangemaakt')
                  : isFail
                  ? o.syncErr || 'Syncfout'
                  : isSyncingThis
                  ? t('exceptions.result_syncing', 'Bezig met synchroniseren...')
                  : t('exceptions.result_sales_order_created', 'Verkooporder aangemaakt');

                return (
                  <div
                    key={o.nr}
                    className="row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'minmax(112px, 0.8fr) minmax(150px, 1.2fr) minmax(160px, 1.1fr) 128px 140px minmax(170px, 1.4fr)',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: '1px solid #EBEBEB',
                      fontSize: '14px',
                      alignItems: 'center',
                    }}
                  >
                    {/* Col 1: Order link */}
                    <button
                      className="lk"
                      onClick={() => onOpenOrder && onOpenOrder(o.nr)}
                      style={{
                        border: 0,
                        background: 'transparent',
                        padding: 0,
                        textAlign: 'left',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#E20714',
                        cursor: 'pointer',
                      }}
                    >
                      {o.nr}
                    </button>

                    {/* Col 2: Customer */}
                    <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{o.klant}</span>

                    {/* Col 3: Approved By & Timestamp */}
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 500 }}>{o.approvedBy || userName}</span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '12px',
                          color: '#4D4D4D',
                        }}
                      >
                        {o.approvedAt || '08/10/2026 09:12'}
                      </span>
                    </span>

                    {/* Col 4: BC Sales Order Nr */}
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px' }}>
                      {o.vo || '-'}
                    </span>

                    {/* Col 5: Status Chip */}
                    <span>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          background: chipBg,
                          color: chipFg,
                          border: `1px solid ${chipBd}`,
                          borderRadius: '2px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {chipLabel}
                      </span>
                    </span>

                    {/* Col 6: Result Outcome text */}
                    <span
                      style={{
                        fontSize: '13px',
                        color: isFail ? '#A61B1B' : '#4D4D4D',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={resultTxt}
                    >
                      {resultTxt}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* ============ CORRECTION MODAL DIALOG (fixDlg) ============ */}
      {fixOrder && (
        <div
          className="a-fade"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(18,18,18,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setFixOrderNr(null);
          }}
        >
          <div
            className="a-pop"
            role="dialog"
            aria-modal="true"
            aria-label={t('exceptions.modal_title', `Corrigeren ${fixOrder.nr}`, {
              nr: fixOrder.nr,
            })}
            style={{
              background: '#FFFFFF',
              width: '560px',
              maxWidth: '100%',
              border: '1px solid #DADADA',
              boxShadow: '0 6px 20px rgba(18,18,18,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '24px',
              boxSizing: 'border-box',
              borderRadius: 0,
            }}
          >
            {/* Modal Title */}
            <h2
              style={{
                margin: 0,
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '19px',
                letterSpacing: 0,
                color: '#1A1A1A',
              }}
            >
              {t('exceptions.modal_title', `Corrigeren ${fixOrder.nr}`, {
                nr: fixOrder.nr,
              })}
            </h2>

            {/* Error Message from Business Central */}
            <div
              style={{
                padding: '10px 12px',
                background: '#FCE8E8',
                color: '#A61B1B',
                fontSize: '14px',
              }}
            >
              <span style={{ fontWeight: 700 }}>
                {t('exceptions.modal_bc_message', 'Melding van Business Central: ')}
              </span>
              {fixOrder.syncErr}
            </div>

            {/* Proposal Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '12px',
                border: '1px solid #DADADA',
                borderTop: '3px solid #FFD302',
                borderRadius: 0,
                background: '#FAFAFA',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B6B' }}>
                {t('exceptions.modal_proposal', 'Voorstel')}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A' }}>
                {fixOrder.fix ||
                  (isNl
                    ? 'Vervang het geblokkeerde artikel door het opvolgartikel'
                    : 'Replace blocked item with successor item')}
              </span>
              <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
                {fixOrder.fixWhy ||
                  (isNl
                    ? 'Het voorgestelde artikel lost de synchronisatiefout in Business Central op.'
                    : 'The proposed item resolves the synchronization blocker in Business Central.')}
              </span>
            </div>

            {/* Modal Action Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                flexWrap: 'wrap',
                marginTop: '8px',
              }}
            >
              <button
                className="bg"
                onClick={() => setFixOrderNr(null)}
                style={{
                  minHeight: '44px',
                  padding: '0 16px',
                  border: '1px solid #1A1A1A',
                  background: '#FFFFFF',
                  borderRadius: 0,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('exceptions.modal_cancel', 'Annuleren')}
              </button>

              <button
                className="bp"
                onClick={() => handleApplyFix(fixOrder.nr)}
                style={{
                  minHeight: '44px',
                  padding: '0 16px',
                  border: 0,
                  background: '#E20714',
                  color: '#FFFFFF',
                  borderRadius: 0,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('exceptions.modal_apply_resend', 'Toepassen en opnieuw versturen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
