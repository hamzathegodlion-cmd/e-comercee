import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  Edit3,
  Eye,
  EyeOff,
  FolderKanban,
  Lock,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShoppingCart,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  AnalyticsPeriod,
  AnalyticsSummary,
  Category,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
  User,
} from '../types';
import { api, formatCurrency } from '../lib/api';
import { StoreImage } from './StoreImage';
import { ProductFormModal, resizeImageFile } from './ProductFormModal';

interface ManagerDashboardProps {
  user: User | null;
  settings: StoreSettings;
  onAuthChange: (user: User | null) => void;
  onStorefrontRefresh: () => void;
}

type ManagerTab = 'overview' | 'inventory' | 'categories' | 'orders' | 'settings';

export function ManagerDashboard({
  user,
  settings,
  onAuthChange,
  onStorefrontRefresh,
}: ManagerDashboardProps) {
  // Login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSecurityPasswords, setShowSecurityPasswords] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard state
  const [tab, setTab] = useState<ManagerTab>('overview');
  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const [invSearch, setInvSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // Product modal & Order receipt modal
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);

  // Category creation
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catError, setCatError] = useState('');

  // Settings form
  const [storeName, setStoreName] = useState(settings.storeName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [heroTitle, setHeroTitle] = useState(settings.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle);
  const [heroImageUrl, setHeroImageUrl] = useState(settings.heroImageUrl);
  const [lowStockThreshold, setLowStockThreshold] = useState(String(settings.lowStockThreshold));
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    String(settings.freeShippingThreshold)
  );
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Password change form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMessage, setPwMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setStoreName(settings.storeName);
    setTagline(settings.tagline);
    setLogoUrl(settings.logoUrl);
    setHeroTitle(settings.heroTitle);
    setHeroSubtitle(settings.heroSubtitle);
    setHeroImageUrl(settings.heroImageUrl);
    setLowStockThreshold(String(settings.lowStockThreshold));
    setFreeShippingThreshold(String(settings.freeShippingThreshold));
  }, [settings]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    window.setTimeout(() => {
      setActionNotice((prev) => (prev === msg ? '' : prev));
    }, 2400);
  };

  const loadDashboardData = useCallback(async () => {
    if (!user || user.role !== 'manager') return;
    setLoading(true);
    setActionError('');
    try {
      const [anaRes, prodRes, catRes, ordRes] = await Promise.all([
        api.getAnalytics(period),
        api.getManagerProducts(),
        api.getManagerCategories(),
        api.getManagerOrders(),
      ]);
      setAnalytics(anaRes);
      setProducts(prodRes.products);
      setCategories(catRes.categories);
      setOrders(ordRes.orders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load manager data.';
      setActionError(message);
      if (message.toLowerCase().includes('manager access') || message.toLowerCase().includes('401')) {
        onAuthChange(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, period, onAuthChange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setActionError('');
    setLoggingIn(true);
    try {
      const loggedIn = await api.login(identifier.trim(), password.trim(), 'manager');
      onAuthChange(loggedIn);
      setPassword('');
      setShowPassword(false);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Invalid manager credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setLoginError('');
    setPassword('');
    onAuthChange(null);
  };

  // If not signed in as manager, show private Manager Login Gate
  if (!user || user.role !== 'manager') {
    return (
      <section className="max-w-[440px] mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-black/[0.08] p-7 sm:p-8 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center mb-5">
            <Lock className="w-4 h-4" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#1D1D1F] mb-1">
            Manager Console
          </h1>
          <p className="text-sm text-[#6E6E73] mb-6">
            Sign in with your Store Manager username and password to manage inventory, analytics, categories, and branding.
          </p>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {loginError}
            </div>
          )}

          <form onSubmit={handleManagerLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                Manager Username
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter manager or admin"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                Manager Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter manager password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 rounded-full bg-[#1D1D1F] text-white text-sm font-medium hover:bg-[#333336] disabled:opacity-60 transition-colors"
            >
              {loggingIn ? 'Verifying...' : 'Sign In to Console'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  // Manager Action Handlers with real error surfacing
  const handleQuickRestock = async (productId: number, currentStock: number, delta: number) => {
    setActionError('');
    try {
      const nextStock = Math.max(0, currentStock + delta);
      await api.updateProduct(productId, { stock: nextStock });
      await loadDashboardData();
      onStorefrontRefresh();
      showNotice(`Stock updated to ${nextStock} units.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update stock.');
    }
  };

  const handleToggleProductActive = async (product: Product) => {
    setActionError('');
    try {
      await api.updateProduct(product.id, { isActive: !product.isActive });
      await loadDashboardData();
      onStorefrontRefresh();
      showNotice(product.isActive ? `${product.name} hidden.` : `${product.name} published.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update product status.');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    setActionError('');
    try {
      const res = await api.deleteProduct(product.id);
      await loadDashboardData();
      onStorefrontRefresh();
      showNotice(
        res.archived
          ? `${product.name} archived (linked to past orders).`
          : `${product.name} removed.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete product.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    setActionError('');
    try {
      await api.createCategory({ name: newCatName, description: newCatDesc, isOpen: true });
      const createdName = newCatName;
      setNewCatName('');
      setNewCatDesc('');
      await loadDashboardData();
      onStorefrontRefresh();
      showNotice(`Category "${createdName}" created.`);
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Unable to create category.');
    }
  };

  const handleToggleCategoryOpen = async (cat: Category) => {
    setCatError('');
    try {
      await api.updateCategory(cat.id, { isOpen: !cat.isOpen });
      await loadDashboardData();
      onStorefrontRefresh();
      showNotice(cat.isOpen ? `${cat.name} closed on storefront.` : `${cat.name} opened on storefront.`);
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Unable to update category.');
    }
  };

  const handleDeleteCategory = async (catId: number) => {
    setCatError('');
    try {
      await api.deleteCategory(catId);
      await loadDashboardData();
      onStorefrontRefresh();
      showNotice('Category deleted.');
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Cannot delete category.');
    }
  };

  const handleOrderStatusChange = async (orderId: number, status: OrderStatus) => {
    setActionError('');
    try {
      await api.updateOrderStatus(orderId, status);
      await loadDashboardData();
      showNotice(`Order status updated to ${status}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update order status.');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file, 320);
      setLogoUrl(dataUrl);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to process logo image.');
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file, 1440);
      setHeroImageUrl(dataUrl);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to process hero image.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setSettingsSaving(true);
    try {
      await api.updateSettings({
        storeName,
        tagline,
        logoUrl,
        heroTitle,
        heroSubtitle,
        heroImageUrl,
        lowStockThreshold: Number(lowStockThreshold) || 8,
        freeShippingThreshold: Number(freeShippingThreshold) || 150,
      });
      setSettingsSaved(true);
      onStorefrontRefresh();
      await loadDashboardData();
      showNotice('Store branding and thresholds saved.');
      window.setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPw !== confirmPw) {
      setPwMessage({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    try {
      const res = await api.changeManagerPassword(currentPw, newPw);
      setPwMessage({ type: 'ok', text: res.message });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to update password.',
      });
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = invSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.categoryName || '').toLowerCase().includes(q)
    );
  });

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) return false;
    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q)
    );
  });

  const maxChartRevenue = Math.max(1, ...(analytics?.series.map((s) => s.revenue) || [1]));

  const sidebarItems: Array<{ id: ManagerTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'inventory', label: 'Products & Stock', icon: <Package className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'settings', label: 'Store & Security', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 flex flex-col lg:flex-row gap-8">
      {/* Sidebar */}
      <aside className="lg:w-60 shrink-0 space-y-6">
        <div className="pb-4 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6E6E73]">
              Manager Console
            </p>
            <p className="font-display text-lg font-semibold text-[#1D1D1F] mt-0.5">
              {settings.storeName}
            </p>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            aria-label="Refresh manager data"
            className="p-2 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                tab === item.id
                  ? 'bg-[#1D1D1F] text-white'
                  : 'text-[#6E6E73] hover:bg-black/[0.04] hover:text-[#1D1D1F]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-4 border-t border-black/[0.06]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#6E6E73] hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {actionError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-4">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError('')}
              className="text-xs font-medium underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {actionNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* ==================== OVERVIEW / ANALYTICS ==================== */}
        {tab === 'overview' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-semibold text-[#1D1D1F]">
                  Business Performance
                </h1>
                <p className="text-sm text-[#6E6E73]">
                  Orders, revenue, net income, best-sellers, and stock alerts.
                </p>
              </div>

              {/* Daily / Monthly / Yearly Period Switcher */}
              <div className="inline-flex p-1 rounded-xl bg-[#F5F5F7] self-start">
                {(['daily', 'monthly', 'yearly'] as AnalyticsPeriod[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      period === p ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white border border-black/[0.07] p-5">
                <p className="text-xs font-medium text-[#6E6E73] mb-1 capitalize">
                  {period} Orders
                </p>
                <p className="font-mono text-2xl font-semibold text-[#1D1D1F] tabular-nums">
                  {loading || !analytics ? '—' : analytics.kpis.ordersCount}
                </p>
                <p className="text-xs text-[#86868B] mt-1 font-mono tabular-nums">
                  {analytics ? `${analytics.kpis.unitsSold} units sold` : ''}
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-black/[0.07] p-5">
                <p className="text-xs font-medium text-[#6E6E73] mb-1 capitalize">
                  {period} Revenue
                </p>
                <p className="font-mono text-2xl font-semibold text-[#1D1D1F] tabular-nums">
                  {loading || !analytics
                    ? '—'
                    : formatCurrency(analytics.kpis.revenue, settings.currency)}
                </p>
                <p className="text-xs text-[#86868B] mt-1 font-mono tabular-nums">
                  {analytics
                    ? `Avg order ${formatCurrency(analytics.kpis.avgOrderValue, settings.currency)}`
                    : ''}
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-black/[0.07] p-5">
                <p className="text-xs font-medium text-[#6E6E73] mb-1 capitalize">
                  {period} Net Income
                </p>
                <p className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
                  {loading || !analytics
                    ? '—'
                    : formatCurrency(analytics.kpis.income, settings.currency)}
                </p>
                <p className="text-xs text-[#86868B] mt-1 font-mono tabular-nums">
                  {analytics && analytics.kpis.revenue > 0
                    ? `${Math.round((analytics.kpis.income / analytics.kpis.revenue) * 100)}% gross margin`
                    : 'Net profit after cost'}
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-black/[0.07] p-5">
                <p className="text-xs font-medium text-[#6E6E73] mb-1">Low Stock Alerts</p>
                <p
                  className={`font-mono text-2xl font-semibold tabular-nums ${
                    analytics && analytics.kpis.lowStockCount > 0
                      ? 'text-amber-600'
                      : 'text-[#1D1D1F]'
                  }`}
                >
                  {loading || !analytics ? '—' : analytics.kpis.lowStockCount}
                </p>
                <p className="text-xs text-[#86868B] mt-1">
                  Items at or below {settings.lowStockThreshold} units
                </p>
              </div>
            </div>

            {/* Revenue & Income Bar Chart + Category Breakdown */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-8 rounded-2xl bg-white border border-black/[0.07] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-base font-semibold text-[#1D1D1F]">
                      Revenue &amp; Net Income Trend
                    </h2>
                    <p className="text-xs text-[#6E6E73] capitalize">{period} breakdown</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#6E6E73]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#0071E3]" /> Revenue
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" /> Income
                    </span>
                  </div>
                </div>

                {!analytics || analytics.series.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-sm text-[#86868B]">
                    No completed orders recorded in this timeframe yet.
                  </div>
                ) : (
                  <div className="h-56 flex items-end gap-3 pt-6 overflow-x-auto">
                    {analytics.series.map((pt) => {
                      const revH = Math.max(6, Math.round((pt.revenue / maxChartRevenue) * 160));
                      const incH = Math.max(4, Math.round((pt.income / maxChartRevenue) * 160));
                      return (
                        <div
                          key={pt.label}
                          className="flex-1 min-w-[48px] flex flex-col items-center gap-2 group"
                        >
                          <div className="w-full flex items-end justify-center gap-1 h-44">
                            <div
                              style={{ height: `${revH}px` }}
                              title={`Revenue: ${formatCurrency(pt.revenue, settings.currency)}`}
                              className="w-4 sm:w-5 rounded-t-md bg-[#0071E3] transition-opacity group-hover:opacity-90"
                            />
                            <div
                              style={{ height: `${incH}px` }}
                              title={`Income: ${formatCurrency(pt.income, settings.currency)}`}
                              className="w-4 sm:w-5 rounded-t-md bg-emerald-600 transition-opacity group-hover:opacity-90"
                            />
                          </div>
                          <span className="font-mono text-[11px] text-[#6E6E73] whitespace-nowrap">
                            {pt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="xl:col-span-4 rounded-2xl bg-white border border-black/[0.07] p-6">
                <h2 className="font-display text-base font-semibold text-[#1D1D1F] mb-1">
                  Revenue by Category
                </h2>
                <p className="text-xs text-[#6E6E73] mb-5">All-time department distribution</p>
                <div className="space-y-4">
                  {(analytics?.categoryBreakdown || []).map((cat) => {
                    const maxCatRev = Math.max(
                      1,
                      ...(analytics?.categoryBreakdown.map((c) => c.revenue) || [1])
                    );
                    const pct = Math.round((cat.revenue / maxCatRev) * 100);
                    return (
                      <div key={cat.categoryName} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#1D1D1F]">{cat.categoryName}</span>
                          <span className="font-mono tabular-nums text-[#6E6E73]">
                            {formatCurrency(cat.revenue, settings.currency)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#F5F5F7] overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full rounded-full bg-[#1D1D1F]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Business Intelligence: Low Stock, Best Products, Best Orders, Most Favorable */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Alerts */}
              <div className="rounded-2xl bg-white border border-black/[0.07] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h2 className="font-display text-base font-semibold text-[#1D1D1F]">
                      Low Stock / Less Stock
                    </h2>
                  </div>
                  <span className="text-xs text-[#6E6E73]">
                    ≤ {settings.lowStockThreshold} units
                  </span>
                </div>

                {!analytics || analytics.lowStockProducts.length === 0 ? (
                  <p className="text-sm text-[#6E6E73] py-6 text-center">
                    All products have healthy inventory levels.
                  </p>
                ) : (
                  <ul className="divide-y divide-black/[0.05]">
                    {analytics.lowStockProducts.map((p) => (
                      <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F5F5F7] shrink-0">
                            <StoreImage
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#1D1D1F] truncate">{p.name}</p>
                            <p className="text-xs text-[#6E6E73]">
                              {p.categoryName} ·{' '}
                              <span className="font-mono text-amber-700 font-medium">
                                {p.stock} left
                              </span>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickRestock(p.id, p.stock, 10)}
                          className="px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#1D1D1F] hover:text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                        >
                          +10 Restock
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Best-Selling Products / Equipment */}
              <div className="rounded-2xl bg-white border border-black/[0.07] p-6">
                <h2 className="font-display text-base font-semibold text-[#1D1D1F] mb-4">
                  Best-Selling Equipment &amp; Products
                </h2>
                <ul className="divide-y divide-black/[0.05]">
                  {(analytics?.bestProducts || []).map((p) => (
                    <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F5F5F7] shrink-0">
                          <StoreImage
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1D1D1F] truncate">{p.name}</p>
                          <p className="text-xs text-[#6E6E73]">
                            {p.categoryName} · {p.unitsSold} sold
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#1D1D1F]">
                        {formatCurrency(p.revenue, settings.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Best Orders */}
              <div className="rounded-2xl bg-white border border-black/[0.07] p-6">
                <h2 className="font-display text-base font-semibold text-[#1D1D1F] mb-4">
                  Best Orders (Highest Value)
                </h2>
                <ul className="divide-y divide-black/[0.05]">
                  {(analytics?.bestOrders || []).map((o) => (
                    <li key={o.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#1D1D1F]">
                          {o.customerName}{' '}
                          <span className="font-mono text-xs text-[#6E6E73]">· {o.orderNumber}</span>
                        </p>
                        <p className="text-xs text-[#6E6E73]">
                          {o.itemCount} items · {o.status}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#1D1D1F]">
                        {formatCurrency(o.totalAmount, settings.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Most Favorable Items */}
              <div className="rounded-2xl bg-white border border-black/[0.07] p-6">
                <h2 className="font-display text-base font-semibold text-[#1D1D1F] mb-4">
                  Most Favorable Products
                </h2>
                <ul className="divide-y divide-black/[0.05]">
                  {(analytics?.favorableProducts || []).map((p) => (
                    <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F5F5F7] shrink-0">
                          <StoreImage
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1D1D1F] truncate">{p.name}</p>
                          <p className="text-xs text-[#6E6E73]">
                            {p.favorites} favorites · {p.views} views
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-medium tabular-nums text-[#1D1D1F]">
                        {formatCurrency(p.price, settings.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PRODUCTS & INVENTORY ==================== */}
        {tab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-semibold text-[#1D1D1F]">
                  Products &amp; Inventory
                </h1>
                <p className="text-sm text-[#6E6E73]">
                  Add equipment or products, manage stock quantities, and control storefront visibility.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071E3] text-white text-xs font-medium hover:bg-[#0077ED] transition-colors self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                placeholder="Filter inventory by name, SKU, or category..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-black/10 text-sm focus:border-[#0071E3] focus:outline-none"
              />
            </div>

            <div className="rounded-2xl bg-white border border-black/[0.07] overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] text-xs font-medium text-[#6E6E73]">
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Price</th>
                    <th className="py-3.5 px-4 text-right">Cost</th>
                    <th className="py-3.5 px-4 text-center">Stock</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-[#86868B]">
                        No products match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FBFBFD]">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-9 rounded-lg overflow-hidden bg-[#F5F5F7] shrink-0">
                              <StoreImage
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-[#1D1D1F]">{p.name}</p>
                              <p className="font-mono text-xs text-[#86868B]">{p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#6E6E73]">{p.categoryName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium">
                          {formatCurrency(p.price, settings.currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#6E6E73]">
                          {formatCurrency(p.costPrice, settings.currency)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(p.id, p.stock, -1)}
                              className="w-6 h-6 rounded-md bg-[#F5F5F7] hover:bg-[#E8E8ED] text-xs font-medium"
                            >
                              -
                            </button>
                            <span
                              className={`w-8 text-center font-mono tabular-nums font-medium ${
                                p.stock <= settings.lowStockThreshold ? 'text-amber-700' : ''
                              }`}
                            >
                              {p.stock}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(p.id, p.stock, 1)}
                              className="w-6 h-6 rounded-md bg-[#F5F5F7] hover:bg-[#E8E8ED] text-xs font-medium"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleProductActive(p)}
                            className={`text-xs font-medium ${
                              p.isActive ? 'text-emerald-700' : 'text-[#86868B]'
                            }`}
                          >
                            {p.isActive ? 'Published' : 'Hidden'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(p)}
                              aria-label={`Edit ${p.name}`}
                              className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p)}
                              aria-label={`Delete ${p.name}`}
                              className="p-1.5 rounded-lg text-[#6E6E73] hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== CATEGORIES ==================== */}
        {tab === 'categories' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-[#1D1D1F]">
                Categories &amp; Store Departments
              </h1>
              <p className="text-sm text-[#6E6E73]">
                Create new departments (e.g. Footwear, Foods, Tools) or close a category to pause selling it.
              </p>
            </div>

            {catError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {catError}
              </div>
            )}

            <form
              onSubmit={handleCreateCategory}
              className="rounded-2xl bg-white border border-black/[0.07] p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
            >
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                  New Category Name
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Clothing, Groceries, Cameras"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short department description"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-xs font-medium hover:bg-[#0077ED] whitespace-nowrap shrink-0"
              >
                Create Category
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-2xl bg-white border border-black/[0.07] p-5 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#6E6E73] mb-1">
                      <span
                        className={
                          cat.isOpen ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'
                        }
                      >
                        {cat.isOpen ? 'Open on Storefront' : 'Closed'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{cat.productCount || 0} products</span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-[#1D1D1F]">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-[#6E6E73] mt-1">
                      {cat.description || 'No description'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleCategoryOpen(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        cat.isOpen
                          ? 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-red-50 hover:text-red-700'
                          : 'bg-[#1D1D1F] text-white hover:bg-[#0071E3]'
                      }`}
                    >
                      {cat.isOpen ? 'Close' : 'Open'}
                    </button>
                    {(cat.productCount || 0) === 0 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        aria-label={`Delete ${cat.name}`}
                        className="p-1.5 text-[#86868B] hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== ORDERS ==================== */}
        {tab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-[#1D1D1F]">
                Customer &amp; Guest Orders
              </h1>
              <p className="text-sm text-[#6E6E73]">
                Review order line items, shipping addresses, and update fulfillment status in real time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search order # or customer..."
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-white border border-black/10 text-sm focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                {['ALL', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      orderStatusFilter === st
                        ? 'bg-[#1D1D1F] text-white'
                        : 'bg-white border border-black/10 text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {st === 'ALL' ? 'All Orders' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-black/[0.07] overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] text-xs font-medium text-[#6E6E73]">
                    <th className="py-3.5 px-4">Order</th>
                    <th className="py-3.5 px-4">Customer &amp; Shipping</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Payment Proof</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-4 text-right">Profit</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-[#86868B]">
                        No orders match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#FBFBFD]">
                        <td className="py-3.5 px-4">
                          <p className="font-mono font-medium text-[#1D1D1F]">{order.orderNumber}</p>
                          <p className="text-xs text-[#86868B]">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#1D1D1F]">{order.customerName}</p>
                          <p className="text-xs text-[#6E6E73]">
                            {order.shippingAddress}, {order.shippingCity} · {order.customerPhone}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#6E6E73] max-w-xs">
                          {order.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                        </td>
                        <td className="py-3.5 px-4">
                          {order.paymentScreenshot ? (
                            <button
                              type="button"
                              onClick={() => setReceiptModalOrder(order)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#1D1D1F] hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Screenshot</span>
                            </button>
                          ) : (
                            <span className="text-xs text-[#86868B]">Legacy order</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium">
                          {formatCurrency(order.totalAmount, settings.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                          {formatCurrency(order.totalProfit, settings.currency)}
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleOrderStatusChange(order.id, e.target.value as OrderStatus)
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#F5F5F7] text-xs font-medium text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== STORE SETTINGS & MANAGER PASSWORD ==================== */}
        {tab === 'settings' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <form
              onSubmit={handleSaveSettings}
              className="xl:col-span-7 rounded-2xl bg-white border border-black/[0.07] p-6 space-y-5"
            >
              <div>
                <h2 className="font-display text-lg font-semibold text-[#1D1D1F]">
                  Store Branding &amp; Rules
                </h2>
                <p className="text-xs text-[#6E6E73]">
                  Customize your store name, logo image, hero banner, and inventory thresholds.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                    Store Name
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-2">
                  Store Logo Image
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Store logo preview"
                      className="w-10 h-10 rounded-lg object-cover border border-black/10"
                    />
                  )}
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-xs font-medium cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Or paste logo image URL..."
                    className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-xs font-mono focus:bg-white focus:outline-none"
                  />
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-xs text-[#6E6E73] hover:text-red-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-2">
                  Hero Banner Image
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-xs font-medium cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Hero</span>
                    <input type="file" accept="image/*" onChange={handleHeroUpload} className="hidden" />
                  </label>
                  <input
                    type="text"
                    value={heroImageUrl}
                    onChange={(e) => setHeroImageUrl(e.target.value)}
                    placeholder="Or paste hero image URL..."
                    className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-xs font-mono focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                  Hero Subtitle
                </label>
                <textarea
                  rows={2}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] font-mono text-sm focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                    Free Shipping Threshold ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] font-mono text-sm focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-xs font-medium hover:bg-[#0077ED] disabled:opacity-60 transition-colors inline-flex items-center gap-1.5"
                >
                  {settingsSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved</span>
                    </>
                  ) : settingsSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <span>Save Store Settings</span>
                  )}
                </button>
              </div>
            </form>

            {/* Change Manager Password */}
            <form
              onSubmit={handleChangePassword}
              className="xl:col-span-5 rounded-2xl bg-white border border-black/[0.07] p-6 space-y-4 self-start"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#1D1D1F]">
                    Manager Security
                  </h2>
                  <p className="text-xs text-[#6E6E73]">
                    Update the single manager password for <span className="font-mono">{user.username}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSecurityPasswords((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] shrink-0"
                >
                  {showSecurityPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showSecurityPasswords ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              {pwMessage && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    pwMessage.type === 'ok'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {pwMessage.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                  Current Password
                </label>
                <input
                  type={showSecurityPasswords ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                  New Password
                </label>
                <input
                  type={showSecurityPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showSecurityPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#1D1D1F] text-white text-xs font-medium hover:bg-[#333336] transition-colors"
              >
                Update Manager Password
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {editingProduct !== undefined && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(undefined)}
          onSaved={() => {
            loadDashboardData();
            onStorefrontRefresh();
            showNotice(editingProduct ? 'Product updated.' : 'New product published.');
          }}
        />
      )}

      {/* Payment Screenshot Modal */}
      {receiptModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setReceiptModalOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl border border-black/[0.08] shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-[#6E6E73]">{receiptModalOrder.orderNumber}</p>
                <h3 className="font-display text-base font-semibold text-[#1D1D1F]">
                  Payment Screenshot · {receiptModalOrder.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOrder(null)}
                aria-label="Close payment screenshot"
                className="p-2 rounded-full hover:bg-[#F5F5F7] text-[#6E6E73]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-[#F5F5F7] p-3 flex items-center justify-center">
                <img
                  src={receiptModalOrder.paymentScreenshot}
                  alt={`Payment proof for ${receiptModalOrder.orderNumber}`}
                  className="max-h-[60vh] w-auto object-contain rounded-xl"
                />
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-black/[0.06]">
                <span className="text-[#6E6E73]">{receiptModalOrder.paymentMethod}</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCurrency(receiptModalOrder.totalAmount, settings.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
