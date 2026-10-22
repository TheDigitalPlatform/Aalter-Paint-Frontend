import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import type { Language } from '../../locales/loadLocale';

interface LearningViewProps {
  language?: Language;
}

interface LearnedItem {
  date: string;
  kind: 'Opvolgartikel' | 'Controle' | 'Drempel' | 'Koppeling';
  titleNl: string;
  titleEn: string;
  effectNl: string;
  effectEn: string;
  by: string;
  isNew?: boolean;
}

const LEARNED_ITEMS: LearnedItem[] = [
  {
    date: '08/10/2026',
    kind: 'Koppeling',
    titleNl: 'Correctie "Aqualaq mat B 2,5" naar CLA05676-2.5L bevestigd voor Hubo / Plafomat Aalter',
    titleEn: 'Correction "Aqualaq mat B 2,5" to CLA05676-2.5L confirmed for Hubo / Plafomat Aalter',
    effectNl: 'Deze omschrijving wordt bij deze klant voortaan aan basis B gekoppeld in plaats van basis A.',
    effectEn: 'This description will now be linked to Base B instead of Base A for this customer.',
    by: 'Katrien Vermeulen',
  },
  {
    date: '06/10/2026',
    kind: 'Koppeling',
    titleNl: 'Koppeling klantomschrijving "polyguard 7016 kit" naar PGD01180-KIT-10L bewaard na bevestiging',
    titleEn: 'Mapping for customer description "polyguard 7016 kit" to PGD01180-KIT-10L saved after confirmation',
    effectNl: 'Bij de volgende order van Bellens-Beneens wordt de regel automatisch voorgesteld met 100% score. Zie AP-26-04816 vandaag.',
    effectEn: 'On the next order from Bellens-Beneens, the line will be suggested automatically with 100% score. See AP-26-04816 today.',
    by: 'Katrien Vermeulen',
  },
  {
    date: '03/10/2026',
    kind: 'Koppeling',
    titleNl: 'Koppeling klantomschrijving "muurverf mat wit 10L" naar CLA05675-10L bewaard voor Hubo / Plafomat',
    titleEn: 'Mapping for customer description "muurverf mat wit 10L" to CLA05675-10L saved for Hubo / Plafomat',
    effectNl: 'Bij de volgende order van deze klant wordt de regel automatisch voorgesteld met 100% score.',
    effectEn: 'On the next order from this customer, the line will be suggested automatically with 100% score.',
    by: 'Pieter De Smet',
  },
  {
    date: '01/10/2026',
    kind: 'Drempel',
    titleNl: 'Bart Van Damme paste de drempel aan van 65% naar 70%',
    titleEn: 'Bart Van Damme adjusted the threshold from 65% to 70%',
    effectNl: 'Regels onder 70% krijgen extra aandacht. Elke order wordt nog steeds door een medewerker goedgekeurd.',
    effectEn: 'Lines below 70% receive extra attention. Every order is still approved by an employee.',
    by: 'Bart Van Damme',
  },
  {
    date: '29/09/2026',
    kind: 'Controle',
    titleNl: 'Nieuwe controle op basis en RAL-code toegevoegd na herhaalde correcties',
    titleEn: 'New check on base and RAL code added after repeated corrections',
    effectNl: '9 correcties in september gingen over een verkeerde basis of kleur. Regels waarvan basis of RAL-code afwijkt van de bon krijgen nu automatisch extra aandacht.',
    effectEn: '9 corrections in September involved an incorrect base or color. Lines whose base or RAL code deviates from the order slip now automatically receive extra attention.',
    by: 'Bart Van Damme',
  },
  {
    date: '24/09/2026',
    kind: 'Opvolgartikel',
    titleNl: 'Opvolgartikel PZN00221-20KG geleerd voor "Polyzinc 20 kg"',
    titleEn: 'Successor item PZN00221-20KG learned for "Polyzinc 20 kg"',
    effectNl: 'Nieuwe orders voor Polyzinc 20 kg worden aan het actieve artikel gekoppeld, niet meer aan het geblokkeerde PZN00220-20KG.',
    effectEn: 'New orders for Polyzinc 20 kg are linked to the active item, no longer to the blocked PZN00220-20KG.',
    by: 'Katrien Vermeulen',
  },
];

const TREND_DATA = [
  { label: '1e order', pct: 0, pctStr: '0%', h: 2, color: '#1A1A1A' },
  { label: '2-3', pct: 31.9, pctStr: '31,9%', h: 51, color: '#1A1A1A' },
  { label: '4-6', pct: 48.2, pctStr: '48,2%', h: 77, color: '#1A1A1A' },
  { label: '7-10', pct: 58.3, pctStr: '58,3%', h: 93, color: '#1A1A1A' },
  { label: '11-20', pct: 65.6, pctStr: '65,6%', h: 105, color: '#1A1A1A' },
  { label: '21-50', pct: 73.6, pctStr: '73,6%', h: 118, color: '#1A1A1A' },
  { label: '50+', pct: 80.4, pctStr: '80,4%', h: 129, color: '#E20714' },
];

const KIND_STYLE: Record<LearnedItem['kind'], [string, string]> = {
  Koppeling: ['#FFF3B8', '#5C4A00'],
  Drempel: ['#E7EEFC', '#1D4FBF'],
  Controle: ['#EBEBEB', '#242424'],
  Opvolgartikel: ['#F2F2F2', '#4D4D4D'],
};

export const LearningView: React.FC<LearningViewProps> = ({ language: propLang }) => {
  const { language: ctxLang } = useTranslation();
  const lang = propLang || ctxLang || 'NL';
  const isNl = lang === 'NL';

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimated(true);
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="a-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
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
          Learning loop
        </h1>
        <p style={{ margin: 0, color: '#4D4D4D' }}>
          {isNl
            ? 'Wat het AI-brein leerde uit gebruik en uit correcties van beoordelaars, en wat dat concreet verandert. De percentages en de leercurve komen uit de POC-nulmeting; de lijst met geleerde koppelingen is voorbeelddata.'
            : 'What the AI brain learned from usage and reviewer corrections, and what that specifically changes. The percentages and learning curve come from the POC baseline measurement; the list of learned links is sample data.'}
        </p>
      </div>

      {/* Human-in-the-Loop Callout Banner */}
      <div
        style={{
          background: '#FFF8D6',
          color: '#242424',
          border: '1px solid #F2E3A0',
          borderRadius: 0,
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 24px',
          alignItems: 'center',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: '12px',
            height: '12px',
            background: '#E8BE00',
            borderRadius: '50%',
            display: 'block',
            flex: 'none',
          }}
        />
        <span
          style={{
            fontFamily: "'Archivo', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '19px',
            letterSpacing: 0,
            flex: '1 1 300px',
            lineHeight: 1.25,
          }}
        >
          {isNl
            ? 'Enkel door een mens bevestigde koppelingen komen in het model'
            : 'Only human-confirmed mappings enter the model'}
        </span>
        <span style={{ fontSize: '14px', color: '#4D4D4D', flex: '1 1 320px', lineHeight: 1.45 }}>
          {isNl
            ? 'Een voorstel van de AI telt pas als een beoordelaar het bevestigt of corrigeert en de order goedkeurt. Afgewezen orders en onbevestigde voorstellen worden niet bewaard.'
            : 'An AI suggestion only counts when a reviewer confirms or corrects it and approves the order. Rejected orders and unconfirmed proposals are not retained.'}
        </span>
      </div>

      {/* 4 Summary Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderRadius: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '34px',
              lineHeight: 1.1,
              color: '#1A1A1A',
            }}
          >
            14
          </span>
          <span style={{ fontSize: '14px', color: '#4D4D4D', lineHeight: 1.4 }}>
            {isNl
              ? 'artikelcorrecties bevestigd door beoordelaars deze maand'
              : 'item corrections confirmed by reviewers this month'}
          </span>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderRadius: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '34px',
              lineHeight: 1.1,
              color: '#1A1A1A',
            }}
          >
            37
          </span>
          <span style={{ fontSize: '14px', color: '#4D4D4D', lineHeight: 1.4 }}>
            {isNl
              ? 'klantomschrijvingen bewaard als vaste koppeling'
              : 'customer descriptions saved as permanent link'}
          </span>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderRadius: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '34px',
              lineHeight: 1.1,
              color: '#1A1A1A',
            }}
          >
            2
          </span>
          <span style={{ fontSize: '14px', color: '#4D4D4D', lineHeight: 1.4 }}>
            {isNl
              ? 'nieuwe controles toegevoegd na herhaalde correcties'
              : 'new checks added after repeated corrections'}
          </span>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderRadius: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '34px',
              lineHeight: 1.1,
              color: '#1A1A1A',
            }}
          >
            66,6%
          </span>
          <span style={{ fontSize: '14px', color: '#4D4D4D', lineHeight: 1.4 }}>
            {isNl
              ? 'van de orderregels krijgt een voorstel boven de drempel van 70% (POC)'
              : 'of order lines receive a proposal above the 70% threshold (POC)'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Feed: Wat werd geleerd */}
        <section
          aria-label={isNl ? 'Wat werd geleerd' : 'What was learned'}
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
          }}
        >
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #DADADA' }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '18px',
                letterSpacing: 0,
                color: '#1A1A1A',
              }}
            >
              {isNl ? 'Wat werd geleerd' : 'What was learned'}
            </h2>
          </div>

          {LEARNED_ITEMS.map((it, idx) => {
            const kindStyle = KIND_STYLE[it.kind] || ['#F5F5F5', '#4D4D4D'];
            const title = isNl ? it.titleNl : it.titleEn;
            const effect = isNl ? it.effectNl : it.effectEn;

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '24px',
                  padding: '18px 24px',
                  borderBottom: idx === LEARNED_ITEMS.length - 1 ? 'none' : '1px solid #EBEBEB',
                  background: '#FFFFFF',
                }}
              >
                {/* Date & Kind Pill inline side by side */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flex: '0 0 190px',
                    paddingTop: '2px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '13px',
                      color: '#4D4D4D',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.date}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      background: kindStyle[0],
                      color: kindStyle[1],
                      borderRadius: '2px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.kind}
                  </span>
                </div>

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A', lineHeight: 1.35 }}>
                    {title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#242424', lineHeight: 1.45 }}>
                    <span style={{ fontWeight: 700 }}>
                      {isNl ? 'Wat verandert: ' : 'What changes: '}
                    </span>
                    {effect}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px' }}>
                    {isNl ? `Bevestigd door ${it.by}` : `Confirmed by ${it.by}`}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Customer Learning Curve (Bar Chart) */}
        <section
          aria-label={isNl ? 'Leercurve per klant' : 'Learning curve per customer'}
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            borderRadius: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '18px',
                letterSpacing: 0,
                color: '#1A1A1A',
              }}
            >
              {isNl ? 'Leercurve per klant' : 'Learning curve per customer'}
            </h2>
            <span style={{ fontSize: '13px', color: '#4D4D4D', lineHeight: 1.4 }}>
              {isNl
                ? 'Aandeel orderregels dat de klant al eerder bestelde, naar aantal orders van die klant · POC-nulmeting op 5.809 orders van 521 klanten over 8 maanden'
                : 'Share of order lines the customer ordered before, by number of orders from that customer · POC baseline on 5,809 orders from 521 customers over 8 months'}
            </span>
          </div>

          {/* Bar Chart Container */}
          <div
            style={{
              position: 'relative',
              height: '210px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '20px',
              padding: '0 0 0 52px',
              borderBottom: '1px solid #1A1A1A',
            }}
          >
            {/* Horizontal Grid lines */}
            <span
              style={{
                position: 'absolute',
                left: '52px',
                right: 0,
                bottom: '160px',
                borderTop: '1px solid #EBEBEB',
                display: 'block',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 0,
                bottom: '154px',
                fontSize: '11px',
                color: '#6B6B6B',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              100%
            </span>

            <span
              style={{
                position: 'absolute',
                left: '52px',
                right: 0,
                bottom: '80px',
                borderTop: '1px solid #EBEBEB',
                display: 'block',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 0,
                bottom: '74px',
                fontSize: '11px',
                color: '#6B6B6B',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              50%
            </span>

            <span
              style={{
                position: 'absolute',
                left: 0,
                bottom: '0px',
                fontSize: '11px',
                color: '#6B6B6B',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              0%
            </span>

            {/* Bars */}
            {TREND_DATA.map((b, i) => {
              const isHovered = hoveredIndex === i;
              const delayMs = i * 85;
              const targetHeight = animated ? `${b.h}px` : '0px';

              return (
                <div
                  key={b.label}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  title={`${b.label}: ${b.pctStr}`}
                  style={{
                    flex: '1 1 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '6px',
                    height: '100%',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  {/* Floating percentage label with fade-in and slide-up animation */}
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isHovered
                        ? (b.color === '#E20714' ? '#E20714' : '#000000')
                        : '#1A1A1A',
                      fontFamily: "'IBM Plex Mono', monospace",
                      lineHeight: 1,
                      opacity: animated ? 1 : 0,
                      transform: animated
                        ? (isHovered ? 'translateY(-2px)' : 'translateY(0)')
                        : 'translateY(10px)',
                      transition: `opacity 0.45s ease ${delayMs + 160}ms, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs + 160}ms, color 0.15s ease`,
                    }}
                  >
                    {b.pctStr}
                  </span>

                  {/* Bar with smooth upward grow animation and hover elevation */}
                  <span
                    style={{
                      display: 'block',
                      width: '100%',
                      maxWidth: '68px',
                      height: targetHeight,
                      background: b.color,
                      borderRadius: 0,
                      opacity: isHovered ? 0.92 : 1,
                      transformOrigin: 'bottom',
                      transform: isHovered ? 'scaleY(1.02)' : 'scaleY(1)',
                      boxShadow: isHovered
                        ? (b.color === '#E20714'
                            ? '0 -4px 14px rgba(226, 7, 20, 0.35)'
                            : '0 -4px 12px rgba(0, 0, 0, 0.18)')
                        : 'none',
                      transition: `height 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease`,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div style={{ display: 'flex', gap: '20px', paddingLeft: '52px' }}>
            {TREND_DATA.map((b) => (
              <span
                key={b.label}
                style={{
                  flex: '1 1 0',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#4D4D4D',
                  fontWeight: 500,
                }}
              >
                {b.label}
              </span>
            ))}
          </div>

          {/* Footnote Explanation */}
          <span style={{ fontSize: '13px', color: '#4D4D4D', lineHeight: 1.55 }}>
            {isNl
              ? 'Van 0% bij de eerste order naar 80,4% vanaf 50 orders. Gecombineerd met het basisniveau verwacht de POC ±69% na drie orders, ±82% na twintig en ±87% bij vaste klanten. Elke bevestigde koppeling in de learning loop duwt een klant verder op deze curve.'
              : 'From 0% on the first order to 80.4% from 50 orders onward. Combined with the baseline level, the POC projects ±69% after three orders, ±82% after twenty, and ±87% for regular customers. Every confirmed link in the learning loop pushes a customer further along this curve.'}
          </span>
        </section>
      </div>
    </div>
  );
};
