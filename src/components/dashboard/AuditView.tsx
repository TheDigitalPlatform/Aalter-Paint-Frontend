import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import type { Language } from '../../locales/loadLocale';

interface AuditViewProps {
  language?: Language;
}

export interface AuditEvent {
  ts: string;
  type: 'order' | 'ai' | 'bc' | 'instellingen' | 'rollen';
  text: string;
  actor: string;
  kind: 'user' | 'systeem' | 'ai';
  order?: string;
}

const AUDIT_EVENTS: AuditEvent[] = [
  { ts: '01/10/2026 11:20:04', type: 'instellingen', text: 'Confidence-drempel aangepast van 65% naar 70%', actor: 'Bart Van Damme', kind: 'user' },
  { ts: '07/10/2026 09:05:12', type: 'order', text: 'Bestelmail ontvangen in bestel@aalterpaint.be, order AP-26-04809 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04809' },
  { ts: '07/10/2026 09:05:39', type: 'ai', text: 'AI-resultaat AP-26-04809: 2 regels, gemiddelde confidence 99%', actor: 'AI', kind: 'ai', order: 'AP-26-04809' },
  { ts: '07/10/2026 09:22:10', type: 'order', text: 'Order AP-26-04809 goedgekeurd', actor: 'Katrien Vermeulen', kind: 'user', order: 'AP-26-04809' },
  { ts: '07/10/2026 09:22:16', type: 'bc', text: 'Verkooporder VO-26-018715 aangemaakt in Business Central', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04809' },
  { ts: '07/10/2026 11:30:02', type: 'order', text: 'Bestelmail ontvangen in bestel@aalterpaint.be, order AP-26-04810 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04810' },
  { ts: '07/10/2026 11:30:31', type: 'ai', text: 'AI-resultaat AP-26-04810: 1 regel, confidence 98%', actor: 'AI', kind: 'ai', order: 'AP-26-04810' },
  { ts: '07/10/2026 11:58:40', type: 'order', text: 'Order AP-26-04810 goedgekeurd', actor: 'Pieter De Smet', kind: 'user', order: 'AP-26-04810' },
  { ts: '07/10/2026 11:58:47', type: 'bc', text: 'Verkooporder VO-26-018721 aangemaakt in Business Central', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04810' },
  { ts: '07/10/2026 15:12:08', type: 'order', text: 'Bestelmail ontvangen in persoonlijke mailbox van Pieter De Smet, order AP-26-04811 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04811' },
  { ts: '07/10/2026 15:12:44', type: 'ai', text: 'AI-resultaat AP-26-04811: handgeschreven bon, OCR-kwaliteit 71%, 2 regels', actor: 'AI', kind: 'ai', order: 'AP-26-04811' },
  { ts: '07/10/2026 15:40:12', type: 'order', text: 'Order AP-26-04811 goedgekeurd', actor: 'Katrien Vermeulen', kind: 'user', order: 'AP-26-04811' },
  { ts: '07/10/2026 15:40:19', type: 'bc', text: 'BC-sync mislukt: artikel PZN00220-20KG is geblokkeerd', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04811' },
  { ts: '07/10/2026 16:48:02', type: 'order', text: 'Bestelmail ontvangen in bestel@aalterpaint.be, order AP-26-04812 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04812' },
  { ts: '07/10/2026 16:48:30', type: 'ai', text: 'AI-resultaat AP-26-04812: 2 regels, gemiddelde confidence 94%. Klantherkenning 72%: nieuw btw-nummer', actor: 'AI', kind: 'ai', order: 'AP-26-04812' },
  { ts: '07/10/2026 17:05:44', type: 'order', text: 'Order AP-26-04812 goedgekeurd', actor: 'Pieter De Smet', kind: 'user', order: 'AP-26-04812' },
  { ts: '07/10/2026 17:05:51', type: 'bc', text: 'BC-sync mislukt: klant niet gevonden (btw-nummer BE 0712.345.678)', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04812' },
  { ts: '07/10/2026 17:30:10', type: 'instellingen', text: 'Herkenningsregel info@aalterpaint.be aangepast: mails met trefwoord "offerte" uitgesloten', actor: 'Jens Goossens', kind: 'user' },
  { ts: '08/10/2026 07:58:31', type: 'bc', text: 'Opnieuw versturen AP-26-04812 mislukt: klant niet gevonden', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04812' },
  { ts: '08/10/2026 08:15:07', type: 'order', text: 'Bestelmail ontvangen in info@aalterpaint.be, order AP-26-04813 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04813' },
  { ts: '08/10/2026 08:15:40', type: 'ai', text: 'AI-resultaat AP-26-04813: mogelijke dubbele bestelling van AP-26-04808 gedetecteerd', actor: 'AI', kind: 'ai', order: 'AP-26-04813' },
  { ts: '08/10/2026 08:40:03', type: 'order', text: 'Bestelmail ontvangen in info@aalterpaint.be, order AP-26-04814 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04814' },
  { ts: '08/10/2026 08:40:27', type: 'ai', text: 'AI-resultaat AP-26-04814: 2 regels, gemiddelde confidence 95%', actor: 'AI', kind: 'ai', order: 'AP-26-04814' },
  { ts: '08/10/2026 08:52:03', type: 'order', text: 'Order AP-26-04813 afgewezen: dubbele bestelling', actor: 'Katrien Vermeulen', kind: 'user', order: 'AP-26-04813' },
  { ts: '08/10/2026 08:52:04', type: 'order', text: 'Outlook-tag op bronmail gewijzigd naar "Afgewezen"', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04813' },
  { ts: '08/10/2026 09:02:11', type: 'order', text: 'Bestelmail ontvangen in bestel@aalterpaint.be, order AP-26-04815 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04815' },
  { ts: '08/10/2026 09:02:33', type: 'ai', text: 'AI-resultaat AP-26-04815: 3 regels, 1 onder de drempel', actor: 'AI', kind: 'ai', order: 'AP-26-04815' },
  { ts: '08/10/2026 09:15:20', type: 'order', text: 'Order AP-26-04814 goedgekeurd', actor: 'Pieter De Smet', kind: 'user', order: 'AP-26-04814' },
  { ts: '08/10/2026 09:15:26', type: 'bc', text: 'Verkooporder VO-26-018737 aangemaakt in Business Central', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04814' },
  { ts: '08/10/2026 09:20:05', type: 'order', text: 'Bestelmail ontvangen in info@aalterpaint.be, order AP-26-04816 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04816' },
  { ts: '08/10/2026 09:20:41', type: 'ai', text: 'AI-resultaat AP-26-04816: 3 regels, 1 onder de drempel, 1 regel 100% via learning loop', actor: 'AI', kind: 'ai', order: 'AP-26-04816' },
  { ts: '08/10/2026 09:38:10', type: 'order', text: 'Reviewercorrectie AP-26-04815 regel 2: CLA05675-2.5L vervangen door CLA05676-2.5L, confidence 54% naar 100%', actor: 'Katrien Vermeulen', kind: 'user', order: 'AP-26-04815' },
  { ts: '08/10/2026 09:41:02', type: 'order', text: 'Order AP-26-04815 goedgekeurd', actor: 'Katrien Vermeulen', kind: 'user', order: 'AP-26-04815' },
  { ts: '08/10/2026 09:41:09', type: 'bc', text: 'Verkooporder VO-26-018738 aangemaakt in Business Central', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04815' },
  { ts: '08/10/2026 10:05:00', type: 'rollen', text: 'Rol van Pieter De Smet gewijzigd van Verkoop naar Beoordelaar', actor: 'Bart Van Damme', kind: 'user' },
  { ts: '08/10/2026 10:52:14', type: 'order', text: 'Bestelmail ontvangen in bestel@aalterpaint.be, order AP-26-04817 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04817' },
  { ts: '08/10/2026 10:52:40', type: 'ai', text: 'AI-resultaat AP-26-04817: 3 regels, gemiddelde confidence 97%', actor: 'AI', kind: 'ai', order: 'AP-26-04817' },
  { ts: '08/10/2026 11:38:22', type: 'order', text: 'Bestelmail ontvangen in persoonlijke mailbox van Pieter De Smet, order AP-26-04818 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04818' },
  { ts: '08/10/2026 11:39:05', type: 'ai', text: 'AI-resultaat AP-26-04818: handgeschreven bon, OCR-kwaliteit 64%, 1 hoeveelheid ontbreekt, 1 RAL-code ontbreekt', actor: 'AI', kind: 'ai', order: 'AP-26-04818' },
  { ts: '08/10/2026 14:05:09', type: 'order', text: 'Bestelmail ontvangen in info@aalterpaint.be, order AP-26-04819 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04819' },
  { ts: '08/10/2026 14:05:47', type: 'ai', text: 'AI-resultaat AP-26-04819: 4 regels, 2 onder de drempel, controle basis mislukt op regel 1', actor: 'AI', kind: 'ai', order: 'AP-26-04819' },
  { ts: '08/10/2026 15:47:03', type: 'order', text: 'Bestelmail ontvangen in bestel@aalterpaint.be, order AP-26-04820 aangemaakt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04820' },
  { ts: '08/10/2026 15:47:29', type: 'ai', text: 'AI-resultaat AP-26-04820: 4 regels, gemiddelde confidence 95%', actor: 'AI', kind: 'ai', order: 'AP-26-04820' },
  { ts: '08/10/2026 16:22:18', type: 'order', text: 'Bestelmail ontvangen in bestel@aalterpaint.be, order AP-26-04821 aangemaakt, OCR loopt', actor: 'Systeem', kind: 'systeem', order: 'AP-26-04821' },
];

const TYPE_CONFIG = [
  { k: 'alle', lNl: 'Alle', lEn: 'All' },
  { k: 'order', lNl: 'Order', lEn: 'Order' },
  { k: 'ai', lNl: 'AI', lEn: 'AI' },
  { k: 'bc', lNl: 'BC-sync', lEn: 'BC sync' },
  { k: 'instellingen', lNl: 'Instellingen', lEn: 'Settings' },
  { k: 'rollen', lNl: 'Rollen en toegang', lEn: 'Roles and access' },
];

const TYPE_LABELS: Record<string, { nl: string; en: string }> = {
  order: { nl: 'Order', en: 'Order' },
  ai: { nl: 'AI', en: 'AI' },
  bc: { nl: 'BC-sync', en: 'BC sync' },
  instellingen: { nl: 'Instellingen', en: 'Settings' },
  rollen: { nl: 'Rollen en toegang', en: 'Roles and access' },
};

export const AuditView: React.FC<AuditViewProps> = ({ language: propLang }) => {
  const { language: ctxLang } = useTranslation();
  const lang = propLang || ctxLang || 'NL';
  const isNl = lang === 'NL';

  const [activeType, setActiveType] = useState<string>('alle');
  const [orderFilter, setOrderFilter] = useState<string>('');

  // Compute counts for each filter type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { alle: AUDIT_EVENTS.length };
    for (const item of AUDIT_EVENTS) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
    return counts;
  }, []);

  // Filtered rows (newest first, matching template.html)
  const filteredEvents = useMemo(() => {
    return AUDIT_EVENTS.slice()
      .reverse()
      .filter((e) => {
        if (activeType !== 'alle' && e.type !== activeType) return false;
        if (orderFilter.trim()) {
          const query = orderFilter.trim().toUpperCase();
          const matchesOrder = e.order && e.order.toUpperCase().includes(query);
          const matchesText = e.text.toUpperCase().includes(query);
          if (!matchesOrder && !matchesText) return false;
        }
        return true;
      });
  }, [activeType, orderFilter]);

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
          {isNl ? 'Audittrail' : 'Audit trail'}
        </h1>
        <p style={{ margin: 0, color: '#4D4D4D' }}>
          {isNl
            ? 'Alles wat er met een order of de configuratie gebeurt, door wie of wat, in volgorde.'
            : 'Everything that happens with an order or configuration, by who or what, in order.'}
        </p>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'flex-end',
          padding: '14px 16px',
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          borderRadius: 0,
        }}
      >
        {/* Type Filter Buttons matching Image 1 and template.html */}
        <div role="group" aria-label="Type" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {TYPE_CONFIG.map((t) => {
            const count = typeCounts[t.k] || 0;
            const isOn = activeType === t.k;
            const label = isNl ? t.lNl : t.lEn;

            return (
              <button
                key={t.k}
                onClick={() => setActiveType(t.k)}
                aria-pressed={isOn}
                style={{
                  minHeight: '40px',
                  padding: '0 12px',
                  border: `1px solid ${isOn ? '#E20714' : '#DADADA'}`,
                  background: '#FFFFFF',
                  color: isOn ? '#E20714' : '#1A1A1A',
                  borderRadius: 0,
                  fontSize: '14px',
                  fontWeight: isOn ? 700 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{label}</span>
                <span style={{ fontWeight: isOn ? 700 : 400, color: isOn ? '#E20714' : '#4D4D4D' }}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Order Search Filter */}
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '13px',
            fontWeight: 600,
            flex: '1 1 200px',
            maxWidth: '280px',
            color: '#1A1A1A',
          }}
        >
          {isNl ? 'Filter op order' : 'Filter by order'}
          <input
            type="search"
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
            placeholder={isNl ? 'bv. AP-26-04819' : 'e.g. AP-26-04819'}
            style={{
              height: '40px',
              padding: '0 10px',
              border: '1px solid #C9C9C9',
              borderRadius: 0,
              fontSize: '15px',
              fontWeight: 400,
              background: '#FFFFFF',
              color: '#1A1A1A',
            }}
          />
        </label>

        {/* Counter */}
        <span
          style={{
            fontSize: '13px',
            color: '#4D4D4D',
            marginLeft: 'auto',
            alignSelf: 'center',
            paddingTop: '8px',
          }}
        >
          {isNl
            ? `${filteredEvents.length} van ${AUDIT_EVENTS.length} gebeurtenissen`
            : `${filteredEvents.length} of ${AUDIT_EVENTS.length} events`}
        </span>
      </div>

      {/* Events Feed Container */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
        }}
      >
        {filteredEvents.map((e, idx) => {
          const typeLabel = TYPE_LABELS[e.type]
            ? isNl
              ? TYPE_LABELS[e.type].nl
              : TYPE_LABELS[e.type].en
            : e.type;

          const isAi = e.kind === 'ai' || e.actor === 'AI';
          const isSys = e.kind === 'systeem' || e.actor === 'Systeem';
          const actorBg = isAi ? '#FFF3B8' : isSys ? '#F2F2F2' : '#E7EEFC';
          const actorFg = isAi ? '#5C4A00' : isSys ? '#4D4D4D' : '#1D4FBF';

          return (
            <div
              key={`${e.ts}-${idx}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '172px minmax(0, 1fr) auto',
                gap: '8px 16px',
                padding: '12px 16px',
                borderBottom: '1px solid #EBEBEB',
                alignItems: 'start',
                fontSize: '14px',
              }}
            >
              {/* Timestamp */}
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '13px',
                  color: '#242424',
                  whiteSpace: 'nowrap',
                }}
              >
                {e.ts}
              </span>

              {/* Event Content & Tags */}
              <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', color: '#1A1A1A', lineHeight: 1.4 }}>
                  {e.text}
                </span>

                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '1px 7px',
                      border: '1px solid #C9C9C9',
                      color: '#4D4D4D',
                      background: '#FFFFFF',
                      borderRadius: '2px',
                    }}
                  >
                    {typeLabel}
                  </span>

                  {e.order && (
                    <button
                      className="lk"
                      onClick={() => setOrderFilter(e.order || '')}
                      title={isNl ? `Filter op order ${e.order}` : `Filter by order ${e.order}`}
                      style={{
                        border: 0,
                        background: 'transparent',
                        padding: '0 4px',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#242424',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      {e.order}
                    </button>
                  )}
                </span>
              </span>

              {/* Actor Badge */}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  background: actorBg,
                  color: actorFg,
                  whiteSpace: 'nowrap',
                  borderRadius: '2px',
                  flex: 'none',
                }}
              >
                {e.actor}
              </span>
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#4D4D4D', fontSize: '14px' }}>
            {isNl ? 'Geen gebeurtenissen voor deze filter.' : 'No events found for this filter.'}
          </div>
        )}
      </div>
    </div>
  );
};
