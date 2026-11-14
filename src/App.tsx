import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { CartItem, Category, Order, Product, StoreSettings, User } from './types';
import { api } from './lib/api';
import { Header, type ActiveRoute } from './components/Header';
import { StorefrontView } from './components/StorefrontView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { TrackOrderView } from './components/TrackOrderView';
import { CustomerAccountView } from './components/CustomerAccountView';
import { ManagerDashboard } from './components/ManagerDashboard';

const DEFAULT_SETTINGS: StoreSettings = {
  id: 1,
  storeName: 'Aeterna',
  tagline: 'Curated technology, tailored apparel, artisan homeware, and fresh market goods.',
  logoUrl: '',
  heroTitle: 'Designed for every part of daily life.',
  heroSubtitle:
    'From anodized workstations and tailored merino layers to precision espresso hardware and fresh orchard crates.',
  heroImageUrl: '/src/assets/images/hero_flagship_showcase_1794591590470.jpg',
  currency: 'USD',
  lowStockThreshold: 8,
  freeShippingThreshold: 150,
  updatedAt: '',
};

const CART_STORAGE_KEY = 'aeterna_bag_items';

function getInitialRoute(): ActiveRoute {
  const p = window.location.pathname.toLowerCase();
  if (p === '/admin' || p === '/manager') return 'manager';
  if (p === '/track') return 'track';
  if (p === '/account') return 'account';
  return 'store';
}

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>(getInitialRoute);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingStore, setLoadingStore] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [trackOrderNumber, setTrackOrderNumber] = useState('');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  const loadStorefront = useCallback(async () => {
    try {
      const data = await api.getStorefront();
      setSettings(data.settings);
      setCategories(data.categories);
      setProducts(data.products);
      document.title = `${data.settings.storeName} — Modern Multi-Category Store`;
    } catch {
      // fallback to default settings
    } finally {
      setLoadingStore(false);
    }
  }, []);

  useEffect(() => {
    loadStorefront();
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {});
  }, [loadStorefront]);

  useEffect(() => {
    const onPop = () => setRoute(getInitialRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (nextRoute: ActiveRoute, sectionId?: string) => {
    setRoute(nextRoute);
    const pathMap: Record<ActiveRoute, string> = {
      store: '/',
      track: '/track',
      account: '/account',
      manager: '/admin',
    };
    const nextPath = pathMap[nextRoute];
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    if (sectionId) {
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (product: Product, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + qty);
        return prev.map((i) =>
          i.product.id === product.id ? { product, quantity: nextQty } : i
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, qty) }];
    });
  };

  const handleUpdateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.min(i.product.stock, qty) }
          : i
      )
    );
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleOrderSuccess = (_order: Order) => {
    setCart([]);
    loadStorefront();
  };

  const handleGoToTrackOrder = (orderNumber = '') => {
    setTrackOrderNumber(orderNumber);
    navigate('track');
  };

  const totalBagCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F]">
      <Header
        settings={settings}
        user={user}
        activeRoute={route}
        cartCount={totalBagCount}
        onNavigate={navigate}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {route === 'store' && (
          <StorefrontView
            settings={settings}
            categories={categories}
            products={products}
            loading={loadingStore}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onAddToCart={(p, q) => handleAddToCart(p, q)}
            onTrackOrder={() => handleGoToTrackOrder('')}
          />
        )}

        {route === 'track' && (
          <TrackOrderView settings={settings} initialOrderNumber={trackOrderNumber} />
        )}

        {route === 'account' && (
          <CustomerAccountView
            user={user}
            settings={settings}
            onAuthChange={setUser}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onAddToCart={(p) => handleAddToCart(p, 1)}
            onTrackOrder={(num) => handleGoToTrackOrder(num)}
          />
        )}

        {route === 'manager' && (
          <ManagerDashboard
            user={user}
            settings={settings}
            onAuthChange={setUser}
            onStorefrontRefresh={loadStorefront}
          />
        )}
      </main>

      <footer className="border-t border-black/[0.06] bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-display text-sm font-semibold text-[#1D1D1F]">
              {settings.storeName}
            </p>
            <p className="text-xs text-[#6E6E73] mt-1 max-w-md">{settings.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#6E6E73]">
            <button
              type="button"
              onClick={() => navigate('store')}
              className="hover:text-[#1D1D1F] transition-colors"
            >
              Store
            </button>
            <button
              type="button"
              onClick={() => navigate('track')}
              className="hover:text-[#1D1D1F] transition-colors"
            >
              Track Order
            </button>
            <button
              type="button"
              onClick={() => navigate('account')}
              className="hover:text-[#1D1D1F] transition-colors"
            >
              Customer Account
            </button>
            <button
              type="button"
              onClick={() => navigate('manager')}
              className="hover:text-[#1D1D1F] transition-colors"
            >
              Manager Portal
            </button>
            <span className="text-[#86868B]">
              © {new Date().getFullYear()} {settings.storeName}
            </span>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            settings={settings}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={(p, q) => handleAddToCart(p, q)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen && (
          <CartDrawer
            open={cartOpen}
            items={cart}
            settings={settings}
            user={user}
            onClose={() => setCartOpen(false)}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveFromCart}
            onOrderSuccess={handleOrderSuccess}
            onTrackOrder={(num) => handleGoToTrackOrder(num)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
