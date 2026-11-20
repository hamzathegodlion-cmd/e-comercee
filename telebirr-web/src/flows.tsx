import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Sheet from './components/Sheet';
import { useWallet } from './lib/WalletContext';
import { telebirrApi, type ApiResult } from './lib/api';
import { BANKS, CONTACTS, DEMO_USER, PAYMENT_BILLERS } from './data';
import type { Transaction } from './types';
import {
  IconArrowDownLeft,
  IconCheck,
  IconChevronRight,
  IconShare,
} from './components/icons';

/* ---------- fee model (demo approximation of telebirr tiers) ---------- */
export function sendFee(amount: number): number {
  if (amount < 500) return 0.5;
  if (amount < 1000) return 1;
  if (amount < 5000) return 3;
  return 7;
}

/* =========================================================
 *  MoneyWizard — shared form → confirm → PIN → success flow
 * ========================================================= */
type Step = 'form' | 'confirm' | 'pin' | 'processing' | 'success';

interface MoneyWizardProps<T> {
  title: string;
  subtitle?: string;
  values: T;
  onChange: (v: T) => void;
  canContinue: (v: T) => boolean;
  renderForm: (v: T, set: (v: T) => void) => ReactNode;
  summary: (v: T) => Array<[string, string]>;
  headlineAmount: (v: T) => number;
  fee: (v: T) => number;
  execute: (v: T, pin: string) => Promise<ApiResult<unknown>>;
  recordOnSuccess: (v: T, reference: string) => Omit<Transaction, 'id' | 'date'>;
  successTitle: string;
  onClose: () => void;
  insufficientBalance?: boolean;
}

function MoneyWizard<T>({
  title,
  subtitle,
  values,
  onChange,
  canContinue,
  renderForm,
  summary,
  headlineAmount,
  fee,
  execute,
  recordOnSuccess,
  successTitle,
  onClose,
  insufficientBalance,
}: MoneyWizardProps<T>) {
  const { addTransaction, formatEtb } = useWallet();
  const [step, setStep] = useState<Step>('form');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const amount = headlineAmount(values);
  const feeValue = fee(values);

  useEffect(() => {
    if (pin.length === 6 && step === 'pin') {
      setStep('processing');
      setError(null);
      void (async () => {
        const res = await execute(values, pin);
        if (!res.ok) {
          setError(res.error ?? 'Transaction failed. Please try again.');
          setStep('pin');
          setPin('');
          return;
        }
        const ref = res.reference ?? 'FTT00000000000';
        setReference(ref);
        addTransaction(recordOnSuccess(values, ref));
        navigator.vibrate?.(25);
        setStep('success');
      })();
    }
  }, [pin, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePin = (digit: string) => {
    if (pin.length < 6) setPin((p) => p + digit);
  };

  if (step === 'success') {
    return (
      <Sheet title="Successful" onClose={onClose}>
        <div className="success-wrap">
          <div className="success-check">
            <IconCheck width={38} height={38} strokeWidth={3.5} />
          </div>
          <h3 style={{ margin: '14px 0 2px', fontSize: 18 }}>{successTitle}</h3>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--green-deep)', margin: '2px 0 4px' }}>
            {formatEtb(amount)}
          </div>
          <div className="receipt">
            {summary(values).map(([k, v]) => (
              <div className="receipt-row" key={k}>
                <span className="k">{k}</span>
                <span className="v">{v}</span>
              </div>
            ))}
            <div className="receipt-row">
              <span className="k">Fee</span>
              <span className="v">{formatEtb(feeValue)}</span>
            </div>
            <div className="receipt-row">
              <span className="k">Reference</span>
              <span className="v">{reference}</span>
            </div>
            <div className="receipt-row">
              <span className="k">Status</span>
              <span className="v" style={{ color: 'var(--green-deep)' }}>COMPLETED</span>
            </div>
          </div>
          <button
            className="ghost-btn"
            onClick={() => {
              const lines = [
                `telebirr receipt — ${successTitle} (UNOFFICIAL DEMO)`,
                ...summary(values).map(([k, v]) => `${k}: ${v}`),
                `Amount: ${formatEtb(amount)}`,
                `Fee: ${formatEtb(feeValue)}`,
                `Ref: ${reference}`,
                `Date: ${new Date().toLocaleString()}`,
              ].join('\n');
              void navigator.clipboard?.writeText(lines);
            }}
          >
            <IconShare width={15} height={15} style={{ verticalAlign: -3, marginRight: 6 }} />
            Copy receipt
          </button>
          <button className="primary-btn" onClick={onClose}>Done</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={title} subtitle={subtitle} onClose={onClose}>
      {step === 'form' && (
        <>
          {renderForm(values, onChange)}
          {insufficientBalance && (
            <p style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 700, marginTop: 4 }}>
              Insufficient balance — top up via a Cash In agent first.
            </p>
          )}
          <button className="primary-btn" disabled={!canContinue(values)} onClick={() => setStep('confirm')}>
            Continue
          </button>
          <button className="ghost-btn" onClick={onClose}>Cancel</button>
        </>
      )}

      {step === 'confirm' && (
        <>
          <div style={{ textAlign: 'center', margin: '6px 0 12px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              You are about to pay
            </div>
            <div style={{ fontSize: 34, fontWeight: 800 }}>{formatEtb(amount)}</div>
            {feeValue > 0 && (
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>+ {formatEtb(feeValue)} service fee</div>
            )}
          </div>
          <div className="receipt" style={{ marginBottom: 12 }}>
            {summary(values).map(([k, v]) => (
              <div className="receipt-row" key={k}>
                <span className="k">{k}</span>
                <span className="v">{v}</span>
              </div>
            ))}
          </div>
          <button className="primary-btn" onClick={() => { setStep('pin'); setPin(''); }}>
            Confirm &amp; pay with PIN
          </button>
          <button className="ghost-btn" onClick={() => setStep('form')}>Back</button>
        </>
      )}

      {step === 'pin' && (
        <div>
          <p className="sheet-sub" style={{ textAlign: 'center' }}>Enter your 6-digit telebirr PIN. It never leaves this screen.</p>
          <div className="pin-dots" aria-label={`${pin.length} of 6 digits entered`}>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className={`pin-dot${i < pin.length ? ' filled' : ''}`} />
            ))}
          </div>
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{error}</p>
          )}
          <div className="pin-pad">
            {['1','2','3','4','5','6','7','8','9'].map((d) => (
              <button key={d} className="pin-key" onClick={() => updatePin(d)}>{d}</button>
            ))}
            <button className="pin-key" onClick={() => setStep('confirm')} aria-label="Back" style={{ fontSize: 15 }}>Back</button>
            <button className="pin-key" onClick={() => updatePin('0')}>0</button>
            <button className="pin-key" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete">⌫</button>
          </div>
          <p className="pin-hint">Demo only — any 6 digits work. Never share your real PIN.</p>
        </div>
      )}

      {step === 'processing' && (
        <div style={{ textAlign: 'center', padding: '36px 0 28px' }}>
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p style={{ marginTop: 16, fontWeight: 700 }}>Contacting telebirr…</p>
          <p className="pill-note">Authorizing {formatEtb(amount)}</p>
        </div>
      )}
    </Sheet>
  );
}

/* =========================================================
 *  Send Money
 * ========================================================= */
interface SendValues { recipientId: string; manualPhone: string; amount: string; note: string }

export function SendMoneyFlow({ onClose }: { onClose: () => void }) {
  const { balance } = useWallet();
  const [v, setV] = useState<SendValues>({ recipientId: CONTACTS[0].id, manualPhone: '', amount: '', note: '' });
  const contact = CONTACTS.find((c) => c.id === v.recipientId);
  const amount = parseFloat(v.amount) || 0;
  const phone = v.recipientId === 'manual' ? v.manualPhone : (contact?.phone ?? '');
  const name = v.recipientId === 'manual' ? (v.manualPhone ? `telebirr user ${v.manualPhone}` : '—') : (contact?.name ?? '—');

  return (
    <MoneyWizard<SendValues>
      title="Send Money"
      subtitle="Transfer instantly to any telebirr mobile number"
      values={v}
      onChange={setV}
      insufficientBalance={amount > 0 && amount + sendFee(amount) > balance}
      canContinue={(s) => (s.recipientId === 'manual' ? s.manualPhone.trim().length >= 9 : Boolean(s.recipientId)) && (parseFloat(s.amount) || 0) > 0 && (parseFloat(s.amount) || 0) + sendFee(parseFloat(s.amount) || 0) <= balance}
      headlineAmount={(s) => parseFloat(s.amount) || 0}
      fee={(s) => sendFee(parseFloat(s.amount) || 0)}
      renderForm={(s, set) => (
        <>
          <div className="field">
            <label>Recipient</label>
            <div className="contact-list">
              {CONTACTS.map((c) => (
                <button
                  key={c.id}
                  className="contact-item"
                  style={{ borderColor: s.recipientId === c.id ? 'var(--green)' : 'transparent', background: s.recipientId === c.id ? '#f4faf0' : 'transparent' }}
                  onClick={() => set({ ...s, recipientId: c.id })}
                >
                  <span className="contact-avatar" style={{ background: c.color }}>{c.initials}</span>
                  <span>
                    <span className="c-name">{c.name}</span><br />
                    <span className="c-phone">+251 {c.phone.slice(1)}</span>
                  </span>
                </button>
              ))}
              <button
                className="contact-item"
                style={{ borderColor: s.recipientId === 'manual' ? 'var(--green)' : 'transparent' }}
                onClick={() => set({ ...s, recipientId: 'manual' })}
              >
                <span className="contact-avatar" style={{ background: '#555' }}>+</span>
                <span className="c-name">Someone else — type number</span>
              </button>
            </div>
            {s.recipientId === 'manual' && (
              <input
                className="input"
                style={{ marginTop: 8 }}
                inputMode="numeric"
                placeholder="09XXXXXXXX"
                value={s.manualPhone}
                onChange={(e) => set({ ...s, manualPhone: e.target.value.replace(/[^\d+]/g, '') })}
              />
            )}
          </div>
          <div className="field">
            <label htmlFor="send-amount">Amount (ETB)</label>
            <input id="send-amount" className="input amount-input" inputMode="decimal" placeholder="0.00" value={s.amount} onChange={(e) => set({ ...s, amount: e.target.value.replace(/[^\d.]/g, '') })} />
            <div className="chip-row">
              {[100, 250, 500, 1000].map((n) => (
                <button key={n} className="chip" onClick={() => set({ ...s, amount: String(n) })}>{n} ETB</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="send-note">Note (optional)</label>
            <input id="send-note" className="input" placeholder="e.g. Lunch split" value={s.note} onChange={(e) => set({ ...s, note: e.target.value })} />
          </div>
        </>
      )}
      summary={(s) => [
        ['To', `${name}`],
        ['Phone', phone],
        ...(s.note ? ([['Note', s.note]] as Array<[string, string]>) : []),
      ]}
      execute={(s, pin) =>
        telebirrApi.sendMoney({ amount: parseFloat(s.amount) || 0, pin, recipientPhone: phone, recipientName: name, note: s.note })
      }
      recordOnSuccess={(s, reference) => ({
        type: 'send',
        title: `Sent to ${name}`,
        subtitle: `Mobile · +251 ${phone.replace(/^0/, '')}`,
        amount: -(parseFloat(s.amount) || 0),
        status: 'success',
        reference,
        fee: sendFee(parseFloat(s.amount) || 0),
      })}
      successTitle="Money sent"
      onClose={onClose}
    />
  );
}

/* =========================================================
 *  Request Money — shows a telebirr-style receive QR
 * ========================================================= */
function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function PseudoQr({ seed, size = 168 }: { seed: string; size?: number }) {
  const n = 21;
  const cell = size / n;
  const rand = (() => {
    let s = hashString(seed) || 1;
    return () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967295;
    };
  })();
  const grid: boolean[][] = [];
  for (let y = 0; y < n; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < n; x++) row.push(rand() > 0.52);
    grid.push(row);
  }
  const drawFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      grid[oy + y][ox + x] = edge || core;
    }
  };
  drawFinder(0, 0); drawFinder(n - 7, 0); drawFinder(0, n - 7);
  const rects: ReactNode[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (grid[y][x]) rects.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} />);
  }
  return (
    <svg className="qr-canvas" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="telebirr request QR (demo)">
      <rect width={size} height={size} fill="#fff" />
      <g fill="#111">{rects}</g>
    </svg>
  );
}

export function RequestMoneyFlow({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [requested, setRequested] = useState<{ qrPayload: string; reference?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const parsed = parseFloat(amount) || 0;

  const request = async () => {
    setBusy(true);
    const res = await telebirrApi.requestMoney(parsed);
    setBusy(false);
    if (res.ok && res.data) setRequested(res.data);
  };

  return (
    <Sheet title="Request Money" subtitle="Show or share this code to get paid" onClose={onClose}>
      {!requested ? (
        <>
          <div className="field">
            <label htmlFor="req-amount">Amount to request (ETB)</label>
            <input id="req-amount" className="input amount-input" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
            <div className="chip-row">
              {[50, 100, 200, 500].map((n) => (
                <button key={n} className="chip" onClick={() => setAmount(String(n))}>{n}</button>
              ))}
            </div>
          </div>
          <button className="primary-btn" disabled={!(parsed > 0) || busy} onClick={request}>
            {busy ? <><span className="spinner" />Generating…</> : 'Generate QR'}
          </button>
        </>
      ) : (
        <div className="qr-box">
          <PseudoQr seed={requested.qrPayload} />
          <div style={{ fontWeight: 800 }}>ETB {parsed.toFixed(2)}</div>
          <div className="pill-note">Anyone scanning this can pay you from their telebirr app.<br />Ref: {requested.reference}</div>
          <button
            className="ghost-btn"
            onClick={() => void navigator.clipboard?.writeText(requested.qrPayload)}
          >
            <IconShare width={15} height={15} style={{ verticalAlign: -3, marginRight: 6 }} />
            Copy payment link
          </button>
          <button className="primary-btn" onClick={onClose}>Done</button>
        </div>
      )}
    </Sheet>
  );
}

/* =========================================================
 *  Airtime / Packages
 * ========================================================= */
interface AirtimeValues { phone: string; packageId: string }
const AIRTIME_PACKAGES = [
  { id: 'a10', label: '50 ETB airtime', detail: 'All networks', amount: 50 },
  { id: 'd1', label: '1 GB · 7 days', detail: 'Ethio telecom data', amount: 70 },
  { id: 'd2', label: '3 GB · 30 days', detail: 'Ethio telecom data', amount: 180 },
  { id: 'd3', label: '10 GB · 30 days', detail: 'Best value', amount: 500 },
];

export function AirtimeFlow({ onClose }: { onClose: () => void }) {
  const { balance } = useWallet();
  const [v, setV] = useState<AirtimeValues>({ phone: DEMO_USER.shortCode.replace(/\s/g, '').slice(-9), packageId: 'd1' });
  const pkg = AIRTIME_PACKAGES.find((p) => p.id === v.packageId) ?? AIRTIME_PACKAGES[0];

  return (
    <MoneyWizard<AirtimeValues>
      title="Airtime / Packages"
      subtitle="Top up any Ethio telecom number — +10% bonus on packages"
      values={v}
      onChange={setV}
      canContinue={(s) => s.phone.replace(/\D/g, '').length >= 9 && pkg.amount <= balance}
      insufficientBalance={pkg.amount > balance}
      headlineAmount={() => pkg.amount}
      fee={() => 0}
      renderForm={(s, set) => (
        <>
          <div className="field">
            <label htmlFor="air-phone">Phone number</label>
            <input id="air-phone" className="input" inputMode="numeric" value={s.phone} onChange={(e) => set({ ...s, phone: e.target.value.replace(/[^\d+]/g, '') })} />
          </div>
          <div className="field">
            <label>Choose package</label>
            {AIRTIME_PACKAGES.map((p) => (
              <button
                key={p.id}
                className="biller-item"
                style={{ borderColor: s.packageId === p.id ? 'var(--green)' : 'var(--line)', marginBottom: 8 }}
                onClick={() => set({ ...s, packageId: p.id })}
              >
                <span className="biller-ic" style={{ background: '#eef6de' }}>📱</span>
                <span style={{ flex: 1 }}>
                  <span className="b-name">{p.label}</span><br />
                  <span className="b-cat">{p.detail}</span>
                </span>
                <strong>{p.amount} ETB</strong>
              </button>
            ))}
          </div>
        </>
      )}
      summary={(s) => [
        ['To', s.phone],
        ['Package', `${pkg.label}`],
      ]}
      execute={(s, pin) => telebirrApi.buyAirtime({ amount: pkg.amount, pin, phone: s.phone, packageId: s.packageId })}
      recordOnSuccess={(s, reference) => ({
        type: 'airtime',
        title: `Airtime — ${s.phone}`,
        subtitle: 'Ethio telecom',
        amount: -pkg.amount,
        status: 'success',
        reference,
        fee: 0,
      })}
      successTitle="Package activated"
      onClose={onClose}
    />
  );
}

/* =========================================================
 *  Bank transfers (CBE / Dashen / other banks)
 * ========================================================= */
interface BankValues { bankId: string; account: string; amount: string }
export function BankTransferFlow({ onClose, presetBank }: { onClose: () => void; presetBank?: string }) {
  const { balance } = useWallet();
  const [v, setV] = useState<BankValues>({ bankId: presetBank ?? 'cbe', account: '', amount: '' });
  const bank = BANKS.find((b) => b.id === v.bankId) ?? BANKS[0];
  const amount = parseFloat(v.amount) || 0;

  return (
    <MoneyWizard<BankValues>
      title="Transfer to Bank"
      subtitle="Instant transfers to linked Ethiopian bank accounts"
      values={v}
      onChange={setV}
      canContinue={(s) => s.account.replace(/\D/g, '').length >= 8 && (parseFloat(s.amount) || 0) > 0 && (parseFloat(s.amount) || 0) + 10 <= balance}
      insufficientBalance={amount > 0 && amount + 10 > balance}
      headlineAmount={(s) => parseFloat(s.amount) || 0}
      fee={() => 10}
      renderForm={(s, set) => (
        <>
          <div className="field">
            <label htmlFor="bank-select">Bank</label>
            <select id="bank-select" className="input" value={s.bankId} onChange={(e) => set({ ...s, bankId: e.target.value })}>
              {BANKS.map((b) => (
                <option key={b.id} value={b.id}>{b.name} · {b.eta}</option>
              ))}
            </select>
            {bank.logo && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={bank.logo} alt={bank.name} style={{ height: 40, objectFit: 'contain', background: '#fff', borderRadius: 8 }} />
                <span className="pill-note" style={{ textAlign: 'left', margin: 0 }}>Official partner transfer</span>
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor="bank-account">Account number</label>
            <input id="bank-account" className="input" inputMode="numeric" placeholder="1000 •••• ••••" value={s.account} onChange={(e) => set({ ...s, account: e.target.value.replace(/\s/g, '').replace(/[^\d]/g, '') })} />
          </div>
          <div className="field">
            <label htmlFor="bank-amount">Amount (ETB)</label>
            <input id="bank-amount" className="input amount-input" inputMode="decimal" placeholder="0.00" value={s.amount} onChange={(e) => set({ ...s, amount: e.target.value.replace(/[^\d.]/g, '') })} />
          </div>
        </>
      )}
      summary={(s) => [
        ['Bank', bank.name],
        ['Account', s.account ? `•••• ${s.account.slice(-4)}` : '—'],
        ['Speed', bank.eta],
      ]}
      execute={(s, pin) => telebirrApi.bankTransfer({ amount: parseFloat(s.amount) || 0, pin, bankId: s.bankId, accountNumber: s.account })}
      recordOnSuccess={(s, reference) => ({
        type: 'bank',
        title: `Transfer to ${bank.name.split(' ')[0]} — ${s.account.slice(-4)}`,
        subtitle: bank.name,
        amount: -(parseFloat(s.amount) || 0),
        status: 'success',
        reference,
        fee: 10,
      })}
      successTitle="Bank transfer initiated"
      onClose={onClose}
    />
  );
}

/* =========================================================
 *  Transfer to Wallet
 * ========================================================= */
interface WalletValues { phone: string; amount: string }
export function WalletTransferFlow({ onClose }: { onClose: () => void }) {
  const { balance } = useWallet();
  const [v, setV] = useState<WalletValues>({ phone: '', amount: '' });
  const amount = parseFloat(v.amount) || 0;

  return (
    <MoneyWizard<WalletValues>
      title="Transfer to Wallet"
      subtitle="Send to another telebirr wallet by phone number"
      values={v}
      onChange={setV}
      canContinue={(s) => s.phone.replace(/\D/g, '').length >= 9 && (parseFloat(s.amount) || 0) > 0 && (parseFloat(s.amount) || 0) + 3 <= balance}
      insufficientBalance={amount > 0 && amount + 3 > balance}
      headlineAmount={(s) => parseFloat(s.amount) || 0}
      fee={() => 3}
      renderForm={(s, set) => (
        <>
          <div className="field">
            <label htmlFor="wt-phone">Recipient phone</label>
            <input id="wt-phone" className="input" inputMode="numeric" placeholder="09XXXXXXXX" value={s.phone} onChange={(e) => set({ ...s, phone: e.target.value.replace(/[^\d+]/g, '') })} />
          </div>
          <div className="field">
            <label htmlFor="wt-amount">Amount (ETB)</label>
            <input id="wt-amount" className="input amount-input" inputMode="decimal" placeholder="0.00" value={s.amount} onChange={(e) => set({ ...s, amount: e.target.value.replace(/[^\d.]/g, '') })} />
          </div>
        </>
      )}
      summary={(s) => [
        ['To wallet', s.phone],
      ]}
      execute={(s, pin) => telebirrApi.walletTransfer({ amount: parseFloat(s.amount) || 0, pin, phone: s.phone })}
      recordOnSuccess={(s, reference) => ({
        type: 'wallet',
        title: `Transfer to wallet — ${s.phone}`,
        subtitle: 'telebirr wallet',
        amount: -(parseFloat(s.amount) || 0),
        status: 'success',
        reference,
        fee: 3,
      })}
      successTitle="Transfer successful"
      onClose={onClose}
    />
  );
}

/* =========================================================
 *  Cash In / Cash Out
 * ========================================================= */
interface CashValues { phone: string; amount: string }
export function CashFlow({ mode, onClose }: { mode: 'in' | 'out'; onClose: () => void }) {
  const { balance } = useWallet();
  const [v, setV] = useState<CashValues>({ phone: '', amount: '' });
  const isIn = mode === 'in';
  const amount = parseFloat(v.amount) || 0;

  return (
    <MoneyWizard<CashValues>
      title={isIn ? 'Cash In' : 'Cash Out'}
      subtitle={isIn ? 'Deposit physical cash via a telebirr agent' : 'Withdraw cash from a telebirr agent'}
      values={v}
      onChange={setV}
      canContinue={(s) => s.phone.replace(/\D/g, '').length >= 4 && (parseFloat(s.amount) || 0) > 0 && (isIn || (parseFloat(s.amount) || 0) <= balance)}
      insufficientBalance={!isIn && amount > balance}
      headlineAmount={(s) => parseFloat(s.amount) || 0}
      fee={() => 0}
      renderForm={(s, set) => (
        <>
          <div className="field">
            <label htmlFor="cash-agent">Agent ID / phone</label>
            <input id="cash-agent" className="input" placeholder="e.g. A-2049" value={s.phone} onChange={(e) => set({ ...s, phone: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="cash-amount">Amount (ETB)</label>
            <input id="cash-amount" className="input amount-input" inputMode="decimal" placeholder="0.00" value={s.amount} onChange={(e) => set({ ...s, amount: e.target.value.replace(/[^\d.]/g, '') })} />
            <div className="chip-row">
              {[200, 500, 1000, 5000].map((n) => (
                <button key={n} className="chip" onClick={() => set({ ...s, amount: String(n) })}>{n}</button>
              ))}
            </div>
          </div>
        </>
      )}
      summary={(s) => [
        [isIn ? 'Agent' : 'Agent', s.phone],
        ['Direction', isIn ? 'Cash → wallet' : 'Wallet → cash'],
      ]}
      execute={(s, pin) => telebirrApi.walletTransfer({ amount: parseFloat(s.amount) || 0, pin, phone: s.phone })}
      recordOnSuccess={(s, reference) => ({
        type: 'cash',
        title: `${isIn ? 'Cash In' : 'Cash Out'} — Agent ${s.phone}`,
        subtitle: isIn ? 'Cash deposit via agent' : 'Cash withdrawal via agent',
        amount: isIn ? parseFloat(s.amount) || 0 : -(parseFloat(s.amount) || 0),
        status: 'success',
        reference,
        fee: 0,
      })}
      successTitle={isIn ? 'Cash deposited' : 'Cash withdrawn'}
      onClose={onClose}
    />
  );
}

/* =========================================================
 *  Pay for Merchants (incl. QR-simulated scan)
 * ========================================================= */
const DEMO_MERCHANTS = [
  { id: 'm1', name: 'Addis Coffee Roasters — Bole' },
  { id: 'm2', name: 'Queen Sheba Supermarket' },
  { id: 'm3', name: 'Zenith Pharmacy — Kazanchis' },
  { id: 'm4', name: 'Habesha 2000 Restaurant' },
];
interface MerchantValues { merchantId: string; amount: string }
export function MerchantPayFlow({ onClose, presetMerchantId }: { onClose: () => void; presetMerchantId?: string }) {
  const { balance } = useWallet();
  const [v, setV] = useState<MerchantValues>({ merchantId: presetMerchantId ?? DEMO_MERCHANTS[0].id, amount: '' });
  const merchant = DEMO_MERCHANTS.find((m) => m.id === v.merchantId) ?? DEMO_MERCHANTS[0];
  const amount = parseFloat(v.amount) || 0;

  return (
    <MoneyWizard<MerchantValues>
      title="Pay for Merchants"
      subtitle="Scan a merchant QR or pick a saved merchant"
      values={v}
      onChange={setV}
      canContinue={(s) => (parseFloat(s.amount) || 0) > 0 && (parseFloat(s.amount) || 0) <= balance}
      insufficientBalance={amount > balance}
      headlineAmount={(s) => parseFloat(s.amount) || 0}
      fee={() => 0}
      renderForm={(s, set) => (
        <>
          <div className="field">
            <label htmlFor="merchant-select">Merchant</label>
            <select id="merchant-select" className="input" value={s.merchantId} onChange={(e) => set({ ...s, merchantId: e.target.value })}>
              {DEMO_MERCHANTS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="merchant-amount">Amount (ETB)</label>
            <input id="merchant-amount" className="input amount-input" inputMode="decimal" placeholder="0.00" value={s.amount} onChange={(e) => set({ ...s, amount: e.target.value.replace(/[^\d.]/g, '') })} />
            <div className="chip-row">
              {[100, 250, 500, 1000].map((n) => (
                <button key={n} className="chip" onClick={() => set({ ...s, amount: String(n) })}>{n}</button>
              ))}
            </div>
          </div>
        </>
      )}
      summary={() => [
        ['Merchant', merchant.name],
        ['Method', 'telebirr merchant payment'],
      ]}
      execute={(s, pin) => telebirrApi.merchantPay({ amount: parseFloat(s.amount) || 0, pin, merchantId: s.merchantId, merchantName: merchant.name })}
      recordOnSuccess={(s, reference) => ({
        type: 'merchant',
        title: `Paid ${merchant.name.split(' — ')[0]}`,
        subtitle: 'Merchant payment',
        amount: -(parseFloat(s.amount) || 0),
        status: 'success',
        reference,
        fee: 0,
      })}
      successTitle="Payment successful"
      onClose={onClose}
    />
  );
}

/* =========================================================
 *  Bill payment (Ethio telecom bill / generic biller)
 * ========================================================= */
interface BillValues { billerId: string; account: string; amount: string }
export function BillPayFlow({ onClose, presetBillerId }: { onClose: () => void; presetBillerId?: string }) {
  const { balance } = useWallet();
  const [v, setV] = useState<BillValues>({ billerId: presetBillerId ?? 'telebirr-bill', account: '', amount: '' });
  const biller = PAYMENT_BILLERS.find((b) => b.id === v.billerId) ?? PAYMENT_BILLERS[0];
  const amount = parseFloat(v.amount) || 0;

  return (
    <MoneyWizard<BillValues>
      title={`Pay ${biller.name}`}
      subtitle="Settle bills directly from your telebirr balance"
      values={v}
      onChange={setV}
      canContinue={(s) => s.account.trim().length >= 4 && (parseFloat(s.amount) || 0) > 0 && (parseFloat(s.amount) || 0) + 5 <= balance}
      insufficientBalance={amount > 0 && amount + 5 > balance}
      headlineAmount={(s) => parseFloat(s.amount) || 0}
      fee={() => 5}
      renderForm={(s, set) => (
        <>
          <div className="field">
            <label htmlFor="bill-account">Account / customer number</label>
            <input id="bill-account" className="input" inputMode="numeric" placeholder="e.g. 0876543210" value={s.account} onChange={(e) => set({ ...s, account: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="bill-amount">Amount (ETB)</label>
            <input id="bill-amount" className="input amount-input" inputMode="decimal" placeholder="0.00" value={s.amount} onChange={(e) => set({ ...s, amount: e.target.value.replace(/[^\d.]/g, '') })} />
            <div className="chip-row">
              {[100, 250, 500, 1000].map((n) => (
                <button key={n} className="chip" onClick={() => set({ ...s, amount: String(n) })}>{n}</button>
              ))}
            </div>
          </div>
        </>
      )}
      summary={(s) => [
        ['Biller', biller.name],
        ['Account', s.account],
      ]}
      execute={(s, pin) => telebirrApi.billPay({ amount: parseFloat(s.amount) || 0, pin, billerId: s.billerId, account: s.account })}
      recordOnSuccess={(s, reference) => ({
        type: 'bill',
        title: `${biller.name} bill`,
        subtitle: `${biller.category} · ${s.account}`,
        amount: -(parseFloat(s.amount) || 0),
        status: 'success',
        reference,
        fee: 5,
      })}
      successTitle="Bill paid"
      onClose={onClose}
    />
  );
}

/* =========================================================
 *  Fuel payment
 * ========================================================= */
const FUEL_STATIONS = [
  { id: 'f1', name: 'NOC Bole Atlas — Bole Rd' },
  { id: 'f2', name: 'Total Kazanchis — Chad St' },
  { id: 'f3', name: 'NOC Kality — Ring Rd' },
  { id: 'f4', name: 'Oilibya CMC — Oromia Rd' },
];
interface FuelValues { stationId: string; liters: string; amount: string }
export function FuelFlow({ onClose }: { onClose: () => void }) {
  const { balance } = useWallet();
  const [v, setV] = useState<FuelValues>({ stationId: 'f1', liters: '', amount: '' });
  const station = FUEL_STATIONS.find((s) => s.id === v.stationId) ?? FUEL_STATIONS[0];
  const amount = parseFloat(v.amount) || 0;

  return (
    <MoneyWizard<FuelValues>
      title="Fuel Payment"
      subtitle="Pay at a participating fuel station — telebirr QR accepted"
      values={v}
      onChange={setV}
      canContinue={(s) => (parseFloat(s.amount) || 0) > 0 && (parseFloat(s.amount) || 0) <= balance}
      insufficientBalance={amount > balance}
      headlineAmount={(s) => parseFloat(s.amount) || 0}
      fee={() => 0}
      renderForm={(s, set) => (
        <>
          <div className="field">
            <label htmlFor="fuel-station">Station</label>
            <select id="fuel-station" className="input" value={s.stationId} onChange={(e) => set({ ...s, stationId: e.target.value })}>
              {FUEL_STATIONS.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="fuel-liters">Liters</label>
              <input id="fuel-liters" className="input" inputMode="decimal" placeholder="0" value={s.liters} onChange={(e) => set({ ...s, liters: e.target.value.replace(/[^\d.]/g, '') })} />
            </div>
            <div className="field">
              <label htmlFor="fuel-amount">Amount (ETB)</label>
              <input id="fuel-amount" className="input" inputMode="decimal" placeholder="0.00" value={s.amount} onChange={(e) => set({ ...s, amount: e.target.value.replace(/[^\d.]/g, '') })} />
            </div>
          </div>
        </>
      )}
      summary={(s) => [
        ['Station', station.name],
        ['Fuel', s.liters ? `${s.liters} L` : '—'],
      ]}
      execute={(s, pin) => telebirrApi.merchantPay({ amount: parseFloat(s.amount) || 0, pin, merchantId: s.stationId, merchantName: station.name })}
      recordOnSuccess={(s, reference) => ({
        type: 'merchant',
        title: `Fuel — ${station.name.split(' — ')[0]}`,
        subtitle: s.liters ? `${s.liters} liters` : 'Fuel payment',
        amount: -(parseFloat(s.amount) || 0),
        status: 'success',
        reference,
        fee: 0,
      })}
      successTitle="Fuel paid"
      onClose={onClose}
    />
  );
}

/* =========================================================
 *  QR scanner (simulated camera)
 * ========================================================= */
export function ScannerSheet({ onClose, onSimulatedScan }: { onClose: () => void; onSimulatedScan: () => void }) {
  return (
    <Sheet title="Scan QR" subtitle="Point your camera at a telebirr merchant or personal QR" onClose={onClose}>
      <div className="scanner">
        <div className="scanner-frame"><div className="scanner-line" /></div>
      </div>
      <p className="scanner-note">Camera is simulated in this demo — hold steady…</p>
      <button className="primary-btn" onClick={onSimulatedScan}>Simulate successful scan</button>
      <button className="ghost-btn" onClick={onClose}>Cancel</button>
    </Sheet>
  );
}

/* =========================================================
 *  EndeKise / trade-fair promo sheet
 * ========================================================= */
export function TradeFairSheet({ onClose, onNotify }: { onClose: () => void; onNotify: (msg: string) => void }) {
  return (
    <Sheet title="33rd Christmas Trade Fair" subtitle="Millennium Hall · Dec 24 – Jan 7" onClose={onClose}>
      <img src="/images/christmas.png" alt="33rd Christmas Trade Fair" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 220 }} />
      <p className="pill-note" style={{ textAlign: 'left', marginTop: 12 }}>
        telebirr users get free entry, EndeKise double-points on all fair purchases, and a dedicated
        cash-out booth at Gate B. Mention this screen at the entrance.
      </p>
      <button
        className="primary-btn"
        onClick={() => {
          onNotify('Trade fair voucher sent to your notifications');
          onClose();
        }}
      >
        Get my free entry voucher
      </button>
      <button className="ghost-btn" onClick={onClose}>Maybe later</button>
    </Sheet>
  );
}

/* =========================================================
 *  Nearby fuel stations
 * ========================================================= */
const NEARBY = [
  { name: 'NOC Bole Atlas — Bole Rd', distance: '0.8 km', price: '76.50 ETB/L' },
  { name: 'Total Kazanchis — Chad St', distance: '2.1 km', price: '76.50 ETB/L' },
  { name: 'Oilibya CMC — Oromia Rd', distance: '4.6 km', price: '76.50 ETB/L' },
];
export function NearbyStationsSheet({ onClose, onPay }: { onClose: () => void; onPay: () => void }) {
  return (
    <Sheet title="Nearby Fuel Stations" subtitle="Stations accepting telebirr payment near you" onClose={onClose}>
      {NEARBY.map((s) => (
        <div key={s.name} className="biller-item" style={{ cursor: 'default' }}>
          <span className="biller-ic">⛽</span>
          <span style={{ flex: 1 }}>
            <span className="b-name">{s.name}</span><br />
            <span className="b-cat">{s.distance} · {s.price}</span>
          </span>
          <button className="chip" onClick={onPay}>Pay</button>
        </div>
      ))}
      <p className="pill-note">Distances are illustrative. Real navigation requires location permission in the official app.</p>
    </Sheet>
  );
}

/* =========================================================
 *  Notifications
 * ========================================================= */
export function NotificationsSheet({ onClose, items }: { onClose: () => void; items: Array<{ id: string; title: string; body: string; date: number }> }) {
  const { markAllNotificationsRead } = useWallet();
  return (
    <Sheet title="Notifications" subtitle={`${items.length} unread`} onClose={onClose}>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {items.map((n) => (
          <div key={n.id} className="notif-item">
            <div className="n-t">{n.title}</div>
            <div className="n-b">{n.body}</div>
            <div className="n-time">{new Date(n.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="pill-note" style={{ padding: 24 }}>You’re all caught up. 🎉</p>
        )}
      </div>
      {items.length > 0 && (
        <button className="primary-btn" onClick={markAllNotificationsRead}>Mark all as read</button>
      )}
    </Sheet>
  );
}

/* =========================================================
 *  Transaction history
 * ========================================================= */
const FILTERS: Array<{ id: string; label: string; match: (t: Transaction) => boolean }> = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'out', label: 'Sent', match: (t) => t.amount < 0 && t.type === 'send' },
  { id: 'in', label: 'Received', match: (t) => t.amount > 0 },
  { id: 'bill', label: 'Bills', match: (t) => t.type === 'bill' },
  { id: 'airtime', label: 'Airtime', match: (t) => t.type === 'airtime' },
  { id: 'bank', label: 'Bank', match: (t) => t.type === 'bank' || t.type === 'wallet' },
  { id: 'merchant', label: 'Merchants', match: (t) => t.type === 'merchant' },
];

export function TransactionsSheet({ onClose }: { onClose: () => void }) {
  const { transactions, formatEtb } = useWallet();
  const [filter, setFilter] = useState('all');
  const shown = useMemo(
    () => transactions.filter(FILTERS.find((f) => f.id === filter)?.match ?? (() => true)),
    [transactions, filter],
  );

  const exportCsv = () => {
    const header = 'Date,Type,Description,Amount (ETB),Fee (ETB),Status,Reference';
    const rows = transactions.map((t) =>
      [
        new Date(t.date).toISOString(),
        t.type,
        `"${t.title.replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
        t.fee.toFixed(2),
        t.status,
        t.reference,
      ].join(','),
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'telebirr-statement.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet title="Transaction History" subtitle="Synced from this demo wallet" onClose={onClose}>
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button key={f.id} className={`filter-pill${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {shown.map((t) => (
          <div key={t.id} className={`txn-item${t.status === 'failed' ? ' failed' : ''}`}>
            <span className={`txn-ic ${t.amount >= 0 ? 'in' : 'out'}`}>
              {t.amount >= 0 ? <IconArrowDownLeft width={18} height={18} /> : <IconArrowDownLeft width={18} height={18} style={{ transform: 'rotate(180deg)' }} />}
            </span>
            <span className="txn-meta">
              <span className="t">{t.title}</span><br />
              <span className="s">{t.subtitle} · {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              {t.status === 'failed' && <span className="txn-status-failed"> · failed</span>}
            </span>
            <span className={`txn-amount ${t.amount >= 0 ? 'pos' : 'neg'}`}>
              {t.amount >= 0 ? '+' : '−'}{formatEtb(t.amount)}
            </span>
          </div>
        ))}
        {shown.length === 0 && <p className="pill-note" style={{ padding: 20 }}>No transactions in this filter yet.</p>}
      </div>
      <button className="ghost-btn" onClick={exportCsv}>Download statement (CSV)</button>
    </Sheet>
  );
}

/* =========================================================
 *  More services sheet
 * ========================================================= */
export function MoreSheet({ onClose, onPick }: { onClose: () => void; onPick: (id: string) => void }) {
  const items: Array<[string, string]> = [
    ['send', 'Send Money'],
    ['request', 'Request Money'],
    ['airtime', 'Airtime / Packages'],
    ['bank', 'Transfer to Bank'],
    ['wallet', 'Transfer to Wallet'],
    ['merchant', 'Pay for Merchants'],
    ['ethio-bill', 'Pay Ethio telecom Bill'],
    ['schedule', 'Schedule Payment'],
    ['fuel', 'Fuel Payment'],
    ['nearby', 'Nearby Fuel Stations'],
    ['tradefair', '33rd Christmas Trade Fair'],
  ];
  return (
    <Sheet title="More Services" subtitle="Everything else telebirr can do" onClose={onClose}>
      {items.map(([id, label]) => (
        <button key={id} className="settings-item" onClick={() => onPick(id)}>
          <span style={{ flex: 1 }}>{label}</span>
          <IconChevronRight width={18} height={18} color="#bbb" />
        </button>
      ))}
    </Sheet>
  );
}

/* =========================================================
 *  Scheduled payment sheet
 * ========================================================= */
export function ScheduleSheet({ onClose, onNotify }: { onClose: () => void; onNotify: (m: string) => void }) {
  const [title, setTitle] = useState('Ethio telecom postpaid');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [freq, setFreq] = useState('monthly');
  const valid = title.trim().length > 2 && (parseFloat(amount) || 0) > 0 && date;

  return (
    <Sheet title="Schedule Payment" subtitle="We will remind you on the due date — you confirm with PIN" onClose={onClose}>
      <div className="field">
        <label htmlFor="sch-title">Payment</label>
        <input id="sch-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="two-col">
        <div className="field">
          <label htmlFor="sch-amount">Amount (ETB)</label>
          <input id="sch-amount" className="input" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
        </div>
        <div className="field">
          <label htmlFor="sch-date">First date</label>
          <input id="sch-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="sch-freq">Repeat</label>
        <select id="sch-freq" className="input" value={freq} onChange={(e) => setFreq(e.target.value)}>
          <option value="once">Once</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <button
        className="primary-btn"
        disabled={!valid}
        onClick={() => {
          onNotify(`Scheduled “${title}” for ${new Date(date).toLocaleDateString()} (${freq})`);
          onClose();
        }}
      >
        Save reminder
      </button>
      <button className="ghost-btn" onClick={onClose}>Cancel</button>
    </Sheet>
  );
}
