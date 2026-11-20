import { useState } from 'react';
import { PAYMENT_BILLERS } from '../data';
import { IconChevronRight, IconSearch } from '../components/icons';

export default function PaymentTab({ onBill }: { onBill: (billerId: string) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const billers = PAYMENT_BILLERS.filter(
    (b) => !q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q),
  );

  return (
    <div>
      <p className="pill-note" style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)', margin: '4px 2px 12px' }}>
        Pay utilities, subscriptions and government fees straight from your telebirr balance.
      </p>

      <div className="field" style={{ position: 'relative' }}>
        <IconSearch width={17} height={17} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
        <input
          className="input"
          style={{ paddingLeft: 38 }}
          placeholder="Search billers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search billers"
        />
      </div>

      {billers.map((b) => (
        <button key={b.id} className="biller-item" onClick={() => onBill(b.id)}>
          <span className="biller-ic">{b.logo}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="b-name">{b.name}</span><br />
            <span className="b-cat">{b.category}</span>
          </span>
          <IconChevronRight width={18} height={18} color="#bbb" />
        </button>
      ))}
      {billers.length === 0 && <p className="pill-note">No billers match “{query}”.</p>}
    </div>
  );
}
