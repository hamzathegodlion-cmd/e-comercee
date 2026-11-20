import type { ReactNode } from 'react';

export interface ServiceItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string;
}

export default function ServicesGrid({
  items,
  onSelect,
}: {
  items: ServiceItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid">
      {items.map((item) => (
        <button key={item.id} className="service-card" onClick={() => onSelect(item.id)}>
          <span className="service-icon" style={{ position: 'relative' }}>
            {item.icon}
            {item.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: -10,
                  right: -18,
                  background: '#f5b800',
                  color: '#3a2b00',
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '2px 5px',
                  borderRadius: 6,
                  border: '1px solid #fff',
                }}
              >
                {item.badge}
              </span>
            )}
          </span>
          <span className="s-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
