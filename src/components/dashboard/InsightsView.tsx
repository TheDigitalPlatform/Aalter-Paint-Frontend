import React from 'react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { type Language } from '../common/LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';

interface InsightsViewProps {
  language?: Language;
  onNavigateToOrders?: () => void;
  onNavigateToExceptions?: () => void;
  onNavigateToLearning?: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  language,
  onNavigateToOrders,
  onNavigateToExceptions,
  onNavigateToLearning,
}) => {
  const { language: ctxLang } = useLanguage();
  const activeLang = language || ctxLang || 'NL';
  const isNl = activeLang === 'NL';

  const attentionItems = [
    {
      id: 'att-1',
      value: 3,
      color: '#8A3405',
      title: isNl ? 'Onzekere artikelmatches' : 'Uncertain article matches',
      text: isNl
        ? 'onder de drempel van 70%, verspreid over 2 orders'
        : 'below the threshold of 70%, spread over 2 orders',
      cta: isNl ? 'Toon deze orders' : 'Show these orders',
      action: onNavigateToOrders,
      d: 80,
    },
    {
      id: 'att-2',
      value: 1,
      color: '#A61B1B',
      title: isNl ? 'Ontbrekende hoeveelheid of eenheid' : 'Missing quantity or unit',
      text: isNl ? 'in AP-26-04818' : 'in AP-26-04818',
      cta: isNl ? 'Open de order' : 'Open order',
      action: onNavigateToOrders,
      d: 150,
    },
    {
      id: 'att-3',
      value: 1,
      color: '#A61B1B',
      title: isNl ? 'Orders wachten langer dan 4 uur' : 'Orders waiting longer than 4 hours',
      text: isNl ? 'langst wachtend: AP-26-04816 (4u 12m)' : 'longest waiting: AP-26-04816 (4h 12m)',
      cta: isNl ? 'Toon deze orders' : 'Show these orders',
      action: onNavigateToOrders,
      d: 220,
    },
    {
      id: 'att-4',
      value: 2,
      color: '#A61B1B',
      title: isNl ? 'Mislukte BC-synchronisaties' : 'Failed BC synchronizations',
      text: isNl
        ? 'AP-26-04812, AP-26-04811 wachten op opvolging'
        : 'AP-26-04812, AP-26-04811 waiting for follow-up',
      cta: isNl ? 'Naar uitzonderingen' : 'To exceptions',
      action: onNavigateToExceptions,
      d: 290,
    },
    {
      id: 'att-5',
      value: 1,
      color: '#8A3405',
      title: isNl ? 'Klanten met lage matchkwaliteit' : 'Customers with low match quality',
      text: isNl
        ? 'Schilderwerken Peeters 72% (vandaag)'
        : 'Schilderwerken Peeters 72% (today)',
      cta: isNl ? 'Toon orders' : 'Show orders',
      action: onNavigateToOrders,
      d: 360,
    },
  ];

  const qualityItems = [
    {
      d: 100,
      v: '86,1%',
      l: isNl ? 'precisie van de voorstellen' : 'precision of proposals',
      s: isNl
        ? 'POC-nulmeting op 467 orders, met Business Central als grondwaarheid'
        : 'POC baseline across 467 orders, with Business Central as ground truth',
    },
    {
      d: 170,
      v: '66,6%',
      l: isNl ? 'van de orderregels boven de drempel' : 'of order lines above the threshold',
      s: isNl
        ? 'voorstel met confidence van 70% of meer (POC)'
        : 'proposals with confidence of 70% or more (POC)',
    },
    {
      d: 240,
      v: '80,4%',
      l: isNl ? 'regels al gekend bij vaste klanten' : 'lines already known for regular customers',
      s: isNl
        ? 'leercurve vanaf 50 orders van dezelfde klant (POC)'
        : 'learning curve from 50 orders of the same customer (POC)',
    },
  ];

  return (
    <div className="a-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Subtitle Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
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
            Insights
          </h1>
          <p style={{ margin: 0, color: '#4D4D4D', maxWidth: '720px' }}>
            {isNl
              ? 'Alles wat het systeem opmerkt en meet, rustig op één plek. Klik een inzicht om meteen naar de juiste orders te gaan.'
              : 'Everything the system notices and measures, calmly in one place. Click an insight to immediately go to the relevant orders.'}
          </p>
        </div>
        <span style={{ fontSize: '12px', color: '#6B6B6B' }}>
          {isNl
            ? 'Vandaag: voorbeelddata · Kwaliteit: POC-nulmeting'
            : 'Today: example data · Quality: POC baseline'}
        </span>
      </div>

      {/* 1. Needs Attention Now (Vraagt nu aandacht) */}
      <section
        aria-label={isNl ? 'Vraagt nu aandacht' : 'Needs attention now'}
        style={{
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          borderTop: '4px solid #FFD302',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px 12px',
            padding: '18px 24px 8px 24px',
          }}
        >
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
          <h2
            style={{
              margin: 0,
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '19px',
            }}
          >
            {isNl ? 'Vraagt nu aandacht' : 'Needs attention now'}
          </h2>
          <span style={{ fontSize: '13px', color: '#6B6B6B', marginLeft: 'auto' }}>
            {isNl
              ? 'Wat de AI vandaag opvalt in de open orders'
              : 'What the AI noticed in open orders today'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 24px 8px 24px' }}>
          {attentionItems.map((c) => (
            <button
              key={c.id}
              className="row a-stag"
              onClick={c.action}
              style={{
                animationDelay: `${c.d}ms`,
                display: 'grid',
                gridTemplateColumns: '64px minmax(0, 1fr) auto',
                gap: '20px',
                alignItems: 'center',
                padding: '16px 0',
                border: 0,
                borderBottom: '1px solid #EBEBEB',
                background: 'transparent',
                textAlign: 'left',
                color: '#1A1A1A',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontFamily: "'Archivo', system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: '34px',
                  lineHeight: 1,
                  color: c.color,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {c.value}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>{c.title}</span>
                <span style={{ fontSize: '14px', color: '#4D4D4D' }}>{c.text}</span>
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#E20714',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.cta}
                <svg className="s arw" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Two-Column Grid: AI-prestaties & Operationeel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(440px, 100%), 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Card A: AI Performance */}
        <section
          aria-label={isNl ? 'AI-prestaties' : 'AI Performance'}
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '12px',
              paddingBottom: '8px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '19px',
              }}
            >
              {isNl ? 'AI-prestaties' : 'AI performance'}
            </h2>
            <span style={{ fontSize: '13px', color: '#6B6B6B' }}>{isNl ? 'vandaag' : 'today'}</span>
          </div>

          {/* Average confidence */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '12px 0',
              borderBottom: '1px solid #EBEBEB',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>
                {isNl ? 'Gemiddelde confidence' : 'Average confidence'}
              </span>
              <ConfidenceBadge value={86} threshold={70} showLabel={true} />
            </span>
            <span
              style={{
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: '20px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              86%
            </span>
          </div>

          {/* Distribution bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '14px 0',
              borderBottom: '1px solid #EBEBEB',
            }}
          >
            <span style={{ fontSize: '14px' }}>
              {isNl ? 'Verdeling van 21 orderregels' : 'Distribution of 21 order lines'}
            </span>
            <span
              title={
                isNl
                  ? '14 regels 90% of hoger, 4 tussen 70% en 90%, 3 onder 70%'
                  : '14 lines 90% or higher, 4 between 70% and 90%, 3 below 70%'
              }
              style={{ display: 'flex', gap: '2px', height: '12px' }}
            >
              <span
                className="a-barx"
                style={{ animationDelay: '300ms', display: 'block', width: '67%', background: '#1F9D55' }}
              />
              <span
                className="a-barx"
                style={{ animationDelay: '450ms', display: 'block', width: '19%', background: '#8CCBA6' }}
              />
              <span
                className="a-barx"
                style={{ animationDelay: '600ms', display: 'block', width: '14%', background: '#E8590C' }}
              />
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: '13px', color: '#4D4D4D' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#1F9D55', display: 'block' }} />
                {isNl ? '90% of hoger: ' : '90% or higher: '}
                <strong style={{ color: '#1A1A1A' }}>14</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#8CCBA6', display: 'block' }} />
                {isNl ? '70% tot 90%: ' : '70% to 90%: '}
                <strong style={{ color: '#1A1A1A' }}>4</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#E8590C', display: 'block' }} />
                {isNl ? 'onder 70%: ' : 'below 70%: '}
                <strong style={{ color: '#1A1A1A' }}>3</strong>
              </span>
            </span>
          </div>

          {/* Low orders stat */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '12px 0',
              borderBottom: '1px solid #EBEBEB',
            }}
          >
            <span style={{ fontSize: '14px' }}>
              {isNl ? 'Orders met minstens 1 regel onder 70%' : 'Orders with at least 1 line below 70%'}
            </span>
            <span
              style={{
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: '20px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              3
            </span>
          </div>

          {/* Corrected matches stat */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '12px 0',
              borderBottom: 0,
            }}
          >
            <span style={{ fontSize: '14px' }}>
              {isNl ? 'Artikelmatches gecorrigeerd door beoordelaars' : 'Article matches corrected by reviewers'}
            </span>
            <span
              style={{
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: '20px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              1
            </span>
          </div>
        </section>

        {/* Card B: Operational */}
        <section
          aria-label={isNl ? 'Operationeel' : 'Operational'}
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '12px',
              paddingBottom: '8px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '19px',
              }}
            >
              {isNl ? 'Operationeel' : 'Operational'}
            </h2>
            <span style={{ fontSize: '13px', color: '#6B6B6B' }}>{isNl ? 'vandaag' : 'today'}</span>
          </div>

          {/* Mailbox volumes */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px 0 14px 0',
              borderBottom: '1px solid #EBEBEB',
            }}
          >
            <span style={{ fontSize: '14px' }}>
              {isNl ? 'Bestelmails per mailbox' : 'Order emails per mailbox'}
            </span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 190px) minmax(0, 1fr) 28px',
                alignItems: 'center',
                gap: '12px',
              }}
              title={isNl ? '4 bestelmails vandaag in info@aalterpaint.be' : '4 order emails today in info@aalterpaint.be'}
            >
              <span style={{ fontSize: '13px', color: '#4D4D4D' }}>info@aalterpaint.be</span>
              <span style={{ display: 'block', height: '10px', background: '#F5F5F5' }}>
                <span
                  className="a-barx"
                  style={{ animationDelay: '400ms', display: 'block', height: '10px', width: '100%', background: '#E20714' }}
                />
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, textAlign: 'right' }}>4</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 190px) minmax(0, 1fr) 28px',
                alignItems: 'center',
                gap: '12px',
              }}
              title={isNl ? '3 bestelmails vandaag in bestel@aalterpaint.be' : '3 order emails today in bestel@aalterpaint.be'}
            >
              <span style={{ fontSize: '13px', color: '#4D4D4D' }}>bestel@aalterpaint.be</span>
              <span style={{ display: 'block', height: '10px', background: '#F5F5F5' }}>
                <span
                  className="a-barx"
                  style={{ animationDelay: '400ms', display: 'block', height: '10px', width: '75%', background: '#E20714' }}
                />
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, textAlign: 'right' }}>3</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 190px) minmax(0, 1fr) 28px',
                alignItems: 'center',
                gap: '12px',
              }}
              title={isNl ? '2 bestelmails vandaag in Persoonlijk (P. De Smet)' : '2 order emails today in Personal (P. De Smet)'}
            >
              <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
                {isNl ? 'Persoonlijk (P. De Smet)' : 'Personal (P. De Smet)'}
              </span>
              <span style={{ display: 'block', height: '10px', background: '#F5F5F5' }}>
                <span
                  className="a-barx"
                  style={{ animationDelay: '400ms', display: 'block', height: '10px', width: '50%', background: '#E20714' }}
                />
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, textAlign: 'right' }}>2</span>
            </div>
          </div>

          {/* Average review time */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '12px 0',
              borderBottom: '1px solid #EBEBEB',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px' }}>
                {isNl ? 'Gemiddelde beoordelingstijd' : 'Average review time'}
              </span>
              <span style={{ fontSize: '12px', color: '#6B6B6B' }}>
                {isNl ? 'van AI-resultaat tot goedkeuring' : 'from AI result to approval'}
              </span>
            </span>
            <span
              style={{
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: '20px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              14 min
            </span>
          </div>

          {/* Sync status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '12px 0',
              borderBottom: '1px solid #EBEBEB',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px' }}>
                {isNl ? 'Synchronisatie met Business Central' : 'Synchronization with Business Central'}
              </span>
              <span style={{ fontSize: '12px', color: '#6B6B6B' }}>
                {isNl ? '2 mislukt, 0 bezig' : '2 failed, 0 in progress'}
              </span>
            </span>
            <span
              style={{
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: '20px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              4 / 6
            </span>
          </div>

          {/* Exceptions link button */}
          <button
            className="row"
            onClick={onNavigateToExceptions}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '12px 0',
              border: 0,
              background: 'transparent',
              textAlign: 'left',
              color: '#1A1A1A',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px' }}>
                {isNl ? 'Uitzonderingen' : 'Exceptions'}
              </span>
              <span style={{ fontSize: '12px', color: '#6B6B6B' }}>
                {isNl ? 'BC-inzendingen op te volgen' : 'BC submissions to follow up'}
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontFamily: "'Archivo', system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: '20px',
                  fontVariantNumeric: 'tabular-nums',
                  color: '#A61B1B',
                }}
              >
                2
              </span>
              <svg className="s arw" viewBox="0 0 24 24" style={{ color: '#E20714' }}>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </button>
        </section>
      </div>

      {/* 3. Quality & Learning loop (Kwaliteit en learning loop) */}
      <section
        aria-label={isNl ? 'Kwaliteit en learning loop' : 'Quality and learning loop'}
        style={{
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '19px',
            }}
          >
            {isNl ? 'Kwaliteit en learning loop' : 'Quality and learning loop'}
          </h2>
          <button
            className="lk"
            onClick={onNavigateToLearning}
            style={{
              border: 0,
              background: 'transparent',
              padding: 0,
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#E20714',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            {isNl ? 'Naar learning loop' : 'To learning loop'}
            <svg className="s" viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
            gap: '0',
          }}
        >
          {qualityItems.map((q) => (
            <div
              key={q.l}
              className="a-stag"
              style={{
                animationDelay: `${q.d}ms`,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '4px 20px 4px 0',
                borderLeft: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "'Archivo', system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: '34px',
                  lineHeight: 1.05,
                  color: '#1A1A1A',
                }}
              >
                {q.v}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{q.l}</span>
              <span style={{ fontSize: '13px', color: '#6B6B6B' }}>{q.s}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
