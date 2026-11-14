import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import type { Category, Product } from '../types';
import { api } from '../lib/api';

interface ProductFormModalProps {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

const PRESET_IMAGES = [
  { label: 'Laptop Studio', url: '/src/assets/images/product_laptop_pro_1794591590610.jpg' },
  { label: 'Headphones', url: '/src/assets/images/product_studio_headphones_1794591590448.jpg' },
  { label: 'Merino Jacket', url: '/src/assets/images/product_merino_jacket_1794591591053.jpg' },
  { label: 'Organic Fruit', url: '/src/assets/images/product_organic_fruits_1794591591530.jpg' },
  { label: 'Espresso Unit', url: '/src/assets/images/product_ceramic_espresso_1794591592000.jpg' },
];

export function resizeImageFile(file: File, maxDim = 960): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ProductFormModal({
  product,
  categories,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [categoryId, setCategoryId] = useState<number>(
    product?.categoryId || categories[0]?.id || 1
  );
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [costPrice, setCostPrice] = useState(product ? String(product.costPrice) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '20');
  const [description, setDescription] = useState(product?.description || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || PRESET_IMAGES[0].url);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>(() => {
    const entries = Object.entries(product?.specs || {});
    return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }];
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file, 960);
      setImageUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const specs: Record<string, string> = {};
      for (const row of specRows) {
        if (row.key.trim() && row.value.trim()) {
          specs[row.key.trim()] = row.value.trim();
        }
      }

      const payload = {
        name,
        sku: sku || undefined,
        categoryId: Number(categoryId),
        description,
        price: Number(price),
        costPrice: costPrice ? Number(costPrice) : undefined,
        stock: Number(stock),
        imageUrl,
        featured,
        isActive,
        specs,
      };

      if (product) {
        await api.updateProduct(product.id, payload);
      } else {
        await api.createProduct(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl border border-black/[0.08] shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-display text-lg font-semibold text-[#1D1D1F]">
            {product ? `Edit Product · ${product.name}` : 'Add New Product / Equipment'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F5F5F7] text-[#6E6E73]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">Product Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Studio Workstation M4"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {!c.isOpen ? '(Closed)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">Sale Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="299"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">Unit Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="160"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">Stock Qty</label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Auto"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] font-mono text-sm uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6E6E73] mb-1">Description</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe materials, specs, or freshness details..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
            />
          </div>

          {/* Product Image Upload or Preset */}
          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-[#6E6E73]">Product Image</label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-xs font-medium text-[#1D1D1F] cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste image URL..."
                className="flex-1 w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_IMAGES.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setImageUrl(preset.url)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    imageUrl === preset.url
                      ? 'bg-[#1D1D1F] text-white'
                      : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#6E6E73]">Specifications (Optional)</label>
              <button
                type="button"
                onClick={() => setSpecRows((r) => [...r, { key: '', value: '' }])}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0071E3] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add spec</span>
              </button>
            </div>
            <div className="space-y-2">
              {specRows.map((row, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Property (e.g. Weight)"
                    value={row.key}
                    onChange={(e) =>
                      setSpecRows((rows) =>
                        rows.map((r, i) => (i === idx ? { ...r, key: e.target.value } : r))
                      )
                    }
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F5F5F7] text-xs focus:bg-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 1.4 kg)"
                    value={row.value}
                    onChange={(e) =>
                      setSpecRows((rows) =>
                        rows.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r))
                      )
                    }
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F5F5F7] text-xs focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSpecRows((rows) => rows.filter((_, i) => i !== idx))}
                    className="p-2 text-[#86868B] hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-2 text-sm text-[#1D1D1F] cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-black/20 accent-[#0071E3]"
              />
              <span>Visible on Storefront</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-[#1D1D1F] cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-black/20 accent-[#0071E3]"
              />
              <span>Featured Collection</span>
            </label>
          </div>

          <div className="pt-4 border-t border-black/[0.06] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#F5F5F7] text-xs font-medium text-[#1D1D1F] hover:bg-[#E8E8ED]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-xs font-medium hover:bg-[#0077ED] disabled:opacity-60"
            >
              {saving ? 'Saving...' : product ? 'Save Changes' : 'Publish to Store'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
