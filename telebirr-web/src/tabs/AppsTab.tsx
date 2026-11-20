import { APPS_LIST } from '../data';

export default function AppsTab({ onOpenApp }: { onOpenApp: (name: string) => void }) {
  return (
    <div>
      <p className="pill-note" style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)', margin: '4px 2px 12px' }}>
        Partner mini-apps inside telebirr. These open in the full release; here they show what’s available.
      </p>
      <div className="apps-grid">
        {APPS_LIST.map((app) => (
          <button key={app.id} className="app-tile" onClick={() => onOpenApp(app.name)}>
            <span className="app-ic" style={{ background: app.color }}>{app.icon}</span>
            <span>{app.name}</span>
          </button>
        ))}
      </div>
      <div className="pill-note" style={{ marginTop: 16 }}>
        Ride · Shop · Trade · Donate — all inside one app.<br />
        New partners join every month.
      </div>
    </div>
  );
}
