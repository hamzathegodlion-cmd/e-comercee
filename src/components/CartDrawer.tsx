import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Minus, Plus, ShoppingBag, Trash2, Upload, X } from 'lucide-react';
import type { CartItem, Order, StoreSettings, User } from '../types';
import { api, formatCurrency } from '../lib/api';
import { StoreImage } from './StoreImage';
import { resizeImageFile } from './ProductFormModal';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  settings: StoreSettings;
  user: User | null;
  onClose: () => void;
  onUpdateQty: (productId: number, qty: number) => void;
  onRemoveItem: (productId: number) => void;
  onOrderSuccess: (order: Order) => void;
  onTrackOrder: (orderNumber: string) => void;
}

export function CartDrawer({
  open,
  items,
  settings,
  user,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onOrderSuccess,
  onTrackOrder,
}: CartDrawerProps) {
  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmed'>('bag');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer / Mobile Pay');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');

  useEffect(() => {
    if (user && user.role === 'customer') {
      setCustomerName((prev) => prev || user.name);
      setCustomerEmail((prev) => prev || user.email);
    }
  }, [user]);

  useEffect(() => {
    if (!open && step === 'confirmed') {
      setStep('bag');
      setConfirmedOrder(null);
      setPaymentScreenshot('');
    }
  }, [open, step]);

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shippingFee = subtotal === 0 || subtotal >= settings.freeShippingThreshold ? 0 : 12;
  const total = subtotal + shippingFee;
  const remainingForFreeShipping = Math.max(0, settings.freeShippingThreshold - subtotal);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await resizeImageFile(file, 1080);
      setPaymentScreenshot(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process payment screenshot.');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!paymentScreenshot) {
      setError('Please upload a screenshot of your payment before placing the order.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createOrder({
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        shippingCity,
        shippingPostalCode,
        paymentMethod,
        paymentScreenshot,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      setConfirmedOrder(res.order);
      setStep('confirmed');
      setPaymentScreenshot('');
      onOrderSuccess(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-xs" onClick={onClose}>
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-black/[0.06]"
      >
        <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#1D1D1F]">
              {step === 'bag'
                ? 'Your Bag'
                : step === 'checkout'
                ? 'Checkout'
                : 'Order Confirmed'}
            </h2>
            {step === 'checkout' && (
              <p className="text-xs text-[#6E6E73]">
                {user?.role === 'customer'
                  ? `Signed in as ${user.name}`
                  : 'Guest checkout — no account required'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bag"
            className="p-2 rounded-full hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'confirmed' && confirmedOrder ? (
            <div className="py-6 space-y-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-mono text-[#6E6E73] mb-1">{confirmedOrder.orderNumber}</p>
                  <h3 className="font-display text-xl font-semibold text-[#1D1D1F] mb-1">
                    Thank you, {confirmedOrder.customerName}
                  </h3>
                  <p className="text-sm text-[#6E6E73]">
                    Your order is confirmed and queued for fulfillment.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#F5F5F7] p-4 space-y-2.5 text-sm">
                {confirmedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <span className="text-[#1D1D1F]">
                      {item.productName}{' '}
                      <span className="text-[#6E6E73] font-mono">×{item.quantity}</span>
                    </span>
                    <span className="font-mono tabular-nums font-medium">
                      {formatCurrency(item.lineTotal, settings.currency)}
                    </span>
                  </div>
                ))}
                <div className="pt-2.5 border-t border-black/10 flex items-center justify-between font-semibold">
                  <span>Total Paid</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(confirmedOrder.totalAmount, settings.currency)}
                  </span>
                </div>
              </div>

              {confirmedOrder.paymentScreenshot && (
                <div className="rounded-2xl border border-black/[0.08] p-3 space-y-2">
                  <p className="text-xs font-medium text-[#6E6E73]">Submitted Payment Screenshot</p>
                  <img
                    src={confirmedOrder.paymentScreenshot}
                    alt="Payment screenshot receipt"
                    className="w-full max-h-48 object-contain rounded-xl bg-[#F5F5F7]"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const num = confirmedOrder.orderNumber;
                  onClose();
                  onTrackOrder(num);
                }}
                className="w-full py-3 px-6 rounded-full bg-[#0071E3] text-white text-sm font-medium hover:bg-[#0077ED] transition-colors flex items-center justify-center gap-2"
              >
                <span>Track Order {confirmedOrder.orderNumber}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center">
              <ShoppingBag className="w-10 h-10 text-[#86868B] mx-auto mb-3 stroke-[1.5]" />
              <p className="font-display text-base font-semibold text-[#1D1D1F] mb-1">
                Your bag is empty
              </p>
              <p className="text-sm text-[#6E6E73]">
                Explore the catalog to add electronics, apparel, market goods, or homeware.
              </p>
            </div>
          ) : step === 'bag' ? (
            <div className="space-y-5">
              {remainingForFreeShipping > 0 ? (
                <div className="rounded-xl bg-[#F5F5F7] px-4 py-3 text-xs text-[#6E6E73]">
                  Add{' '}
                  <span className="font-mono font-medium text-[#1D1D1F]">
                    {formatCurrency(remainingForFreeShipping, settings.currency)}
                  </span>{' '}
                  more for complimentary shipping.
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-medium">
                  Your order qualifies for complimentary shipping.
                </div>
              )}

              <ul className="divide-y divide-black/[0.06]">
                {items.map(({ product, quantity }) => (
                  <li key={product.id} className="py-4 flex gap-4">
                    <div className="w-20 h-16 rounded-xl overflow-hidden bg-[#F5F5F7] shrink-0">
                      <StoreImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-[#1D1D1F] truncate">{product.name}</p>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(product.id)}
                          aria-label={`Remove ${product.name}`}
                          className="text-[#86868B] hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-[#6E6E73] mb-2">{product.categoryName}</p>
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full bg-[#F5F5F7] p-0.5">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(product.id, quantity - 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            disabled={quantity >= product.stock}
                            onClick={() => onUpdateQty(product.id, quantity + 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-mono text-sm font-medium tabular-nums">
                          {formatCurrency(product.price * quantity, settings.currency)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Hamza Al-Mansoor"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+1 555-0142"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="420 Cupertino Way"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    placeholder="San Jose"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={shippingPostalCode}
                    onChange={(e) => setShippingPostalCode(e.target.value)}
                    placeholder="95129"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                >
                  <option value="Bank Transfer / Mobile Pay">Bank Transfer / Mobile Pay</option>
                  <option value="Card / Instant Pay">Card / Instant Pay</option>
                  <option value="Cash on Delivery">Cash on Delivery (Deposit)</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#1D1D1F]">
                    Payment Screenshot <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[11px] text-[#6E6E73]">Required before ordering</span>
                </div>

                {paymentScreenshot ? (
                  <div className="rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 space-y-2.5">
                    <img
                      src={paymentScreenshot}
                      alt="Uploaded payment proof"
                      className="w-full max-h-44 object-contain rounded-xl bg-white"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-emerald-700">
                        Payment screenshot attached
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-medium text-[#0071E3] hover:underline cursor-pointer">
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setPaymentScreenshot('')}
                          className="text-xs text-[#6E6E73] hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 bg-[#F5F5F7] hover:bg-[#EFEFF2] px-4 py-5 cursor-pointer transition-colors text-center">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <Upload className="w-4 h-4 text-[#1D1D1F]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#1D1D1F]">
                        Upload payment screenshot
                      </p>
                      <p className="text-[11px] text-[#6E6E73] mt-0.5">
                        PNG, JPG, or mobile transfer receipt
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer Summary */}
        {items.length > 0 && step !== 'confirmed' && (
          <div className="px-6 py-5 border-t border-black/[0.06] bg-[#FBFBFD] space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#6E6E73]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(subtotal, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between text-[#6E6E73]">
                <span>Shipping</span>
                <span className="font-mono tabular-nums">
                  {shippingFee === 0 ? 'Free' : formatCurrency(shippingFee, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-[#1D1D1F] pt-1.5 border-t border-black/[0.06]">
                <span>Total</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(total, settings.currency)}
                </span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3 px-6 rounded-full bg-[#0071E3] text-white text-sm font-medium hover:bg-[#0077ED] transition-colors flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('bag')}
                  className="px-5 py-3 rounded-full bg-[#F5F5F7] text-sm font-medium text-[#1D1D1F] hover:bg-[#E8E8ED] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={submitting}
                  className="flex-1 py-3 px-6 rounded-full bg-[#0071E3] text-white text-sm font-medium hover:bg-[#0077ED] disabled:opacity-60 transition-colors"
                >
                  {submitting
                    ? 'Processing...'
                    : `Place Order · ${formatCurrency(total, settings.currency)}`}
                </button>
              </div>
            )}
          </div>
        )}
      </motion.aside>
    </div>
  );
}
