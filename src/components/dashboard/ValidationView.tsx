import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { type Language } from '../common/LanguageToggle';
import { TablePagination } from '../common/TablePagination';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchOrders,
  fetchOrderById,
  fetchOrderByEmailId,
  updateOrderLine,
  fetchEmailById,
  fetchOrderContact,
  fetchEmailContact,
  fetchValidationOrdersCount,
  type OrderDetail,
  type OrderListItem,
  type EmailAttachmentItem,
  type CustomerContactInfo,
} from '../../lib/ordersApi';
import { mapApiOrderToOrderItem } from './OrdersView';
import { getApiBaseUrl, getToken } from '../../lib/auth';
import {
  INITIAL_ORDERS,
  WAITING_ORDERS_DATA,
  CAT,
  type OrderItem,
  type OrderLine,
} from '../../data/mockData';

interface ValidationViewProps {
  language?: Language;
  selectedOrderNr?: string;
  selectedOrderId?: number;
  selectedEmailId?: number;
  userName?: string;
  onNavigateToOrders?: () => void;
  onNavigateToExceptions?: () => void;
  onOrderUpdated?: (order: OrderItem) => void;
  onOrderChanged?: (orderNr: string, orderId?: number, emailId?: number) => void;
  backLabel?: string;
  totalCountFromSidebar?: number;
}

export function resolveProductUnit(
  unit?: string | null,
  packaging?: string | null,
  description?: string | null,
  artCode?: string | null
): string {
  // 1. Check direct unit string first if explicitly provided (e.g. from DB or user dropdown)
  if (unit) {
    const clean = unit.trim().toLowerCase();
    if (clean === 'bucket' || clean === 'emmer') return 'emmer';
    if (clean === 'can' || clean === 'blik') return 'blik';
    if (clean === 'kit') return 'kit';
    if (clean === 'piece' || clean === 'stuk' || clean === 'st') return 'stuk';
    if (clean === 'drum' || clean === 'vat') return 'vat';
    if (clean === 'pot') return 'pot';
    if (clean && clean !== 'null' && clean !== 'undefined') {
      return clean;
    }
  }

  // 2. Check catalog definition if item is registered
  if (artCode && CAT[artCode]?.unit) {
    const catU = CAT[artCode].unit.toLowerCase();
    if (catU === 'emmer' || catU === 'bucket' || catU === 'pail') return 'emmer';
    if (catU === 'kit') return 'kit';
    if (catU === 'vat' || catU === 'drum') return 'vat';
    if (catU === 'pot') return 'pot';
    if (catU === 'stuk' || catU === 'piece' || catU === 'st') return 'stuk';
    if (catU === 'blik' || catU === 'can') return 'blik';
    return catU;
  }

  // 2. Combine all text clues from unit, packaging, and description
  const combined = `${unit || ''} ${packaging || ''} ${description || ''}`.toLowerCase();

  // Bucket / Emmer indicators (e.g. "emmer", "bucket", "pail", "seau", "20kg", "25kg")
  if (
    combined.includes('emmer') ||
    combined.includes('bucket') ||
    combined.includes('pail') ||
    combined.includes('seau') ||
    combined.includes('20kg') ||
    combined.includes('25kg')
  ) {
    return 'emmer';
  }

  // Kit / Set indicators
  if (combined.includes('kit') || combined.includes('set') || combined.includes('comp')) {
    return 'kit';
  }

  // Drum / Vat indicators
  if (
    combined.includes('vat') ||
    combined.includes('drum') ||
    combined.includes('barrel') ||
    combined.includes('ton') ||
    combined.includes('200l')
  ) {
    return 'vat';
  }

  // Pot / Jar indicators
  if (combined.includes('pot') || combined.includes('jar') || combined.includes('bocal')) {
    return 'pot';
  }

  // Piece / Stuk indicators
  if (
    combined.includes('stuk') ||
    combined.includes('piece') ||
    combined.includes('st.') ||
    combined.includes('pcs') ||
    combined.includes('pc')
  ) {
    return 'stuk';
  }

  // Can / Blik indicators
  if (
    combined.includes('blik') ||
    combined.includes('can') ||
    combined.includes('tin') ||
    combined.includes('bus') ||
    combined.includes('bidon')
  ) {
    return 'blik';
  }

  // Direct unit string normalization if provided
  const clean = (unit || '').trim().toLowerCase();
  if (clean === 'bucket' || clean === 'emmer') return 'emmer';
  if (clean === 'can' || clean === 'blik') return 'blik';
  if (clean === 'kit') return 'kit';
  if (clean === 'piece' || clean === 'stuk') return 'stuk';
  if (clean === 'drum' || clean === 'vat') return 'vat';
  if (clean === 'pot') return 'pot';

  if (clean && clean !== 'null' && clean !== 'undefined') {
    return clean;
  }

  return 'blik';
}

export function formatUnitLabel(u?: string | null, isNl = false): string {
  const lower = (u || '').toLowerCase().trim();
  if (lower === 'emmer' || lower === 'bucket') return isNl ? 'emmer' : 'bucket';
  if (lower === 'blik' || lower === 'can') return isNl ? 'blik' : 'can';
  if (lower === 'stuk' || lower === 'piece') return isNl ? 'stuk' : 'piece';
  if (lower === 'vat' || lower === 'drum') return isNl ? 'vat' : 'drum';
  if (lower === 'kit') return 'kit';
  if (lower === 'pot') return 'pot';
  return u || (isNl ? 'blik' : 'can');
}

export function formatQuantity(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str === '' || str === '??') return '';
  const clean = str.replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num)) return str;
  return num.toFixed(2);
}

function mapOrderDetailToOrderItem(apiOrder: OrderDetail, isNl: boolean): OrderItem {
  let day = '04/11/2026';
  let time = '12:00';
  let min = 720;
  const rawDate = apiOrder.received_at || apiOrder.created_at;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        day = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        min = d.getHours() * 60 + d.getMinutes();
      }
    } catch {}
  }

  let mb: 'info' | 'bestel' | 'persoonlijk' = 'info';
  const mbStr = (apiOrder.mailbox || '').toLowerCase();
  if (mbStr.includes('bestel')) mb = 'bestel';
  else if (mbStr.includes('persoonlijk') || mbStr.includes('personal')) mb = 'persoonlijk';

  // Dynamic extraction / OCR confidence calculation
  const rawConfidence =
    apiOrder.extraction_confidence ??
    apiOrder.confidence ??
    (apiOrder as any).ocr_confidence;

  const lineConfidences = (apiOrder.lines || [])
    .map((l) => l.confidence)
    .filter((c): c is number => c != null && !isNaN(c));

  const lineAverage =
    lineConfidences.length > 0
      ? lineConfidences.reduce((sum, val) => sum + val, 0) / lineConfidences.length
      : null;

  const effectiveConfidence = rawConfidence ?? lineAverage;

  const avg =
    effectiveConfidence != null
      ? Math.round(effectiveConfidence <= 1 ? effectiveConfidence * 100 : effectiveConfidence)
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

  const orderNr = apiOrder.order_number || `AP-26-${String(apiOrder.order_id).padStart(5, '0')}`;

  const lines: OrderLine[] = (apiOrder.lines || []).map((l, i) => {
    const lineConf =
      l.confidence != null
        ? Math.round(l.confidence <= 1 ? l.confidence * 100 : l.confidence)
        : (avg ?? 70);

    const itemCode =
      (l as any).product_reference ||
      l.item_code ||
      (l as any).product_description ||
      l.description ||
      `ART-${i + 1}`;
    const rawText =
      (l as any).product_description ||
      l.description ||
      (l as any).product_reference ||
      l.item_code ||
      `Regel ${i + 1}`;
    const pack = l.packaging || (l as any).unit || l.unit_of_measure || '10L';
    const detectedUnit = resolveProductUnit(
      (l as any).unit || l.unit_of_measure,
      l.packaging,
      rawText,
      itemCode
    );
    const rawQtyStr = l.quantity !== null && l.quantity !== undefined ? String(l.quantity) : '';
    const numQty = rawQtyStr !== '' && !isNaN(parseFloat(rawQtyStr)) ? parseFloat(rawQtyStr) : null;
    const formattedQtyStr = rawQtyStr !== '' ? formatQuantity(rawQtyStr) : (numQty !== null ? formatQuantity(numQty) : '');
    const dbLineId = (l as any).id || l.line_id;
    const lineNumber = l.line_number || i + 1;

    if (itemCode && !CAT[itemCode]) {
      CAT[itemCode] = {
        d: rawText,
        fam: itemCode.split(/[-0-9]/)[0] || 'GEN',
        pack,
        unit: detectedUnit,
      };
    }

    const whyText =
      lineConf < 70
        ? (isNl
            ? 'Lage score: controleer artikel, verpakking en hoeveelheid voor deze regel.'
            : 'Low score: please verify article, packaging and quantity for this line.')
        : (isNl
            ? 'Hoge score: product, code en verpakking komen overeen.'
            : 'High score: product, code and packaging match.');

    return {
      id: `${orderNr}-${dbLineId || lineNumber}`,
      dbLineId,
      lineNumber,
      orderId: apiOrder.order_id,
      raw: rawText,
      art: itemCode,
      qty: numQty,
      unit: detectedUnit,
      conf: lineConf,
      why: l.source_evidence?.reason || (l as any).field_evidence?.reason || whyText,
      want: l.source_evidence?.want || { pack },
      alts: l.source_evidence?.alts || [],
      bonQty: formattedQtyStr,
      confirmed: l.status === 'confirmed' || l.status === 'approved',
      corrected: l.status === 'corrected',
      by: l.source_evidence?.by || '',
    };
  });

  return {
    nr: orderNr,
    klant: apiOrder.customer_name || (isNl ? 'Onbekende klant' : 'Unknown customer'),
    klantNr: klantNr || '',
    klantConf: avg ?? 95,
    klantWhy: apiOrder.email_sender
      ? (isNl
          ? `Afzender ${apiOrder.email_sender} gekoppeld aan ${apiOrder.customer_name || 'klant'}`
          : `Sender ${apiOrder.email_sender} linked to ${apiOrder.customer_name || 'customer'}`)
      : '',
    ref: ref || '—',
    day,
    time,
    min,
    mb,
    from:
      apiOrder.email_sender ||
      (apiOrder.mailbox ? `${apiOrder.mailbox}@aalterpaint.be` : 'info@aalterpaint.be'),
    subject:
      apiOrder.email_subject || (isNl ? `Bestelling ${orderNr}` : `Order ${orderNr}`),
    body:
      apiOrder.email_body ||
      (isNl
        ? 'Geen emailinhoud beschikbaar voor deze order.'
        : 'No email body available for this order.'),
    att: (apiOrder as any)?.attachment_filename || (apiOrder as any)?.attachment || '',
    ocr: avg != null ? avg : (lineAverage != null ? Math.round(lineAverage * 100) : 85),
    ocrKind: (apiOrder as any)?.attachment_filename
      ? (isNl ? 'Gescande getypte bon' : 'Scanned typed slip')
      : (isNl ? 'E-mail tekst' : 'Email text'),
    ocrWhy: (apiOrder as any)?.attachment_filename
      ? ((avg ?? 85) >= 70
          ? (isNl ? 'Hoge score: scan van een getypte bon, goed leesbaar' : 'High score: scan of a typed slip, clearly legible')
          : (isNl ? 'Lage score: controleer de gescande bon zorgvuldig' : 'Low score: please check scanned slip carefully'))
      : (isNl
          ? 'Bestelling uitgelezen uit e-mail tekst'
          : 'Order extracted from email body'),
    st,
    lines,
    rawReceivedAt: rawDate,
    outlook_status: apiOrder.outlook_status,
    order_id: apiOrder.order_id,
    email_id: apiOrder.email_id,
    waitTxt: apiOrder.wait_text || undefined,
    waitColor: apiOrder.wait_color || undefined,
    waitH: apiOrder.wait_hours != null ? apiOrder.wait_hours : undefined,
    contact_person: apiOrder.contact_info?.contact_person || null,
    contact_role: apiOrder.contact_info?.role || null,
    contact_email: apiOrder.contact_info?.email || apiOrder.email_sender || null,
    contact_phone: apiOrder.contact_info?.phone || null,
    contact_location: apiOrder.contact_info?.location || null,
    contact_source: apiOrder.contact_info?.source || null,
  } as OrderItem;
}

export function getOrderIdFromOrder(order?: OrderItem | null, selectedOrderId?: number): number | undefined {
  if (selectedOrderId) {
    return selectedOrderId > 1000000 ? selectedOrderId % 100000 : selectedOrderId;
  }
  if (!order) return undefined;
  if ((order as any).order_id) {
    const oid = (order as any).order_id;
    return oid > 1000000 ? oid % 100000 : oid;
  }
  if (order.nr) {
    const parts = order.nr.split('-');
    const last = parts[parts.length - 1];
    const parsed = parseInt(last, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed > 1000000 ? parsed % 100000 : parsed;
    }
  }
  return undefined;
}

export function getLineIdFromLine(line?: OrderLine | null, fallbackLineIdStr?: string): number | undefined {
  if (!line && !fallbackLineIdStr) return undefined;
  const raw = (line as any)?.dbLineId || (line as any)?.lineNumber || (fallbackLineIdStr ? fallbackLineIdStr.split('-').pop() : undefined);
  if (raw !== undefined && raw !== null) {
    const parsed = parseInt(String(raw), 10);
    return !isNaN(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function renderAttachmentIcon(filename?: string) {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';

  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return (
      <svg
        viewBox="0 0 24 24"
        style={{ width: '20px', height: '20px', color: '#107C41', flexShrink: 0 }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  }

  if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'svg'].includes(ext)) {
    return (
      <svg
        viewBox="0 0 24 24"
        style={{ width: '20px', height: '20px', color: '#2563EB', flexShrink: 0 }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }

  // PDF or general document icon
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: '20px', height: '20px', color: '#E20714', flexShrink: 0 }}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export const ValidationView: React.FC<ValidationViewProps> = ({
  language,
  selectedOrderNr = 'AP-26-04819',
  selectedOrderId,
  selectedEmailId,
  userName = 'Bart Van Damme',
  onNavigateToOrders,
  onNavigateToExceptions,
  onOrderUpdated,
  onOrderChanged,
  backLabel,
  totalCountFromSidebar,
}) => {
  const { language: ctxLang } = useLanguage();
  const activeLang = language || ctxLang || 'NL';
  const isNl = activeLang === 'NL';
  const threshold = 70;

  // Live validation queue total count (mirrors the sidebar badge)
  const [liveQueueTotal, setLiveQueueTotal] = useState<number | null>(() => {
    return typeof totalCountFromSidebar === 'number' && totalCountFromSidebar > 0
      ? totalCountFromSidebar
      : null;
  });

  // Local copy of orders for interactive state
  const [orders, setOrders] = useState<OrderItem[]>(() => INITIAL_ORDERS);
  const [currentNr, setCurrentNr] = useState(selectedOrderNr);
  const [loadingOrder, setLoadingOrder] = useState<boolean>(false);
  const [liveOrder, setLiveOrder] = useState<OrderItem | null>(null);
  const [confirmingLineId, setConfirmingLineId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<EmailAttachmentItem[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState<boolean>(false);
  const [liveContact, setLiveContact] = useState<CustomerContactInfo | null>(null);
  const [loadingContact, setLoadingContact] = useState<boolean>(false);

  // Sync prop changes for totalCountFromSidebar
  useEffect(() => {
    if (typeof totalCountFromSidebar === 'number' && totalCountFromSidebar > 0) {
      setLiveQueueTotal(totalCountFromSidebar);
    }
  }, [totalCountFromSidebar]);

  // Dynamically listen for validation count updates and refresh live count from API
  useEffect(() => {
    let isCancelled = false;

    const refreshCount = () => {
      fetchValidationOrdersCount()
        .then((count) => {
          if (!isCancelled && typeof count === 'number' && count > 0) {
            setLiveQueueTotal(count);
          }
        })
        .catch(() => {});
    };

    if (liveQueueTotal === null) {
      refreshCount();
    }

    const handleCountUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<number>;
      if (typeof customEvt.detail === 'number' && customEvt.detail > 0) {
        setLiveQueueTotal(customEvt.detail);
      }
    };

    window.addEventListener('validation_count_updated', handleCountUpdate);
    window.addEventListener('orders_refreshed', refreshCount);

    return () => {
      isCancelled = true;
      window.removeEventListener('validation_count_updated', handleCountUpdate);
      window.removeEventListener('orders_refreshed', refreshCount);
    };
  }, []);

  // Temporary line edits draft state (changes remain temporary until Confirm Line is clicked)
  const [lineDrafts, setLineDrafts] = useState<Record<string, {
    qtyStr?: string;
    unit?: string;
    art?: string;
    raw?: string;
  }>>({});

  // Reset line drafts and live contact when switching orders
  useEffect(() => {
    setLineDrafts({});
    setLiveContact(null);
  }, [currentNr, selectedOrderId, selectedEmailId]);

  // Sync prop changes
  useEffect(() => {
    if (selectedOrderNr) {
      setCurrentNr(selectedOrderNr);
    }
  }, [selectedOrderNr]);

  // Fetch live orders list from backend to populate orders and queueList
  useEffect(() => {
    let isCancelled = false;
    fetchOrders({ status: 'validation', limit: 100 })
      .then((res) => {
        if (!isCancelled && res.items && res.items.length > 0) {
          if (typeof res.total === 'number' && res.total > 0) {
            setLiveQueueTotal(res.total);
            window.dispatchEvent(new CustomEvent('validation_count_updated', { detail: res.total }));
          }
          const liveItems: OrderItem[] = res.items.map((it) => mapApiOrderToOrderItem(it, isNl));
          setOrders((prev) => {
            const map = new Map<string, OrderItem>();
            liveItems.forEach((item) => {
              const existing = prev.find((p) => p.nr === item.nr);
              // Preserve full line details if already present in state
              if (existing && existing.lines && existing.lines.some((l) => Boolean(l.raw))) {
                map.set(item.nr, existing);
              } else {
                map.set(item.nr, item);
              }
            });
            // Keep the currently viewed order in the map if loaded
            if (liveOrder && !map.has(liveOrder.nr)) {
              map.set(liveOrder.nr, liveOrder);
            }
            return Array.from(map.values());
          });
          if (!selectedOrderNr && !selectedOrderId) {
            setCurrentNr((prev) => prev || liveItems[0]?.nr);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load live orders for queue:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [isNl, selectedOrderNr, selectedOrderId, liveOrder]);

  // Fetch live order data using GET /api/orders/{order_id} or GET /api/orders/by-email/{email_id}
  useEffect(() => {
    let isCancelled = false;

    const orderIdToFetch =
      selectedOrderId !== undefined
        ? (selectedOrderId > 1000000 ? selectedOrderId % 100000 : selectedOrderId)
        : (() => {
            const raw = currentNr || selectedOrderNr;
            if (!raw) return undefined;
            const parts = raw.split('-');
            const lastPart = parts[parts.length - 1];
            const parsed = parseInt(lastPart, 10);
            return !isNaN(parsed) && parsed > 0 ? (parsed > 1000000 ? parsed % 100000 : parsed) : undefined;
          })();

    const fetchTarget = orderIdToFetch !== undefined ? orderIdToFetch : (currentNr || selectedOrderNr);

    const mergeCachedEdits = (item: OrderItem): OrderItem => {
      try {
        const cached = sessionStorage.getItem(`order_edits_${item.nr}`);
        if (cached) {
          const parsedLines = JSON.parse(cached);
          if (Array.isArray(parsedLines) && parsedLines.length === item.lines.length) {
            const mergedLines = item.lines.map((l) => {
              const match = parsedLines.find((pl: any) => pl.id === l.id);
              if (match) {
                return {
                  ...l,
                  qty: match.qty !== undefined ? match.qty : l.qty,
                  bonQty: match.bonQty !== undefined ? formatQuantity(match.bonQty) : l.bonQty,
                  unit: match.unit || l.unit,
                  art: match.art || l.art,
                  raw: match.raw || l.raw,
                  confirmed: match.confirmed !== undefined ? match.confirmed : l.confirmed,
                  corrected: match.corrected !== undefined ? match.corrected : l.corrected,
                };
              }
              return l;
            });
            return { ...item, lines: mergedLines };
          }
        }
      } catch {}
      return item;
    };

    if (fetchTarget) {
      setLoadingOrder(true);
      fetchOrderById(fetchTarget)
        .then((orderDetail) => {
          if (!isCancelled && orderDetail) {
            if (orderDetail.contact_info) {
              setLiveContact(orderDetail.contact_info);
            }
            const mapped = mergeCachedEdits(mapOrderDetailToOrderItem(orderDetail, isNl));
            setLiveOrder(mapped);
            setOrders((prev) => {
              const idx = prev.findIndex((o) => o.nr === mapped.nr);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = mapped;
                return next;
              }
              return [mapped, ...prev];
            });
            setCurrentNr(mapped.nr);
          }
        })
        .catch((err) => {
          // If fetch by ID fails and email ID is available, attempt by-email
          if (selectedEmailId !== undefined) {
            fetchOrderByEmailId(selectedEmailId)
              .then((orderDetail) => {
                if (!isCancelled && orderDetail) {
                  if (orderDetail.contact_info) {
                    setLiveContact(orderDetail.contact_info);
                  }
                  const mapped = mergeCachedEdits(mapOrderDetailToOrderItem(orderDetail, isNl));
                  setLiveOrder(mapped);
                  setOrders((prev) => {
                    const idx = prev.findIndex((o) => o.nr === mapped.nr);
                    if (idx >= 0) {
                      const next = [...prev];
                      next[idx] = mapped;
                      return next;
                    }
                    return [mapped, ...prev];
                  });
                  setCurrentNr(mapped.nr);
                }
              })
              .catch(() => {});
          }
        })
        .finally(() => {
          if (!isCancelled) setLoadingOrder(false);
        });
    } else if (selectedEmailId !== undefined) {
      setLoadingOrder(true);
      fetchOrderByEmailId(selectedEmailId)
        .then((orderDetail) => {
          if (!isCancelled && orderDetail) {
            if (orderDetail.contact_info) {
              setLiveContact(orderDetail.contact_info);
            }
            const mapped = mergeCachedEdits(mapOrderDetailToOrderItem(orderDetail, isNl));
            setLiveOrder(mapped);
            setOrders((prev) => {
              const idx = prev.findIndex((o) => o.nr === mapped.nr);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = mapped;
                return next;
              }
              return [mapped, ...prev];
            });
            setCurrentNr(mapped.nr);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!isCancelled) setLoadingOrder(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [currentNr, selectedOrderId, selectedEmailId, selectedOrderNr, isNl]);

  // Fetch live dynamic customer contact details (email first, fallback PDF OCR)
  useEffect(() => {
    let isCancelled = false;
    const targetOrderId =
      selectedOrderId !== undefined
        ? (selectedOrderId > 1000000 ? selectedOrderId % 100000 : selectedOrderId)
        : (() => {
            if (!currentNr) return undefined;
            const parts = currentNr.split('-');
            const lastPart = parts[parts.length - 1];
            const parsed = parseInt(lastPart, 10);
            return !isNaN(parsed) && parsed > 0 ? (parsed > 1000000 ? parsed % 100000 : parsed) : undefined;
          })();

    const fetchId = targetOrderId !== undefined ? targetOrderId : currentNr;

    if (fetchId) {
      setLoadingContact(true);
      fetchOrderContact(fetchId)
        .then((info) => {
          if (!isCancelled && info) {
            setLiveContact(info);
          }
        })
        .catch(() => {
          if (selectedEmailId !== undefined) {
            fetchEmailContact(selectedEmailId)
              .then((info) => {
                if (!isCancelled && info) {
                  setLiveContact(info);
                }
              })
              .catch(() => {});
          }
        })
        .finally(() => {
          if (!isCancelled) setLoadingContact(false);
        });
    } else if (selectedEmailId !== undefined) {
      setLoadingContact(true);
      fetchEmailContact(selectedEmailId)
        .then((info) => {
          if (!isCancelled && info) {
            setLiveContact(info);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!isCancelled) setLoadingContact(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [currentNr, selectedOrderId, selectedEmailId]);

  const currentOrder = useMemo(() => {
    // 1. If liveOrder is loaded and matches current target, always prioritize it because it has full line details
    if (
      liveOrder &&
      (!currentNr ||
        liveOrder.nr === currentNr ||
        String((liveOrder as any).order_id) === String(currentNr) ||
        (currentNr && currentNr.endsWith(String((liveOrder as any).order_id))))
    ) {
      return liveOrder;
    }

    // 2. Otherwise look in orders for an item with full line details (not summary placeholders)
    const foundWithLines = orders.find(
      (o) =>
        (o.nr === currentNr ||
          String((o as any).order_id) === String(currentNr) ||
          (currentNr && currentNr.endsWith(String((o as any).order_id)))) &&
        o.lines &&
        o.lines.some((l) => Boolean(l.raw))
    );
    if (foundWithLines) return foundWithLines;

    if (liveOrder) return liveOrder;

    const found = orders.find((o) => o.nr === currentNr);
    if (found) return found;

    return orders[0];
  }, [liveOrder, orders, currentNr]);

  // Synchronize browser URL to /validation/{orderId} when viewing an order
  useEffect(() => {
    const activeNr = currentOrder?.nr || currentNr;
    if (activeNr && typeof window !== 'undefined' && window.location.pathname.startsWith('/validation')) {
      const targetPath = `/validation/${encodeURIComponent(activeNr)}`;
      if (window.location.pathname !== targetPath) {
        window.history.replaceState(null, '', targetPath);
        try {
          sessionStorage.setItem('selected_order_nr', activeNr);
          if ((currentOrder as any)?.order_id) {
            sessionStorage.setItem('selected_order_id', String((currentOrder as any).order_id));
          }
        } catch {}
      }
    }
  }, [currentOrder?.nr, (currentOrder as any)?.order_id, currentNr]);

  // Fetch live email attachments for current order
  useEffect(() => {
    let isCancelled = false;
    const activeEmailId =
      (currentOrder as any)?.email_id ||
      (liveOrder as any)?.email_id ||
      selectedEmailId;

    if (!activeEmailId) {
      setAttachments([]);
      return;
    }

    setLoadingAttachments(true);
    fetchEmailById(activeEmailId)
      .then((emailData) => {
        if (!isCancelled && emailData?.attachments) {
          setAttachments(Array.isArray(emailData.attachments) ? emailData.attachments : []);
        }
      })
      .catch((err) => {
        console.warn('[ValidationView] Could not load attachments for email:', activeEmailId, err);
        if (!isCancelled) setAttachments([]);
      })
      .finally(() => {
        if (!isCancelled) setLoadingAttachments(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [(currentOrder as any)?.email_id, (liveOrder as any)?.email_id, selectedEmailId]);

  const handleOpenAttachment = (att: EmailAttachmentItem) => {
    const filename = att?.filename || 'attachment';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const baseUrl = getApiBaseUrl();
    const token = getToken();

    let contentUrl = att?.file_path || '';
    if (att?.id) {
      contentUrl = `${baseUrl}/attachments/${att.id}/content${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    }

    if (!contentUrl && !att?.file_path) {
      toast.error(isNl ? 'Geen bestandspad beschikbaar' : 'No file path available');
      return;
    }

    // Synchronously open blank window to avoid popup blockers
    const newTab = window.open('', '_blank');
    if (!newTab) {
      window.open(contentUrl || att.file_path, '_blank');
      return;
    }

    // PDF: direct browser rendering
    if (ext === 'pdf') {
      newTab.location.href = contentUrl;
      return;
    }

    const sanitizedName = filename.replace(/[<>&"]/g, '');

    // Images: image viewer page with zoom controls and download
    if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'svg'].includes(ext)) {
      newTab.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sanitizedName}</title><style>
body{margin:0;background:#0f172a;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden;}
header{background:rgba(15,23,42,0.95);border-bottom:1px solid #334155;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.badge{background:#2563eb;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;text-transform:uppercase;}
.btn{background:#1e293b;color:#e2e8f0;border:1px solid #475569;padding:6px 14px;font-size:13px;border-radius:6px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;}
.btn-primary{background:#e20714;border-color:#e20714;color:#fff;}
.viewport{flex:1;display:flex;align-items:center;justify-content:center;overflow:auto;padding:20px;position:relative;}
img{max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,0.5);transition:transform 0.15s ease-out;}
.controls{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(30,41,59,0.9);border:1px solid #475569;padding:4px 8px;border-radius:20px;display:flex;gap:6px;}
.ctrl-btn{background:transparent;border:none;color:#e2e8f0;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;}
</style></head><body>
<header>
  <div style="display:flex;align-items:center;gap:10px;"><span class="badge">${ext.toUpperCase()}</span><strong>${sanitizedName}</strong></div>
  <div style="display:flex;gap:8px;"><button class="btn" onclick="window.print()">Print</button><a class="btn btn-primary" href="${contentUrl}" download="${sanitizedName}">Download</a></div>
</header>
<div class="viewport">
  <img id="imgView" src="${contentUrl}" alt="${sanitizedName}"/>
  <div class="controls">
    <button class="ctrl-btn" onclick="zoom(-0.25)">−</button>
    <button class="ctrl-btn" onclick="resetZoom()" style="font-size:11px;">100%</button>
    <button class="ctrl-btn" onclick="zoom(0.25)">+</button>
  </div>
</div>
<script>
let scale = 1;
function zoom(d){scale = Math.max(0.25, Math.min(4, scale + d)); document.getElementById('imgView').style.transform = 'scale(' + scale + ')';}
function resetZoom(){scale = 1; document.getElementById('imgView').style.transform = 'scale(1)';}
</script>
</body></html>`);
      newTab.document.close();
      return;
    }

    // Spreadsheets: interactive Excel viewer using SheetJS
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      newTab.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sanitizedName}</title><style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f8fafc;color:#1e293b;height:100vh;display:flex;flex-direction:column;overflow:hidden;}
header{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.05);}
.badge{background:#107c41;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:4px;text-transform:uppercase;}
.search{padding:6px 12px;font-size:13px;border:1px solid #cbd5e1;border-radius:6px;outline:none;width:200px;}
.search:focus{border-color:#107c41;}
.btn{padding:6px 14px;font-size:13px;font-weight:500;border-radius:6px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;border:1px solid #e2e8f0;background:#f1f5f9;color:#334155;}
.btn-primary{background:#107c41;border-color:#107c41;color:#fff;}
.tabs{display:flex;gap:4px;background:#f1f5f9;border-bottom:1px solid #cbd5e1;padding:6px 16px 0;flex-shrink:0;overflow-x:auto;}
.tab{padding:6px 16px;font-size:13px;font-weight:500;color:#64748b;cursor:pointer;border:1px solid transparent;border-bottom:none;border-radius:6px 6px 0 0;background:transparent;}
.tab.active{color:#107c41;background:#fff;border-color:#cbd5e1;border-bottom:2px solid #107c41;font-weight:600;}
.content{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;}
.tbl-box{background:#fff;border:1px solid #e2e8f0;border-radius:6px;overflow:auto;flex:1;}
table{border-collapse:collapse;width:100%;font-size:13px;font-family:monospace,"Segoe UI",Roboto,sans-serif;}
th,td{border:1px solid #e2e8f0;padding:6px 12px;text-align:left;white-space:nowrap;}
th{background:#f8fafc;color:#475569;font-weight:600;position:sticky;top:0;z-index:2;border-bottom:2px solid #cbd5e1;}
th.col-letter{background:#f1f5f9;text-align:center;font-size:11px;color:#64748b;}
td.row-idx{text-align:center;background:#f8fafc;color:#94a3b8;font-size:11px;user-select:none;position:sticky;left:0;z-index:1;width:40px;min-width:40px;}
tr:hover td:not(.row-idx){background:#f8fafc;}
.highlight{background:#fef08a!important;color:#854d0e;font-weight:600;}
.msg{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:#64748b;}
.spinner{width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#107c41;border-radius:50%;animation:spin 0.8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
@media print{header,.tabs,.search,.btn{display:none!important;}body{overflow:visible;height:auto;}.content,.tbl-box{overflow:visible;border:none;}td.row-idx,th.col-letter{display:none;}}
</style></head><body>
<header>
  <div style="display:flex;align-items:center;gap:10px;"><span class="badge">${ext.toUpperCase()}</span><strong>${sanitizedName}</strong></div>
  <div style="display:flex;align-items:center;gap:8px;">
    <input type="text" id="srch" class="search" placeholder="Search..." oninput="onFilter(this.value)"/>
    <button class="btn" onclick="window.print()">Print</button>
    <a class="btn btn-primary" href="${contentUrl}" download="${sanitizedName}">Download</a>
  </div>
</header>
<div id="tabsBar" class="tabs" style="display:none;"></div>
<div class="content">
  <div id="loading" class="msg"><div class="spinner"></div><div>Loading ${sanitizedName}...</div></div>
  <div id="box" class="tbl-box" style="display:none;"><table id="tbl"><thead id="th"></thead><tbody id="tb"></tbody></table></div>
  <div id="err" class="msg" style="display:none;">
    <p style="font-weight:600;color:#b91c1c;">Could not preview spreadsheet</p>
    <div style="display:flex;gap:8px;"><a class="btn btn-primary" href="${contentUrl}" download="${sanitizedName}">Download ${sanitizedName}</a></div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script>
let wb=null,sheetData=[],q='';
function colLetter(n){let l='';n++;while(n>0){let m=(n-1)%26;l=String.fromCharCode(65+m)+l;n=Math.floor((n-m)/26);}return l;}
function showSheet(name){
  if(!wb)return;
  const s=wb.Sheets[name];if(!s)return;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.getAttribute('data-s')===name));
  sheetData=window.XLSX.utils.sheet_to_json(s,{header:1,defval:''});
  drawTable();
}
function drawTable(){
  const thead=document.getElementById('th'),tbody=document.getElementById('tb');
  thead.innerHTML='';tbody.innerHTML='';
  if(!sheetData||sheetData.length===0){tbody.innerHTML='<tr><td style="text-align:center;padding:20px;color:#94a3b8;">(Empty Sheet)</td></tr>';return;}
  let cols=0;sheetData.forEach(r=>{if(Array.isArray(r)&&r.length>cols)cols=r.length;});
  if(cols===0)cols=1;
  const htr=document.createElement('tr');
  const c0=document.createElement('th');c0.className='col-letter';c0.textContent='#';htr.appendChild(c0);
  for(let c=0;c<cols;c++){const th=document.createElement('th');th.className='col-letter';th.textContent=colLetter(c);htr.appendChild(th);}
  thead.appendChild(htr);
  const qClean=(q||'').toLowerCase().trim();
  sheetData.forEach((row,idx)=>{
    const arr=Array.isArray(row)?row:[];
    const text=arr.map(x=>String(x??'')).join(' ').toLowerCase();
    if(qClean&&!text.includes(qClean))return;
    const tr=document.createElement('tr');
    const idxTd=document.createElement('td');idxTd.className='row-idx';idxTd.textContent=String(idx+1);tr.appendChild(idxTd);
    for(let c=0;c<cols;c++){
      const td=document.createElement('td');
      const val=arr[c]!==undefined&&arr[c]!==null?String(arr[c]):'';
      if(qClean&&val.toLowerCase().includes(qClean)){
        td.innerHTML=val.replace(new RegExp('('+qClean.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g,'\\\\$&')+')','gi'),'<span class="highlight">$1</span>');
      } else { td.textContent=val; }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
}
function onFilter(val){q=val;drawTable();}
async function load(){
  try{
    const res=await fetch("${contentUrl}");
    if(!res.ok)throw new Error("HTTP "+res.status);
    const buf=await res.arrayBuffer();
    let tryCount=0;
    while(!window.XLSX&&tryCount<25){await new Promise(r=>setTimeout(r,100));tryCount++;}
    if(!window.XLSX)throw new Error("XLSX unavailable");
    wb=window.XLSX.read(new Uint8Array(buf),{type:'array'});
    if(!wb||!wb.SheetNames||wb.SheetNames.length===0)throw new Error("Empty workbook");
    const bar=document.getElementById('tabsBar');
    bar.innerHTML='';
    wb.SheetNames.forEach((n,i)=>{
      const b=document.createElement('button');b.className='tab'+(i===0?' active':'');b.textContent=n;b.setAttribute('data-s',n);b.onclick=()=>showSheet(n);bar.appendChild(b);
    });
    bar.style.display='flex';
    showSheet(wb.SheetNames[0]);
    document.getElementById('loading').style.display='none';
    document.getElementById('box').style.display='flex';
  }catch(e){
    console.error(e);
    document.getElementById('loading').style.display='none';
    document.getElementById('err').style.display='flex';
  }
}
load();
</script>
</body></html>`);
      newTab.document.close();
      return;
    }

    // Fallback: direct download / view
    newTab.location.href = contentUrl;
  };

  // Pending queue list
  const queueList = useMemo(() => {
    return orders.filter(
      (o) =>
        o.st === 'pending' ||
        o.st === 'verwerking' ||
        o.st === 'klaar' ||
        o.st === 'aandacht'
    );
  }, [orders]);

  const queueIdx = queueList.findIndex((o) => o.nr === currentOrder.nr);

  const displayQueueTotal =
    typeof liveQueueTotal === 'number' && liveQueueTotal > 0
      ? liveQueueTotal
      : (queueList.length > 0 ? queueList.length : 30);

  const displayQueueIdx =
    queueIdx >= 0
      ? Math.min(queueIdx + 1, displayQueueTotal)
      : (queueList.length > 0 ? Math.min(1, displayQueueTotal) : 1);

  // Wait time calculation: under 1 hour shows "min", from 1 hour shows "hour", in standard grey (never red)
  const waitInfo = useMemo(() => {
    let numVal: number | null = null;
    let isMinutes = true;

    // 1. Calculate dynamically from rawReceivedAt timestamp if available
    const rawDate = (currentOrder as any)?.rawReceivedAt;
    if (rawDate) {
      try {
        const recMs = new Date(rawDate).getTime();
        if (!isNaN(recMs)) {
          const diffMs = Math.max(0, Date.now() - recMs);
          const calcHours = diffMs / 3600000;
          if (calcHours < 1.0) {
            numVal = Math.max(1, Math.round(calcHours * 60));
            isMinutes = true;
          } else {
            numVal = Math.round(calcHours * 10) / 10;
            isMinutes = false;
          }
        }
      } catch {}
    }

    // 2. If not calculated from timestamp, check incoming text / mock data
    if (numVal === null) {
      let rawText: string | undefined = (currentOrder as any)?.waitTxt || (currentOrder as any)?.wait_text;
      if (!rawText) {
        const match = WAITING_ORDERS_DATA.find(
          (w) =>
            w.nr === currentOrder.nr ||
            (currentOrder.ref && w.ref && (w.ref === currentOrder.ref || currentOrder.ref.includes(w.ref)))
        );
        if (match) {
          rawText = match.waitTxt;
        }
      }

      if (rawText) {
        const numMatch = rawText.match(/(\d+(?:[.,]\d+)?)/);
        if (numMatch) {
          const parsed = parseFloat(numMatch[1].replace(',', '.'));
          if (rawText.toLowerCase().includes('min')) {
            numVal = parsed;
            isMinutes = true;
          } else {
            numVal = parsed;
            isMinutes = false;
          }
        }
      }
    }

    // 3. Fallback for demo orders
    if (numVal === null && currentOrder.day && currentOrder.time) {
      numVal = 8;
      isMinutes = true;
    }

    if (numVal === null) return null;

    const unitStr = isMinutes ? 'min' : (isNl ? 'uur' : 'hour');
    return {
      text: `${numVal} ${unitStr}`,
      color: '#4D4D4D', // Always standard grey (never red), exactly matching reference image
    };
  }, [currentOrder, isNl]);

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

  // Lines pagination state matching reference design
  const [linesPage, setLinesPage] = useState<number>(1);
  const [linesPageSize, setLinesPageSize] = useState<number>(10);

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
    setLinesPage(1);
    return () => clearTimeout(scanTimer);
  }, [currentOrder.nr]);

  // Paginated order lines
  const paginatedLines = useMemo(() => {
    const startIndex = (linesPage - 1) * linesPageSize;
    return (currentOrder.lines || []).slice(startIndex, startIndex + linesPageSize);
  }, [currentOrder.lines, linesPage, linesPageSize]);

  // Auto-switch page if the selected line is on another page
  useEffect(() => {
    if (selLineId && currentOrder && currentOrder.lines) {
      const idx = currentOrder.lines.findIndex((l) => l.id === selLineId);
      if (idx >= 0) {
        const targetPage = Math.floor(idx / linesPageSize) + 1;
        if (targetPage !== linesPage) {
          setLinesPage(targetPage);
        }
      }
    }
  }, [selLineId, linesPageSize, currentOrder.lines]);

  // Customer contact info (purely dynamic from backend API extraction: email / PDF OCR)
  const contactPerson =
    liveContact?.contact_person ||
    (currentOrder as any)?.contact_person ||
    (currentOrder as any)?.contactInfo?.contact_person ||
    null;

  const rawRole =
    liveContact?.role ||
    (currentOrder as any)?.contact_role ||
    (currentOrder as any)?.contactInfo?.role ||
    null;

  const contactRole = useMemo(() => {
    if (!rawRole) return null;
    if (!isNl) {
      if (rawRole === 'Werfleider') return 'Site Manager';
      if (rawRole === 'Inkoop' || rawRole === 'Aankoop') return 'Purchasing';
      if (rawRole === 'Zaakvoerder') return 'Managing Director';
      if (rawRole === 'Werfcoördinator') return 'Site Coordinator';
      if (rawRole === 'Orderadministratie') return 'Order Administration';
    }
    return rawRole;
  }, [rawRole, isNl]);

  const contactEmail =
    liveContact?.email ||
    (currentOrder as any)?.contact_email ||
    (currentOrder as any)?.contactInfo?.email ||
    (currentOrder.from && !currentOrder.from.endsWith('@aalterpaint.be') ? currentOrder.from : null) ||
    null;

  const contactPhone =
    liveContact?.phone ||
    (currentOrder as any)?.contact_phone ||
    (currentOrder as any)?.contactInfo?.phone ||
    null;

  const contactLocation =
    liveContact?.location ||
    (currentOrder as any)?.contact_location ||
    (currentOrder as any)?.contactInfo?.location ||
    null;

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

    const firstName =
      (contactPerson ? contactPerson.split(' ')[0] : '') ||
      contactPerson ||
      (isNl ? 'Klant' : 'Customer');
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

  // Confirm single line and call PATCH API to persist changes to PostgreSQL
  const handleConfirmLine = async (lineId: string) => {
    const targetLine = currentOrder.lines.find((l) => l.id === lineId);
    if (!targetLine) return;

    const draft = lineDrafts[lineId];

    // Read draft values if edited, otherwise fall back to current committed values
    const rawQtyStr =
      draft?.qtyStr !== undefined
        ? draft.qtyStr
        : (targetLine.bonQty !== undefined && targetLine.bonQty !== ''
            ? formatQuantity(targetLine.bonQty)
            : (targetLine.qty !== null && targetLine.qty !== undefined ? formatQuantity(targetLine.qty) : ''));

    const cleanQtyStr = rawQtyStr.replace(',', '.').trim();
    const parsedQty = cleanQtyStr !== '' && !isNaN(parseFloat(cleanQtyStr)) ? parseFloat(cleanQtyStr) : targetLine.qty;
    const formattedQtyToCommit = parsedQty !== null && parsedQty !== undefined && !isNaN(parsedQty) ? formatQuantity(parsedQty) : rawQtyStr;

    const unitToSend =
      draft?.unit !== undefined
        ? draft.unit
        : (targetLine.unit || resolveProductUnit(targetLine.unit, targetLine.want?.pack || CAT[targetLine.art]?.pack, targetLine.raw, targetLine.art));

    const artToSend = draft?.art !== undefined ? draft.art : targetLine.art;
    const rawToSend = draft?.raw !== undefined ? draft.raw : targetLine.raw;

    const isCorrected =
      targetLine.corrected ||
      (draft?.art !== undefined && draft.art !== targetLine.art) ||
      (draft?.unit !== undefined && draft.unit !== targetLine.unit) ||
      (draft?.qtyStr !== undefined && draft.qtyStr.trim() !== (formatQuantity(targetLine.bonQty) || formatQuantity(targetLine.qty ?? '')).trim());

    const orderIdToSave = getOrderIdFromOrder(currentOrder, selectedOrderId);
    const lineIdToSave = getLineIdFromLine(targetLine, lineId);

    // 1. Commit draft values to interactive state (Order Slip and lines update now)
    const updatedLines = currentOrder.lines.map((l) =>
      l.id === lineId
        ? {
            ...l,
            art: artToSend,
            raw: rawToSend,
            qty: parsedQty,
            bonQty: formattedQtyToCommit,
            unit: unitToSend,
            confirmed: true,
            corrected: isCorrected,
            by: userName,
            why: isCorrected
              ? (isNl
                  ? `Gewijzigd en bevestigd door ${userName}.`
                  : `Modified and confirmed by ${userName}.`)
              : l.why,
          }
        : l
    );

    const updatedOrder = { ...currentOrder, lines: updatedLines };
    const newOrders = orders.map((o) => (o.nr === currentOrder.nr ? updatedOrder : o));
    setOrders(newOrders);
    setLiveOrder(updatedOrder);
    if (onOrderUpdated) onOrderUpdated(updatedOrder);

    // 2. Clear draft for this line so it is now in confirmed state with no pending changes
    setLineDrafts((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });

    // 3. Save in sessionStorage so page reload preserves state immediately
    try {
      sessionStorage.setItem(`order_edits_${currentOrder.nr}`, JSON.stringify(updatedLines));
    } catch {}

    // 4. Persist confirmation, quantity, unit, and article to backend PostgreSQL
    if (orderIdToSave && lineIdToSave) {
      setConfirmingLineId(lineId);
      try {
        const savedLine = await updateOrderLine(orderIdToSave, lineIdToSave, {
          quantity: cleanQtyStr !== '' ? cleanQtyStr : undefined,
          unit: unitToSend,
          product_reference: artToSend,
          product_description: rawToSend,
          match_status: isCorrected ? 'corrected' : 'confirmed',
          status: 'confirmed',
        });

        const exactLineNr =
          savedLine?.line_number ??
          targetLine.lineNumber ??
          (currentOrder.lines.findIndex((l) => l.id === lineId) + 1);

        toast.success(
          isNl
            ? `Regel ${exactLineNr} bevestigd en opgeslagen in database`
            : `Line ${exactLineNr} confirmed and saved in database`
        );

        if (savedLine && savedLine.quantity !== undefined && savedLine.quantity !== null) {
          const freshQtyStr = formatQuantity(savedLine.quantity);
          const freshUnit = savedLine.unit || unitToSend;
          const freshArt = savedLine.product_reference || artToSend;
          const freshRaw = savedLine.product_description || rawToSend;
          const syncedLines = updatedLines.map((l) =>
            l.id === lineId
              ? {
                  ...l,
                  bonQty: freshQtyStr,
                  qty: parseFloat(freshQtyStr) || l.qty,
                  unit: freshUnit,
                  art: freshArt,
                  raw: freshRaw,
                }
              : l
          );
          const syncedOrder = { ...currentOrder, lines: syncedLines };
          setOrders((prev) => prev.map((o) => (o.nr === currentOrder.nr ? syncedOrder : o)));
          setLiveOrder(syncedOrder);
          if (onOrderUpdated) onOrderUpdated(syncedOrder);
          try {
            sessionStorage.setItem(`order_edits_${currentOrder.nr}`, JSON.stringify(syncedLines));
          } catch {}
          window.dispatchEvent(new CustomEvent('orders_refreshed'));
        }
      } catch (err: any) {
        console.warn('Failed to save confirmed line to backend:', err);
        toast.error(
          isNl
            ? `Fout bij opslaan in database: ${err.message || 'Onbekende fout'}`
            : `Failed to save in database: ${err.message || 'Unknown error'}`
        );
      } finally {
        setConfirmingLineId(null);
      }
    }

    // Advance to next unconfirmed line needing attention
    const nextUnconfirmed = updatedLines.find(
      (l) => l.id !== lineId && !l.confirmed && l.conf < threshold
    );
    if (nextUnconfirmed) {
      setSelLineId(nextUnconfirmed.id);
    }
  };

  // Correct line with article from search or alternatives (held in draft until Confirm Line is clicked)
  const handlePickArticle = (lineId: string, artCode: string) => {
    const catItem = CAT[artCode];
    if (!catItem) return;

    setLineDrafts((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        art: artCode,
        raw: catItem.d || prev[lineId]?.raw,
        unit: catItem.unit || prev[lineId]?.unit,
      },
    }));
    setArtSearch('');
  };

  // Apply RAL code (held in draft until Confirm Line is clicked)
  const handleApplyRal = (lineId: string) => {
    const val = ralDraft.replace(/ral/i, '').trim();
    if (!val) return;

    const curLine = currentOrder.lines.find((l) => l.id === lineId);
    if (!curLine) return;

    const cur = CAT[curLine.art] || { fam: 'CRY', pack: '4L' };
    const match = Object.keys(CAT).find(
      (k) => CAT[k].fam === cur.fam && CAT[k].pack === cur.pack && CAT[k].ral === val
    );

    if (match && CAT[match]) {
      setLineDrafts((prev) => ({
        ...prev,
        [lineId]: {
          ...prev[lineId],
          art: match,
          raw: CAT[match].d || prev[lineId]?.raw,
          unit: CAT[match].unit || prev[lineId]?.unit,
        },
      }));
    }
    setRalDraft('');
  };

  // Update line quantity in temporary draft state (temporary until Confirm Line is clicked)
  const handleSetQty = (lineId: string, val: string) => {
    setLineDrafts((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        qtyStr: val,
      },
    }));
  };

  // Update line unit in temporary draft state (temporary until Confirm Line is clicked)
  const handleSetUnit = (lineId: string, unitVal: string) => {
    setLineDrafts((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        unit: unitVal,
      },
    }));
  };

  // Approve Order
  const handleApprove = () => {
    if (hasBlockers || isSyncing) return;

    setIsSyncing(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowTs = `${currentOrder.day || '08/10/2026'} ${timeStr}`;

    const updatedOrder: OrderItem = {
      ...currentOrder,
      st: 'goedgekeurd',
      approvedBy: userName,
      approvedAt: nowTs,
      comment: comment.trim() || undefined,
    };

    const newOrders = orders.map((o) => (o.nr === currentOrder.nr ? updatedOrder : o));
    setOrders(newOrders);
    setLiveOrder(updatedOrder);
    if (onOrderUpdated) onOrderUpdated(updatedOrder);
    window.dispatchEvent(new CustomEvent('orders_refreshed'));

    toast.info(
      isNl
        ? 'Goedgekeurd. Order wordt naar Business Central verstuurd.'
        : 'Approved. Order is being sent to Business Central.'
    );

    // Business Central sync sequence matching AalterPaint_Demo_9_10.html
    setTimeout(() => {
      setIsSyncing(false);
      const voNumber = `VO-26-018742`;
      const syncedOrder: OrderItem = {
        ...updatedOrder,
        st: 'gesync',
        vo: voNumber,
        syncAt: nowTs,
      };
      setOrders((prev) => prev.map((o) => (o.nr === currentOrder.nr ? syncedOrder : o)));
      setLiveOrder(syncedOrder);
      setSyncResult({
        show: true,
        synced: true,
        vo: voNumber,
        title: isNl
          ? `Goedgekeurd door ${userName} om ${timeStr}`
          : `Approved by ${userName} at ${timeStr}`,
        text: isNl
          ? `Verkooporder ${voNumber} succesvol aangemaakt in Business Central. Outlook-tag: Goedgekeurd.`
          : `Sales order ${voNumber} successfully created in Business Central. Outlook tag: Approved.`,
      });
      toast.success(
        isNl
          ? `Verkooporder ${voNumber} aangemaakt in Business Central`
          : `Sales order ${voNumber} created in Business Central`
      );
      setComment('');
      if (onOrderUpdated) onOrderUpdated(syncedOrder);
      window.dispatchEvent(new CustomEvent('orders_refreshed'));
    }, 1500);
  };

  // Reject Order
  const handleReject = () => {
    const trimmedReason = comment.trim();
    if (!trimmedReason) {
      toast.error(
        isNl
          ? 'Vul eerst een opmerking in om de bestelling af te wijzen.'
          : 'Please enter a note before rejecting the order.'
      );
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowTs = `${currentOrder.day || '08/10/2026'} ${timeStr}`;

    const updatedOrder: OrderItem = {
      ...currentOrder,
      st: 'afgewezen',
      rejectedBy: userName,
      rejectedAt: nowTs,
      rejectReason: trimmedReason,
    };

    const newOrders = orders.map((o) => (o.nr === currentOrder.nr ? updatedOrder : o));
    setOrders(newOrders);
    setLiveOrder(updatedOrder);
    setSyncResult({
      show: true,
      synced: false,
      title: isNl
        ? `Afgewezen door ${userName} op ${nowTs}`
        : `Rejected by ${userName} on ${nowTs}`,
      text: isNl
        ? `Reden: ${trimmedReason}. Er ging niets naar Business Central. Outlook-tag: Afgewezen.`
        : `Reason: ${trimmedReason}. Nothing was sent to Business Central. Outlook tag: Rejected.`,
    });
    toast.error(
      isNl
        ? `Order ${currentOrder.nr} afgewezen. Er gaat niets naar Business Central.`
        : `Order ${currentOrder.nr} rejected. Nothing sent to Business Central.`
    );
    setComment('');
    if (onOrderUpdated) onOrderUpdated(updatedOrder);
    window.dispatchEvent(new CustomEvent('orders_refreshed'));
  };

  // Queue navigation
  const handlePrevOrder = () => {
    if (queueIdx > 0) {
      const prevOrder = queueList[queueIdx - 1];
      setCurrentNr(prevOrder.nr);
      if (onOrderChanged) {
        onOrderChanged(prevOrder.nr, (prevOrder as any).order_id, (prevOrder as any).email_id);
      }
    }
  };

  const handleNextOrder = () => {
    if (queueIdx < queueList.length - 1) {
      const nextOrder = queueList[queueIdx + 1];
      setCurrentNr(nextOrder.nr);
      if (onOrderChanged) {
        onOrderChanged(nextOrder.nr, (nextOrder as any).order_id, (nextOrder as any).email_id);
      }
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

  const dynamicOcrScore = currentOrder.ocr ?? (currentOrder.klantConf || 85);
  const insSummary = isNl
    ? `${linesUnderThreshold} van ${currentOrder.lines.length} regels onder de drempel · ${
        totalFails ? `${totalFails} controle mislukt` : totalMisses ? `${totalMisses} veld onzeker` : 'controles in orde'
      } · OCR ${dynamicOcrScore}%`
    : `${linesUnderThreshold} of ${currentOrder.lines.length} lines below threshold · ${
        totalFails ? `${totalFails} check failed` : totalMisses ? `${totalMisses} field uncertain` : 'all checks passed'
      } · OCR ${dynamicOcrScore}%`;

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
  const isPending = !isApproved && !isRejected && currentOrder.st !== 'syncfout';

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
    <div key={`val-view-${currentOrder.nr}`} className="a-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
            {backLabel || (isNl ? 'Validatie' : 'Validation')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#6B6B6B', marginRight: '4px' }}>
              {isNl
                ? `Order ${displayQueueIdx} van ${displayQueueTotal} in de wachtrij`
                : `Order ${displayQueueIdx} of ${displayQueueTotal} in the queue`}
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
              disabled={queueIdx >= queueList.length - 1 || displayQueueIdx >= displayQueueTotal}
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
                cursor: (queueIdx >= queueList.length - 1 || displayQueueIdx >= displayQueueTotal) ? 'not-allowed' : 'pointer',
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
            gap: '8px 22px',
            fontSize: '14px',
            color: '#1A1A1A',
            padding: '12px 0',
            borderTop: '1px solid #DADADA',
            borderBottom: '1px solid #DADADA',
          }}
        >
          {/* Person & Role */}
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#6B6B6B', display: 'flex' }}>
              <svg className="s" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
              </svg>
            </span>
            <strong style={{ fontWeight: 600 }}>{contactPerson || '—'}</strong>
            {contactRole ? <span style={{ color: '#6B6B6B' }}>{contactRole}</span> : null}
          </span>

          {/* Email */}
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
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
              {contactEmail}
            </a>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8C8C8C' }}>
              <span style={{ color: '#6B6B6B', display: 'flex' }}>
                <svg className="s" viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="1" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              </span>
              —
            </span>
          )}

          {/* Phone */}
          {contactPhone ? (
            <a
              href={`tel:${contactPhone.replace(/\s/g, '')}`}
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
              {contactPhone}
            </a>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8C8C8C' }}>
              <span style={{ color: '#6B6B6B', display: 'flex' }}>
                <svg className="s" viewBox="0 0 24 24">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
                </svg>
              </span>
              —
            </span>
          )}

          {/* Location */}
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: contactLocation ? '#1A1A1A' : '#8C8C8C' }}>
            <span style={{ color: '#6B6B6B', display: 'flex' }}>
              <svg className="s" viewBox="0 0 24 24">
                <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            {contactLocation || '—'}
          </span>

          {currentOrder.klantNr ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4D4D4D' }}>
              BC {currentOrder.klantNr}
              <ConfidenceBadge
                value={currentOrder.klantConf}
                threshold={threshold}
                showLabel={false}
              />
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4D4D4D' }}>
              <ConfidenceBadge
                value={currentOrder.klantConf}
                threshold={threshold}
                showLabel={false}
              />
            </span>
          )}
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
            {isNl ? 'EMAIL KLANT' : 'EMAIL CUSTOMER'}
          </button>

          <a
            href={contactPhone ? `tel:${contactPhone.replace(/\s/g, '')}` : undefined}
            onClick={(e) => {
              if (!contactPhone) e.preventDefault();
            }}
            className="bg"
            style={{
              minHeight: '40px',
              boxSizing: 'border-box',
              padding: '0 14px',
              background: '#FFFFFF',
              color: contactPhone ? '#1A1A1A' : '#8C8C8C',
              border: `1px solid ${contactPhone ? '#1A1A1A' : '#DADADA'}`,
              borderRadius: 0,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: '12px',
              textDecoration: 'none',
              cursor: contactPhone ? 'pointer' : 'not-allowed',
            }}
          >
            <svg className="s" viewBox="0 0 24 24">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
            </svg>
            {isNl ? 'BEL KLANT' : 'CALL CUSTOMER'}
          </a>
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
                {isNl
                  ? (contactPerson ? `Mail aan ${contactPerson}` : 'Mail aan klant')
                  : (contactPerson ? `Email to ${contactPerson}` : 'Email to customer')}
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
            <ConfidenceBadge value={currentOrder.ocr ?? currentOrder.klantConf ?? 95} threshold={threshold} showLabel={false} />
          </span>
          <span>
            {isNl ? 'Ontvangen' : 'Received'} {currentOrder.day} {currentOrder.time}
          </span>
          {waitInfo ? (
            <span style={{ color: waitInfo.color, fontWeight: 500 }}>
              {isNl ? `wacht ${waitInfo.text}` : `wait ${waitInfo.text}`}
            </span>
          ) : null}
          <span>{mbFull}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: '#E8590C', display: 'block' }} />
            Outlook: {(currentOrder as any).outlook_status || (isNl ? 'In review' : 'In review')}
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
              <ConfidenceBadge value={currentOrder.ocr ?? (currentOrder.klantConf || 85)} threshold={threshold} showLabel={false} />
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
                    {contactLocation ? (
                      <span style={{ fontSize: '12px', color: '#4D4D4D' }}>{contactLocation}</span>
                    ) : null}
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
                          {l.lineNumber ?? (i + 1)}
                        </span>
                        <span>{l.raw}</span>
                        <span
                          style={{
                            textAlign: 'right',
                            color: l.qty === null ? '#A61B1B' : '#1E2A3A',
                          }}
                        >
                          {formatQuantity(l.bonQty ?? l.qty) || (l.qty !== null ? formatQuantity(l.qty) : '??')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {contactLocation ? (
                  <div style={{ fontSize: '13px', color: '#4D4D4D' }}>
                    Levering: {contactLocation} · Gelieve onze referentie te vermelden op de leveringsbon.
                  </div>
                ) : null}
              </div>

              <span style={{ fontSize: '12px', color: '#6B6B6B' }}>
                {currentOrder.ocrKind || (isNl ? 'E-mail tekst' : 'Email text')}
                {(attachments.length > 0 || currentOrder.att) ? (
                  <>
                    {' · '}
                    {attachments.length > 0
                      ? attachments.map((a) => a.filename).join(', ')
                      : currentOrder.att}
                  </>
                ) : null}{' '}
                ·{' '}
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

              {/* Live PDF attachments list (shown 1 below 1, click to open in new tab) */}
              {loadingAttachments ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6B6B6B', padding: '6px 0' }}>
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #E20714',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  {isNl ? 'Bijlagen laden...' : 'Loading attachments...'}
                </div>
              ) : attachments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {attachments.map((att, idx) => (
                    <div
                      key={att.id || `${att.filename}-${idx}`}
                      onClick={() => handleOpenAttachment(att)}
                      role="button"
                      tabIndex={0}
                      title={isNl ? `Klik om ${att.filename} te openen in een nieuw tabblad` : `Click to open ${att.filename} in a new tab`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '10px 14px',
                        background: '#FAFAFA',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        userSelect: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FFF5F5';
                        e.currentTarget.style.borderColor = '#E20714';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(226, 7, 20, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FAFAFA';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {renderAttachmentIcon(att.filename)}
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#1A1A1A',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {att.filename}
                        </span>
                        {att.file_size ? (
                          <span style={{ fontSize: '12px', color: '#6B6B6B', whiteSpace: 'nowrap' }}>
                            ({formatFileSize(att.file_size)})
                          </span>
                        ) : null}
                      </div>

                      {/* Open in new tab link icon */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#E20714',
                          flexShrink: 0,
                        }}
                      >
                        {isNl ? 'Openen' : 'Open'}
                        <svg
                          viewBox="0 0 24 24"
                          style={{ width: '14px', height: '14px' }}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

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
                        value={currentOrder.ocr ?? (currentOrder.klantConf || 85)}
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
          {paginatedLines.map((l, i) => {
            const isSelected = selLineId === l.id;
            const idx = (linesPage - 1) * linesPageSize + i + 1;
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
                key={`val-line-${currentOrder.nr}-${linesPage}-${l.id}`}
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
                        {l.qty === null
                          ? (isNl ? 'Hoeveelheid ontbreekt' : 'Quantity missing')
                          : `${formatQuantity(l.bonQty ?? l.qty) || l.qty} ${formatUnitLabel(l.unit, isNl)}`}
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
                    {(() => {
                      const draft = lineDrafts[l.id];
                      const committedQtyStr =
                        l.bonQty !== undefined && l.bonQty !== ''
                          ? formatQuantity(l.bonQty)
                          : (l.qty !== null && l.qty !== undefined ? formatQuantity(l.qty) : '');
                      const committedUnit = resolveProductUnit(l.unit, l.want?.pack || CAT[l.art]?.pack, l.raw || catItem.d, l.art);
                      const committedArt = l.art;

                      const currentQtyStr = draft?.qtyStr !== undefined ? draft.qtyStr : committedQtyStr;
                      const currentUnit = draft?.unit !== undefined ? draft.unit : committedUnit;
                      const currentArt = draft?.art !== undefined ? draft.art : committedArt;

                      const isQtyChanged = currentQtyStr.trim() !== committedQtyStr.trim();
                      const isUnitChanged = currentUnit !== committedUnit;
                      const isArtChanged = currentArt !== committedArt;
                      const hasChanges = isQtyChanged || isUnitChanged || isArtChanged;

                      const cleanQtyVal = currentQtyStr.replace(',', '.').trim();
                      const isQtyValid = cleanQtyVal !== '' && !isNaN(parseFloat(cleanQtyVal)) && parseFloat(cleanQtyVal) > 0;

                      // Confirm button is disabled if:
                      // 1. Line is already confirmed and has no new edits made
                      // 2. Quantity is empty or invalid
                      // 3. API save in flight
                      const isConfirmDisabled = (l.confirmed && !hasChanges) || !isQtyValid || confirmingLineId === l.id;

                      return (
                        <>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#4D4D4D' }}>
                              {isNl ? 'Hoeveelheid' : 'Quantity'}
                              <input
                                type="text"
                                inputMode="decimal"
                                value={currentQtyStr}
                                onChange={(e) => handleSetQty(l.id, e.target.value)}
                                placeholder={isNl ? 'Aanvullen' : 'Fill in'}
                                style={{
                                  height: '40px',
                                  width: '96px',
                                  padding: '0 10px',
                                  border: `1px solid ${!isQtyValid ? '#A61B1B' : isQtyChanged ? '#E20714' : '#C9C9C9'}`,
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
                                value={currentUnit}
                                onChange={(e) => handleSetUnit(l.id, e.target.value)}
                                style={{
                                  height: '40px',
                                  padding: '0 8px',
                                  border: `1px solid ${isUnitChanged ? '#E20714' : '#C9C9C9'}`,
                                  borderRadius: 0,
                                  fontSize: '15px',
                                  fontWeight: 400,
                                  background: '#FFFFFF',
                                  minWidth: '96px',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="blik">{isNl ? 'blik' : 'can'}</option>
                                <option value="emmer">{isNl ? 'emmer' : 'bucket'}</option>
                                <option value="kit">kit</option>
                                <option value="pot">pot</option>
                                <option value="vat">{isNl ? 'vat' : 'drum'}</option>
                                <option value="stuk">{isNl ? 'stuk' : 'piece'}</option>
                                {(() => {
                                  if (currentUnit && !['blik', 'emmer', 'kit', 'pot', 'vat', 'stuk'].includes(currentUnit)) {
                                    return <option value={currentUnit}>{currentUnit}</option>;
                                  }
                                  return null;
                                })()}
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
                              <span>
                                {isNl ? 'Ander artikel zoeken' : 'Search other article'}
                                {isArtChanged && (
                                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#D97706', fontWeight: 700 }}>
                                    ({isNl ? 'Concept' : 'Draft'}: {currentArt})
                                  </span>
                                )}
                              </span>
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  height: '40px',
                                  padding: '0 10px',
                                  border: `1px solid ${isArtChanged ? '#E20714' : '#C9C9C9'}`,
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
                              {l.confirmed && !hasChanges ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#15803D', fontWeight: 600 }}>
                                  <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  {isNl ? `Bevestigd door ${l.by || userName}` : `Confirmed by ${l.by || userName}`}
                                </span>
                              ) : l.confirmed && hasChanges ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#D97706', fontWeight: 600 }}>
                                  <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                  </svg>
                                  {isNl ? 'Niet-opgeslagen wijzigingen (klik op bevestigen om op te slaan)' : 'Unsaved changes (click confirm to save)'}
                                </span>
                              ) : !isQtyValid ? (
                                <span style={{ color: '#DC2626', fontWeight: 500 }}>
                                  {isNl ? 'Vul eerst een geldige hoeveelheid in.' : 'Please enter a valid quantity first.'}
                                </span>
                              ) : (
                                <span>
                                  {isNl ? 'Deze regel vraagt extra aandacht: bevestig of corrigeer.' : 'This line requires attention: please confirm or correct.'}
                                </span>
                              )}
                            </span>

                            <button
                              onClick={() => handleConfirmLine(l.id)}
                              disabled={isConfirmDisabled}
                              className="bd"
                              title={
                                isConfirmDisabled && l.confirmed && !hasChanges
                                  ? (isNl ? 'Geen wijzigingen om te bevestigen' : 'No changes to confirm')
                                  : undefined
                              }
                              style={{
                                minHeight: '40px',
                                padding: '0 16px',
                                background: isConfirmDisabled ? '#F3F4F6' : '#FFFFFF',
                                color: isConfirmDisabled ? '#9CA3AF' : '#E20714',
                                border: `1px solid ${isConfirmDisabled ? '#E5E7EB' : '#E20714'}`,
                                borderRadius: 0,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                fontSize: '12px',
                                cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
                                opacity: confirmingLineId === l.id ? 0.7 : isConfirmDisabled ? 0.75 : 1,
                                transition: 'all 0.15s ease-in-out',
                              }}
                            >
                              <svg className="s" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                              {confirmingLineId === l.id
                                ? (isNl ? 'Opslaan...' : 'Saving...')
                                : l.confirmed && hasChanges
                                ? (isNl ? 'Wijzigingen bevestigen' : 'Confirm changes')
                                : (isNl ? 'Regel bevestigen' : 'Confirm line')}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}

          {/* Order Lines Pagination matching reference design */}
          <TablePagination
            currentPage={linesPage}
            pageSize={linesPageSize}
            totalItems={currentOrder.lines ? currentOrder.lines.length : 0}
            onPageChange={setLinesPage}
            onPageSizeChange={setLinesPageSize}
            pageSizeOptions={[10, 25, 50]}
            itemLabel={isNl ? 'regels' : 'lines'}
            language={activeLang}
          />

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
              <svg className="s" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                <rect x="4" y="11" width="16" height="10" rx="1" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              {isNl
                ? 'Niets gaat automatisch naar Business Central. Enkel wat jij goedkeurt, wordt een verkooporder.'
                : 'Nothing goes to Business Central automatically. Only what you approve becomes a sales order.'}
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
                    {isNl ? 'Opmerking (verplicht bij afwijzen)' : 'Note (required for rejection)'}
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={
                        isNl
                          ? 'bv. Levering vrijdag bevestigd met klant'
                          : 'e.g. Delivery confirmed with custom...'
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
                      border: `1px solid ${!comment.trim() ? '#DADADA' : '#1A1A1A'}`,
                      background: '#FFFFFF',
                      color: !comment.trim() ? '#BFBFBF' : '#1A1A1A',
                      borderRadius: 0,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontSize: '13px',
                      cursor: !comment.trim() ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isNl ? 'AFWIJZEN' : 'REJECT'}
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
                      background: hasBlockers || isSyncing ? '#E2071480' : '#E20714',
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
                      opacity: hasBlockers ? 0.6 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSyncing ? (
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          border: '2px solid #FFFFFF',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'spin 0.6s linear infinite',
                        }}
                      />
                    ) : (
                      <svg className="s" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', strokeWidth: 2.5 }}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    {isNl ? 'GOEDKEUREN' : 'APPROVE'}
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
            {(syncResult || isApproved || isRejected) && (
              <div
                className="a-in"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  background: (syncResult ? syncResult.synced : isApproved) ? '#E3F2E9' : '#FCE8E8',
                  color: (syncResult ? syncResult.synced : isApproved) ? '#11603B' : '#A61B1B',
                }}
              >
                {(syncResult ? syncResult.synced : isApproved) ? (
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
                    <svg className="i" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', strokeWidth: 2.5 }}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                ) : (
                  <span
                    className="a-pop"
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: '#A61B1B',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                    }}
                  >
                    <svg className="i" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', strokeWidth: 2.5 }}>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </span>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>
                    {syncResult?.title ||
                      (isApproved
                        ? (isNl
                            ? `Goedgekeurd door ${currentOrder.approvedBy || userName} op ${currentOrder.approvedAt || currentOrder.day}`
                            : `Approved by ${currentOrder.approvedBy || userName} on ${currentOrder.approvedAt || currentOrder.day}`)
                        : (isNl
                            ? `Afgewezen door ${currentOrder.rejectedBy || userName} op ${currentOrder.rejectedAt || currentOrder.day}`
                            : `Rejected by ${currentOrder.rejectedBy || userName} on ${currentOrder.rejectedAt || currentOrder.day}`))}
                  </span>
                  <span style={{ fontSize: '14px' }}>
                    {syncResult?.text ||
                      (isApproved
                        ? (isNl
                            ? `Verkooporder ${currentOrder.vo || 'VO-26-018742'} aangemaakt in Business Central. Outlook-tag: Goedgekeurd.`
                            : `Sales order ${currentOrder.vo || 'VO-26-018742'} created in Business Central. Outlook tag: Approved.`)
                        : (isNl
                            ? `Reden: ${currentOrder.rejectReason || 'Order afgewezen'}. Er ging niets naar Business Central. Outlook-tag: Afgewezen.`
                            : `Reason: ${currentOrder.rejectReason || 'Order rejected'}. Nothing was sent to Business Central. Outlook tag: Rejected.`))}
                  </span>
                </div>
              </div>
            )}

            {/* Next order button if available */}
            {(syncResult || isApproved || isRejected) && (
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
