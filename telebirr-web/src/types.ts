export type TxnType =
  | 'send'
  | 'receive'
  | 'airtime'
  | 'bill'
  | 'bank'
  | 'wallet'
  | 'merchant'
  | 'cash'
  | 'reward';

export interface Transaction {
  id: string;
  type: TxnType;
  title: string;
  subtitle: string;
  amount: number; // positive = received, negative = paid
  date: number; // epoch ms
  status: 'success' | 'pending' | 'failed';
  reference: string;
  fee: number;
}

export interface DemoNotification {
  id: string;
  title: string;
  body: string;
  date: number;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  initials: string;
  color: string;
}

export interface BankOption {
  id: string;
  name: string;
  logo?: string;
  eta: string;
}

export type TabId = 'home' | 'payment' | 'apps' | 'account';

export type Lang = 'en' | 'am';
