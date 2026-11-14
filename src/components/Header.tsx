import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { StoreSettings, User } from '../types';

export type ActiveRoute = 'store' | 'track' | 'account' | 'manager';

interface HeaderProps {
  settings: StoreSettings;
  user: User | null;
  activeRoute: ActiveRoute;
  cartCount: number;
  onNavigate: (route: ActiveRoute, sectionId?: string) => void;
  onOpenCart: () => void;
}

export function Header({
  settings,
  user,
  activeRoute,
  cartCount,
  onNavigate,
  onOpenCart,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const accountLabel =
    user && user.role === 'customer' ? `Hi, ${user.name.split(' ')[0]}` : 'Account';

  const navItems: Array<{ label: string; route: ActiveRoute; sectionId?: string }> = [
    { label: 'Store', route: 'store' },
    { label: 'Catalog', route: 'store', sectionId: 'catalog-section' },
    { label: 'Track Order', route: 'track' },
    { label: accountLabel, route: 'account' },
    { label: user?.role === 'manager' ? 'Console' : 'Manager', route: 'manager' },
  ];

  const handleNav = (route: ActiveRoute, sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigate(route, sectionId);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FBFBFD]/85 backdrop-blur-xl border-b border-black/[0.06]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Store Logo + Brand Name */}
        <button
          type="button"
          onClick={() => handleNav('store')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0071E3] rounded-md"
        >
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={`${settings.storeName} logo`}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-md object-cover border border-black/10 shrink-0"
            />
          ) : null}
          <span className="font-display text-lg font-semibold tracking-tight text-[#1D1D1F] whitespace-nowrap shrink-0">
            {settings.storeName}
          </span>
        </button>

        {/* Zone 2: Clean single-line typography nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6E6E73]">
          {navItems.map((item) => {
            const isActive = activeRoute === item.route && !item.sectionId;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNav(item.route, item.sectionId)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#0071E3] rounded ${
                  isActive ? 'text-[#1D1D1F]' : 'hover:text-[#1D1D1F]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-0.5 h-[1.5px] bg-[#1D1D1F]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action (Bag) + Mobile toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-xs font-medium hover:bg-[#333336] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071E3]"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Bag</span>
            <span className="font-mono tabular-nums text-white/90">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden p-2 rounded-lg text-[#1D1D1F] hover:bg-black/5 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-black/[0.06] bg-[#FBFBFD] px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNav(item.route, item.sectionId)}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#1D1D1F] hover:bg-black/[0.04] rounded-lg"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
