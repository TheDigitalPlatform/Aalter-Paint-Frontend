import { getApiBaseUrl, getAuthHeaders, handleUnauthorizedSession } from './auth';

export interface OrderListItem {
  order_id: number;
  order_number: string;
  email_id: number;
  customer_name?: string | null;
  customer_reference?: string | null;
  received_at?: string | null;
  mailbox?: string | null;
  lines_count: number;
  confidence?: number | null;
  confidence_summary?: string | null;
  status: string;
  outlook_status?: string | null;
  missing_fields: string[];
  review_reasons: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OrderInsightsSummary {
  uncertain_matches: number;
  missing_quantities: number;
  waiting_over_4h: number;
  failed_syncs: number;
  total_orders?: number;
}

export interface OrderListResponseData {
  items: OrderListItem[];
  total: number;
  skip: number;
  limit: number;
  insights: OrderInsightsSummary;
  available_mailboxes?: string[];
}

export interface FetchOrdersParams {
  search?: string;
  status?: string;
  mailbox?: string;
  extra_attention?: boolean;
  waiting_longer_than_4_hours?: boolean;
  uncertain_only?: boolean;
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}

export async function fetchOrders(params: FetchOrdersParams = {}): Promise<OrderListResponseData> {
  const baseUrl = getApiBaseUrl();
  const query = new URLSearchParams();

  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'alle' && params.status !== 'all') {
    query.append('status', params.status);
  }
  if (params.mailbox && params.mailbox !== 'alle' && params.mailbox !== 'all') {
    query.append('mailbox', params.mailbox);
  }
  if (params.extra_attention !== undefined) {
    query.append('extra_attention', String(params.extra_attention));
  }
  if (params.waiting_longer_than_4_hours !== undefined) {
    query.append('waiting_longer_than_4_hours', String(params.waiting_longer_than_4_hours));
  }
  if (params.uncertain_only !== undefined) {
    query.append('uncertain_only', String(params.uncertain_only));
  }
  if (params.skip !== undefined) query.append('skip', String(params.skip));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.sort_by) query.append('sort_by', params.sort_by);
  if (params.sort_order) query.append('sort_order', params.sort_order);

  const url = `${baseUrl}/orders${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to fetch orders');
  }

  return json.data;
}

export interface CustomerContactInfo {
  contact_person?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  source?: Record<string, string>;
}

export interface MatchAlternativeItem {
  bc_item_number: string;
  bc_item_description?: string | null;
  confidence: number;
  rationale?: string | null;
}

export interface BcItemSearchResult {
  item_number: string;
  display_name: string;
  description?: string | null;
  unit_of_measure?: string | null;
  item_category?: string | null;
  blocked?: boolean;
}

export interface OrderLineDetail {
  id?: number;
  line_id?: number;
  order_id?: number;
  line_number?: number | null;
  product_description?: string | null;
  product_reference?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  packaging?: string | null;
  notes?: string | null;
  confidence?: number | null;
  status?: string | null;
  match_status?: string | null;
  bc_item_number?: string | null;
  bc_item_description?: string | null;
  match_confidence?: number | null;
  match_rationale?: string | null;
  match_alternatives?: MatchAlternativeItem[] | null;
  match_source?: string | null;
  matched_at?: string | null;
  item_code?: string | null;
  description?: string | null;
  unit_of_measure?: string | null;
  source_evidence?: any;
}

export interface OrderDetail {
  order_id: number;
  order_number?: string;
  email_id: number;
  status: string;
  match_status?: string | null;
  match_confidence?: number | null;
  match_review_reasons?: string[];
  customer_name?: string | null;
  customer_reference?: string | null;
  order_date?: string | null;
  currency?: string | null;
  missing_fields: string[];
  review_reasons: string[];
  extraction_confidence?: number | null;
  confidence?: number | null;
  ocr_confidence?: number | null;
  field_evidence?: any;
  model?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  lines: OrderLineDetail[];
  mailbox?: string | null;
  received_at?: string | null;
  email_sender?: string | null;
  email_subject?: string | null;
  email_body?: string | null;
  outlook_status?: string | null;
  contact_info?: CustomerContactInfo | null;
  wait_hours?: number | null;
  wait_text?: string | null;
  wait_color?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function fetchOrderById(orderId: number | string): Promise<OrderDetail> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/orders/${orderId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || `Failed to fetch order ${orderId}`);
  }

  return json.data;
}

export async function fetchOrderByEmailId(emailId: number | string): Promise<OrderDetail> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/orders/by-email/${emailId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || `Failed to fetch order for email ${emailId}`);
  }

  return json.data;
}

export async function fetchOrderContact(orderId: number | string): Promise<CustomerContactInfo> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/orders/${orderId}/contact`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || `Failed to fetch contact details for order ${orderId}`);
  }

  return json.data;
}

export async function fetchEmailContact(emailId: number | string): Promise<CustomerContactInfo> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/orders/by-email/${emailId}/contact`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || `Failed to fetch contact details for email ${emailId}`);
  }

  return json.data;
}

export interface UpdateOrderLinePayload {
  quantity?: number | string | null;
  unit?: string | null;
  product_reference?: string | null;
  product_description?: string | null;
  packaging?: string | null;
  confidence?: number | null;
  match_status?: string | null;
  status?: string | null;
  bc_item_number?: string | null;
  bc_item_description?: string | null;
  match_confidence?: number | null;
  match_rationale?: string | null;
  match_source?: string | null;
}

export async function searchBcItems(
  query: string,
  limit: number = 15
): Promise<BcItemSearchResult[]> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const response = await fetch(`${baseUrl}/business-central/items?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to search Business Central items');
  }

  return Array.isArray(json.data?.items) ? json.data.items : [];
}

export async function matchOrderProducts(
  orderId: number | string,
  force: boolean = false
): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}/match-products`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ force }),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || json.error?.message || `Failed to match products for order ${orderId}`);
  }

  return json.data;
}

export async function updateOrderLine(
  orderId: number | string,
  lineId: number | string,
  payload: UpdateOrderLinePayload
): Promise<OrderLineDetail> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/orders/${orderId}/lines/${lineId}`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || `Failed to update line ${lineId}`);
  }

  return json.data;
}

export async function fetchAvailableMailboxes(): Promise<string[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/orders/mailboxes`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) return [];
    const json = await response.json();
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.data)) return json.data;
    return [];
  } catch {
    return [];
  }
}

export async function fetchOrdersCount(): Promise<number> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/orders/count`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to fetch orders count');
  }

  return typeof json.data?.count === 'number' ? json.data.count : 0;
}

export async function fetchValidationOrdersCount(): Promise<number> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/orders/validation/count`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to fetch validation count');
  }

  return typeof json.data?.count === 'number' ? json.data.count : 0;
}

export interface EmailAttachmentItem {
  id: number;
  email_id: number;
  filename: string;
  content_type: string;
  file_size: number;
  file_path: string;
  blob_name?: string | null;
  ocr_status?: string | null;
  ocr_text?: string | null;
  created_at?: string | null;
}

export interface EmailRecordDetail {
  id: number;
  message_id?: string;
  mailbox?: string;
  subject?: string | null;
  sender?: string;
  recipients?: any;
  body_text?: string | null;
  body_html?: string | null;
  received_at?: string;
  status?: string;
  attachments?: EmailAttachmentItem[];
}

export async function fetchEmailById(emailId: number | string): Promise<EmailRecordDetail> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/emails/${emailId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || `Failed to fetch email ${emailId}`);
  }

  return json.data;
}

export interface WaitingOrderItem {
  order_id: number;
  order_number: string;
  email_id: number;
  customer_name?: string | null;
  customer_reference?: string | null;
  received_at?: string | null;
  status: string;
  category: string;
  confidence?: number | null;
  confidence_summary?: string | null;
  reason: string;
  lines_count: number;
  missing_fields: string[];
  review_reasons: string[];
  wait_hours: number;
  wait_text: string;
  wait_color: string;
}

export interface WaitingOrdersResponseData {
  items: WaitingOrderItem[];
  total_waiting: number;
}

export async function fetchWaitingForYouOrders(limit: number = 10): Promise<WaitingOrdersResponseData> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/orders/waiting-for-you?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to fetch waiting orders');
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// Customer Email Reply (F12) APIs
// ---------------------------------------------------------------------------

export interface CustomerEmailDraftData {
  order_id: number;
  order_number: string;
  email_id: number;
  mailbox: string;
  source_message_id: string;
  source_subject?: string | null;
  source_sender?: string | null;
  contact_person?: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_text: string;
  hint: string;
}

export interface SendCustomerEmailPayload {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body_text: string;
  body_html?: string | null;
  force?: boolean;
}

export interface CustomerEmailSendResult {
  outbound_id: number;
  order_id: number;
  order_number: string;
  email_id: number;
  mailbox: string;
  source_message_id: string;
  status: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
}

export interface CustomerEmailOutboundItem {
  id: number;
  order_id: number;
  email_id: number;
  mailbox: string;
  source_message_id: string;
  source_internet_message_id?: string | null;
  source_conversation_id?: string | null;
  to_recipients: string[];
  cc_recipients: string[];
  bcc_recipients: string[];
  subject: string;
  body_text: string;
  body_html?: string | null;
  status: string;
  provider_message_id?: string | null;
  error_message?: string | null;
  requested_by_user_id?: number | null;
  n8n_execution_id?: string | null;
  queued_at?: string | null;
  sent_at?: string | null;
  failed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function fetchCustomerEmailDraft(
  orderId: string | number
): Promise<CustomerEmailDraftData> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/orders/${encodeURIComponent(orderId)}/customer-email/draft`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    const errorMsg =
      json.message || json.error?.message || json.error?.details || 'Failed to fetch customer email draft';
    const err = new Error(errorMsg);
    (err as any).code = json.error?.code;
    throw err;
  }

  return json.data;
}

export async function sendCustomerEmail(
  orderId: string | number,
  payload: SendCustomerEmailPayload
): Promise<CustomerEmailSendResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/orders/${encodeURIComponent(orderId)}/customer-email/send`,
    {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    const errorMsg =
      json.message || json.error?.message || json.error?.details || 'Failed to send customer email';
    const err = new Error(errorMsg);
    (err as any).code = json.error?.code;
    throw err;
  }

  return json.data;
}

export async function fetchCustomerEmailHistory(
  orderId: string | number
): Promise<CustomerEmailOutboundItem[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/orders/${encodeURIComponent(orderId)}/customer-email`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (response.status === 401) {
    handleUnauthorizedSession();
    throw new Error('Unauthorized');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(
      json.message || json.error?.message || json.error?.details || 'Failed to fetch customer email history'
    );
  }

  return json.data;
}
