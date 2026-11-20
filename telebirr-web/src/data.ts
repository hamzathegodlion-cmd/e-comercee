import type { BankOption, Contact, DemoNotification, Transaction } from './types';

const now = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const DEMO_USER = {
  name: 'BirukBr7',
  fullName: 'Biruk Bereket',
  phone: '+251 91 234 5678',
  account: '251912345678',
  shortCode: '251 91 234 5678',
  endekisePoints: 1430,
  rewardEtb: 57.5,
};

export const SEED_BALANCE = 25_430.5;

export const SEED_TRANSACTIONS: Transaction[] = [
  { id: 't-001', type: 'send', title: 'Sent to Abebe Kebede', subtitle: 'Mobile · 0911 223 344', amount: -1500, date: now - 35 * MIN, status: 'success', reference: 'FTT26A1B2C3D4', fee: 3 },
  { id: 't-002', type: 'receive', title: 'Received from Sara Tesfaye', subtitle: 'Mobile · 0914 556 677', amount: 4200, date: now - 3 * HOUR, status: 'success', reference: 'FTT26B7E8F9A0', fee: 0 },
  { id: 't-003', type: 'airtime', title: 'Airtime — +251 91 234 5678', subtitle: 'Ethio telecom · 50 ETB', amount: -50, date: now - 7 * HOUR, status: 'success', reference: 'FTT26C1D2E3F4', fee: 0 },
  { id: 't-004', type: 'bill', title: 'Electric Bill — Ethiopian Electric Utility', subtitle: 'EEU · Prepaid 0876543210', amount: -750, date: now - 1 * DAY, status: 'success', reference: 'FTT26D5A6B7C8', fee: 5 },
  { id: 't-005', type: 'bank', title: 'Transfer to CBE — 1000…4432', subtitle: 'Commercial Bank of Ethiopia', amount: -2000, date: now - 1 * DAY - 5 * HOUR, status: 'success', reference: 'FTT26E9F0A1B2', fee: 10 },
  { id: 't-006', type: 'merchant', title: 'Paid Addis Coffee Roasters', subtitle: 'Merchant · Bole · QR', amount: -320, date: now - 2 * DAY, status: 'success', reference: 'FTT26F3C4D5E6', fee: 0 },
  { id: 't-007', type: 'cash', title: 'Cash In — Agent #A-2049', subtitle: 'Cash deposit via agent', amount: 10000, date: now - 3 * DAY, status: 'success', reference: 'FTT26A7B8C9D0', fee: 0 },
  { id: 't-008', type: 'reward', title: 'EndeKise reward credit', subtitle: 'Promotion · 33rd Trade Fair', amount: 57.5, date: now - 4 * DAY, status: 'success', reference: 'FTT26B1C2D3E4', fee: 0 },
  { id: 't-009', type: 'wallet', title: 'Transfer to wallet — +251 93 777 8899', subtitle: 'telebirr wallet', amount: -800, date: now - 5 * DAY, status: 'failed', reference: 'FTT26C5D6E7F8', fee: 0 },
];

export const CONTACTS: Contact[] = [
  { id: 'c1', name: 'Abebe Kebede', phone: '0911223344', initials: 'AK', color: '#0287d0' },
  { id: 'c2', name: 'Sara Tesfaye', phone: '0914556677', initials: 'ST', color: '#8cca3b' },
  { id: 'c3', name: 'Dawit Haile', phone: '0919001122', initials: 'DH', color: '#f5820b' },
  { id: 'c4', name: 'Hanna Girma', phone: '0923112233', initials: 'HG', color: '#7b1fa2' },
  { id: 'c5', name: 'Mekdes Alemu', phone: '0933445566', initials: 'MA', color: '#00897b' },
  { id: 'c6', name: 'Yonas Tadesse', phone: '0944556677', initials: 'YT', color: '#c62828' },
];

export const BANKS: BankOption[] = [
  { id: 'cbe', name: 'Commercial Bank of Ethiopia', logo: '/images/cbe.png', eta: 'Instant' },
  { id: 'dashen', name: 'Dashen Bank', logo: '/images/dashen.png', eta: 'Instant' },
  { id: 'awash', name: 'Awash Bank', eta: '~5 minutes' },
  { id: 'abyssinia', name: 'Bank of Abyssinia', eta: '~5 minutes' },
  { id: 'zemen', name: 'Zemen Bank', eta: '~10 minutes' },
  { id: 'nib', name: 'Nib International Bank', eta: '~10 minutes' },
];

export const NOTIFICATIONS: DemoNotification[] = Array.from({ length: 23 }, (_, i) => {
  const templates: Array<[string, string]> = [
    ['Send & receive instantly', 'Transfer ETB to any telebirr user or linked bank account in seconds.'],
    ['EndeKise rewards', 'You earned 25 EndeKise points on your last payment. Keep going!'],
    ['33rd Christmas Trade Fair', 'Free transport vouchers for telebirr users at the Millennium Hall.'],
    ['Security reminder', 'Never share your telebirr PIN. We will never call asking for it.'],
    ['Pay your Ethio telecom bill', 'Settle your postpaid bill directly from telebirr — zero extra charge.'],
    ['Fuel near you', 'New fuel stations accepting telebirr QR are now live in Bole and Kazanchis.'],
  ];
  const [title, body] = templates[i % templates.length];
  return {
    id: `n-${i + 1}`,
    title,
    body,
    date: now - (i + 1) * 3 * HOUR,
  };
});

export const BANNERS = ['/images/banner-1.jpg', '/images/banner-2.jpg', '/images/banner-3.jpg'];

export const PAYMENT_BILLERS = [
  { id: 'eeu', name: 'Ethiopian Electric Utility', category: 'Utilities', logo: '⚡' },
  { id: 'telebirr-bill', name: 'Ethio telecom Postpaid', category: 'Telecom', logo: '☎' },
  { id: 'aawt', name: 'Addis Ababa Water & Sewerage', category: 'Utilities', logo: '💧' },
  { id: 'dstv', name: 'DSTV', category: 'TV & Media', logo: '📺' },
  { id: 'ethio-insurance', name: 'Nyala Insurance', category: 'Insurance', logo: '🛡' },
  { id: 'awash-insurance', name: 'Awash Insurance', category: 'Insurance', logo: '🛡' },
  { id: 'traffic', name: 'Traffic Fines', category: 'Government', logo: '🚦' },
  { id: 'tuition', name: 'AAU Tuition Fees', category: 'Education', logo: '🎓' },
];

export const APPS_LIST = [
  { id: 'a1', name: 'Airtime +Data', icon: '📱', color: '#e3f4d0' },
  { id: 'a2', name: 'HelloCash Agent', icon: '🏧', color: '#fdf3d8' },
  { id: 'a3', name: 'Ethio telecom CBE Birr', icon: '🏦', color: '#e0f0fb' },
  { id: 'a4', name: 'RIDE Rides', icon: '🚕', color: '#ffe8d6' },
  { id: 'a5', name: 'Zmall E-commerce', icon: '🛒', color: '#efe4fb' },
  { id: 'a6', name: 'Zemen Bank Trade', icon: '📈', color: '#e6f7f5' },
  { id: 'a7', name: 'Asbeza Shopping', icon: '🧺', color: '#fde6ec' },
  { id: 'a8', name: 'Ethio Football', icon: '⚽', color: '#e9efe6' },
  { id: 'a9', name: 'Donation', icon: '🤝', color: '#eef3ff' },
  { id: 'a10', name: 'FuelFinder', icon: '⛽', color: '#fff4cc' },
  { id: 'a11', name: 'Trade Fair 2024', icon: '🎪', color: '#f3e8ff' },
  { id: 'a12', name: 'More Apps', icon: '➕', color: '#f0f0f0' },
];

export const INITIAL_STATE = {
  balance: SEED_BALANCE,
  endekise: DEMO_USER.endekisePoints,
  reward: DEMO_USER.rewardEtb,
};
