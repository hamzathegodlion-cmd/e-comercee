import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { INITIAL_STATE, SEED_TRANSACTIONS } from '../data';
import type { Transaction } from '../types';

const STORAGE_KEY = 'telebirr-demo-state-v1';

interface PersistedState {
  balance: number;
  endekise: number;
  reward: number;
  transactions: Transaction[];
  readNotificationIds: string[];
}

interface WalletContextValue extends PersistedState {
  addTransaction: (txn: Omit<Transaction, 'id' | 'date'>) => Transaction;
  markAllNotificationsRead: () => void;
  resetDemo: () => void;
  formatEtb: (n: number) => string;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function loadInitial(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (typeof parsed.balance === 'number' && Array.isArray(parsed.transactions)) {
        return parsed;
      }
    }
  } catch {
    // fall through to defaults
  }
  return {
    ...INITIAL_STATE,
    transactions: SEED_TRANSACTIONS,
    readNotificationIds: [],
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => loadInitial());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable in private mode; demo continues in memory
    }
  }, [state]);

  const addTransaction = useCallback<WalletContextValue['addTransaction']>((txn) => {
    const record: Transaction = {
      ...txn,
      id: `t-${Date.now()}`,
      date: Date.now(),
    };
    setState((s) => ({
      ...s,
      balance: Math.max(0, s.balance + record.amount),
      transactions: [record, ...s.transactions],
    }));
    return record;
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((s) => ({
      ...s,
      readNotificationIds: Array.from(
        new Set([...s.readNotificationIds, ...Array.from({ length: 23 }, (_, i) => `n-${i + 1}`)]),
      ),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    setState({
      ...INITIAL_STATE,
      transactions: SEED_TRANSACTIONS,
      readNotificationIds: [],
    });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const formatEtb = useCallback((n: number) => {
    return `ETB ${Math.abs(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      ...state,
      addTransaction,
      markAllNotificationsRead,
      resetDemo,
      formatEtb,
    }),
    [state, addTransaction, markAllNotificationsRead, resetDemo, formatEtb],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
