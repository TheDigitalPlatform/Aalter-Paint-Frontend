import React, { useState, useMemo, useEffect } from 'react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { type Language } from '../common/LanguageToggle';
import { TablePagination } from '../common/TablePagination';
import { useLanguage } from '../../context/LanguageContext';
import { INITIAL_ORDERS, type OrderItem } from '../../data/mockData';
import { fetchOrders, fetchAvailableMailboxes, type OrderListItem, type OrderInsightsSummary } from '../../lib/ordersApi';

export interface OrdersViewProps {
  language?: Language;
  onOpenOrder?: (orderNr: string, orderId?: number, emailId?: number) => void;
  onNavigateToExceptions?: () => void;
  mode?: 'orders' | 'validation';
  totalCountFromSidebar?: number;
}

type SortKey = 'nr' | 'klant' | 'received' | 'conf';
type SortDir = 'asc' | 'desc';

function formatMailboxOptionLabel(mailbox: string, isNl: boolean): string {
  const clean = mailbox.trim();
  const lower = clean.toLowerCase();
  if (lower === 'info') return 'info@';
  if (lower === 'bestel') return 'bestel@';
  if (lower === 'persoonlijk' || lower === 'personal') return isNl ? 'Persoonlijk' : 'Personal';
  return clean;
}

export function mapApiOrderToOrderItem(apiOrder: OrderListItem, isNl: boolean): OrderItem {
  let day = '';
  let time = '';
  let min = 0;
  if (apiOrder.received_at) {
    const d = new Date(apiOrder.received_at);
    day = d.toLocaleDateString(isNl ? 'nl-BE' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    min = d.getHours() * 60 + d.getMinutes();
  }

  let mb: 'info' | 'bestel' | 'persoonlijk' = 'info';
  const mbStr = (apiOrder.mailbox || '').toLowerCase();
  if (mbStr.includes('bestel')) mb = 'bestel';
  else if (mbStr.includes('persoonlijk') || mbStr.includes('personal')) mb = 'persoonlijk';

  const avg =
    apiOrder.confidence != null
      ? Math.round(apiOrder.confidence <= 1 ? apiOrder.confidence * 100 : apiOrder.confidence)
      : null;

  const stLower = (apiOrder.status || '').toLowerCase();
  let st: 'pending' | 'verwerking' | 'klaar' | 'aandacht' | 'goedgekeurd' | 'afgewezen' | 'gesync' | 'syncfout' = 'pending';
  if (stLower === 'processing') st = 'verwerking';
  else if (stLower === 'ready_for_review' || stLower === 'completed') st = 'klaar';
  else if (stLower === 'needs_attention' || stLower === 'needs_review') st = 'aandacht';
  else if (stLower === 'approved') st = 'goedgekeurd';
  else if (stLower === 'rejected') st = 'afgewezen';
  else if (stLower === 'synchronized' || stLower === 'gesync') st = 'gesync';
  else if (stLower === 'failed' || stLower === 'syncfout') st = 'syncfout';

  let ref = apiOrder.customer_reference || '';
  let klantNr = '';
  if (ref.includes('·')) {
    const parts = ref.split('·');
    ref = parts[0].trim();
    klantNr = parts.slice(1).join('·').trim();
  } else if (ref.includes('K-')) {
    klantNr = ref.substring(ref.indexOf('K-')).trim();
    ref = ref.substring(0, ref.indexOf('K-')).trim().replace(/[-·,\s]+$/, '');
  }

  return {
    nr: apiOrder.order_number || `AP-26-${String(apiOrder.order_id).padStart(5, '0')}`,
    klant: apiOrder.customer_name || (isNl ? 'Onbekende klant' : 'Unknown customer'),
    klantNr: klantNr || '',
    klantConf: avg ?? 95,
    klantWhy: '',
    ref: ref || '',
    day,
    time,
    min,
    mb,
    from: '',
    subject: '',
    body: '',
    att: '',
    ocr: avg,
    ocrKind: 'Getypte PDF',
    st,
    lines: Array.from({ length: apiOrder.lines_count || 0 }, (_, i) => ({
      id: String(i + 1),
      raw: '',
      art: '',
      qty: 1,
      unit: 'L',
      conf: avg ?? 90,
      why: '',
      bonQty: '1',
      confirmed: false,
      corrected: false,
      by: 'AI',
    })),
    lines_count: apiOrder.lines_count,
    apiConfidenceSummary: apiOrder.confidence_summary,
    apiOutlookStatus: apiOrder.outlook_status,
    rawReceivedAt: apiOrder.received_at || apiOrder.created_at,
    rawMailbox: apiOrder.mailbox || undefined,
    order_id: apiOrder.order_id,
    email_id: apiOrder.email_id,
    ...(apiOrder.confidence_summary ? { confWhy: apiOrder.confidence_summary } : {}),
  } as OrderItem;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  language,
  onOpenOrder,
  onNavigateToExceptions,
  mode = 'orders',
  totalCountFromSidebar,
}) => {
  const { language: ctxLang } = useLanguage();
  const activeLang = language || ctxLang || 'NL';
  const isNl = activeLang === 'NL';

  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('alle');
  const [fMailbox, setFMailbox] = useState('alle');
  const [fAttention, setFAttention] = useState(false);
  const [fLong, setFLong] = useState(false);
  const [fUncertain, setFUncertain] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('received');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Live API State
  const [liveOrders, setLiveOrders] = useState<OrderListItem[] | null>(null);
  const [liveTotal, setLiveTotal] = useState<number | null>(null);
  const [liveMailboxes, setLiveMailboxes] = useState<string[]>([]);
  const [insightsSummary, setInsightsSummary] = useState<OrderInsightsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const threshold = 70;

  // Fetch distinct live mailboxes on mount
  useEffect(() => {
    let isCancelled = false;
    fetchAvailableMailboxes().then((mbs) => {
      if (!isCancelled && Array.isArray(mbs) && mbs.length > 0) {
        setLiveMailboxes((prev) => Array.from(new Set([...prev, ...mbs])));
      }
    }).catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, []);

  // Fetch orders from GET /api/orders with live polling and reactive refresh
  useEffect(() => {
    let isCancelled = false;

    const statusParam =
      mode === 'validation'
        ? (fStatus !== 'alle' ? fStatus : 'validation')
        : (fStatus !== 'alle' ? fStatus : undefined);

    const loadOrders = (isBackground: boolean = false) => {
      if (!isBackground) setLoading(true);

      fetchOrders({
        search: search.trim() || undefined,
        status: statusParam,
        mailbox: fMailbox !== 'alle' ? fMailbox : undefined,
        extra_attention: fAttention ? true : undefined,
        waiting_longer_than_4_hours: fLong ? true : undefined,
        uncertain_only: fUncertain ? true : undefined,
      })
        .then((data) => {
          console.log(`[OrdersView (${mode})] Live GET /api/orders data received:`, data);
          if (!isCancelled) {
            setLiveOrders(data.items || []);
            if (typeof data.total === 'number') {
              setLiveTotal(data.total);
            }
            setInsightsSummary(data.insights);
            if (data.available_mailboxes && data.available_mailboxes.length > 0) {
              setLiveMailboxes((prev) => Array.from(new Set([...prev, ...data.available_mailboxes!])));
            }
            if (mode === 'validation') {
              const valTotal =
                (!fAttention && !fLong && !fUncertain && !search.trim() && fStatus === 'alle' && fMailbox === 'alle')
                  ? data.total
                  : undefined;
              if (typeof valTotal === 'number') {
                window.dispatchEvent(new CustomEvent('validation_count_updated', { detail: valTotal }));
              }
            } else {
              const liveTotal =
                data.insights?.total_orders ??
                ((!fAttention && !fLong && !fUncertain && !search.trim() && fStatus === 'alle' && fMailbox === 'alle')
                  ? data.total
                  : undefined);
              if (typeof liveTotal === 'number') {
                window.dispatchEvent(new CustomEvent('orders_count_updated', { detail: liveTotal }));
              }
            }
          }
        })
        .catch((err) => {
          console.error(`[OrdersView (${mode})] GET /api/orders request failed:`, err);
        })
        .finally(() => {
          if (!isCancelled && !isBackground) setLoading(false);
        });
    };

    loadOrders(false);

    // Auto-refresh every 1 minute to automatically pick up newly incoming live orders
    const intervalId = setInterval(() => {
      console.log(`[OrdersView 1 min] ${new Date().toLocaleTimeString()} - Auto-refreshing orders table data...`);
      loadOrders(true);
    }, 60000);

    const handleFocus = () => loadOrders(true);
    const handleRefresh = () => loadOrders(true);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('orders_refreshed', handleRefresh);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('orders_refreshed', handleRefresh);
    };
  }, [search, fStatus, fMailbox, fAttention, fLong, fUncertain, mode]);

  // Dynamically derive available mailbox list from live backend data and incoming orders
  const availableMailboxOptions = useMemo(() => {
    const set = new Set<string>();

    // 1. Add mailboxes returned from backend /mailboxes or /orders available_mailboxes
    liveMailboxes.forEach((m) => {
      if (m && m.trim()) set.add(m.trim());
    });

    // 2. Add mailboxes found in any currently loaded live orders
    if (liveOrders) {
      liveOrders.forEach((o) => {
        if (o.mailbox && o.mailbox.trim()) set.add(o.mailbox.trim());
      });
    }

    // 3. Fallback: if no live mailboxes found yet, keep initial options so filter is available
    if (set.size === 0) {
      INITIAL_ORDERS.forEach((o) => {
        if (o.mb) set.add(o.mb);
      });
    }

    return Array.from(set);
  }, [liveMailboxes, liveOrders]);

  // Determine source data (uses live API data once loaded, even if 0 items)
  const sourceOrders = useMemo(() => {
    let orders = liveOrders !== null
      ? liveOrders.map((apiOrder) => mapApiOrderToOrderItem(apiOrder, isNl))
      : INITIAL_ORDERS;

    if (mode === 'validation') {
      orders = orders.filter((o) => {
        const stLower = (o.st || '').toLowerCase();
        return (
          stLower === 'aandacht' ||
          stLower === 'klaar' ||
          stLower === 'needs_attention' ||
          stLower === 'needs_review' ||
          stLower === 'ready_for_review' ||
          stLower === 'completed' ||
          stLower === 'pending'
        );
      });
    }

    return orders;
  }, [liveOrders, isNl, mode]);

  // Process order views
  const processedOrders = useMemo(() => {
    return sourceOrders.map((o) => {
      const lines = o.lines || [];
      const n = (o as any).lines_count !== undefined ? (o as any).lines_count : lines.length;
      const avg = o.ocr != null ? o.ocr : (n ? Math.round(lines.reduce((t, l) => t + l.conf, 0) / n) : null);
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
      let waitH = 0;
      const rawDate = (o as any).rawReceivedAt;
      if (rawDate) {
        const receivedMs = new Date(rawDate).getTime();
        if (!isNaN(receivedMs)) {
          waitH = Math.max(0, (Date.now() - receivedMs) / (1000 * 60 * 60));
        }
      } else {
        waitH = isPending || isProcessing ? (990 - o.min) / 60 : 0;
      }
      const isLongOrder =
        (waitH > 4 && st !== 'gesync' && st !== 'goedgekeurd') ||
        (isPending && (990 - o.min) / 60 > 4);

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

      // Mailbox label from live data
      const rawMb = (o as any).rawMailbox || (o as any).mailbox;
      let mbLabel = 'info@';
      if (rawMb) {
        mbLabel = formatMailboxOptionLabel(rawMb, isNl);
      } else {
        if (o.mb === 'bestel') mbLabel = 'bestel@';
        else if (o.mb === 'persoonlijk') mbLabel = isNl ? 'Persoonlijk' : 'Personal';
        else mbLabel = 'info@';
      }

      // Under threshold text
      let underTxt = (o as any).apiConfidenceSummary;
      if (!underTxt) {
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
        tagLabel: (o as any).apiOutlookStatus || tagLabel,
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
  }, [sourceOrders, isNl]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return processedOrders.filter((o) => {
      const matchSearch =
        !q ||
        (String(o.nr || '') + ' ' + String(o.klant || '') + ' ' + String(o.ref || '')).toLowerCase().indexOf(q) >= 0;

      // In validation mode, restrict strictly to validation categories (Needs Attention and Ready for Review)
      if (mode === 'validation') {
        const isValidationCategory = o.st === 'aandacht' || o.st === 'klaar';
        if (!isValidationCategory) return false;
        if (fStatus === 'klaar' && o.st !== 'klaar') return false;
        if (fStatus === 'aandacht' && o.st !== 'aandacht') return false;
      }

      // When live API is active, the backend handles server-side filtering
      if (liveOrders !== null) {
        if (fUncertain) {
          const isAttention = o.st === 'aandacht';
          const isLowConf = o.avg !== null && o.avg <= 70;
          if (!isAttention || !isLowConf) return false;
        }
        return matchSearch;
      }

      const matchStatus =
        fStatus === 'alle' ||
        (fStatus === 'open' ? o.isPending : o.st === fStatus);

      const matchMailbox =
        fMailbox === 'alle' ||
        o.mb === fMailbox ||
        (Boolean((o as any).rawMailbox) && (o as any).rawMailbox.toLowerCase().includes(fMailbox.toLowerCase()));
      const matchAttention = !fAttention || o.st === 'aandacht';
      const matchLong = !fLong || o.isLongOrder;
      const matchUncertain = !fUncertain || (o.st === 'aandacht' && o.avg !== null && o.avg <= 70);

      return (
        matchSearch &&
        matchStatus &&
        matchMailbox &&
        matchAttention &&
        matchLong &&
        matchUncertain
      );
    });
  }, [processedOrders, search, fStatus, fMailbox, fAttention, fLong, fUncertain, liveOrders, mode]);

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

  // Reset to page 1 when search, filters, or sorting change
  useEffect(() => {
    setPage(1);
  }, [search, fStatus, fMailbox, fAttention, fLong, fUncertain, sortKey, sortDir, mode]);

  // Paginated rows for the current page view
  const paginatedRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, page, pageSize]);

  // Dynamic live count derivation matching the sidebar
  const isFiltered =
    Boolean(search.trim()) ||
    fStatus !== 'alle' ||
    fMailbox !== 'alle' ||
    fAttention ||
    fLong ||
    fUncertain;

  const dynamicTotal =
    typeof totalCountFromSidebar === 'number' && totalCountFromSidebar > 0
      ? totalCountFromSidebar
      : typeof liveTotal === 'number' && liveTotal > 0
      ? liveTotal
      : processedOrders.length;

  const countToDisplay = isFiltered ? sortedRows.length : dynamicTotal;
  const totalToDisplay = dynamicTotal;

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
    setFUncertain(false);
  };

  // Compact Insights Cards
  const compactInsights = [
    {
      id: 'ci-1',
      value: insightsSummary ? insightsSummary.uncertain_matches : 3,
      color: '#8A3405',
      title: isNl ? 'onzekere matches' : 'uncertain matches',
      short: isNl
        ? 'regels onder 70% in orders'
        : 'lines below 70% in orders',
      d: 60,
      onClick: () => {
        if (fUncertain) {
          setFUncertain(false);
          setFAttention(false);
        } else {
          setFUncertain(true);
          setFAttention(true);
          setFStatus('alle');
          setFMailbox('alle');
          setFLong(false);
        }
      },
    },
    {
      id: 'ci-2',
      value: insightsSummary ? insightsSummary.missing_quantities : 1,
      color: '#A61B1B',
      title: isNl ? 'ontbrekende hoeveelheden' : 'missing quantities',
      short: isNl ? 'openstaande orders controleren' : 'open orders to review',
      d: 120,
      onClick: () => {
        setFUncertain(false);
        if (onOpenOrder) {
          onOpenOrder('AP-26-04818');
        } else {
          setSearch('AP-26-04818');
        }
      },
    },
    {
      id: 'ci-3',
      value: insightsSummary ? insightsSummary.waiting_over_4h : 1,
      color: '#A61B1B',
      title: isNl ? 'wachten > 4 uur' : 'waiting > 4 hours',
      short: isNl
        ? 'orders die vandaag nog weg moeten'
        : 'orders that must go out today',
      d: 180,
      onClick: () => {
        if (fLong) {
          setFLong(false);
          setFStatus('alle');
        } else {
          setFUncertain(false);
          setFLong(true);
          setFAttention(false);
          setFStatus('alle');
        }
      },
    },
    {
      id: 'ci-4',
      value: insightsSummary ? insightsSummary.failed_syncs : 2,
      color: '#A61B1B',
      title: isNl ? 'mislukte BC-syncs' : 'failed BC syncs',
      short: isNl
        ? 'op te volgen in uitzonderingen'
        : 'to follow up in exceptions',
      d: 240,
      onClick: () => {
        setFUncertain(false);
        if (onNavigateToExceptions) {
          onNavigateToExceptions();
        } else {
          setFStatus('syncfout');
        }
      },
    },
  ];

  return (
    <div key={`orders-view-${mode}`} className="a-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
          {mode === 'validation' ? (isNl ? 'Validatie' : 'Validation') : 'Orders'}
        </h1>
        <p style={{ margin: 0, color: '#4D4D4D' }}>
          {mode === 'validation'
            ? (isNl
                ? 'Bestellingen die aandacht vereisen of klaar zijn voor controle. Klik een order om te valideren.'
                : 'Orders that need attention or are ready for review. Click an order to validate.')
            : (isNl
                ? 'Alle bestelmails uit info@, bestel@ en de persoonlijke mailbox, automatisch gelezen en gekoppeld. Klik een order om te valideren.'
                : 'All order emails from info@, bestel@ and the personal mailbox, automatically read and linked. Click an order to validate.')}
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
                border: (c.id === 'ci-1' && fUncertain)
                  ? '2px solid #8A3405'
                  : (c.id === 'ci-3' && fLong)
                  ? '2px solid #A61B1B'
                  : '1px solid #E8D27A',
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
          flexDirection: 'column',
          gap: '14px',
          padding: '14px 16px',
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          borderRadius: 0,
        }}
      >
        {/* Top Controls Row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: '12px',
          }}
        >
          {/* Search */}
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              width: '240px',
              maxWidth: '240px',
              flex: '0 0 240px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {isNl ? 'Zoeken' : 'To search'}
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
              onChange={(e) => {
                setFStatus(e.target.value);
                setFUncertain(false);
              }}
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
              {mode === 'validation' ? (
                <>
                  <option value="klaar">{isNl ? 'Klaar voor controle' : 'Ready for review'}</option>
                  <option value="aandacht">{isNl ? 'Aandacht nodig' : 'Needs attention'}</option>
                </>
              ) : (
                <>
                  <option value="open">{isNl ? 'Wacht op controle' : 'Awaiting review'}</option>
                  <option value="verwerking">{isNl ? 'In behandeling' : 'Processing'}</option>
                  <option value="klaar">{isNl ? 'Klaar voor controle' : 'Ready for review'}</option>
                  <option value="aandacht">{isNl ? 'Aandacht nodig' : 'Needs attention'}</option>
                  <option value="goedgekeurd">{isNl ? 'Goedgekeurd' : 'Approved'}</option>
                  <option value="afgewezen">{isNl ? 'Afgewezen' : 'Rejected'}</option>
                  <option value="gesync">{isNl ? 'Gesynchroniseerd' : 'Synchronized'}</option>
                  <option value="syncfout">{isNl ? 'Sync mislukt' : 'Sync failed'}</option>
                </>
              )}
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
              {availableMailboxOptions.map((mb) => (
                <option key={mb} value={mb}>
                  {formatMailboxOptionLabel(mb, isNl)}
                </option>
              ))}
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
              onChange={(e) => {
                setFAttention(e.target.checked);
                if (!e.target.checked) {
                  setFUncertain(false);
                }
              }}
              style={{ width: '18px', height: '18px', accentColor: '#E20714' }}
            />
            {isNl ? 'Enkel extra aandacht' : 'Just extra attention'}
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
              onChange={(e) => {
                setFLong(e.target.checked);
                if (e.target.checked) {
                  setFUncertain(false);
                }
              }}
              style={{ width: '18px', height: '18px', accentColor: '#E20714' }}
            />
            {isNl ? 'Wacht langer dan 4 uur' : 'Wait longer than 4 hours'}
          </label>
        </div>

        {/* Bottom Actions Row: Clear filters on left, count indicator on right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
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
          <span style={{ fontSize: '13px', color: '#4D4D4D' }}>
            {isNl
              ? `${countToDisplay} van ${totalToDisplay} orders`
              : `${countToDisplay} of ${totalToDisplay} orders`}
          </span>
        </div>
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
          {paginatedRows.map((o, idx) => (
            <button
              key={`row-${mode}-${page}-${o.nr}-${idx}`}
              className="a-stag row"
              onClick={() => onOpenOrder && onOpenOrder(o.nr, (o as any).order_id, (o as any).email_id)}
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
                  {[o.ref && o.ref !== '—' ? o.ref : null, o.klantNr || null].filter(Boolean).join(' · ') || '—'}
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

          {/* Table Pagination matching reference design */}
          <TablePagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={isFiltered ? sortedRows.length : totalToDisplay}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50]}
            itemLabel={isNl ? (mode === 'validation' ? 'validatie-orders' : 'bestellingen') : (mode === 'validation' ? 'validation orders' : 'orders')}
            language={activeLang}
          />
        </div>
      </div>
    </div>
  );
};
