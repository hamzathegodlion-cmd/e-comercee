import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Plus, Search, SlidersHorizontal } from 'lucide-react';
import type { Category, Product, StoreSettings } from '../types';
import { formatCurrency } from '../lib/api';
import { StoreImage } from './StoreImage';

interface StorefrontViewProps {
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  loading: boolean;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, qty?: number) => void;
  onTrackOrder: () => void;
}

export function StorefrontView({
  settings,
  categories,
  products,
  loading,
  onSelectProduct,
  onAddToCart,
  onTrackOrder,
}: StorefrontViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price_asc' | 'price_desc' | 'popular'>('featured');
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      const catMatch = selectedCategory === 'all' || p.categorySlug === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    });

    const sorted = [...list];
    if (sortBy === 'price_asc') sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'popular') sorted.sort((a, b) => b.favorites - a.favorites || b.views - a.views);
    else if (sortBy === 'newest') sorted.sort((a, b) => b.id - a.id);
    else sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || b.id - a.id);
    return sorted;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (product.stock <= 0) return;
    onAddToCart(product, 1);
    setRecentlyAddedId(product.id);
    window.setTimeout(() => {
      setRecentlyAddedId((prev) => (prev === product.id ? null : prev));
    }, 1200);
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      {/* Section 1: Hero Showcase */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-center py-4"
          >
            <p className="text-xs font-medium tracking-wide uppercase text-[#6E6E73] mb-4">
              {settings.storeName} Collection
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] leading-[1.08] text-balance mb-5">
              {settings.heroTitle}
            </h1>
            <p className="text-base sm:text-lg text-[#6E6E73] leading-relaxed max-w-lg mb-8">
              {settings.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={scrollToCatalog}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0071E3] text-white text-sm font-medium hover:bg-[#0077ED] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0"
              >
                <span>Shop Collection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onTrackOrder}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-sm font-medium text-[#1D1D1F] hover:bg-black/[0.04] transition-colors whitespace-nowrap shrink-0"
              >
                <span>Track an Order</span>
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            <div className="w-full h-full min-h-[280px] sm:min-h-[380px] lg:min-h-[440px] rounded-2xl overflow-hidden bg-[#F5F5F7] border border-black/[0.06]">
              <StoreImage
                src={settings.heroImageUrl}
                alt={`${settings.storeName} flagship showcase`}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>

        {/* Clean editorial strip below Hero */}
        <div className="mt-10 pt-6 border-t border-black/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-[#6E6E73]">
          <div>
            <span className="font-medium text-[#1D1D1F]">Complimentary Shipping</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Orders over {formatCurrency(settings.freeShippingThreshold, settings.currency)}</span>
          </div>
          <div>
            <span className="font-medium text-[#1D1D1F]">Multi-Category Catalog</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{categories.length} open departments</span>
          </div>
          <div>
            <span className="font-medium text-[#1D1D1F]">Flexible Checkout</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Buy as guest or save order history</span>
          </div>
        </div>
      </section>

      {/* Section 2: Interactive Filter Bar & 3-Column Product Catalog */}
      <section
        id="catalog-section"
        className="max-w-[1280px] mx-auto px-4 sm:px-8 pb-20"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-8 border-b border-black/[0.06]">
          {/* Interactive Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 ${
                selectedCategory === 'all'
                  ? 'bg-[#1D1D1F] text-white'
                  : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 ${
                  selectedCategory === cat.slug
                    ? 'bg-[#1D1D1F] text-white'
                    : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 rounded-full bg-[#F5F5F7] text-sm text-[#1D1D1F] placeholder-[#86868B] border border-transparent focus:border-[#0071E3] focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div className="relative flex items-center">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#86868B] absolute left-3.5 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Sort products"
                className="pl-9 pr-8 py-2 rounded-full bg-[#F5F5F7] text-xs font-medium text-[#1D1D1F] border border-transparent focus:border-[#0071E3] focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] rounded-2xl bg-[#F5F5F7] mb-4" />
                <div className="h-3 w-24 bg-[#F5F5F7] rounded mb-2" />
                <div className="h-5 w-48 bg-[#F5F5F7] rounded mb-2" />
                <div className="h-4 w-20 bg-[#F5F5F7] rounded" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display text-xl font-semibold text-[#1D1D1F] mb-2">
              No matching products found
            </p>
            <p className="text-sm text-[#6E6E73] mb-6">
              Try clearing your search filter or switching departments.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-xs font-medium hover:bg-[#333336] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 pt-10">
            {filteredProducts.map((product, index) => {
              const outOfStock = product.stock <= 0;
              const isLowStock = product.stock > 0 && product.stock <= settings.lowStockThreshold;
              const wasJustAdded = recentlyAddedId === product.id;

              return (
                <motion.article
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.25), ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => onSelectProduct(product)}
                  className="group cursor-pointer flex flex-col"
                >
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#F5F5F7] border border-black/[0.05] mb-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                    <StoreImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>

                  {/* Unboxed clean metadata */}
                  <div className="flex items-center gap-2 text-xs text-[#6E6E73] mb-1">
                    <span className="uppercase tracking-wider font-medium">{product.categoryName}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        outOfStock
                          ? 'text-red-600 font-medium'
                          : isLowStock
                          ? 'text-amber-700 font-medium'
                          : 'text-[#6E6E73]'
                      }
                    >
                      {outOfStock
                        ? 'Out of Stock'
                        : isLowStock
                        ? `Only ${product.stock} left`
                        : 'In Stock'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <h2 className="font-display text-base font-semibold text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors truncate">
                      {product.name}
                    </h2>
                    <span className="font-mono text-sm font-medium text-[#1D1D1F] tabular-nums shrink-0">
                      {formatCurrency(product.price, settings.currency)}
                    </span>
                  </div>

                  <p className="text-sm text-[#6E6E73] line-clamp-2 mb-4 flex-1">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.05]">
                    <span className="text-xs font-medium text-[#0071E3] group-hover:underline">
                      View details
                    </span>

                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={(e) => handleQuickAdd(e, product)}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 ${
                        outOfStock
                          ? 'bg-[#F5F5F7] text-[#86868B] cursor-not-allowed'
                          : wasJustAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#1D1D1F] text-white hover:bg-[#0071E3]'
                      }`}
                    >
                      {wasJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>{outOfStock ? 'Sold Out' : 'Add to Bag'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
