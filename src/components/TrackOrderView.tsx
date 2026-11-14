import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Package, Search, Truck } from 'lucide-react';
import type { Order, StoreSettings } from '../types';
import { api, formatCurrency } from '../lib/api';
import { StoreImage } from './StoreImage';

interface TrackOrderViewProps {
  settings: StoreSettings;
  initialOrderNumber?: string;
}

const STEPS = ['Pending', 'Processing', 'Shipped', 'Delivered'] as const;

export function TrackOrderView({ settings, initialOrderNumber = '' }: TrackOrderViewProps) {
  const [query, setQuery] = useState(initialOrderNumber);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = async (num: string) => {
    const clean = num.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.trackOrder(clean);
      setOrder(res.order);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : 'Order not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      setQuery(initialOrderNumber);
      lookup(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(query);
  };

  const activeStepIdx = order
    ? STEPS.indexOf(order.status as (typeof STEPS)[number])
    : -1;

  return (
    <section className="max-w-[900px] mx-auto px-4 sm:px-8 py-14">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-[#6E6E73] mb-2">
          Order Lookup
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F] mb-3">
          Track your order
        </h1>
        <p className="text-sm text-[#6E6E73]">
          Enter your order confirmation code (for example, <span className="font-mono text-[#1D1D1F]">ORD-1041</span>) to view real-time status and receipt details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-10">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#86868B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ORD-1041"
            className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-black/10 text-sm font-mono uppercase focus:border-[#0071E3] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-7 py-3 rounded-full bg-[#0071E3] text-white text-sm font-medium hover:bg-[#0077ED] transition-colors whitespace-nowrap shrink-0"
        >
          {loading ? 'Searching...' : 'Track Order'}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {order && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-black/[0.08] p-6 sm:p-8 space-y-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-black/[0.06]">
            <div>
              <p className="font-mono text-xs text-[#6E6E73] mb-1">{order.orderNumber}</p>
              <h2 className="font-display text-xl font-semibold text-[#1D1D1F]">
                {order.status === 'Cancelled'
                  ? 'Order Cancelled'
                  : order.status === 'Delivered'
                  ? 'Delivered to Recipient'
                  : `Status: ${order.status}`}
              </h2>
              <p className="text-xs text-[#6E6E73] mt-1">
                Placed {new Date(order.createdAt).toLocaleString()} · {order.paymentMethod}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#6E6E73]">Order Total</p>
              <p className="font-mono text-xl font-semibold text-[#1D1D1F] tabular-nums">
                {formatCurrency(order.totalAmount, settings.currency)}
              </p>
            </div>
          </div>

          {/* Fulfillment Stepper */}
          {order.status !== 'Cancelled' && (
            <div className="grid grid-cols-4 gap-3">
              {STEPS.map((stepName, idx) => {
                const done = idx <= activeStepIdx;
                return (
                  <div key={stepName} className="space-y-2">
                    <div
                      className={`h-1.5 rounded-full transition-colors ${
                        done ? 'bg-[#0071E3]' : 'bg-[#E8E8ED]'
                      }`}
                    />
                    <div className="flex items-center gap-1.5">
                      {done ? (
                        <Check className="w-3.5 h-3.5 text-[#0071E3]" />
                      ) : idx === 2 ? (
                        <Truck className="w-3.5 h-3.5 text-[#86868B]" />
                      ) : (
                        <Package className="w-3.5 h-3.5 text-[#86868B]" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          done ? 'text-[#1D1D1F]' : 'text-[#86868B]'
                        }`}
                      >
                        {stepName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Shipping & Items */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
            <div className="md:col-span-5 text-sm space-y-1">
              <p className="text-xs uppercase tracking-wider font-medium text-[#6E6E73] mb-2">
                Delivery Details
              </p>
              <p className="font-medium text-[#1D1D1F]">{order.customerName}</p>
              <p className="text-[#6E6E73]">{order.shippingAddress}</p>
              <p className="text-[#6E6E73]">
                {order.shippingCity}, {order.shippingPostalCode}
              </p>
              <p className="text-[#6E6E73] pt-1">{order.customerEmail}</p>
              <p className="text-[#6E6E73]">{order.customerPhone}</p>
              {order.paymentScreenshot && (
                <div className="pt-4">
                  <p className="text-xs uppercase tracking-wider font-medium text-[#6E6E73] mb-2">
                    Payment Screenshot
                  </p>
                  <img
                    src={order.paymentScreenshot}
                    alt={`Payment receipt for ${order.orderNumber}`}
                    className="w-40 h-28 object-cover rounded-xl border border-black/10 bg-[#F5F5F7]"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-7">
              <p className="text-xs uppercase tracking-wider font-medium text-[#6E6E73] mb-3">
                Items in Shipment
              </p>
              <ul className="divide-y divide-black/[0.06]">
                {order.items.map((item) => (
                  <li key={item.id} className="py-3 flex items-center gap-3">
                    <div className="w-12 h-10 rounded-lg overflow-hidden bg-[#F5F5F7] shrink-0">
                      <StoreImage
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1D1D1F] truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-[#6E6E73] font-mono tabular-nums">
                        {item.quantity} × {formatCurrency(item.unitPrice, settings.currency)}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {formatCurrency(item.lineTotal, settings.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}
