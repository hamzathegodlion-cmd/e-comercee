import { useEffect, useMemo, useState } from 'react';
import { WalletProvider, useWallet } from './lib/WalletContext';
import Header from './components/Header';
import GreenHeader from './components/GreenHeader';
import BottomNav from './components/BottomNav';
import Sheet from './components/Sheet';
import HomeTab from './tabs/HomeTab';
import PaymentTab from './tabs/PaymentTab';
import AppsTab from './tabs/AppsTab';
import AccountTab from './tabs/AccountTab';
import {
  AirtimeFlow,
  BankTransferFlow,
  BillPayFlow,
  CashFlow,
  FuelFlow,
  MerchantPayFlow,
  MoreSheet,
  NearbyStationsSheet,
  NotificationsSheet,
  RequestMoneyFlow,
  ScheduleSheet,
  ScannerSheet,
  SendMoneyFlow,
  TradeFairSheet,
  TransactionsSheet,
  WalletTransferFlow,
} from './flows';
import { DEMO_USER, NOTIFICATIONS } from './data';
import type { Lang, TabId } from './types';
import { IconChevronRight, IconQr, IconSearch } from './components/icons';

/* Searchable catalog of every service in the app */
const SERVICE_INDEX: Array<{ id: string; label: string; keywords: string }> = [
  { id: 'send', label: 'Send Money', keywords: 'send transfer birr mobile wallet person' },
  { id: 'cash', label: 'Cash In / Cash Out', keywords: 'cash deposit withdraw agent in out' },
  { id: 'airtime', label: 'Airtime / Packages', keywords: 'airtime data internet bundle phone topup mobile' },
  { id: 'request', label: 'Request Money', keywords: 'request receive qr code ask' },
  { id: 'dashen', label: 'Financial Service With Dashen', keywords: 'dashen bank loan transfer' },
  { id: 'cbe', label: 'Financial Service With CBE', keywords: 'cbe commercial bank ethiopia transfer' },
  { id: 'merchant', label: 'Pay for Merchants', keywords: 'merchant shop store pay qr buy' },
  { id: 'apps', label: 'Apps', keywords: 'apps mini programs partners' },
  { id: 'tradefair', label: '33rd Christmas Trade Fair', keywords: 'trade fair christmas event millennium' },
  { id: 'ethio-bill', label: 'Pay Ethio telecom Bill', keywords: 'ethio telecom postpaid bill phone utility' },
  { id: 'schedule', label: 'Schedule Payment', keywords: 'schedule recurring reminder autopay plan' },
  { id: 'bank', label: 'Transfer to Bank', keywords: 'bank transfer cbe dashen awash' },
  { id: 'wallet', label: 'Transfer to Wallet', keywords: 'wallet transfer send person phone' },
  { id: 'fuel', label: 'Fuel Payment', keywords: 'fuel petrol gas station noc total' },
  { id: 'nearby', label: 'Nearby Fuel Station', keywords: 'fuel station nearby location map' },
  { id: 'transactions', label: 'Transaction Details', keywords: 'history transactions statement receipt' },
  { id: 'more', label: 'More Services', keywords: 'more all services' },
];

function Toast({ message }: { message: string }) {
  return <div className="toast" role="status">{message}</div>;
}

function TabHeader({ title }: { title: string }) {
  return (
    <div style={{ background: '#fff', padding: '14px 16px', fontWeight: 800, fontSize: 17, borderBottom: '1px solid #efefef' }}>
      {title}
    </div>
  );
}

function SearchSheet({ onClose, onPick }: { onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const hits = query
    ? SERVICE_INDEX.filter((s) => s.label.toLowerCase().includes(query) || s.keywords.includes(query))
    : SERVICE_INDEX;
  return (
    <Sheet title="Search" subtitle="Find any service instantly" onClose={onClose}>
      <div className="field" style={{ position: 'relative' }}>
        <IconSearch width={17} height={17} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
        <input
          autoFocus
          className="input"
          style={{ paddingLeft: 38 }}
          placeholder="Try “send”, “airtime”, “fuel”…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search services"
        />
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {hits.map((s) => (
          <button key={s.id} className="settings-item" onClick={() => onPick(s.id)}>
            <span style={{ flex: 1 }}>{s.label}</span>
            <IconChevronRight width={18} height={18} color="#bbb" />
          </button>
        ))}
        {hits.length === 0 && <p className="pill-note">No services match “{q}”.</p>}
      </div>
    </Sheet>
  );
}

function CashChoiceSheet({ onClose, onPick }: { onClose: () => void; onPick: (mode: 'in' | 'out') => void }) {
  return (
    <Sheet title="Cash In / Out" subtitle="Deposit or withdraw physical cash via any agent" onClose={onClose}>
      <button className="settings-item" style={{ background: '#f4faf0', borderRadius: 12, marginBottom: 10, border: '1.5px solid var(--green)' }} onClick={() => onPick('in')}>
        <span style={{ fontSize: 22 }}>⬇️</span>
        <span style={{ flex: 1 }}>
          <strong>Cash In</strong><br />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Deposit cash into your wallet at an agent</span>
        </span>
        <IconChevronRight width={18} height={18} color="#6fa32c" />
      </button>
      <button className="settings-item" style={{ background: '#fdf6ec', borderRadius: 12, border: '1.5px solid var(--amber)' }} onClick={() => onPick('out')}>
        <span style={{ fontSize: 22 }}>⬆️</span>
        <span style={{ flex: 1 }}>
          <strong>Cash Out</strong><br />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Withdraw cash from your wallet at an agent</span>
        </span>
        <IconChevronRight width={18} height={18} color="#c25700" />
      </button>
    </Sheet>
  );
}

function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
  const [phone, setPhone] = useState(DEMO_USER.shortCode.replace(/\s/g, ''));
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(165deg, #8cca3b 0%, #4c7a1f 100%)', padding: 28, textAlign: 'center' }}>
      <img src="/images/telebirr.png" alt="telebirr" width={120} style={{ background: '#fff', borderRadius: 20, padding: 12 }} />
      <h1 style={{ color: '#fff', fontSize: 22, margin: '18px 0 4px' }}>Welcome to telebirr</h1>
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: '0 0 18px' }}>One app for all your needs</p>
      <div className="card" style={{ background: '#fff', borderRadius: 16, padding: 18, width: '100%' }}>
        <label htmlFor="login-phone" style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Mobile number</label>
        <input id="login-phone" className="input" style={{ marginTop: 6 }} inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))} />
        <button className="primary-btn" style={{ marginTop: 12 }} onClick={onSignIn}>Sign in with OTP</button>
        <p className="pill-note">Unofficial demo — no real OTP is sent. Any number works.</p>
      </div>
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabId>('home');
  const [lang, setLang] = useState<Lang>('en');
  const [active, setActive] = useState<string | null>(null);
  const [billerPreset, setBillerPreset] = useState('telebirr-bill');
  const [merchantPreset, setMerchantPreset] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const { readNotificationIds, resetDemo } = useWallet();

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = (m: string) => setToast(m);
  const unread = Math.max(0, NOTIFICATIONS.length - readNotificationIds.length);
  const unreadItems = useMemo(
    () => NOTIFICATIONS.filter((n) => !readNotificationIds.includes(n.id)),
    [readNotificationIds],
  );

  const openService = (id: string) => {
    switch (id) {
      case 'apps':
        setTab('apps');
        return;
      case 'transactions':
        setActive('transactions');
        return;
      default:
        setActive(id);
    }
  };

  const close = () => setActive(null);

  if (loggedOut) {
    return (
      <div className="phone">
        <div className="demo-ribbon">Unofficial demo · Not Ethio telecom</div>
        <LoginScreen onSignIn={() => setLoggedOut(false)} />
      </div>
    );
  }

  return (
    <div className="phone">
      <Header />
      {tab === 'home' ? (
        <GreenHeader
          lang={lang}
          onChangeLang={setLang}
          unread={unread}
          onOpenNotifications={() => setActive('notifications')}
          onOpenSearch={() => setActive('search')}
        />
      ) : (
        <TabHeader title={tab === 'payment' ? 'Payments & Bills' : tab === 'apps' ? 'Mini Apps' : 'Account'} />
      )}

      <main className="screen-scroll">
        {tab === 'home' && <HomeTab onService={openService} />}
        {tab === 'payment' && (
          <PaymentTab
            onBill={(billerId) => {
              setBillerPreset(billerId);
              setActive('bill');
            }}
          />
        )}
        {tab === 'apps' && (
          <AppsTab onOpenApp={(name) => showToast(`${name} — partner app, opens in the full release`)} />
        )}
        {tab === 'account' && (
          <AccountTab
            onNotify={showToast}
            onReset={() => {
              resetDemo();
              showToast('Demo wallet reset to seed data');
            }}
            onLogout={() => setLoggedOut(true)}
          />
        )}
      </main>

      {tab === 'home' && (
        <div className="scan-fab">
          <button onClick={() => setActive('scanner')} aria-label="Scan QR">
            <IconQr width={24} height={24} />
            Scan QR
          </button>
        </div>
      )}

      <BottomNav tab={tab} onChange={setTab} />
      {toast && <Toast message={toast} />}

      {/* ---------- overlays ---------- */}
      {active === 'send' && <SendMoneyFlow onClose={close} />}
      {active === 'cash' && <CashChoiceSheet onClose={close} onPick={(m) => setActive(m === 'in' ? 'cash-in' : 'cash-out')} />}
      {active === 'cash-in' && <CashFlow mode="in" onClose={close} />}
      {active === 'cash-out' && <CashFlow mode="out" onClose={close} />}
      {active === 'airtime' && <AirtimeFlow onClose={close} />}
      {active === 'request' && <RequestMoneyFlow onClose={close} />}
      {active === 'dashen' && <BankTransferFlow presetBank="dashen" onClose={close} />}
      {active === 'cbe' && <BankTransferFlow presetBank="cbe" onClose={close} />}
      {active === 'bank' && <BankTransferFlow onClose={close} />}
      {active === 'wallet' && <WalletTransferFlow onClose={close} />}
      {active === 'merchant' && <MerchantPayFlow presetMerchantId={merchantPreset} onClose={close} />}
      {active === 'ethio-bill' && <BillPayFlow presetBillerId="telebirr-bill" onClose={close} />}
      {active === 'bill' && <BillPayFlow presetBillerId={billerPreset} onClose={close} />}
      {active === 'fuel' && <FuelFlow onClose={close} />}
      {active === 'schedule' && <ScheduleSheet onClose={close} onNotify={showToast} />}
      {active === 'nearby' && <NearbyStationsSheet onClose={close} onPay={() => setActive('fuel')} />}
      {active === 'tradefair' && <TradeFairSheet onClose={close} onNotify={showToast} />}
      {active === 'more' && <MoreSheet onClose={close} onPick={(id) => setActive(id)} />}
      {active === 'scanner' && <ScannerSheet onClose={close} onSimulatedScan={() => {
        setMerchantPreset('m1');
        setActive('merchant');
      }} />}
      {active === 'transactions' && <TransactionsSheet onClose={close} />}
      {active === 'notifications' && <NotificationsSheet onClose={close} items={unreadItems} />}
      {active === 'search' && <SearchSheet onClose={close} onPick={openService} />}
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <Shell />
    </WalletProvider>
  );
}
