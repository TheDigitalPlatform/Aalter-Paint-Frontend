import React, { useState } from 'react';
import { toast } from 'sonner';
import { INITIAL_ORDERS, type OrderItem } from '../../data/mockData';
import { useTranslation } from '../../context/LanguageContext';
import type { Language } from '../../locales/loadLocale';

interface SettingsViewProps {
  language?: Language;
  userName?: string;
}

interface MailboxRule {
  key: 'info' | 'bestel' | 'persoonlijk';
  full: string;
  descNl: string;
  descEn: string;
  on: boolean;
  kw: string;
  known: boolean;
  pdf: boolean;
  statNl: string;
  statEn: string;
}

interface NotificationPreference {
  k: string;
  labelNl: string;
  labelEn: string;
  app: boolean;
  mail: boolean;
  push: boolean;
}

interface OutlookTag {
  k: 'ontvangen' | 'review' | 'ok' | 'nok';
  whenNl: string;
  whenEn: string;
  color: string;
  colorNameNl: string;
  colorNameEn: string;
  label: string;
}

const INITIAL_MAILBOXES: MailboxRule[] = [
  {
    key: 'info',
    full: 'info@aalterpaint.be',
    descNl: 'Algemene mailbox',
    descEn: 'General mailbox',
    on: true,
    kw: 'bestelling, bestelbon, order, PO',
    known: true,
    pdf: true,
    statNl: 'Laatste 7 dagen: 41 bestelmails herkend, 268 andere mails ongemoeid',
    statEn: 'Last 7 days: 41 order emails recognized, 268 other emails untouched',
  },
  {
    key: 'bestel',
    full: 'bestel@aalterpaint.be',
    descNl: 'Bestelmailbox',
    descEn: 'Order mailbox',
    on: true,
    kw: 'alle mails met bijlage',
    known: false,
    pdf: true,
    statNl: 'Laatste 7 dagen: 96 bestelmails herkend, 7 andere mails ongemoeid',
    statEn: 'Last 7 days: 96 order emails recognized, 7 other emails untouched',
  },
  {
    key: 'persoonlijk',
    full: 'pieter.desmet@aalterpaint.be',
    descNl: 'Persoonlijke mailbox van Pieter De Smet',
    descEn: 'Personal mailbox of Pieter De Smet',
    on: true,
    kw: 'bestelling, bestelbon, bestel',
    known: true,
    pdf: true,
    statNl: 'Laatste 7 dagen: 12 bestelmails herkend, 143 andere mails ongemoeid',
    statEn: 'Last 7 days: 12 order emails recognized, 143 other emails untouched',
  },
];

const INITIAL_NOTIFICATIONS: NotificationPreference[] = [
  {
    k: 'klaar',
    labelNl: 'Nieuwe order klaar voor controle',
    labelEn: 'New order ready for check',
    app: true,
    mail: false,
    push: false,
  },
  {
    k: 'aandacht',
    labelNl: 'Order vraagt extra aandacht',
    labelEn: 'Order requires extra attention',
    app: true,
    mail: true,
    push: false,
  },
  {
    k: 'wacht',
    labelNl: 'Order wacht langer dan 4 uur op validatie',
    labelEn: 'Order waiting longer than 4 hours for validation',
    app: true,
    mail: true,
    push: true,
  },
  {
    k: 'sync',
    labelNl: 'BC-synchronisatie mislukt',
    labelEn: 'BC synchronization failed',
    app: true,
    mail: true,
    push: true,
  },
  {
    k: 'config',
    labelNl: 'Wijziging aan drempel, herkenningsregels of rollen',
    labelEn: 'Change to threshold, recognition rules or roles',
    app: true,
    mail: false,
    push: false,
  },
];

const INITIAL_TAGS: OutlookTag[] = [
  {
    k: 'ontvangen',
    whenNl: 'Mail herkend',
    whenEn: 'Email recognized',
    color: '#2F6FEB',
    colorNameNl: 'blauw',
    colorNameEn: 'blue',
    label: 'Ontvangen',
  },
  {
    k: 'review',
    whenNl: 'Wacht op controle',
    whenEn: 'Awaiting check',
    color: '#E8590C',
    colorNameNl: 'oranje',
    colorNameEn: 'orange',
    label: 'In review',
  },
  {
    k: 'ok',
    whenNl: 'Goedgekeurd',
    whenEn: 'Approved',
    color: '#1F9D55',
    colorNameNl: 'groen',
    colorNameEn: 'green',
    label: 'Goedgekeurd',
  },
  {
    k: 'nok',
    whenNl: 'Afgewezen',
    whenEn: 'Rejected',
    color: '#6B6B6B',
    colorNameNl: 'grijs',
    colorNameEn: 'gray',
    label: 'Afgewezen',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  language: propLang,
  userName: _userName,
}) => {
  const { language: ctxLang } = useTranslation();
  const lang = propLang || ctxLang || 'NL';
  const isNl = lang === 'NL';

  // 1. Mailbox recognition rules state
  const [mailboxes, setMailboxes] = useState<MailboxRule[]>(INITIAL_MAILBOXES);
  const [savedMailboxes, setSavedMailboxes] = useState<MailboxRule[]>(INITIAL_MAILBOXES);

  // 2. Confidence threshold state
  const [threshold, setThreshold] = useState<number>(70);
  const [reqAll, setReqAll] = useState<boolean>(true);
  const [draftThr, setDraftThr] = useState<number>(70);
  const [draftReqAll, setDraftReqAll] = useState<boolean>(true);

  // 3. Notification preferences state
  const [notif, setNotif] = useState<NotificationPreference[]>(INITIAL_NOTIFICATIONS);

  // 4. Outlook tags state
  const [tags, setTags] = useState<OutlookTag[]>(INITIAL_TAGS);
  const [savedTags, setSavedTags] = useState<OutlookTag[]>(INITIAL_TAGS);

  // Clean / Dirty checkers
  const isMbClean = JSON.stringify(mailboxes) === JSON.stringify(savedMailboxes);
  const isThrClean = draftThr === threshold && draftReqAll === reqAll;
  const isTagsClean = JSON.stringify(tags) === JSON.stringify(savedTags);

  // Handlers for mailbox recognition rules
  const updateMailbox = (key: 'info' | 'bestel' | 'persoonlijk', patch: Partial<MailboxRule>) => {
    setMailboxes((prev) =>
      prev.map((m) => (m.key === key ? { ...m, ...patch } : m))
    );
  };

  const handleSaveMb = () => {
    setSavedMailboxes(mailboxes);
    toast.success(
      isNl ? 'Herkenningsregels opgeslagen' : 'Recognition rules saved'
    );
  };

  // Handlers for threshold
  const handleSaveThr = () => {
    setThreshold(draftThr);
    setReqAll(draftReqAll);
    toast.success(
      isNl ? `Drempel opgeslagen: ${draftThr}%` : `Threshold saved: ${draftThr}%`
    );
  };

  // Handlers for notifications
  const toggleNotif = (key: string, channel: 'app' | 'mail' | 'push') => {
    setNotif((prev) =>
      prev.map((n) => (n.k === key ? { ...n, [channel]: !n[channel] } : n))
    );
  };

  const handleSaveNotif = () => {
    toast.success(
      isNl ? 'Meldingsvoorkeuren opgeslagen' : 'Notification preferences saved'
    );
  };

  // Handlers for tags
  const updateTagLabel = (key: 'ontvangen' | 'review' | 'ok' | 'nok', label: string) => {
    setTags((prev) =>
      prev.map((t) => (t.k === key ? { ...t, label } : t))
    );
  };

  const handleSaveTags = () => {
    setSavedTags(tags);
    toast.success(
      isNl ? 'Outlook-tags opgeslagen' : 'Outlook tags saved'
    );
  };

  // Calculate dynamic queue preview effect from INITIAL_ORDERS
  const pendingOrders: OrderItem[] = INITIAL_ORDERS.filter(
    (o) => o.st === 'pending' || o.st === 'aandacht' || o.st === 'klaar'
  );

  const draftAtt = pendingOrders.filter((o) => {
    const n = o.lines.length;
    const u = o.lines.filter((l) => l.conf < draftThr).length;
    const avg = n ? o.lines.reduce((sum, l) => sum + l.conf, 0) / n : 100;
    return draftReqAll ? u > 0 : avg < draftThr;
  }).length;

  const currentAtt = pendingOrders.filter((o) => {
    const n = o.lines.length;
    const u = o.lines.filter((l) => l.conf < threshold).length;
    const avg = n ? o.lines.reduce((sum, l) => sum + l.conf, 0) / n : 100;
    return reqAll ? u > 0 : avg < threshold;
  }).length;

  const previewText = isNl
    ? `met ${draftThr}% krijgen ${draftAtt} van de ${pendingOrders.length} open orders extra aandacht${
        draftThr !== threshold ? ` (nu ${currentAtt})` : ''
      }. Alle ${pendingOrders.length} worden nog steeds door een medewerker goedgekeurd.`
    : `with ${draftThr}%, ${draftAtt} of the ${pendingOrders.length} open orders require extra attention${
        draftThr !== threshold ? ` (currently ${currentAtt})` : ''
      }. All ${pendingOrders.length} orders are still approved by an employee.`;

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
          {isNl ? 'Instellingen' : 'Settings'}
        </h1>
        <p style={{ margin: 0, color: '#4D4D4D' }}>
          {isNl
            ? 'Elke wijziging komt in de audittrail.'
            : 'Every change is recorded in the audit trail.'}
        </p>
      </div>

      {/* ================= SECTION 1: HERKENNINGSREGELS ================= */}
      <section
        aria-label={isNl ? 'Herkenningsregels' : 'Recognition rules'}
        style={{
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          borderRadius: 0,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
              {isNl ? 'Herkenningsregels voor bestelmails' : 'Recognition rules for order emails'}
            </h2>
            <span style={{ fontSize: '14px', color: '#4D4D4D' }}>
              {isNl
                ? 'Enkel mails die aan de regels voldoen worden gelezen en getagd. Andere mails blijven ongewijzigd in Outlook.'
                : 'Only emails matching the rules are read and tagged. Other emails remain unchanged in Outlook.'}
            </span>
          </div>

          <button
            className="bd"
            onClick={handleSaveMb}
            disabled={isMbClean}
            style={{
              minHeight: '44px',
              padding: '0 16px',
              background: '#FFFFFF',
              color: isMbClean ? '#8C8C8C' : '#E20714',
              border: `1px solid ${isMbClean ? '#C9C9C9' : '#E20714'}`,
              borderRadius: 0,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: '13px',
              cursor: isMbClean ? 'not-allowed' : 'pointer',
              opacity: isMbClean ? 0.5 : 1,
              transition: 'all 0.15s ease-in-out',
            }}
          >
            {isNl ? 'Regels opslaan' : 'Save rules'}
          </button>
        </div>

        {/* 3 Mailboxes Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
            gap: '12px',
          }}
        >
          {mailboxes.map((m) => (
            <div
              key={m.key}
              style={{
                border: '1px solid #DADADA',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                borderRadius: 0,
                background: '#FFFFFF',
              }}
            >
              {/* Mailbox Header & Guarded Checkbox */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, color: '#1A1A1A', fontSize: '15px' }}>
                    {m.full}
                  </span>
                  <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
                    {isNl ? m.descNl : m.descEn}
                  </span>
                </span>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: '#1A1A1A',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={m.on}
                    onChange={(e) => updateMailbox(m.key, { on: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#E20714', cursor: 'pointer' }}
                  />
                  {isNl ? 'Bewaakt' : 'Monitored'}
                </label>
              </div>

              {/* Keywords Input */}
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1A1A1A',
                }}
              >
                {isNl ? 'Trefwoorden in onderwerp of tekst' : 'Keywords in subject or text'}
                <input
                  type="text"
                  value={m.kw}
                  onChange={(e) => updateMailbox(m.key, { kw: e.target.value })}
                  style={{
                    height: '40px',
                    padding: '0 10px',
                    border: '1px solid #C9C9C9',
                    borderRadius: 0,
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#1A1A1A',
                    background: '#FFFFFF',
                  }}
                />
              </label>

              {/* Checkbox: Known Customer */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: '#242424',
                }}
              >
                <input
                  type="checkbox"
                  checked={m.known}
                  onChange={(e) => updateMailbox(m.key, { known: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#E20714', cursor: 'pointer' }}
                />
                {isNl
                  ? 'Afzender is gekende klant of contact in BC'
                  : 'Sender is known customer or contact in BC'}
              </label>

              {/* Checkbox: Attachment is PDF */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: '#242424',
                }}
              >
                <input
                  type="checkbox"
                  checked={m.pdf}
                  onChange={(e) => updateMailbox(m.key, { pdf: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#E20714', cursor: 'pointer' }}
                />
                {isNl ? 'Bijlage is een PDF of scan' : 'Attachment is a PDF or scan'}
              </label>

              {/* Bottom Stat Footnote */}
              <span
                style={{
                  fontSize: '12px',
                  color: '#4D4D4D',
                  paddingTop: '8px',
                  borderTop: '1px solid #EBEBEB',
                  lineHeight: 1.4,
                }}
              >
                {isNl ? m.statNl : m.statEn}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SECTION 2: CONFIDENCE-DREMPEL ================= */}
      <section
        aria-label={isNl ? 'Confidence-drempel' : 'Confidence threshold'}
        style={{
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          borderRadius: 0,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
              {isNl ? 'Confidence-drempel' : 'Confidence threshold'}
            </h2>
            <span style={{ fontSize: '14px', color: '#4D4D4D' }}>
              {isNl
                ? 'De drempel bepaalt enkel het soort controle. Elke order wordt door een medewerker goedgekeurd.'
                : 'The threshold only determines the type of check. Every order is approved by an employee.'}
            </span>
          </div>

          <button
            className="bd"
            onClick={handleSaveThr}
            disabled={isThrClean}
            style={{
              minHeight: '44px',
              padding: '0 16px',
              background: '#FFFFFF',
              color: isThrClean ? '#8C8C8C' : '#E20714',
              border: `1px solid ${isThrClean ? '#C9C9C9' : '#E20714'}`,
              borderRadius: 0,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: '13px',
              cursor: isThrClean ? 'not-allowed' : 'pointer',
              opacity: isThrClean ? 0.5 : 1,
              transition: 'all 0.15s ease-in-out',
            }}
          >
            {isNl ? 'Drempel opslaan' : 'Save threshold'}
          </button>
        </div>

        {/* Slider & Visual Threshold Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              flex: '1 1 320px',
              color: '#1A1A1A',
            }}
          >
            <span>
              {isNl ? 'Drempel: ' : 'Threshold: '}
              <strong style={{ fontSize: '15px' }}>{draftThr}%</strong>
            </span>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={draftThr}
              onChange={(e) => setDraftThr(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                accentColor: '#242424',
                cursor: 'pointer',
                height: '6px',
              }}
            />
          </label>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              flex: '1 1 320px',
            }}
          >
            {/* Visual Dual-Color Indicator Bar */}
            <div
              style={{
                display: 'flex',
                height: '28px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 0,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  width: `${draftThr}%`,
                  background: '#FDEBDD',
                  color: '#8A3405',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '8px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  transition: 'width 0.2s ease',
                }}
              >
                {isNl ? 'Extra aandacht' : 'Extra attention'}
              </span>
              <span
                style={{
                  flexGrow: 1,
                  background: '#E3F2E9',
                  color: '#11603B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '8px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {isNl ? 'Normale controle' : 'Normal check'}
              </span>
            </div>
            <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
              {isNl
                ? `0%, onder ${draftThr}% extra aandacht, vanaf ${draftThr}% normale controle, 100%`
                : `0%, below ${draftThr}% extra attention, from ${draftThr}% normal check, 100%`}
            </span>
          </div>
        </div>

        {/* Checkbox: Require all lines above threshold */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            userSelect: 'none',
            color: '#242424',
          }}
        >
          <input
            type="checkbox"
            checked={draftReqAll}
            onChange={(e) => setDraftReqAll(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#E20714', cursor: 'pointer' }}
          />
          {isNl
            ? 'Eis dat elke orderregel boven de drempel zit voor normale controle (anders telt het ordergemiddelde)'
            : 'Require every order line to be above threshold for normal check (otherwise order average counts)'}
        </label>

        {/* Dynamic Queue Effect Box */}
        <div
          style={{
            padding: '12px 14px',
            background: '#F5F5F5',
            fontSize: '14px',
            color: '#242424',
            borderLeft: '4px solid #E20714',
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontWeight: 700 }}>
            {isNl ? 'Effect op de wachtrij: ' : 'Effect on the queue: '}
          </span>
          {previewText}
        </div>
      </section>

      {/* ================= SECTION 3: MELDINGSVOORKEUREN ================= */}
      <section
        aria-label={isNl ? 'Meldingsvoorkeuren' : 'Notification preferences'}
        style={{
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          borderRadius: 0,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '12px',
            alignItems: 'flex-start',
          }}
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
            {isNl ? 'Meldingsvoorkeuren' : 'Notification preferences'}
          </h2>

          <button
            className="bd"
            onClick={handleSaveNotif}
            style={{
              minHeight: '44px',
              padding: '0 16px',
              background: '#FFFFFF',
              color: '#E20714',
              border: '1px solid #E20714',
              borderRadius: 0,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
          >
            {isNl ? 'Voorkeuren opslaan' : 'Save preferences'}
          </button>
        </div>

        {/* Notifications Matrix Table */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '560px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(240px, 1fr) 90px 90px 90px',
                gap: '12px',
                padding: '8px 12px',
                borderBottom: '1px solid #DADADA',
                background: '#FAFAFA',
                fontSize: '13px',
                fontWeight: 600,
                color: '#6B6B6B',
              }}
            >
              <span>{isNl ? 'Gebeurtenis' : 'Event'}</span>
              <span style={{ textAlign: 'center' }}>In-app</span>
              <span style={{ textAlign: 'center' }}>E-mail</span>
              <span style={{ textAlign: 'center' }}>Push</span>
            </div>

            {notif.map((n) => (
              <div
                key={n.k}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(240px, 1fr) 90px 90px 90px',
                  gap: '12px',
                  padding: '12px',
                  borderBottom: '1px solid #EBEBEB',
                  alignItems: 'center',
                  fontSize: '14px',
                  color: '#242424',
                }}
              >
                <span style={{ fontWeight: 500 }}>{isNl ? n.labelNl : n.labelEn}</span>
                <span style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    aria-label="In-app"
                    checked={n.app}
                    onChange={() => toggleNotif(n.k, 'app')}
                    style={{ width: '18px', height: '18px', accentColor: '#E20714', cursor: 'pointer' }}
                  />
                </span>
                <span style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    aria-label="E-mail"
                    checked={n.mail}
                    onChange={() => toggleNotif(n.k, 'mail')}
                    style={{ width: '18px', height: '18px', accentColor: '#E20714', cursor: 'pointer' }}
                  />
                </span>
                <span style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    aria-label="Push"
                    checked={n.push}
                    onChange={() => toggleNotif(n.k, 'push')}
                    style={{ width: '18px', height: '18px', accentColor: '#E20714', cursor: 'pointer' }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION 4: OUTLOOK-TAGS ================= */}
      <section
        aria-label={isNl ? 'Outlook-tags' : 'Outlook tags'}
        style={{
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          borderRadius: 0,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
              {isNl ? 'Outlook-tags' : 'Outlook tags'}
            </h2>
            <span style={{ fontSize: '14px', color: '#4D4D4D' }}>
              {isNl
                ? 'De bronmail krijgt in Outlook een categorie per status, zodat iedereen in de mailbox ziet waar een bestelling staat.'
                : 'The source email receives an Outlook category per status, so everyone in the mailbox sees where an order stands.'}
            </span>
          </div>

          <button
            className="bd"
            onClick={handleSaveTags}
            disabled={isTagsClean}
            style={{
              minHeight: '38px',
              padding: '0 16px',
              background: '#FFFFFF',
              color: isTagsClean ? '#9CA3AF' : '#E20714',
              border: `1px solid ${isTagsClean ? '#E5E7EB' : '#E20714'}`,
              borderRadius: 0,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: '12.5px',
              cursor: isTagsClean ? 'not-allowed' : 'pointer',
              opacity: 1,
              transition: 'all 0.15s ease-in-out',
            }}
          >
            {isNl ? 'Tags opslaan' : 'Save tags'}
          </button>
        </div>

        {/* 4 Outlook Tag Cards Grid - 4 Columns in single row */}
        <div className="outlook-tags-grid">
          {tags.map((t) => (
            <label
              key={t.k}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px 14px',
                border: '1px solid #DADADA',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 0,
                background: '#FFFFFF',
                color: '#1A1A1A',
                boxSizing: 'border-box',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    background: t.color,
                    display: 'inline-block',
                    flexShrink: 0,
                    marginTop: '3px',
                    borderRadius: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#1A1A1A',
                    lineHeight: '1.25',
                    wordBreak: 'break-word',
                  }}
                >
                  {isNl ? t.whenNl : t.whenEn} · {isNl ? `categorie ${t.colorNameNl}` : `category ${t.colorNameEn}`}
                </span>
              </div>
              <input
                type="text"
                value={t.label}
                onChange={(e) => updateTagLabel(t.k, e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  border: '1px solid #C9C9C9',
                  borderRadius: 0,
                  fontSize: '14.5px',
                  fontWeight: 400,
                  color: '#1A1A1A',
                  background: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};
