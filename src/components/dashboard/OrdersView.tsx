import React, { useState, useMemo } from 'react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { type Language } from '../common/LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';
import { INITIAL_ORDERS } from '../../data/mockData';

interface OrdersViewProps {
  language?: Language;
  onOpenOrder?: (orderNr: string) => void;
  onNavigateToExceptions?: () => void;
}

type SortKey = 'nr' | 'klant' | 'received' | 'conf';
type SortDir = 'asc' | 'desc';

export const OrdersView: React.FC<OrdersViewProps> = ({
  language,
  onOpenOrder,
  onNavigateToExceptions,
}) => {
  const { language: ctxLang } = useLanguage();
  const activeLang = language || ctxLang || 'NL';
  const isNl = activeLang === 'NL';

  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('alle');
  const [fMailbox, setFMailbox] = useState('alle');
  const [fAttention, setFAttention] = useState(false);
  const [fLong, setFLong] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('received');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const threshold = 70;

  // Process order views
  const processedOrders = useMemo(() => {
    return INITIAL_ORDERS.map((o) => {
      const lines = o.lines || [];
      const n = lines.length;
      const avg = n
        ? Math.round(lines.reduce((t, l) => t + l.conf, 0) / n)
        : null;
      const under = lines.filter((l) => l.conf < threshold).length;

      // Status derivation
      let st: string = o.st;
      const isPending = o.st === 'pending';
      const isProcessing = o.st === 'verwerking';

      if (isPending) {
        const hasMissing = lines.some((l) => l.qty === null || l.qty === undefined);
        const att = under > 0 || (avg !== null && avg < threshold) || hasMissing;
        st = att ? 'aandacht' : 'klaar';
      }

      // Waiting calculation
      const waitH = isPending || isProcessing ? (990 - o.min) / 60 : 0;
      const isLongOrder = isPending && waitH > 4;

      // Status labels and styling
      let stLabel = '';
      let stBg = '#ECECEC';
      let stFg = '#4D4D4D';
      let stBd = '#ECECEC';
      let tagLabel = '';
      let tagColor = '#6B6B6B';

      switch (st) {
        case 'verwerking':
          stLabel = isNl ? 'In behandeling' : 'Processing';
          stBg = '#ECECEC';
          stFg = '#4D4D4D';
          stBd = '#ECECEC';
          tagLabel = isNl ? 'Mail herkend' : 'Mail recognized';
          tagColor = '#2F6FEB';
          break;
        case 'klaar':
          stLabel = isNl ? 'Klaar voor controle' : 'Ready for review';
          stBg = '#E7EEFC';
          stFg = '#1D4FBF';
          stBd = '#E7EEFC';
          tagLabel = isNl ? 'Wacht op controle' : 'Awaiting review';
          tagColor = '#E8590C';
          break;
        case 'aandacht':
          stLabel = isNl ? 'Aandacht nodig' : 'Needs attention';
          stBg = '#FDEBDD';
          stFg = '#8A3405';
          stBd = '#FDEBDD';
          tagLabel = isNl ? 'Wacht op controle' : 'Awaiting review';
          tagColor = '#E8590C';
          break;
        case 'goedgekeurd':
          stLabel = isNl ? 'Goedgekeurd' : 'Approved';
          stBg = '#FFFFFF';
          stFg = '#11603B';
          stBd = '#9FD3B4';
          tagLabel = isNl ? 'Goedgekeurd' : 'Approved';
          tagColor = '#1F9D55';
          break;
        case 'afgewezen':
          stLabel = isNl ? 'Afgewezen' : 'Rejected';
          stBg = '#EBEBEB';
          stFg = '#242424';
          stBd = '#EBEBEB';
          tagLabel = isNl ? 'Afgewezen' : 'Rejected';
          tagColor = '#6B6B6B';
          break;
        case 'gesync':
          stLabel = isNl ? 'Gesynchroniseerd' : 'Synchronized';
          stBg = '#E3F2E9';
          stFg = '#11603B';
          stBd = '#E3F2E9';
          tagLabel = isNl ? 'Goedgekeurd' : 'Approved';
          tagColor = '#1F9D55';
          break;
        case 'syncfout':
          stLabel = isNl ? 'Sync mislukt' : 'Sync failed';
          stBg = '#FCE8E8';
          stFg = '#A61B1B';
          stBd = '#FCE8E8';
          tagLabel = isNl ? 'Goedgekeurd' : 'Approved';
          tagColor = '#1F9D55';
          break;
        default:
          stLabel = st;
      }

      // Mailbox label
      let mbLabel = 'info@';
      if (o.mb === 'bestel') mbLabel = 'bestel@';
      if (o.mb === 'persoonlijk') mbLabel = isNl ? 'Persoonlijk' : 'Personal';

      // Under threshold text
      let underTxt = '';
      if (n > 0) {
        if (under > 0) {
          underTxt = isNl
            ? `${under} van ${n} regels onder de drempel`
            : `${under} of ${n} lines below threshold`;
        } else {
          underTxt = isNl
            ? 'alle regels boven drempel'
            : 'all lines above threshold';
        }
      } else {
        underTxt = isNl ? 'OCR en AI-matching lopen' : 'OCR and AI matching running';
      }

      const confWhy = n
        ? isNl
          ? `Ordergemiddelde. ${under} van ${n} regels onder de drempel.`
          : `Order average. ${under} of ${n} lines below threshold.`
        : isNl
        ? 'In verwerking'
        : 'Processing';

      return {
        ...o,
        n,
        avg,
        under,
        st,
        stLabel,
        stBg,
        stFg,
        stBd,
        tagLabel,
        tagColor,
        mbLabel,
        underTxt,
        confWhy,
        isPending,
        isProcessing,
        waitH,
        isLongOrder,
      };
    });
  }, [isNl]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return processedOrders.filter((o) => {
      const matchSearch =
        !q ||
        (o.nr + ' ' + o.klant + ' ' + o.ref).toLowerCase().indexOf(q) >= 0;

      const matchStatus =
        fStatus === 'alle' ||
        (fStatus === 'open' ? o.isPending : o.st === fStatus);

      const matchMailbox = fMailbox === 'alle' || o.mb === fMailbox;
      const matchAttention = !fAttention || o.st === 'aandacht';
      const matchLong = !fLong || o.isLongOrder;

      return (
        matchSearch &&
        matchStatus &&
        matchMailbox &&
        matchAttention &&
        matchLong
      );
    });
  }, [processedOrders, search, fStatus, fMailbox, fAttention, fLong]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    const dir = sortDir === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === 'received') {
        va = a.min;
        vb = b.min;
      } else if (sortKey === 'conf') {
        va = a.avg === null ? -1 : a.avg;
        vb = b.avg === null ? -1 : b.avg;
      } else if (sortKey === 'klant') {
        va = a.klant;
        vb = b.klant;
      } else {
        va = a.nr;
        vb = b.nr;
      }

      return va < vb ? -dir : va > vb ? dir : 0;
    });

    return list;
  }, [filteredRows, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  const handleResetFilters = () => {
    setSearch('');
    setFStatus('alle');
    setFMailbox('alle');
    setFAttention(false);
    setFLong(false);
  };

  // Compact Insights Cards
  const compactInsights = [
    {
      id: 'ci-1',
      value: 3,
      color: '#8A3405',
      title: isNl ? 'onzekere matches' : 'uncertain matches',
      short: isNl
        ? 'regels onder 70% in 2 orders'
        : 'lines below 70% in 2 orders',
      d: 60,
      onClick: () => {
        setFAttention(true);
        setFStatus('alle');
        setFMailbox('alle');
        setFLong(false);
      },
    },
    {
      id: 'ci-2',
      value: 1,
      color: '#A61B1B',
      title: isNl ? 'ontbrekende hoeveelheden' : 'missing quantities',
      short: 'open AP-26-04818',
      d: 120,
      onClick: () => {
        if (onOpenOrder) {
          onOpenOrder('AP-26-04818');
        } else {
          setSearch('AP-26-04818');
        }
      },
    },
    {
      id: 'ci-3',
      value: 1,
      color: '#A61B1B',
      title: isNl ? 'wachten > 4 uur' : 'waiting > 4 hours',
      short: isNl
        ? 'orders die vandaag nog weg moeten'
        : 'orders that must go out today',
      d: 180,
      onClick: () => {
        setFLong(true);
        setFStatus('open');
        setFAttention(false);
      },
    },
    {
      id: 'ci-4',
      value: 2,
      color: '#A61B1B',
      title: isNl ? 'mislukte BC-syncs' : 'failed BC syncs',
      short: isNl
        ? 'op te volgen in uitzonderingen'
        : 'to follow up in exceptions',
      d: 240,
      onClick: () => {
        if (onNavigateToExceptions) {
          onNavigateToExceptions();
        } else {
          setFStatus('syncfout');
        }
      },
    },
  ];

  return (
    <div className="a-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title Header */}
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
          Orders
        </h1>
        <p style={{ margin: 0, color: '#4D4D4D' }}>
          {isNl
            ? 'Alle bestelmails uit info@, bestel@ en de persoonlijke mailbox, automatisch gelezen en gekoppeld. Klik een order om te valideren.'
            : 'All order emails from info@, bestel@ and the personal mailbox, automatically read and linked. Click an order to validate.'}
        </p>
      </div>

      {/* AI Insights compact banner */}
      <section
        aria-label="AI Insights"
        style={{
          background: '#FFF1A6',
          border: '1px solid #E8BE00',
          borderTop: '4px solid #FFD302',
          borderRadius: 0,
          padding: '14px 16px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 9px 2px 7px',
              borderRadius: '2px',
              background: '#FFD302',
              color: '#1A1A1A',
              fontSize: '12px',
              fontWeight: 700,
              flex: 'none',
            }}
          >
            <svg className="s a-spark" viewBox="0 0 24 24">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
              <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
            </svg>
            AI
          </span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#5C4A00' }}>
            AI Insights
          </h2>
          <span style={{ fontSize: '12px', color: '#7A6400', marginLeft: 'auto' }}>
            {isNl ? 'Klik om de orderlijst te filteren' : 'Click to filter the order list'}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))',
            gap: '10px',
          }}
        >
          {compactInsights.map((c) => (
            <button
              key={c.id}
              className="a-stag row"
              onClick={c.onClick}
              style={{
                animationDelay: `${c.d}ms`,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '12px 14px',
                background: '#FFFFFF',
                border: '1px solid #E8D27A',
                borderRadius: 0,
                textAlign: 'left',
                color: '#242424',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: "'Archivo', system-ui, sans-serif",
                    fontWeight: 700,
                    fontSize: '26px',
                    lineHeight: 1.1,
                    color: c.color,
                  }}
                >
                  {c.value}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{c.title}</span>
              </span>
              <span style={{ fontSize: '13px', color: '#4D4D4D' }}>{c.short}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Filters bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: '12px',
          padding: '14px 16px',
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          borderRadius: 0,
        }}
      >
        {/* Search */}
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            flex: '1 1 240px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {isNl ? 'Zoeken' : 'Search'}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '44px',
              padding: '0 12px',
              border: '1px solid #C9C9C9',
              background: '#FFFFFF',
              borderRadius: 0,
            }}
          >
            <svg className="i" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isNl
                  ? 'Ordernummer, klant of referentie'
                  : 'Order number, customer or reference'
              }
              style={{
                border: 0,
                outline: 'none',
                flexGrow: 1,
                minWidth: 0,
                fontSize: '15px',
                fontWeight: 400,
                background: 'transparent',
              }}
            />
          </span>
        </label>

        {/* Status */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
          Status
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
            style={{
              height: '44px',
              padding: '0 10px',
              border: '1px solid #C9C9C9',
              background: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 400,
              minWidth: '190px',
              borderRadius: 0,
            }}
          >
            <option value="alle">{isNl ? 'Alle statussen' : 'All statuses'}</option>
            <option value="open">{isNl ? 'Wacht op controle' : 'Awaiting review'}</option>
            <option value="verwerking">{isNl ? 'In behandeling' : 'Processing'}</option>
            <option value="klaar">{isNl ? 'Klaar voor controle' : 'Ready for review'}</option>
            <option value="aandacht">{isNl ? 'Aandacht nodig' : 'Needs attention'}</option>
            <option value="goedgekeurd">{isNl ? 'Goedgekeurd' : 'Approved'}</option>
            <option value="afgewezen">{isNl ? 'Afgewezen' : 'Rejected'}</option>
            <option value="gesync">{isNl ? 'Gesynchroniseerd' : 'Synchronized'}</option>
            <option value="syncfout">{isNl ? 'Sync mislukt' : 'Sync failed'}</option>
          </select>
        </label>

        {/* Mailbox */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
          Mailbox
          <select
            value={fMailbox}
            onChange={(e) => setFMailbox(e.target.value)}
            style={{
              height: '44px',
              padding: '0 10px',
              border: '1px solid #C9C9C9',
              background: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 400,
              minWidth: '160px',
              borderRadius: 0,
            }}
          >
            <option value="alle">{isNl ? 'Alle mailboxen' : 'All mailboxes'}</option>
            <option value="info">info@</option>
            <option value="bestel">bestel@</option>
            <option value="persoonlijk">{isNl ? 'Persoonlijk' : 'Personal'}</option>
          </select>
        </label>

        {/* Only extra attention */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '44px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={fAttention}
            onChange={(e) => setFAttention(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#E20714' }}
          />
          {isNl ? 'Enkel extra aandacht' : 'Only extra attention'}
        </label>

        {/* Wait > 4 hours */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '44px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={fLong}
            onChange={(e) => setFLong(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#E20714' }}
          />
          {isNl ? 'Wacht langer dan 4 uur' : 'Waiting longer than 4 hours'}
        </label>

        {/* Reset button */}
        <button
          className="bg"
          onClick={handleResetFilters}
          style={{
            height: '44px',
            padding: '0 14px',
            border: '1px solid #C9C9C9',
            background: '#FFFFFF',
            borderRadius: 0,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {isNl ? 'Wis filters' : 'Clear filters'}
        </button>

        {/* Count indicator */}
        <span style={{ fontSize: '13px', color: '#4D4D4D', marginLeft: 'auto', alignSelf: 'center' }}>
          {isNl
            ? `${sortedRows.length} van ${processedOrders.length} orders`
            : `${sortedRows.length} of ${processedOrders.length} orders`}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #DADADA', borderRadius: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: '880px' }}>
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(112px, 0.8fr) minmax(170px, 1.6fr) minmax(128px, 1fr) 52px minmax(168px, 1.2fr) minmax(150px, 1fr)',
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
            <button
              onClick={() => handleSort('nr')}
              style={{
                border: 0,
                background: 'transparent',
                padding: 0,
                textAlign: 'left',
                fontWeight: 600,
                fontSize: '13px',
                color: '#6B6B6B',
                cursor: 'pointer',
              }}
            >
              Order {getSortIndicator('nr')}
            </button>

            <button
              onClick={() => handleSort('klant')}
              style={{
                border: 0,
                background: 'transparent',
                padding: 0,
                textAlign: 'left',
                fontWeight: 600,
                fontSize: '13px',
                color: '#6B6B6B',
                cursor: 'pointer',
              }}
            >
              {isNl ? 'Klant en referentie' : 'Customer and reference'} {getSortIndicator('klant')}
            </button>

            <button
              onClick={() => handleSort('received')}
              style={{
                border: 0,
                background: 'transparent',
                padding: 0,
                textAlign: 'left',
                fontWeight: 600,
                fontSize: '13px',
                color: '#6B6B6B',
                cursor: 'pointer',
              }}
            >
              {isNl ? 'Ontvangen en mailbox' : 'Received and mailbox'} {getSortIndicator('received')}
            </button>

            <span>{isNl ? 'Regels' : 'Lines'}</span>

            <button
              onClick={() => handleSort('conf')}
              style={{
                border: 0,
                background: 'transparent',
                padding: 0,
                textAlign: 'left',
                fontWeight: 600,
                fontSize: '13px',
                color: '#6B6B6B',
                cursor: 'pointer',
              }}
            >
              Confidence {getSortIndicator('conf')}
            </button>

            <span>{isNl ? 'Status en Outlook' : 'Status and Outlook'}</span>
          </div>

          {/* Table Rows */}
          {sortedRows.map((o, idx) => (
            <button
              key={o.nr}
              className="a-stag row"
              onClick={() => onOpenOrder && onOpenOrder(o.nr)}
              style={{
                animationDelay: `${Math.min(idx, 12) * 35}ms`,
                display: 'grid',
                gridTemplateColumns:
                  'minmax(112px, 0.8fr) minmax(170px, 1.6fr) minmax(128px, 1fr) 52px minmax(168px, 1.2fr) minmax(150px, 1fr)',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                border: 0,
                borderBottom: '1px solid #EBEBEB',
                background: '#FFFFFF',
                textAlign: 'left',
                alignItems: 'center',
                color: '#242424',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {/* Col 1: Order nr */}
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {o.nr}
              </span>

              {/* Col 2: Klant en referentie */}
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{o.klant}</span>
                <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
                  {o.ref} · {o.klantNr}
                </span>
              </span>

              {/* Col 3: Ontvangen en mailbox */}
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span>
                  {o.day}{' '}
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12px',
                      color: '#4D4D4D',
                    }}
                  >
                    {o.time}
                  </span>
                </span>
                <span style={{ fontSize: '13px', color: '#4D4D4D' }}>{o.mbLabel}</span>
              </span>

              {/* Col 4: Regels */}
              <span style={{ fontWeight: 600 }}>{o.n}</span>

              {/* Col 5: Confidence */}
              <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                <ConfidenceBadge
                  value={o.avg || 0}
                  threshold={threshold}
                  showLabel={false}
                />
                <span style={{ fontSize: '12px', color: '#4D4D4D' }}>{o.underTxt}</span>
              </span>

              {/* Col 6: Status en Outlook */}
              <span style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    background: o.stBg,
                    color: o.stFg,
                    border: `1px solid ${o.stBd}`,
                    borderRadius: '2px',
                  }}
                >
                  {o.isProcessing && (
                    <span
                      className="a-pulse"
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#E20714',
                        display: 'block',
                      }}
                    />
                  )}
                  {o.stLabel}
                </span>

                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4D4D4D' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      background: o.tagColor,
                      display: 'block',
                      flex: 'none',
                    }}
                  />
                  Outlook: {o.tagLabel}
                </span>
              </span>
            </button>
          ))}

          {/* Empty message */}
          {sortedRows.length === 0 && (
            <div style={{ padding: '32px 16px', color: '#4D4D4D' }}>
              {isNl ? 'Geen orders voor deze filters.' : 'No orders matching these filters.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
