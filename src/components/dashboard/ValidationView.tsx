import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { type Language } from '../common/LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';
import {
  INITIAL_ORDERS,
  CAT,
  CONTACT_DATA,
  ADRES_DATA,
  type OrderItem,
  type OrderLine,
} from '../../data/mockData';

interface ValidationViewProps {
  language?: Language;
  selectedOrderNr?: string;
  userName?: string;
  onNavigateToOrders?: () => void;
  onNavigateToExceptions?: () => void;
  onOrderUpdated?: (order: OrderItem) => void;
}

export const ValidationView: React.FC<ValidationViewProps> = ({
  language,
  selectedOrderNr = 'AP-26-04819',
  userName = 'Bart Van Damme',
  onNavigateToOrders,
  onNavigateToExceptions,
  onOrderUpdated,
}) => {
  const { language: ctxLang } = useLanguage();
  const activeLang = language || ctxLang || 'NL';
  const isNl = activeLang === 'NL';
  const threshold = 70;

  // Local copy of orders for interactive state
  const [orders, setOrders] = useState<OrderItem[]>(() => INITIAL_ORDERS);
  const [currentNr, setCurrentNr] = useState(selectedOrderNr);

  // Sync prop changes
  useEffect(() => {
    if (selectedOrderNr) {
      setCurrentNr(selectedOrderNr);
    }
  }, [selectedOrderNr]);

  const currentOrder = useMemo(() => {
    return orders.find((o) => o.nr === currentNr) || orders[2] || orders[0];
  }, [orders, currentNr]);

  // Pending queue list
  const queueList = useMemo(() => {
    return orders.filter((o) => o.st === 'pending' || o.st === 'verwerking');
  }, [orders]);

  const queueIdx = queueList.findIndex((o) => o.nr === currentOrder.nr);

  // Selected line id
  const [selLineId, setSelLineId] = useState<string | null>(null);

  // Left tab: 'bon' (order slip) or 'mail' (source email)
  const [leftTab, setLeftTab] = useState<'bon' | 'mail'>('bon');

  // AI insights accordion under source (open by default matching reference)
  const [insOpen, setInsOpen] = useState(true);

  // Mail compose dialog state (with CC, BCC and validation warning)
  const [composeOpen, setComposeOpen] = useState(false);
  const [cSubject, setCSubject] = useState('');
  const [cBody, setCBody] = useState('');
  const [cCc, setCCc] = useState('');
  const [cBcc, setCBcc] = useState('');
  const [emailWarning, setEmailWarning] = useState('');

  // Comment for approve / reject
  const [comment, setComment] = useState('');

  // Art search query
  const [artSearch, setArtSearch] = useState('');
  const [ralDraft, setRalDraft] = useState('');

  // Animated scan line trigger & progress scan key
  const [scanOn, setScanOn] = useState(true);
  const [scanKey, setScanKey] = useState(0);

  // Approval sync animation state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    show: boolean;
    synced: boolean;
    vo?: string;
    title: string;
    text: string;
  } | null>(null);

  // Auto-select first attention line on order change & trigger fresh scan
  useEffect(() => {
    if (currentOrder && currentOrder.lines && currentOrder.lines.length > 0) {
      const firstAtt = currentOrder.lines.find((l) => l.conf < threshold && !l.confirmed);
      setSelLineId(firstAtt ? firstAtt.id : currentOrder.lines[0].id);
    }
    setScanOn(false);
    const scanTimer = setTimeout(() => {
      setScanOn(true);
      setScanKey((k) => k + 1);
    }, 40);
    setSyncResult(null);
    setIsSyncing(false);
    setComposeOpen(false);
    setComment('');
    setArtSearch('');
    setRalDraft('');
    return () => clearTimeout(scanTimer);
  }, [currentOrder.nr]);

  // Customer contact info
  const contact = CONTACT_DATA[currentOrder.klant] || {
    name: isNl ? 'Contactpersoon' : 'Contact person',
    role: isNl ? 'Inkoop' : 'Purchasing',
    phone: '+32 9 386 12 40',
  };

  const address = ADRES_DATA[currentOrder.klant] || 'Lostraat 21, 9880 Aalter';

  // Mailbox full & label
  const mbFull =
    currentOrder.mb === 'bestel'
      ? 'bestel@aalterpaint.be'
      : currentOrder.mb === 'persoonlijk'
      ? 'pieter.desmet@aalterpaint.be'
      : 'info@aalterpaint.be';

  const mbLabel =
    currentOrder.mb === 'bestel'
      ? 'bestel@'
      : currentOrder.mb === 'persoonlijk'
      ? isNl
        ? 'Persoonlijk'
        : 'Personal'
      : 'info@';

  // Pre-fill compose mail body when opened
  const handleOpenCompose = () => {
    const questions: string[] = [];
    currentOrder.lines.forEach((l, i) => {
      const ask: string[] = [];
      if (l.qty === null || l.qty === undefined) {
        ask.push(isNl ? 'welke hoeveelheid mogen we noteren?' : 'what quantity should we register?');
      }
      if (!l.confirmed && l.conf < threshold) {
        if (l.want?.basis && l.want.basis !== CAT[l.art]?.basis) {
          ask.push(
            isNl
              ? `bevestigt u basis ${l.want.basis}?`
              : `do you confirm base ${l.want.basis}?`
          );
        }
        if (!CAT[l.art]?.ral && !l.want?.ral) {
          ask.push(isNl ? 'in welke RAL-kleur wenst u dit?' : 'which RAL color do you require?');
        }
        if (!l.want?.pack) {
          ask.push(
            isNl
              ? 'welke verpakking bedoelt u (bijvoorbeeld kit of los blik)?'
              : 'which packaging do you prefer (e.g. kit or single can)?'
          );
        }
      }
      if (ask.length > 0) {
        questions.push(
          `- ${isNl ? 'Regel' : 'Line'} ${i + 1} "${l.raw}": ${ask.join(' ')}`
        );
      }
    });

    const firstName = contact.name.split(' ')[0] || contact.name;
    const bodyText = isNl
      ? `Dag ${firstName},\n\nBedankt voor uw bestelling met referentie ${currentOrder.ref}.${
          questions.length
            ? ' Om ze correct in te geven hebben we nog een paar vragen:\n\n' +
              questions.join('\n') +
              '\n\nAlvast bedankt voor uw antwoord.'
            : ' We verwerken ze vandaag nog.'
        }\n\nMet vriendelijke groeten,\n${userName}\nAalterpaint`
      : `Dear ${firstName},\n\nThank you for your order with reference ${currentOrder.ref}.${
          questions.length
            ? ' To process it accurately, we have a few questions:\n\n' +
              questions.join('\n') +
              '\n\nThank you in advance for your reply.'
            : ' We will process it today.'
        }\n\nBest regards,\n${userName}\nAalterpaint`;

    setCSubject(`Re: ${currentOrder.subject} (${currentOrder.ref})`);
    setCBody(bodyText);
    setComposeOpen(true);
  };

  // Line checks computation
  const getLineChecks = (l: OrderLine) => {
    const a = CAT[l.art] || { d: 'Product', fam: 'GEN', pack: '10L', unit: 'blik' };
    const w = l.want || {};

    let b: { k: 'ok' | 'fail' | 'miss' | 'na'; t: string };
    let r: { k: 'ok' | 'fail' | 'miss' | 'na'; t: string };
    let p: { k: 'ok' | 'fail' | 'miss' | 'na'; t: string };

    // Basis check
    if (!a.basis && !w.basis) {
      b = { k: 'na', t: isNl ? 'Niet van toepassing' : 'Not applicable' };
    } else if (a.basis && w.basis) {
      b =
        a.basis === w.basis
          ? { k: 'ok', t: isNl ? `Basis ${a.basis} klopt` : `Base ${a.basis} matches` }
          : {
              k: 'fail',
              t: isNl
                ? `Bon basis ${w.basis}, artikel basis ${a.basis}`
                : `Slip base ${w.basis}, article base ${a.basis}`,
            };
    } else if (a.basis) {
      b = { k: 'miss', t: isNl ? 'Niet vermeld op de bon' : 'Not stated on slip' };
    } else {
      b = { k: 'fail', t: isNl ? 'Artikel heeft geen basis' : 'Article has no base' };
    }

    // RAL check
    if (!a.ral && !w.ral) {
      r = { k: 'na', t: isNl ? 'Niet van toepassing' : 'Not applicable' };
    } else if (a.ral && w.ral) {
      r =
        a.ral === w.ral
          ? { k: 'ok', t: isNl ? `RAL ${a.ral} klopt` : `RAL ${a.ral} matches` }
          : {
              k: 'fail',
              t: isNl
                ? `Bon RAL ${w.ral}, artikel RAL ${a.ral}`
                : `Slip RAL ${w.ral}, article RAL ${a.ral}`,
            };
    } else if (a.ral) {
      r = {
        k: 'miss',
        t: isNl
          ? `Ontbreekt op de bon (artikel RAL ${a.ral})`
          : `Missing on slip (article RAL ${a.ral})`,
      };
    } else {
      r = { k: 'fail', t: isNl ? 'Artikel zonder RAL-code' : 'Article without RAL code' };
    }

    // Pack check
    if (w.pack) {
      p =
        a.pack === w.pack
          ? { k: 'ok', t: isNl ? `${a.pack} klopt` : `${a.pack} matches` }
          : {
              k: 'fail',
              t: isNl ? `Bon ${w.pack}, artikel ${a.pack}` : `Slip ${w.pack}, article ${a.pack}`,
            };
    } else {
      p = {
        k: 'miss',
        t: isNl
          ? `Onzeker op de bon (artikel ${a.pack || '?'})`
          : `Uncertain on slip (article ${a.pack || '?'})`,
      };
    }

    return [
      { n: 'Basis A/B/C', ...b },
      { n: 'RAL-code', ...r },
      { n: isNl ? 'Verpakkingsmaat' : 'Packaging size', ...p },
    ];
  };

  // Blockers for approval
  const blockers = useMemo(() => {
    const list: string[] = [];
    currentOrder.lines.forEach((l, i) => {
      const idx = i + 1;
      if (l.qty === null || l.qty === undefined || isNaN(l.qty)) {
        list.push(
          isNl ? `Regel ${idx}: hoeveelheid ontbreekt` : `Line ${idx}: quantity is missing`
        );
      }
      if (!l.confirmed && l.conf < threshold) {
        list.push(
          isNl
            ? `Regel ${idx}: extra aandacht, bevestig of corrigeer`
            : `Line ${idx}: extra attention needed, please confirm or correct`
        );
      }
    });
    return list;
  }, [currentOrder.lines, isNl]);

  const hasBlockers = blockers.length > 0;

  // Confirm single line
  const handleConfirmLine = (lineId: string) => {
    const updatedLines = currentOrder.lines.map((l) =>
      l.id === lineId ? { ...l, confirmed: true, by: userName } : l
    );
    const updatedOrder = { ...currentOrder, lines: updatedLines };
    const newOrders = orders.map((o) => (o.nr === currentOrder.nr ? updatedOrder : o));
    setOrders(newOrders);
    if (onOrderUpdated) onOrderUpdated(updatedOrder);

    // Advance to next unconfirmed line needing attention
    const nextUnconfirmed = updatedLines.find(
      (l) => l.id !== lineId && !l.confirmed && l.conf < threshold
    );
    if (nextUnconfirmed) {
      setSelLineId(nextUnconfirmed.id);
    }
  };

  // Correct line with article from search or alternatives
  const handlePickArticle = (lineId: string, artCode: string) => {
    const catItem = CAT[artCode];
    if (!catItem) return;

    const updatedLines = currentOrder.lines.map((l) => {
      if (l.id === lineId) {
        const matchesBasis = catItem.basis && l.want?.basis && catItem.basis === l.want.basis;
        const matchesPack = catItem.pack && l.want?.pack && catItem.pack === l.want.pack;
        const newConf = matchesBasis && matchesPack ? 88 : 95;
        return {
          ...l,
          art: artCode,
          unit: catItem.unit || l.unit,
          conf: newConf,
          corrected: true,
          confirmed: true,
          by: userName,
          why: isNl
            ? `Gecorrigeerd door ${userName} (alternatief): ${l.art} vervangen door ${artCode}. Basis, RAL-code en verpakkingsmaat gecontroleerd.`
            : `Corrected by ${userName} (alternative): ${l.art} replaced with ${artCode}. Base, RAL and packaging verified.`,
        };
      }
      return l;
    });

    const updatedOrder = { ...currentOrder, lines: updatedLines };
    const newOrders = orders.map((o) => (o.nr === currentOrder.nr ? updatedOrder : o));
    setOrders(newOrders);
    setArtSearch('');
    if (onOrderUpdated) onOrderUpdated(updatedOrder);

    // Auto-advance to next line needing attention
    const nextUnconfirmed = updatedLines.find(
      (l) => l.id !== lineId && !l.confirmed && (l.conf < threshold || l.qty === null)
    );
    if (nextUnconfirmed) {
      setSelLineId(nextUnconfirmed.id);
    }
  };

  // Apply RAL code
  const handleApplyRal = (lineId: string) => {
    const val = ralDraft.replace(/ral/i, '').trim();
    if (!val) return;

    const curLine = currentOrder.lines.find((l) => l.id === lineId);
    if (!curLine) return;

    const cur = CAT[curLine.art] || { fam: 'CRY', pack: '4L' };
    const match = Object.keys(CAT).find(
      (k) => CAT[k].fam === cur.fam && CAT[k].pack === cur.pack && CAT[k].ral === val
    );

    const art = match || curLine.art;
    const ok = !!match;

    const updatedLines = currentOrder.lines.map((l) => {
      if (l.id === lineId) {
        return {
          ...l,
          art,
          unit: CAT[art]?.unit || l.unit,
          conf: ok ? 92 : 40,
          confirmed: ok,
          corrected: art !== l.art,
          by: userName,
          why: ok
            ? isNl
              ? `RAL ${val} aangevuld door ${userName}. Artikel ${art} past op RAL en verpakking.`
              : `RAL ${val} supplemented by ${userName}. Article ${art} matches RAL and packaging.`
            : isNl
            ? `RAL ${val} aangevuld door ${userName}, maar artikel niet gevonden.`
            : `RAL ${val} supplemented by ${userName}, but matching article not found.`,
        };
      }
      return l;
    });

    const updatedOrder = { ...currentOrder, lines: updatedLines };
    const newOrders = orders.map((o) => (o.nr === currentOrder.nr ? updatedOrder : o));
    setOrders(newOrders);
    setRalDraft('');
    if (onOrderUpdated) onOrderUpdated(updatedOrder);
  };

  // Update line quantity
  const handleSetQty = (lineId: string, val: string) => {
    const num = parseFloat(val.replace(',', '.'));
    const updatedLines = currentOrder.lines.map((l) =>
      l.id === lineId
        ? {
            ...l,
            qty: isNaN(num) ? null : num,
            bonQty: val,
          }
        : l
    );
    const updatedOrder = { ...currentOrder, lines: updatedLines };
    const newOrders = orders.map((o) => (o.nr === currentOrder.nr ? updatedOrder : o));
    setOrders(newOrders);
  };

  // Update line unit
  const handleSetUnit = (lineId: string, unitVal: string) => {
    const updatedLines = currentOrder.lines.map((l) =>
      l.id === lineId ? { ...l, unit: unitVal } : l
    );
    const updatedOrder = { ...currentOrder, lines: updatedLines };
    const newOrders = orders.map((o) => (o.nr === currentOrder.nr ? updatedOrder : o));
    setOrders(newOrders);
  };

  // Approve Order
  const handleApprove = () => {
    if (hasBlockers) return;

    setIsSyncing(true);
    const updatedOrder: OrderItem = {
      ...currentOrder,
      st: 'goedgekeurd',
      approvedBy: userName,
      approvedAt: `${currentOrder.day} 16:45`,
    };

    const newOrders = orders.map((o) => (o.nr === currentOrder.nr ? updatedOrder : o));
    setOrders(newOrders);
    if (onOrderUpdated) onOrderUpdated(updatedOrder);

    // Simulate BC sync completion after 1.8s
    setTimeout(() => {
      setIsSyncing(false);
      const voNumber = `VO-26-01874`;
      const syncedOrder: OrderItem = {
        ...updatedOrder,
        st: 'gesync',
        vo: voNumber,
      };
      setOrders((prev) => prev.map((o) => (o.nr === currentOrder.nr ? syncedOrder : o)));
      setSyncResult({
        show: true,
        synced: true,
        vo: voNumber,
        title: isNl
          ? `Goedgekeurd door ${userName} om 16:45`
          : `Approved by ${userName} at 16:45`,
        text: isNl
          ? `Verkooporder ${voNumber} succesvol aangemaakt in Business Central. Outlook-tag: Goedgekeurd.`
          : `Sales order ${voNumber} successfully created in Business Central. Outlook tag: Approved.`,
      });
      toast.success(
        isNl
          ? `Verkooporder ${voNumber} aangemaakt in Business Central`
          : `Sales order ${voNumber} created in Business Central`
      );
      if (onOrderUpdated) onOrderUpdated(syncedOrder);
    }, 1800);
  };

  // Reject Order
  const handleReject = () => {
    if (!comment.trim()) return;

    const updatedOrder: OrderItem = {
      ...currentOrder,
      st: 'afgewezen',
    };

    const newOrders = orders.map((o) => (o.nr === currentOrder.nr ? updatedOrder : o));
    setOrders(newOrders);
    setSyncResult({
      show: true,
      synced: false,
      title: isNl
        ? `Afgewezen door ${userName}`
        : `Rejected by ${userName}`,
      text: isNl
        ? `Reden: ${comment}. Er ging niets naar Business Central. Outlook-tag: Afgewezen.`
        : `Reason: ${comment}. Nothing was sent to Business Central. Outlook tag: Rejected.`,
    });
    toast.error(
      isNl
        ? `Order ${currentOrder.nr} afgewezen`
        : `Order ${currentOrder.nr} rejected`
    );
    if (onOrderUpdated) onOrderUpdated(updatedOrder);
  };

  // Queue navigation
  const handlePrevOrder = () => {
    if (queueIdx > 0) {
      setCurrentNr(queueList[queueIdx - 1].nr);
    }
  };

  const handleNextOrder = () => {
    if (queueIdx < queueList.length - 1) {
      setCurrentNr(queueList[queueIdx + 1].nr);
    }
  };

  // Article search results in catalog
  const searchResults = useMemo(() => {
    const q = artSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return Object.keys(CAT)
      .filter(
        (k) =>
          k.toLowerCase().includes(q) ||
          CAT[k].d.toLowerCase().includes(q) ||
          (CAT[k].ral && CAT[k].ral?.includes(q))
      )
      .slice(0, 5)
      .map((k) => ({
        art: k,
        d: CAT[k].d,
        note: CAT[k].blocked ? (isNl ? 'Geblokkeerd in BC' : 'Blocked in BC') : CAT[k].pack,
        blocked: CAT[k].blocked,
      }));
  }, [artSearch, isNl]);

  // Overall lines summary
  const linesUnderThreshold = currentOrder.lines.filter((l) => l.conf < threshold).length;
  const linesConfirmed = currentOrder.lines.filter((l) => l.confirmed).length;

  // Average confidence across order lines
  const avgOrderConf = useMemo(() => {
    if (!currentOrder.lines || currentOrder.lines.length === 0) return 74;
    const sum = currentOrder.lines.reduce((acc, l) => acc + l.conf, 0);
    return Math.round(sum / currentOrder.lines.length);
  }, [currentOrder.lines]);

  // Overall check statistics for drawer summary
  const allChecksList = useMemo(() => {
    const list: Array<{ n: string; k: string; t: string }> = [];
    currentOrder.lines.forEach((l) => {
      getLineChecks(l).forEach((c) => list.push(c));
    });
    return list;
  }, [currentOrder.lines]);

  const totalFails = allChecksList.filter((c) => c.k === 'fail').length;
  const totalMisses = allChecksList.filter((c) => c.k === 'miss').length;

  const insSummary = isNl
    ? `${linesUnderThreshold} van ${currentOrder.lines.length} regels onder de drempel · ${
        totalFails ? `${totalFails} controle mislukt` : totalMisses ? `${totalMisses} veld onzeker` : 'controles in orde'
      } · OCR ${currentOrder.ocr || 91}%`
    : `${linesUnderThreshold} of ${currentOrder.lines.length} lines below threshold · ${
        totalFails ? `${totalFails} check failed` : totalMisses ? `${totalMisses} field uncertain` : 'all checks passed'
      } · OCR ${currentOrder.ocr || 91}%`;

  const validateEmails = (text: string) => {
    if (!text.trim()) {
      setEmailWarning('');
      return true;
    }
    const emails = text.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = emails.some((e) => !emailRegex.test(e));
    if (invalid) {
      setEmailWarning(
        isNl
          ? 'Controleer of alle ingevoerde e-mailadressen een geldig formaat hebben.'
          : 'Please ensure all entered email addresses have a valid format.'
      );
      return false;
    }
    setEmailWarning('');
    return true;
  };

  // Order status chip styling
  const isApproved = currentOrder.st === 'goedgekeurd' || currentOrder.st === 'gesync';
  const isRejected = currentOrder.st === 'afgewezen';
  const isPending = currentOrder.st === 'pending' || currentOrder.st === 'verwerking';

  const statusChipBg = isApproved
    ? '#E3F2E9'
    : isRejected
    ? '#EBEBEB'
    : linesUnderThreshold > 0
    ? '#FDEBDD'
    : '#E7EEFC';

  const statusChipFg = isApproved
    ? '#11603B'
    : isRejected
    ? '#242424'
    : linesUnderThreshold > 0
    ? '#8A3405'
    : '#1D4FBF';

  const statusChipLabel = isApproved
    ? isNl
      ? 'Goedgekeurd'
      : 'Approved'
    : isRejected
    ? isNl
      ? 'Afgewezen'
      : 'Rejected'
    : linesUnderThreshold > 0
    ? isNl
      ? 'Aandacht nodig'
      : 'Needs attention'
    : isNl
    ? 'Klaar voor controle'
    : 'Ready for review';

  return (
    <div className="a-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header with Queue Navigation & Customer Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Back Link & Queue Position Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <button
            onClick={onNavigateToOrders}
            className="lk"
            style={{
              border: 0,
              background: 'transparent',
              padding: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: '#4D4D4D',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <svg className="s" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Orders
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#6B6B6B', marginRight: '4px' }}>
              {isNl
                ? `Order ${queueIdx >= 0 ? queueIdx + 1 : 1} van ${queueList.length} in de wachtrij`
                : `Order ${queueIdx >= 0 ? queueIdx + 1 : 1} of ${queueList.length} in queue`}
            </span>
            <button
              onClick={handlePrevOrder}
              disabled={queueIdx <= 0}
              aria-label="Previous order"
              className="bg"
              style={{
                width: '40px',
                height: '40px',
                border: '1px solid #DADADA',
                background: '#FFFFFF',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: queueIdx <= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <svg className="i" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={handleNextOrder}
              disabled={queueIdx >= queueList.length - 1}
              aria-label="Next order"
              className="bg"
              style={{
                width: '40px',
                height: '40px',
                border: '1px solid #DADADA',
                background: '#FFFFFF',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: queueIdx >= queueList.length - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <svg className="i" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Title, Order Nr, and Status Chip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 14px' }}>
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
            {currentOrder.klant}
          </h1>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '15px', color: '#4D4D4D' }}>
            {currentOrder.nr}
          </span>
          <span
            style={{
              alignSelf: 'center',
              fontSize: '12px',
              fontWeight: 600,
              padding: '3px 10px',
              background: statusChipBg,
              color: statusChipFg,
              border: `1px solid ${statusChipBg}`,
              borderRadius: '2px',
            }}
          >
            {statusChipLabel}
          </span>
        </div>

        {/* Customer contact strip */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px 24px',
            padding: '12px 0',
            borderTop: '1px solid #DADADA',
            borderBottom: '1px solid #DADADA',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 22px',
              fontSize: '14px',
              color: '#1A1A1A',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6B6B6B', display: 'flex' }}>
                <svg className="s" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
                </svg>
              </span>
              <strong style={{ fontWeight: 600 }}>{contact.name}</strong>
              <span style={{ color: '#6B6B6B' }}>{contact.role}</span>
            </span>

            <a
              href={`mailto:${currentOrder.from}`}
              className="lk"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#1A1A1A',
                textDecoration: 'none',
              }}
            >
              <span style={{ color: '#6B6B6B', display: 'flex' }}>
                <svg className="s" viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="1" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              </span>
              {currentOrder.from}
            </a>

            <a
              href={`tel:${contact.phone.replace(/\s/g, '')}`}
              className="lk"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#1A1A1A',
                textDecoration: 'none',
              }}
            >
              <span style={{ color: '#6B6B6B', display: 'flex' }}>
                <svg className="s" viewBox="0 0 24 24">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
                </svg>
              </span>
              {contact.phone}
            </a>

            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6B6B6B', display: 'flex' }}>
                <svg className="s" viewBox="0 0 24 24">
                  <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </span>
              {address}
            </span>

            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4D4D4D' }}>
              BC {currentOrder.klantNr}
              <ConfidenceBadge
                value={currentOrder.klantConf}
                threshold={threshold}
                showLabel={false}
              />
            </span>
          </div>

          {/* Mail customer & Call customer buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleOpenCompose}
              className="bd"
              style={{
                minHeight: '40px',
                padding: '0 14px',
                background: '#FFFFFF',
                color: '#E20714',
                border: '1px solid #E20714',
                borderRadius: 0,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <svg className="s" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="1" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              {isNl ? 'Mail klant' : 'Mail customer'}
            </button>

            <a
              href={`tel:${contact.phone.replace(/\s/g, '')}`}
              className="bg"
              style={{
                minHeight: '40px',
                boxSizing: 'border-box',
                padding: '0 14px',
                background: '#FFFFFF',
                color: '#1A1A1A',
                border: '1px solid #1A1A1A',
                borderRadius: 0,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontSize: '12px',
                textDecoration: 'none',
              }}
            >
              <svg className="s" viewBox="0 0 24 24">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
              </svg>
              {isNl ? 'Bel klant' : 'Call customer'}
            </a>
          </div>
        </div>

        {/* Inline compose mail form */}
        {composeOpen && (
          <div
            className="a-in"
            style={{
              background: '#FFFFFF',
              border: '1px solid #DADADA',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 700 }}>
                {isNl ? `Mail aan ${contact.name}` : `Email to ${contact.name}`}
              </span>
              <span style={{ fontSize: '13px', color: '#6B6B6B' }}>
                {isNl
                  ? `Verstuurd vanuit ${mbFull}, als antwoord op de bronmail`
                  : `Sent from ${mbFull}, replying to source email`}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '80px minmax(0, 1fr)',
                gap: '8px 12px',
                alignItems: 'center',
                fontSize: '14px',
              }}
            >
              <span style={{ color: '#6B6B6B' }}>{isNl ? 'Aan' : 'To'}</span>
              <span style={{ fontWeight: 600 }}>{currentOrder.from}</span>

              {/* CC Field with helper */}
              <label htmlFor="cmp-cc" style={{ color: '#6B6B6B' }}>
                Cc
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <input
                  id="cmp-cc"
                  type="text"
                  value={cCc}
                  onChange={(e) => {
                    setCCc(e.target.value);
                    validateEmails(e.target.value);
                  }}
                  placeholder="bv. werfleider@uvin.be, werf@uvin.be"
                  style={{
                    height: '40px',
                    padding: '0 10px',
                    border: '1px solid #C9C9C9',
                    borderRadius: 0,
                    fontSize: '15px',
                    background: '#FFFFFF',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#6B6B6B' }}>
                  {isNl
                    ? 'Meerdere e-mailadressen scheiden met een komma of puntkomma.'
                    : 'Separate multiple email addresses with a comma or semicolon.'}
                </span>
              </div>

              {/* BCC Field with helper */}
              <label htmlFor="cmp-bcc" style={{ color: '#6B6B6B' }}>
                Bcc
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <input
                  id="cmp-bcc"
                  type="text"
                  value={cBcc}
                  onChange={(e) => {
                    setCBcc(e.target.value);
                    validateEmails(e.target.value);
                  }}
                  placeholder="bv. administratie@aalterpaint.be"
                  style={{
                    height: '40px',
                    padding: '0 10px',
                    border: '1px solid #C9C9C9',
                    borderRadius: 0,
                    fontSize: '15px',
                    background: '#FFFFFF',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#6B6B6B' }}>
                  {isNl
                    ? 'Bcc-ontvangers zijn niet zichtbaar voor de klant.'
                    : 'Bcc recipients are hidden from the customer.'}
                </span>
              </div>

              {/* Subject Field */}
              <label htmlFor="cmp-subj" style={{ color: '#6B6B6B' }}>
                {isNl ? 'Onderwerp' : 'Subject'}
              </label>
              <input
                id="cmp-subj"
                type="text"
                value={cSubject}
                onChange={(e) => setCSubject(e.target.value)}
                style={{
                  height: '40px',
                  padding: '0 10px',
                  border: '1px solid #C9C9C9',
                  borderRadius: 0,
                  fontSize: '15px',
                  background: '#FFFFFF',
                }}
              />
            </div>

            {/* Validation warning message */}
            {emailWarning && (
              <div
                style={{
                  padding: '8px 12px',
                  background: '#FCE8E8',
                  border: '1px solid #F5C6CB',
                  color: '#A61B1B',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {emailWarning}
              </div>
            )}

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#4D4D4D',
              }}
            >
              {isNl ? 'Bericht' : 'Message'}
              <span style={{ fontWeight: 400, color: '#6B6B6B' }}>
                {isNl
                  ? 'De vragen zijn ingevuld op basis van wat nog ontbreekt in deze order.'
                  : 'Questions are pre-filled based on missing information in this order.'}
              </span>
              <textarea
                value={cBody}
                onChange={(e) => setCBody(e.target.value)}
                rows={7}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #C9C9C9',
                  borderRadius: 0,
                  fontSize: '15px',
                  fontWeight: 400,
                  lineHeight: 1.5,
                  resize: 'vertical',
                  color: '#1A1A1A',
                  fontFamily: 'inherit',
                }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setComposeOpen(false)}
                className="bg"
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
                {isNl ? 'Annuleren' : 'Cancel'}
              </button>
              <button
                onClick={() => setComposeOpen(false)}
                className="bp"
                style={{
                  minHeight: '44px',
                  padding: '0 18px',
                  border: 0,
                  background: '#E20714',
                  color: '#FFFFFF',
                  borderRadius: 0,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <svg className="s" viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="1" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                {isNl ? 'Verzenden' : 'Send'}
              </button>
            </div>
          </div>
        )}

        {/* Order metadata strip */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px 22px',
            fontSize: '14px',
            color: '#4D4D4D',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Ref. <strong style={{ color: '#1A1A1A', fontWeight: 600 }}>{currentOrder.ref}</strong>
            <ConfidenceBadge value={98} threshold={threshold} showLabel={false} />
          </span>
          <span>
            {isNl ? 'Ontvangen' : 'Received'} {currentOrder.day} {currentOrder.time}
          </span>
          <span>{mbFull}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: '#E8590C', display: 'block' }} />
            Outlook: {isNl ? 'In review' : 'In review'}
          </span>
        </div>
      </div>

      {/* 2. Main Two-Column Comparison View */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'flex-start' }}>
        {/* LEFT COLUMN: Source document (Bron) */}
        <section
          aria-label={isNl ? 'Bron' : 'Source'}
          style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* Tabs bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              borderBottom: '1px solid #DADADA',
            }}
          >
            <div role="tablist" style={{ display: 'flex', gap: '20px' }}>
              <button
                role="tab"
                onClick={() => setLeftTab('bon')}
                style={{
                  padding: '10px 0',
                  border: 0,
                  borderBottom: `2px solid ${leftTab === 'bon' ? '#E20714' : 'transparent'}`,
                  marginBottom: '-1px',
                  background: 'transparent',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#1A1A1A',
                  cursor: 'pointer',
                }}
              >
                {isNl ? 'Bestelbon' : 'Order slip'}
              </button>
              <button
                role="tab"
                onClick={() => setLeftTab('mail')}
                style={{
                  padding: '10px 0',
                  border: 0,
                  borderBottom: `2px solid ${leftTab === 'mail' ? '#E20714' : 'transparent'}`,
                  marginBottom: '-1px',
                  background: 'transparent',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#1A1A1A',
                  cursor: 'pointer',
                }}
              >
                {isNl ? 'Bronmail' : 'Source email'}
              </button>
            </div>

            {/* OCR score badge */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: '#4D4D4D',
                paddingBottom: '6px',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '1px 7px 1px 5px',
                  borderRadius: '2px',
                  background: '#FFD302',
                  color: '#1A1A1A',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                <svg className="s a-spark" viewBox="0 0 24 24">
                  <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
                  <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
                </svg>
                AI
              </span>
              OCR
              <ConfidenceBadge value={currentOrder.ocr || 91} threshold={threshold} showLabel={false} />
            </span>
          </div>

          {/* TAB 1: Bestelbon (Order slip view) */}
          {leftTab === 'bon' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#FFFEFA',
                  border: '1px solid #E6E6E6',
                  boxShadow: '0 6px 24px rgba(18,18,18,0.08)',
                  padding: '26px 26px 30px 26px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  color: '#1E2A3A',
                }}
              >
                {/* Scanning laser animation line */}
                {scanOn && <span aria-hidden="true" className="a-scan" />}

                {/* Slip header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    fontFamily: "'Archivo', system-ui, sans-serif",
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: '#1E2A3A' }}>
                      {currentOrder.klant}
                    </span>
                    <span style={{ fontSize: '12px', color: '#4D4D4D' }}>{address}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, letterSpacing: '0.12em', fontSize: '14px' }}>
                      {isNl ? 'BESTELBON' : 'ORDER SLIP'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#4D4D4D' }}>Aan: Aalterpaint nv, Aalter</span>
                  </div>
                </div>

                {/* Reference & date */}
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px' }}>
                  <span>Ref.: {currentOrder.ref}</span>
                  <span>
                    {isNl ? 'Datum' : 'Date'}: {currentOrder.day}
                  </span>
                </div>

                {/* Lines table on slip */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px minmax(0, 1fr) 90px',
                      gap: '8px',
                      padding: '4px 6px',
                      borderBottom: '1px solid #1E2A3A',
                      fontFamily: "'Archivo', system-ui, sans-serif",
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}
                  >
                    <span>#</span>
                    <span>{isNl ? 'Omschrijving' : 'Description'}</span>
                    <span style={{ textAlign: 'right' }}>{isNl ? 'Aantal' : 'Quantity'}</span>
                  </div>

                  {currentOrder.lines.map((l, i) => {
                    const isSelected = selLineId === l.id;
                    return (
                      <button
                        key={l.id}
                        className="tr"
                        onClick={() => setSelLineId(l.id)}
                        title={isNl ? 'Toon deze regel rechts' : 'View this line on the right'}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '28px minmax(0, 1fr) 90px',
                          gap: '8px',
                          padding: '6px',
                          border: 0,
                          outline: isSelected ? '2px solid #FFD302' : '2px solid transparent',
                          outlineOffset: '-2px',
                          borderRadius: 0,
                          background: isSelected ? '#FFF8D6' : 'transparent',
                          boxShadow: isSelected ? '0 0 8px rgba(255, 211, 2, 0.45)' : 'none',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          color: '#1E2A3A',
                          alignItems: 'baseline',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontFamily: "'Archivo', system-ui, sans-serif", fontSize: '12px', color: '#6B6B6B' }}>
                          {i + 1}
                        </span>
                        <span>{l.raw}</span>
                        <span
                          style={{
                            textAlign: 'right',
                            color: l.qty === null ? '#A61B1B' : '#1E2A3A',
                          }}
                        >
                          {l.bonQty || (l.qty !== null ? l.qty : '??')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: '13px', color: '#4D4D4D' }}>
                  Levering: {address} · Gelieve onze referentie te vermelden op de leveringsbon.
                </div>
              </div>

              <span style={{ fontSize: '12px', color: '#6B6B6B' }}>
                {currentOrder.ocrKind || 'Getypte PDF'} · {currentOrder.att} ·{' '}
                {isNl
                  ? 'geel = waar de AI de geselecteerde regel las'
                  : 'yellow = where AI read the selected line'}
              </span>
            </div>
          )}

          {/* TAB 2: Bronmail (Source email view) */}
          {leftTab === 'mail' && (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E6E6E6',
                boxShadow: '0 6px 24px rgba(18,18,18,0.08)',
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '96px minmax(0, 1fr)',
                  gap: '6px 12px',
                  fontSize: '14px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid #EBEBEB',
                }}
              >
                <span style={{ color: '#6B6B6B' }}>{isNl ? 'Van' : 'From'}</span>
                <span style={{ fontWeight: 600 }}>{currentOrder.from}</span>
                <span style={{ color: '#6B6B6B' }}>{isNl ? 'Aan' : 'To'}</span>
                <span>
                  {mbFull} ({mbLabel})
                </span>
                <span style={{ color: '#6B6B6B' }}>{isNl ? 'Onderwerp' : 'Subject'}</span>
                <span style={{ fontWeight: 600 }}>{currentOrder.subject}</span>
                <span style={{ color: '#6B6B6B' }}>{isNl ? 'Ontvangen' : 'Received'}</span>
                <span>
                  {currentOrder.day} {currentOrder.time}
                </span>
              </div>

              <p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: '15px' }}>{currentOrder.body}</p>

              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                <svg className="s" viewBox="0 0 24 24">
                  <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
                  <path d="M14 3v5h5" />
                </svg>
                {currentOrder.att}
              </span>

              <span
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#4D4D4D',
                  paddingTop: '12px',
                  borderTop: '1px solid #EBEBEB',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '1px 7px 1px 5px',
                    borderRadius: '2px',
                    background: '#FFD302',
                    color: '#1A1A1A',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  <svg className="s a-spark" viewBox="0 0 24 24">
                    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
                  </svg>
                  AI
                </span>
                {isNl ? 'Herkend als bestelmail' : 'Recognized as order email'}
                <ConfidenceBadge value={97} threshold={threshold} showLabel={false} />
              </span>
            </div>
          )}

          {/* AI Insights: Collapsible drawer below source document */}
          <section
            aria-label="AI Insights voor deze order"
            style={{
              background: '#FFFFFF',
              border: '1px solid #DADADA',
              borderTop: '3px solid #FFD302',
            }}
          >
            <button
                className="row"
                onClick={() => {
                  const next = !insOpen;
                  setInsOpen(next);
                  if (next) setScanKey((k) => k + 1);
                }}
                aria-expanded={insOpen}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px 12px',
                  width: '100%',
                  padding: '12px 16px',
                  border: 0,
                  background: 'transparent',
                  textAlign: 'left',
                  color: '#1A1A1A',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '1px 7px 1px 5px',
                    borderRadius: '2px',
                    background: '#FFD302',
                    color: '#1A1A1A',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  <svg className="s a-spark" viewBox="0 0 24 24">
                    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
                  </svg>
                  AI
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>
                  {isNl ? 'AI Insights voor deze order' : 'AI Insights for this order'}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#E20714',
                    marginLeft: 'auto',
                  }}
                >
                  {insOpen ? (isNl ? 'Inklappen' : 'Collapse') : isNl ? 'Bekijken' : 'View'}
                  <svg
                    className="s"
                    viewBox="0 0 24 24"
                    style={{
                      transform: insOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform .25s ease',
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
                <span style={{ fontSize: '12px', color: '#6B6B6B', flex: '1 1 100%', order: 3 }}>
                  {insSummary}
                </span>
              </button>

              {insOpen && (
                <div
                  className="a-in"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '0 24px',
                    padding: '0 16px 14px 16px',
                  }}
                >
                  {/* Card 1: Regels */}
                  <div
                    className="a-stag"
                    style={{
                      animationDelay: '40ms',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px 0',
                      borderTop: '1px solid #EBEBEB',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B6B' }}>
                      {isNl ? 'Regels' : 'Lines'}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Archivo', system-ui, sans-serif",
                        fontWeight: 700,
                        fontSize: '20px',
                        lineHeight: 1.2,
                        color: linesUnderThreshold ? '#8A3405' : '#11603B',
                      }}
                    >
                      {isNl
                        ? `${linesUnderThreshold} van ${currentOrder.lines.length} onder de drempel`
                        : `${linesUnderThreshold} of ${currentOrder.lines.length} below threshold`}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '2px', paddingBottom: '2px' }}>
                      <ConfidenceBadge
                        key={`conf-regels-${currentOrder.nr}-${scanKey}`}
                        value={avgOrderConf}
                        threshold={threshold}
                        showLabel={false}
                        delay={100}
                        scanKey={scanKey}
                      />
                    </div>
                    <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
                      {linesUnderThreshold
                        ? isNl
                          ? 'Bevestig of corrigeer deze regels voor je goedkeurt.'
                          : 'Confirm or correct these lines before approving.'
                        : isNl
                        ? 'Alle regels boven drempel: normale controle.'
                        : 'All lines above threshold: standard review.'}
                    </span>
                  </div>

                  {/* Card 2: Controles */}
                  <div
                    className="a-stag"
                    style={{
                      animationDelay: '100ms',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px 0',
                      borderTop: '1px solid #EBEBEB',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B6B' }}>
                      {isNl ? 'Controles' : 'Checks'}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Archivo', system-ui, sans-serif",
                        fontWeight: 700,
                        fontSize: '20px',
                        lineHeight: 1.2,
                        color: totalFails ? '#A61B1B' : totalMisses ? '#8A3405' : '#11603B',
                      }}
                    >
                      {totalFails
                        ? isNl
                          ? `${totalFails} mislukt`
                          : `${totalFails} failed`
                        : totalMisses
                        ? isNl
                          ? `${totalMisses} onzeker`
                          : `${totalMisses} uncertain`
                        : isNl
                        ? 'In orde'
                        : 'In order'}
                    </span>
                    <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
                      {isNl
                        ? `Basis A/B/C, RAL-code en verpakkingsmaat per regel${totalMisses ? `, plus ${totalMisses} onzeker` : ''}.`
                        : `Base A/B/C, RAL code and packaging per line${totalMisses ? `, plus ${totalMisses} uncertain` : ''}.`}
                    </span>
                  </div>

                  {/* Card 3: OCR-kwaliteit */}
                  <div
                    className="a-stag"
                    style={{
                      animationDelay: '160ms',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px 0',
                      borderTop: '1px solid #EBEBEB',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B6B' }}>
                      {isNl ? 'OCR-kwaliteit' : 'OCR quality'}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Archivo', system-ui, sans-serif",
                        fontWeight: 700,
                        fontSize: '20px',
                        lineHeight: 1.2,
                        color: '#1A1A1A',
                      }}
                    >
                      {currentOrder.ocrKind || (isNl ? 'Gescande getypte bon' : 'Scanned typed slip')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '2px', paddingBottom: '2px' }}>
                      <ConfidenceBadge
                        key={`conf-ocr-${currentOrder.nr}-${scanKey}`}
                        value={currentOrder.ocr || 91}
                        threshold={threshold}
                        showLabel={false}
                        delay={220}
                        scanKey={scanKey}
                      />
                    </div>
                    <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
                      {currentOrder.ocrWhy ||
                        (isNl
                          ? 'Hoge score: scan van een getypte bon, goed leesbaar'
                          : 'High score: scan of a typed slip, clearly legible')}
                    </span>
                  </div>

                  {/* Card 4: Klantherkenning */}
                  <div
                    className="a-stag"
                    style={{
                      animationDelay: '220ms',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px 0',
                      borderTop: '1px solid #EBEBEB',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B6B' }}>
                      {isNl ? 'Klantherkenning' : 'Customer recognition'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontFamily: "'Archivo', system-ui, sans-serif",
                          fontWeight: 700,
                          fontSize: '20px',
                          lineHeight: 1.2,
                          color: '#1A1A1A',
                        }}
                      >
                        {currentOrder.klant}
                      </span>
                      <ConfidenceBadge
                        key={`conf-klant-${currentOrder.nr}-${scanKey}`}
                        value={currentOrder.klantConf || 96}
                        threshold={threshold}
                        showLabel={false}
                        delay={340}
                        scanKey={scanKey}
                      />
                    </div>
                    <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
                      {currentOrder.klantWhy ||
                        (isNl
                          ? 'Afzenderdomein uvin.be en leveradres komen overeen met BC-klant K-10145'
                          : 'Sender domain uvin.be and delivery address match BC customer K-10145')}
                    </span>
                  </div>
                </div>
              )}
            </section>
          </section>

        {/* RIGHT COLUMN: Order lines & Decision (Orderregels en beslissing) */}
        <section
          aria-label={isNl ? 'Orderregels' : 'Order lines'}
          style={{
            flex: '1.4 1 520px',
            minWidth: 0,
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '18px 22px 12px 22px',
              borderBottom: '1px solid #DADADA',
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
              {isNl ? `Orderregels (${currentOrder.lines.length})` : `Order lines (${currentOrder.lines.length})`}
            </h2>
            <span style={{ fontSize: '13px', color: '#6B6B6B' }}>
              {isNl
                ? `${linesUnderThreshold} van ${currentOrder.lines.length} onder de drempel · ${linesConfirmed} bevestigd`
                : `${linesUnderThreshold} of ${currentOrder.lines.length} below threshold · ${linesConfirmed} confirmed`}
            </span>
          </div>

          {/* Lines list */}
          {currentOrder.lines.map((l, i) => {
            const isSelected = selLineId === l.id;
            const idx = i + 1;
            const checks = getLineChecks(l);
            const fails = checks.filter((c) => c.k === 'fail').length;
            const misses = checks.filter((c) => c.k === 'miss').length;
            const catItem = CAT[l.art] || { d: 'Product', pack: '10L' };

            // Status chip
            let chipText = isNl ? 'Normale controle' : 'Standard check';
            let chipBg = '#F2F2F2';
            let chipFg = '#4D4D4D';

            if (l.corrected) {
              chipText = isNl ? 'Gecorrigeerd' : 'Corrected';
              chipBg = '#E7EEFC';
              chipFg = '#1D4FBF';
            } else if (l.confirmed) {
              chipText = isNl ? 'Bevestigd' : 'Confirmed';
              chipBg = '#E3F2E9';
              chipFg = '#11603B';
            } else if (l.conf < threshold || fails > 0 || misses > 0 || l.qty === null) {
              chipText = isNl ? 'Extra aandacht' : 'Extra attention';
              chipBg = '#FDEBDD';
              chipFg = '#8A3405';
            }

            return (
              <div
                key={l.id}
                className="a-stag"
                style={{
                  animationDelay: `${80 + i * 70}ms`,
                  borderBottom: '1px solid #EBEBEB',
                  background: isSelected ? '#FAFAFA' : '#FFFFFF',
                }}
              >
                {/* Line summary button */}
                <button
                  className="row"
                  onClick={() => setSelLineId(isSelected ? null : l.id)}
                  aria-expanded={isSelected}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '22px minmax(0, 1fr) auto',
                    gap: '14px',
                    width: '100%',
                    padding: '14px 22px',
                    border: 0,
                    background: 'transparent',
                    textAlign: 'left',
                    color: '#1A1A1A',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Archivo', system-ui, sans-serif",
                      fontWeight: 700,
                      fontSize: '15px',
                      color: isSelected ? '#E20714' : '#1A1A1A',
                    }}
                  >
                    {idx}
                  </span>

                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                    <span style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'baseline' }}>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        {l.art}
                      </span>
                      <span style={{ fontWeight: 600 }}>{catItem.d}</span>
                    </span>

                    <span style={{ fontSize: '13px', color: '#6B6B6B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Bon: "{l.raw}" ·{' '}
                      <span style={{ color: l.qty === null ? '#A61B1B' : '#1A1A1A', fontWeight: 600 }}>
                        {l.qty === null ? (isNl ? 'Hoeveelheid ontbreekt' : 'Quantity missing') : `${l.qty} ${l.unit || 'blik'}`}
                      </span>
                    </span>
                  </span>

                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ConfidenceBadge value={l.conf} threshold={threshold} showLabel={false} />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        background: chipBg,
                        color: chipFg,
                        borderRadius: '2px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {chipText}
                    </span>
                  </span>
                </button>

                {/* Expanded line details & editing */}
                {isSelected && (
                  <div
                    className="a-in"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '18px',
                      padding: '0 22px 20px 58px',
                    }}
                  >
                    {/* AI reasoning yellow card */}
                    <div
                      style={{
                        background: '#FFF8D6',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '1px 7px 1px 5px',
                            borderRadius: '2px',
                            background: '#FFD302',
                            color: '#1A1A1A',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <svg className="s a-spark" viewBox="0 0 24 24">
                            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
                          </svg>
                          AI
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#5C4A00' }}>
                          {isNl ? 'Waarom dit voorstel' : 'Why this proposal'}
                        </span>
                        <ConfidenceBadge value={l.conf} threshold={threshold} showLabel={true} />
                      </span>

                      <span style={{ fontSize: '14px', color: '#1A1A1A' }}>{l.why}</span>

                      {/* Other candidates */}
                      {l.alts && l.alts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #EFDD95', paddingTop: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#7A6400', padding: '6px 0 2px 0' }}>
                            {isNl ? 'Andere kandidaten' : 'Other candidates'}
                          </span>
                          {l.alts.map((alt) => (
                            <div
                              key={alt.art}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                                gap: '12px',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: '1px solid #EFDD95',
                              }}
                            >
                              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'baseline' }}>
                                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 500 }}>
                                    {alt.art}
                                  </span>
                                  <span style={{ fontSize: '14px' }}>{CAT[alt.art]?.d || alt.art}</span>
                                </span>
                                <span style={{ fontSize: '12px', color: '#6B6B6B' }}>{alt.why}</span>
                              </span>
                              <ConfidenceBadge value={alt.conf} threshold={threshold} showLabel={false} />
                              <button
                                onClick={() => handlePickArticle(l.id, alt.art)}
                                className="lk"
                                style={{
                                  border: 0,
                                  background: 'transparent',
                                  padding: '6px 0',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  letterSpacing: '0.06em',
                                  textTransform: 'uppercase',
                                  color: '#E20714',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer',
                                }}
                              >
                                {isNl ? 'Kies' : 'Choose'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Checks against slip */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B6B' }}>
                        {isNl ? 'Controles tegenover de bon' : 'Checks against the slip'}
                      </span>
                      {checks.map((k) => {
                        const isOk = k.k === 'ok';
                        const isFail = k.k === 'fail';
                        const isMiss = k.k === 'miss';
                        const iconBg = isOk
                          ? '#E3F2E9'
                          : isFail
                          ? '#FCE8E8'
                          : isMiss
                          ? '#FDEBDD'
                          : '#F2F2F2';
                        const iconFg = isOk
                          ? '#11603B'
                          : isFail
                          ? '#A61B1B'
                          : isMiss
                          ? '#8A3405'
                          : '#4D4D4D';

                        return (
                          <span key={k.n} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                            <span
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: iconBg,
                                color: iconFg,
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'center',
                                justifyContent: 'center',
                                flex: 'none',
                              }}
                            >
                              {isOk && (
                                <svg className="s" viewBox="0 0 24 24">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                              {isFail && (
                                <svg className="s" viewBox="0 0 24 24">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              )}
                              {isMiss && (
                                <svg className="s" viewBox="0 0 24 24">
                                  <path d="M12 7v6M12 16.5v.01" />
                                </svg>
                              )}
                              {k.k === 'na' && (
                                <svg className="s" viewBox="0 0 24 24">
                                  <path d="M6 12h12" />
                                </svg>
                              )}
                            </span>
                            <span style={{ fontWeight: 600, minWidth: '120px' }}>{k.n}</span>
                            <span style={{ color: iconFg }}>{k.t}</span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Line editing inputs */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#4D4D4D' }}>
                        {isNl ? 'Hoeveelheid' : 'Quantity'}
                        <input
                          type="text"
                          inputMode="decimal"
                          value={l.qty !== null && l.qty !== undefined ? String(l.qty) : ''}
                          onChange={(e) => handleSetQty(l.id, e.target.value)}
                          placeholder={isNl ? 'Aanvullen' : 'Fill in'}
                          style={{
                            height: '40px',
                            width: '96px',
                            padding: '0 10px',
                            border: `1px solid ${l.qty === null ? '#A61B1B' : '#C9C9C9'}`,
                            borderRadius: 0,
                            fontSize: '15px',
                            fontWeight: 400,
                            background: '#FFFFFF',
                          }}
                        />
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#4D4D4D' }}>
                        {isNl ? 'Eenheid' : 'Unit'}
                        <select
                          value={l.unit || 'blik'}
                          onChange={(e) => handleSetUnit(l.id, e.target.value)}
                          style={{
                            height: '40px',
                            padding: '0 8px',
                            border: '1px solid #C9C9C9',
                            borderRadius: 0,
                            fontSize: '15px',
                            fontWeight: 400,
                            background: '#FFFFFF',
                            minWidth: '96px',
                          }}
                        >
                          <option value="blik">{isNl ? 'blik' : 'can'}</option>
                          <option value="emmer">{isNl ? 'emmer' : 'bucket'}</option>
                          <option value="kit">kit</option>
                          <option value="stuk">{isNl ? 'stuk' : 'piece'}</option>
                        </select>
                      </label>

                      {/* Optional RAL input if RAL missed */}
                      {misses > 0 && !CAT[l.art]?.ral && (
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#4D4D4D' }}>
                          RAL-code
                          <span style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              value={ralDraft}
                              onChange={(e) => setRalDraft(e.target.value)}
                              placeholder="bv. 9010"
                              style={{
                                height: '40px',
                                width: '96px',
                                padding: '0 10px',
                                border: '1px solid #E8590C',
                                borderRadius: 0,
                                fontSize: '15px',
                                fontWeight: 400,
                              }}
                            />
                            <button
                              onClick={() => handleApplyRal(l.id)}
                              className="bd"
                              style={{
                                height: '40px',
                                padding: '0 12px',
                                background: '#FFFFFF',
                                color: '#E20714',
                                border: '1px solid #E20714',
                                borderRadius: 0,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              {isNl ? 'Toepassen' : 'Apply'}
                            </button>
                          </span>
                        </label>
                      )}

                      {/* Search another article */}
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#4D4D4D', flex: '1 1 220px' }}>
                        {isNl ? 'Ander artikel zoeken' : 'Search other article'}
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            height: '40px',
                            padding: '0 10px',
                            border: '1px solid #C9C9C9',
                            background: '#FFFFFF',
                            color: '#242424',
                          }}
                        >
                          <svg className="s" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="7" />
                            <path d="M21 21l-4.35-4.35" />
                          </svg>
                          <input
                            type="search"
                            value={artSearch}
                            onChange={(e) => setArtSearch(e.target.value)}
                            placeholder={
                              isNl
                                ? 'Nummer, product, basis of RAL'
                                : 'Number, product, base or RAL'
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
                    </div>

                    {/* Search results dropdown */}
                    {searchResults.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #DADADA', padding: '4px 10px', background: '#FFFFFF' }}>
                        {searchResults.map((r) => (
                          <button
                            key={r.art}
                            onClick={() => !r.blocked && handlePickArticle(l.id, r.art)}
                            className="row"
                            disabled={r.blocked}
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'baseline',
                              gap: '4px 10px',
                              padding: '8px 0',
                              border: 0,
                              borderBottom: '1px solid #EBEBEB',
                              background: 'transparent',
                              textAlign: 'left',
                              cursor: r.blocked ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 500 }}>
                              {r.art}
                            </span>
                            <span style={{ fontSize: '14px' }}>{r.d}</span>
                            <span
                              style={{
                                fontSize: '12px',
                                color: r.blocked ? '#A61B1B' : '#4D4D4D',
                                marginLeft: 'auto',
                              }}
                            >
                              {r.note}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Confirmation bar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
                        {l.confirmed
                          ? isNl
                            ? `Bevestigd door ${l.by || userName}`
                            : `Confirmed by ${l.by || userName}`
                          : l.qty === null
                          ? isNl
                            ? 'Vul eerst de hoeveelheid aan.'
                            : 'Please fill in quantity first.'
                          : isNl
                          ? 'Deze regel vraagt extra aandacht: bevestig of corrigeer.'
                          : 'This line requires attention: please confirm or correct.'}
                      </span>

                      {!l.confirmed && (
                        <button
                          onClick={() => handleConfirmLine(l.id)}
                          disabled={l.qty === null}
                          className="bd"
                          style={{
                            minHeight: '40px',
                            padding: '0 14px',
                            background: '#FFFFFF',
                            color: '#E20714',
                            border: '1px solid #E20714',
                            borderRadius: 0,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            fontSize: '12px',
                            cursor: l.qty === null ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <svg className="s" viewBox="0 0 24 24">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          {isNl ? 'Regel bevestigen' : 'Confirm line'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 3. Decision Area (Beslissing) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '20px 22px 22px 22px',
              background: '#FAFAFA',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4D4D4D' }}>
              <svg className="s" viewBox="0 0 24 24">
                <rect x="4" y="11" width="16" height="10" rx="1" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              {isNl
                ? 'Niets gaat automatisch naar Business Central. Enkel wat jij goedkeurt, wordt een verkooporder.'
                : 'Nothing goes automatically to Business Central. Only what you approve becomes a sales order.'}
            </span>

            {isPending && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Blockers warning */}
                {hasBlockers && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#8A3405' }}>
                    <span style={{ fontWeight: 700 }}>
                      {isNl ? 'Nog te doen voor goedkeuring' : 'Remaining items before approval'}
                    </span>
                    {blockers.map((b, idx) => (
                      <span key={idx}>{b}</span>
                    ))}
                  </div>
                )}

                {/* Comment & Action buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#4D4D4D',
                      flex: '1 1 260px',
                    }}
                  >
                    {isNl ? 'Opmerking (verplicht bij afwijzen)' : 'Comment (required when rejecting)'}
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={
                        isNl
                          ? 'bv. Levering vrijdag bevestigd met klant'
                          : 'e.g. Delivery confirmed for Friday with customer'
                      }
                      style={{
                        height: '48px',
                        padding: '0 12px',
                        border: '1px solid #C9C9C9',
                        borderRadius: 0,
                        fontSize: '15px',
                        fontWeight: 400,
                        background: '#FFFFFF',
                      }}
                    />
                  </label>

                  {/* Reject button */}
                  <button
                    onClick={handleReject}
                    disabled={!comment.trim()}
                    className="bg"
                    style={{
                      minHeight: '48px',
                      padding: '0 18px',
                      border: '1px solid #1A1A1A',
                      background: '#FFFFFF',
                      borderRadius: 0,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontSize: '13px',
                      cursor: !comment.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isNl ? 'Afwijzen' : 'Reject'}
                  </button>

                  {/* Approve button */}
                  <button
                    onClick={handleApprove}
                    disabled={hasBlockers || isSyncing}
                    className="bp"
                    style={{
                      minHeight: '48px',
                      padding: '0 20px',
                      border: 0,
                      background: '#E20714',
                      color: '#FFFFFF',
                      borderRadius: 0,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontSize: '13px',
                      cursor: hasBlockers || isSyncing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <svg className="s" viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {isNl ? 'Goedkeuren' : 'Approve'}
                  </button>
                </div>
              </div>
            )}

            {/* Syncing Progress Banner */}
            {isSyncing && (
              <div
                className="a-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  background: '#F5F5F5',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#E20714',
                  }}
                >
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
                  {isNl
                    ? 'Verzenden naar Business Central...'
                    : 'Transmitting to Business Central...'}
                </span>
                <span style={{ position: 'relative', display: 'block', height: '4px', background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <span
                    className="a-prog"
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: '40%',
                      background: '#E20714',
                      display: 'block',
                    }}
                  />
                </span>
              </div>
            )}

            {/* Approval / Sync Result Banner */}
            {syncResult && (
              <div
                className="a-in"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  background: syncResult.synced ? '#E3F2E9' : '#FCE8E8',
                  color: syncResult.synced ? '#11603B' : '#A61B1B',
                }}
              >
                {syncResult.synced && (
                  <span
                    className="a-pop"
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: '#1F9D55',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                    }}
                  >
                    <svg className="i" viewBox="0 0 24 24" style={{ strokeWidth: 2.5 }}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{syncResult.title}</span>
                  <span style={{ fontSize: '14px' }}>{syncResult.text}</span>
                </div>
              </div>
            )}

            {/* Next order button if available */}
            {syncResult && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
                <button
                  onClick={handleNextOrder}
                  className="bd"
                  style={{
                    minHeight: '44px',
                    padding: '0 16px',
                    background: '#FFFFFF',
                    color: '#E20714',
                    border: '1px solid #E20714',
                    borderRadius: 0,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {isNl ? 'Volgende order' : 'Next order'}
                  <svg className="s" viewBox="0 0 24 24">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
                {onNavigateToExceptions && (
                  <button
                    onClick={onNavigateToExceptions}
                    className="bg"
                    style={{
                      minHeight: '44px',
                      padding: '0 16px',
                      background: '#FFFFFF',
                      border: '1px solid #1A1A1A',
                      borderRadius: 0,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {isNl ? 'Naar uitzonderingen' : 'To exceptions'}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
