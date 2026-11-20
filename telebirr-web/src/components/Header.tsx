import { useEffect, useState } from 'react';
import { IconBattery, IconSignal, IconWifi } from './icons';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function StatusBar() {
  const now = useClock();
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
  return (
    <div className="statusbar" aria-hidden="true">
      <span>{time}</span>
      <span className="sb-icons">
        <IconSignal width={14} height={14} />
        <IconWifi width={14} height={14} />
        <IconBattery width={16} height={16} />
      </span>
    </div>
  );
}

export function AppBar() {
  return (
    <header className="appbar">
      <img className="ethio" src="/images/ethio.png" alt="Ethio telecom" draggable={false} />
      <img className="telebirr" src="/images/telebirr.png" alt="telebirr" draggable={false} />
    </header>
  );
}

export default function Header() {
  return (
    <>
      <div className="demo-ribbon">Unofficial demo · Not Ethio telecom</div>
      <StatusBar />
      <AppBar />
    </>
  );
}
