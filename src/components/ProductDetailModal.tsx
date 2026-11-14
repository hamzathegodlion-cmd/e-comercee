import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Heart, Minus, Plus, X } from 'lucide-react';
import type { Product, StoreSettings } from '../types';
import { api, formatCurrency } from '../lib/api';
import { StoreImage } from './StoreImage';

interface ProductDetailModalProps {
  product: Product;
  settings: StoreSettings;
  onClose: () => void;
  onAddToCart: (product: Product, qty: number) => void;
}

export function ProductDetailModal({
  product: initialProduct,
  settings,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [quantity, setQuantity] = useState(1);
  const [favorited, setFavorited] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    // Records view + updates registered customer's recent browsing history
    api
      .getProduct(initialProduct.id)
      .then((res) => setProduct(res.product))
      .catch(() => {});
  }, [initialProduct.id]);

  const handleFavorite = async () => {
    if (favorited) return;
    setFavorited(true);
    try {
      const res = await api.favoriteProduct(product.id);
      setProduct((p) => ({ ...p, favorites: res.favorites }));
    } catch {
      // ignore
    }
  };

  const handleAdd = () => {
    if (product.stock <= 0) return;
    onAddToCart(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  const specEntries = Object.entries(product.specs || {});
  const outOfStock = product.stock <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-black/[0.06] max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left: Product Image */}
          <div className="md:col-span-6 bg-[#F5F5F7] p-6 sm:p-8 flex items-center justify-center">
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden">
              <StoreImage
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right: Contiguous Purchase Module */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#6E6E73] mb-2">
                <span className="uppercase tracking-wider font-medium">{product.categoryName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{product.sku}</span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#1D1D1F] mb-2">
                {product.name}
              </h2>

              <div className="flex items-center justify-between mb-5">
                <span className="font-mono text-xl font-semibold text-[#1D1D1F] tabular-nums">
                  {formatCurrency(product.price, settings.currency)}
                </span>
                <span
                  className={`text-xs font-medium ${
                    outOfStock
                      ? 'text-red-600'
                      : product.stock <= settings.lowStockThreshold
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {outOfStock ? 'Out of Stock' : `${product.stock} units available`}
                </span>
              </div>

              <p className="text-sm text-[#6E6E73] leading-relaxed mb-6">{product.description}</p>

              {specEntries.length > 0 && (
                <div className="mb-6 border-t border-black/[0.06] pt-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[#6E6E73] mb-3">
                    Specifications
                  </h3>
                  <dl className="divide-y divide-black/[0.05]">
                    {specEntries.map(([k, v]) => (
                      <div key={k} className="py-2 flex items-center justify-between gap-4 text-sm">
                        <dt className="text-[#6E6E73]">{k}</dt>
                        <dd className="font-medium text-[#1D1D1F] text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-black/[0.06] space-y-3">
              <div className="flex items-center gap-3">
                {/* Quantity Stepper */}
                <div className="inline-flex items-center rounded-full bg-[#F5F5F7] p-1">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F] hover:bg-white disabled:opacity-40 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-9 text-center font-mono text-sm font-medium tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= product.stock}
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    aria-label="Increase quantity"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F] hover:bg-white disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={handleAdd}
                  className={`flex-1 py-3 px-6 rounded-full text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 ${
                    outOfStock
                      ? 'bg-[#E8E8ED] text-[#86868B] cursor-not-allowed'
                      : added
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0071E3] text-white hover:bg-[#0077ED]'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Bag</span>
                    </>
                  ) : (
                    <span>
                      {outOfStock
                        ? 'Currently Unavailable'
                        : `Add to Bag · ${formatCurrency(product.price * quantity, settings.currency)}`}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleFavorite}
                  aria-label="Favorite product"
                  className={`p-3 rounded-full border transition-colors ${
                    favorited
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-black/10 text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-[#86868B] text-center">
                {product.favorites} shoppers favorited · {product.views} views
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
