import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

export const IconWallet = (p: P) => (
  <svg {...base} {...p}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
);

export const IconCashInOut = (p: P) => (
  <svg {...base} {...p}><path d="M12 3v18" /><path d="m8 7 4-4 4 4" /><path d="m8 17 4 4 4-4" /><rect x="2" y="9" width="20" height="6" rx="2" /></svg>
);

export const IconMegaphone = (p: P) => (
  <svg {...base} {...p}><path d="m3 11 18-5v12L3 14v-3Z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
);

export const IconHands = (p: P) => (
  <svg {...base} {...p}><path d="M11 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-6" /><path d="M13 12V6.5a1.5 1.5 0 0 0-3 0V12" /><path d="M10 12V8.5a1.5 1.5 0 0 0-3 0V14c0 4 2 6 6 6s6-2 6-6v-1a2 2 0 0 0-2-2h-2" /></svg>
);

export const IconStore = (p: P) => (
  <svg {...base} {...p}><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M9 21v-6h6v6" /><path d="M3 9h18" /></svg>
);

export const IconGrid = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);

export const IconCalendar = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
);

export const IconBank = (p: P) => (
  <svg {...base} {...p}><path d="M3 9l9-6 9 6" /><path d="M5 9v10M9.5 9v10M14.5 9v10M19 9v10" /><path d="M3 19h18M2 22h20" /></svg>
);

export const IconPayments = (p: P) => (
  <svg {...base} {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20" /><circle cx="7" cy="14.5" r="0.5" fill="currentColor" /></svg>
);

export const IconFuel = (p: P) => (
  <svg {...base} {...p}><path d="M5 21V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v16" /><path d="M3 21h12" /><path d="M13 9h3l3 4v5a1.5 1.5 0 0 1-3 0v-3" /><path d="M7.5 7h3" /></svg>
);

export const IconLocation = (p: P) => (
  <svg {...base} {...p}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
);

export const IconPlusCircle = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
);

export const IconSearch = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);

export const IconBell = (p: P) => (
  <svg {...base} {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);

export const IconEye = (p: P) => (
  <svg {...base} {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
);

export const IconEyeOff = (p: P) => (
  <svg {...base} {...p}><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="m2 2 20 20" /><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 8 10 8a9.74 9.74 0 0 0 5.39-1.61" /></svg>
);

export const IconHome = (p: P) => (
  <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></svg>
);

export const IconPayment = (p: P) => (
  <svg {...base} {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /><path d="M6 15h4" /></svg>
);

export const IconApps = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M17.5 14v7M14 17.5h7" /></svg>
);

export const IconUser = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="4.5" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>
);

export const IconChevronRight = (p: P) => (
  <svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>
);

export const IconQr = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14h.01M14 21h.01M18 18h3v3" /></svg>
);

export const IconArrowUpRight = (p: P) => (
  <svg {...base} {...p}><path d="M7 17 17 7M9 7h8v8" /></svg>
);

export const IconArrowDownLeft = (p: P) => (
  <svg {...base} {...p}><path d="M17 7 7 17M15 17H7V9" /></svg>
);

export const IconCheck = (p: P) => (
  <svg {...base} {...p} strokeWidth={3}><path d="m4 12.5 5.5 5.5L20 6.5" /></svg>
);

export const IconClose = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);

export const IconShare = (p: P) => (
  <svg {...base} {...p}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 13.2 7.6 4.4M15.8 6.4l-7.6 4.4" /></svg>
);

export const IconShield = (p: P) => (
  <svg {...base} {...p}><path d="M12 3 5 6v6c0 5 3.5 8.5 7 9.5 3.5-1 7-4.5 7-9.5V6l-7-3Z" /><path d="m9.5 12 2 2 3.5-3.5" /></svg>
);

export const IconGlobe = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
);

export const IconDownload = (p: P) => (
  <svg {...base} {...p}><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 21h16" /></svg>
);

export const IconHistory = (p: P) => (
  <svg {...base} {...p}><path d="M3 12a9 9 0 1 0 2.6-6.3L3 8.3" /><path d="M3 3v5.3h5.3" /><path d="M12 8v4l3 2" /></svg>
);

export const IconSignal = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><rect x="2" y="14" width="4" height="6" rx="1" /><rect x="8" y="10" width="4" height="10" rx="1" /><rect x="14" y="6" width="4" height="14" rx="1" /><rect x="20" y="2" width="2" height="18" rx="1" opacity="0.35" /></svg>
);

export const IconWifi = (p: P) => (
  <svg {...base} {...p}><path d="M5 10a10 10 0 0 1 14 0" /><path d="M8.5 13.5a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="17.5" r="0.5" fill="currentColor" /></svg>
);

export const IconBattery = (p: P) => (
  <svg {...base} {...p}><rect x="2" y="8" width="16" height="8" rx="2" /><path d="M22 11v2" /><rect x="4.5" y="10.5" width="8" height="3" rx="0.8" fill="currentColor" stroke="none" /></svg>
);

export const IconBanknote = (p: P) => (
  <svg {...base} {...p}><rect x="2" y="7" width="20" height="10" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 12h.01M18 12h.01" /></svg>
);

export const IconReceipt = (p: P) => (
  <svg {...base} {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" /><path d="M9.5 7h5M9.5 11h5M9.5 15h3" /></svg>
);
