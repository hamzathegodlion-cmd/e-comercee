import type { ReactNode } from 'react';
import { DEMO_USER } from '../data';
import { useWallet } from '../lib/WalletContext';
import {
  IconBank,
  IconBell,
  IconChevronRight,
  IconGlobe,
  IconReceipt,
  IconShield,
  IconHistory,
} from '../components/icons';

export default function AccountTab({
  onNotify,
  onReset,
  onLogout,
}: {
  onNotify: (m: string) => void;
  onReset: () => void;
  onLogout: () => void;
}) {
  const { endekise, reward, transactions, formatEtb } = useWallet();

  const settings: Array<{ icon: ReactNode; label: string; action: () => void }> = [
    { icon: <IconShield width={20} height={20} color="#6fa32c" />, label: 'Change telebirr PIN', action: () => onNotify('PIN changes are disabled in the demo') },
    { icon: <IconBank width={20} height={20} color="#0287d0" />, label: 'Linked bank accounts', action: () => onNotify('You have 2 linked accounts: CBE, Dashen') },
    { icon: <IconBell width={20} height={20} color="#f5820b" />, label: 'Notification settings', action: () => onNotify('Push, SMS and Telegram alerts are ON') },
    { icon: <IconGlobe width={20} height={20} color="#7b1fa2" />, label: 'Language — English', action: () => onNotify('Switch language from the home header') },
    { icon: <IconReceipt width={20} height={20} color="#00897b" />, label: 'Statements & limits', action: () => onNotify('Daily limit: 75,000 ETB · Monthly: 1,000,000 ETB') },
    { icon: <IconHistory width={20} height={20} color="#c62828" />, label: 'About this demo', action: () => onNotify('Unofficial UI recreation — not Ethio telecom') },
  ];

  return (
    <div>
      <div className="profile-card">
        <span className="big-avatar">B7</span>
        <span style={{ minWidth: 0 }}>
          <div className="p-name">{DEMO_USER.fullName}</div>
          <div className="p-phone">{DEMO_USER.phone}</div>
          <div className="p-phone" style={{ opacity: 0.85, marginTop: 2 }}>
            telebirr acct: {DEMO_USER.account} · verified ✓
          </div>
        </span>
      </div>

      <div className="two-col" style={{ marginTop: 12 }}>
        <div className="service-card" style={{ minHeight: 74, cursor: 'default' }}>
          <span className="s-label" style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: 10 }}>Endekise</span>
          <span style={{ fontWeight: 800, fontSize: 18 }}>{endekise.toLocaleString()} pts</span>
        </div>
        <div className="service-card" style={{ minHeight: 74, cursor: 'default' }}>
          <span className="s-label" style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: 10 }}>Rewards</span>
          <span style={{ fontWeight: 800, fontSize: 18 }}>{formatEtb(reward)}</span>
        </div>
      </div>

      <div className="settings-list">
        {settings.map((s) => (
          <button key={s.label} className="settings-item" onClick={s.action}>
            {s.icon}
            <span style={{ flex: 1 }}>{s.label}</span>
            <IconChevronRight width={18} height={18} color="#bbb" />
          </button>
        ))}
      </div>

      <button className="ghost-btn" style={{ marginTop: 14 }} onClick={onReset}>
        Reset demo data ({transactions.length} transactions)
      </button>
      <button className="logout-btn" onClick={onLogout}>Sign out</button>
    </div>
  );
}
