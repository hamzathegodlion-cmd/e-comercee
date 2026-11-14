import type {
  AnalyticsPeriod,
  AnalyticsSummary,
  BrowsingHistoryItem,
  Category,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
  User,
} from '../types';

const TOKEN_KEY = 'aeterna_auth_token';
let memoryToken: string | null = null;

export function getStoredToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    const ls = localStorage.getItem(TOKEN_KEY);
    if (ls) {
      memoryToken = ls;
      return ls;
    }
  } catch {
    // ignore storage errors in restricted iframes
  }
  try {
    const ss = sessionStorage.getItem(TOKEN_KEY);
    if (ss) {
      memoryToken = ss;
      return ss;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setStoredToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

const API_BASE = ((import.meta.env?.VITE_API_BASE_URL as string | undefined) || '').replace(/\/+$/, '');

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const targetUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const res = await fetch(targetUrl, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  // Storefront
  getStorefront: () =>
    request<{ settings: StoreSettings; categories: Category[]; products: Product[] }>('/api/storefront'),

  getProducts: (params?: { search?: string; category?: string; sort?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category) q.set('category', params.category);
    if (params?.sort) q.set('sort', params.sort);
    const qs = q.toString();
    return request<{ products: Product[] }>(`/api/products${qs ? `?${qs}` : ''}`);
  },

  getProduct: (id: number) => request<{ product: Product }>(`/api/products/${id}`),

  favoriteProduct: (id: number) =>
    request<{ favorites: number }>(`/api/products/${id}/favorite`, { method: 'POST' }),

  // Auth
  me: () => request<{ user: User | null }>('/api/auth/me'),

  login: async (identifier: string, password: string, expectedRole?: 'customer' | 'manager') => {
    const res = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, expectedRole }),
    });
    setStoredToken(res.token);
    return res.user;
  },

  register: async (name: string, username: string, email: string, password: string) => {
    const res = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password }),
    });
    setStoredToken(res.token);
    return res.user;
  },

  logout: async () => {
    await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    setStoredToken(null);
  },

  changeManagerPassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean; message: string }>('/api/auth/manager/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Customer history & orders
  getHistory: () => request<{ history: BrowsingHistoryItem[] }>('/api/history'),

  getCustomerOrders: () => request<{ orders: Order[] }>('/api/customer/orders'),

  createOrder: (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    shippingCity: string;
    shippingPostalCode: string;
    paymentMethod: string;
    paymentScreenshot: string;
    items: Array<{ productId: number; quantity: number }>;
  }) =>
    request<{ order: Order }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  trackOrder: (orderNumber: string) =>
    request<{ order: Order }>(`/api/orders/track/${encodeURIComponent(orderNumber)}`),

  // Manager
  getAnalytics: (period: AnalyticsPeriod) =>
    request<AnalyticsSummary>(`/api/manager/analytics?period=${period}`),

  getManagerProducts: () => request<{ products: Product[] }>('/api/manager/products'),

  createProduct: (payload: Partial<Product>) =>
    request<{ product: Product }>('/api/manager/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProduct: (id: number, payload: Partial<Product>) =>
    request<{ product: Product }>(`/api/manager/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteProduct: (id: number) =>
    request<{ ok: boolean; archived: boolean }>(`/api/manager/products/${id}`, {
      method: 'DELETE',
    }),

  getManagerCategories: () => request<{ categories: Category[] }>('/api/manager/categories'),

  createCategory: (payload: { name: string; description?: string; isOpen?: boolean }) =>
    request<{ category: Category }>('/api/manager/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCategory: (id: number, payload: Partial<Category>) =>
    request<{ category: Category }>(`/api/manager/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteCategory: (id: number) =>
    request<{ ok: boolean }>(`/api/manager/categories/${id}`, {
      method: 'DELETE',
    }),

  getManagerOrders: () => request<{ orders: Order[] }>('/api/manager/orders'),

  updateOrderStatus: (id: number, status: OrderStatus) =>
    request<{ order: Order }>(`/api/manager/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  updateSettings: (payload: Partial<StoreSettings>) =>
    request<{ settings: StoreSettings }>('/api/manager/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
