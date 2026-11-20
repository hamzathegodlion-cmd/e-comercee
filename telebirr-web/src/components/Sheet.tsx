import type { ReactNode } from 'react';
import { IconClose } from './icons';

export default function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-title">
          <span>{title}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ color: '#555' }}>
            <IconClose width={22} height={22} />
          </button>
        </div>
        {subtitle && <p className="sheet-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
