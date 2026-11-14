export type UserRole = 'customer' | 'manager';

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface StoreSettings {
  id: number;
  storeName: string;
  tagline: string;
  logoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  currency: string;
  lowStockThreshold: number;
  freeShippingThreshold: number;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  isOpen: boolean;
  productCount?: number;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  categoryOpen?: boolean;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  imageUrl: string;
  featured: boolean;
  isActive: boolean;
  views: number;
  favorites: number;
  specs: Record<string, string>;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productImage: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  lineTotal: number;
}

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
  id: number;
  orderNumber: string;
  userId: number | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  paymentMethod: string;
  paymentScreenshot: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  totalProfit: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}

export interface BrowsingHistoryItem {
  id: number;
  productId: number;
  viewedAt: string;
  product: Product;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type AnalyticsPeriod = 'daily' | 'monthly' | 'yearly';

export interface AnalyticsSummary {
  period: AnalyticsPeriod;
  kpis: {
    ordersCount: number;
    revenue: number;
    income: number;
    avgOrderValue: number;
    unitsSold: number;
    lowStockCount: number;
  };
  series: Array<{
    label: string;
    orders: number;
    revenue: number;
    income: number;
  }>;
  bestProducts: Array<{
    id: number;
    name: string;
    categoryName: string;
    imageUrl: string;
    unitsSold: number;
    revenue: number;
    stock: number;
  }>;
  favorableProducts: Array<{
    id: number;
    name: string;
    categoryName: string;
    imageUrl: string;
    views: number;
    favorites: number;
    price: number;
  }>;
  bestOrders: Array<{
    id: number;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
    itemCount: number;
  }>;
  lowStockProducts: Array<{
    id: number;
    name: string;
    sku: string;
    categoryName: string;
    stock: number;
    price: number;
    imageUrl: string;
  }>;
  categoryBreakdown: Array<{
    categoryName: string;
    revenue: number;
    ordersCount: number;
  }>;
}
