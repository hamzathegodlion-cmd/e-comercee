import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Eye, EyeOff, LogOut, Package, Plus, User as UserIcon } from 'lucide-react';
import type { BrowsingHistoryItem, Order, Product, StoreSettings, User } from '../types';
import { api, formatCurrency } from '../lib/api';
import { StoreImage } from './StoreImage';

interface CustomerAccountViewProps {
  user: User | null;
  settings: StoreSettings;
  onAuthChange: (user: User | null) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onTrackOrder: (orderNumber: string) => void;
}

export function CustomerAccountView({
  user,
  settings,
  onAuthChange,
  onSelectProduct,
  onAddToCart,
  onTrackOrder,
}: CustomerAccountViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<BrowsingHistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (user && user.role === 'customer') {
      setLoadingData(true);
      Promise.all([api.getCustomerOrders(), api.getHistory()])
        .then(([ordRes, histRes]) => {
          setOrders(ordRes.orders);
          setHistory(histRes.history);
        })
        .catch(() => {})
        .finally(() => setLoadingData(false));
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSubmitting(true);
    try {
      const loggedIn = await api.login(identifier.trim(), password.trim(), 'customer');
      onAuthChange(loggedIn);
      setPassword('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSubmitting(true);
    try {
      const created = await api.register(name, username, email, password);
      onAuthChange(created);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    onAuthChange(null);
  };

  // If manager is currently signed in, prompt cleanly
  if (user && user.role === 'manager') {
    return (
      <section className="max-w-[520px] mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-[#1D1D1F] mb-2">
          Signed in as Store Manager
        </h1>
        <p className="text-sm text-[#6E6E73] mb-6">
          Customer dashboards are separate from the Manager Console. Sign out to switch to a customer account.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="px-6 py-2.5 rounded-full bg-[#1D1D1F] text-white text-sm font-medium hover:bg-[#333336]"
        >
          Sign Out
        </button>
      </section>
    );
  }

  // Logged-in Customer Dashboard ("Hi, Hamza")
  if (user && user.role === 'customer') {
    return (
      <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-12 space-y-12">
        {/* Personalized Greeting Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-black/[0.06]"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6E6E73] mb-1">
              Customer Account · {user.email}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F]">
              Hi, {user.name}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F5F5F7] text-xs font-medium text-[#1D1D1F] hover:bg-[#E8E8ED] transition-colors self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </motion.div>

        {/* Order History */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-4 h-4 text-[#6E6E73]" />
            <h2 className="font-display text-xl font-semibold text-[#1D1D1F]">
              Your Order History
            </h2>
          </div>

          {loadingData ? (
            <div className="h-32 rounded-2xl bg-[#F5F5F7] animate-pulse" />
          ) : orders.length === 0 ? (
            <div className="rounded-2xl bg-white border border-black/[0.06] p-8 text-center">
              <p className="text-sm text-[#6E6E73]">
                You haven&apos;t placed any orders yet. Items you purchase will appear here with live tracking.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white border border-black/[0.07] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[#6E6E73]">
                      <span className="font-mono font-medium text-[#1D1D1F]">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#0071E3]">{order.status}</span>
                    </div>
                    <p className="text-sm text-[#1D1D1F]">
                      {order.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-mono text-base font-semibold tabular-nums">
                      {formatCurrency(order.totalAmount, settings.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onTrackOrder(order.orderNumber)}
                      className="px-4 py-2 rounded-full bg-[#F5F5F7] text-xs font-medium text-[#1D1D1F] hover:bg-[#E8E8ED] transition-colors"
                    >
                      Track
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Browsing History */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-[#6E6E73]" />
            <h2 className="font-display text-xl font-semibold text-[#1D1D1F]">
              Recently Viewed History
            </h2>
          </div>

          {loadingData ? (
            <div className="h-40 rounded-2xl bg-[#F5F5F7] animate-pulse" />
          ) : history.length === 0 ? (
            <div className="rounded-2xl bg-white border border-black/[0.06] p-8 text-center">
              <p className="text-sm text-[#6E6E73]">
                Browse products in the store and your recent viewing history will automatically save here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectProduct(item.product)}
                  className="group cursor-pointer rounded-2xl bg-white border border-black/[0.07] overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] bg-[#F5F5F7] overflow-hidden">
                    <StoreImage
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#6E6E73] mb-0.5">
                        {item.product.categoryName}
                      </p>
                      <p className="font-display text-sm font-semibold text-[#1D1D1F] truncate">
                        {item.product.name}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium tabular-nums">
                        {formatCurrency(item.product.price, settings.currency)}
                      </span>
                      <button
                        type="button"
                        disabled={item.product.stock <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(item.product);
                        }}
                        className="p-1.5 rounded-full bg-[#1D1D1F] text-white hover:bg-[#0071E3] disabled:opacity-40 transition-colors"
                        aria-label={`Add ${item.product.name} to bag`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Sign In / Register Card
  return (
    <section className="max-w-[440px] mx-auto px-4 py-14">
      <div className="bg-white rounded-3xl border border-black/[0.08] p-7 sm:p-8 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-5">
          <UserIcon className="w-5 h-5 text-[#1D1D1F]" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-[#1D1D1F] mb-1">
          {mode === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
        </h1>
        <p className="text-sm text-[#6E6E73] mb-6">
          {mode === 'login'
            ? 'Save your browsing history and track every order in one place.'
            : 'Register in seconds, or shop freely anytime as a guest.'}
        </p>

        {/* Segmented toggle */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#F5F5F7] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setAuthError('');
            }}
            className={`py-2 text-xs font-medium rounded-lg transition-all ${
              mode === 'login' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setAuthError('');
            }}
            className={`py-2 text-xs font-medium rounded-lg transition-all ${
              mode === 'register' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
            }`}
          >
            Create Account
          </button>
        </div>

        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {authError}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                Username or Email
              </label>
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or email"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
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
              disabled={submitting}
              className="w-full py-3 rounded-full bg-[#0071E3] text-white text-sm font-medium hover:bg-[#0077ED] disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Hamza"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="hamza"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hamza@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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
              disabled={submitting}
              className="w-full py-3 rounded-full bg-[#0071E3] text-white text-sm font-medium hover:bg-[#0077ED] disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
