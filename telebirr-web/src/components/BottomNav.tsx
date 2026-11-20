import type { TabId } from '../types';
import { IconApps, IconHome, IconPayment, IconUser } from './icons';
import type { ReactNode } from 'react';

const TABS: Array<{ id: TabId; label: string; icon: () => ReactNode }> = [
  { id: 'home', label: 'Home', icon: () => <IconHome width={22} height={22} /> },
  { id: 'payment', label: 'Payment', icon: () => <IconPayment width={22} height={22} /> },
  { id: 'apps', label: 'Apps', icon: () => <IconApps width={22} height={22} /> },
  { id: 'account', label: 'Account', icon: () => <IconUser width={22} height={22} /> },
];

export default function BottomNav({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`nav-item${tab === t.id ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
        >
          {t.icon()}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
