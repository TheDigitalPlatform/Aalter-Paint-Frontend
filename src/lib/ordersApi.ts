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

export interface OrderLineDetail {
  id?: number;
  order_id?: number;
  line_number?: number | null;
  product_description?: string | null;
  product_reference?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  packaging?: string | null;
  notes?: string | null;
  missing_fields: string[];
  confidence?: number | null;
  field_evidence?: any;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OrderDetail {
  order_id: number;
  order_number?: string;
  email_id: number;
  status: string;
  customer_name?: string | null;
  customer_reference?: string | null;
  order_date?: string | null;
  currency?: string | null;
  missing_fields: string[];
  review_reasons: string[];
  extraction_confidence?: number | null;
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

export interface UpdateOrderLinePayload {
  quantity?: number | string | null;
  unit?: string | null;
  product_reference?: string | null;
  product_description?: string | null;
  packaging?: string | null;
  confidence?: number | null;
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

