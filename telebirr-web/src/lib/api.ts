/**
 * telebirr API layer.
 * -------------------
 * Today every call is served by a local simulation (see `simulate` below),
 * because there is no public Telebirr API available to unofficial clients.
 *
 * To go live later (requires a formal integration agreement / merchant
 * credentials from Ethio Telecom), set the environment variables:
 *
 *   VITE_TELEBIRR_API_URL   e.g. https://api.telebirr.et/...   (base URL)
 *   VITE_TELEBIRR_API_KEY   your issued API key / token
 *
 * then `USE_LIVE_BACKEND` flips on automatically and every method below
 * performs a real HTTPS call to `${VITE_TELEBIRR_API_URL}${path}` with the
 * `Authorization: Bearer ${VITE_TELEBIRR_API_KEY}` header.
 *
 * The PIN is never stored, never persisted, and is only ever passed in the
 * request body to the (currently simulated) endpoint, exactly as a live
 * integration would do over TLS. In demo mode the PIN never leaves memory.
 *
 * NOTE: No real Telebirr production endpoint is publicly documented for
 * third-party apps. Do NOT point this at production without written
 * authorization from Ethio Telecom.
 */

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  reference?: string;
}

export interface MoneyRequest {
  /** amount in ETB */
  amount: number;
  /** 6-digit PIN, held in memory only */
  pin: string;
  note?: string;
}

export interface SendMoneyRequest extends MoneyRequest {
  recipientPhone: string;
  recipientName: string;
}

export interface AirtimeRequest extends MoneyRequest {
  phone: string;
  packageId: string;
}

export interface BankTransferRequest extends MoneyRequest {
  bankId: string;
  accountNumber: string;
}

export interface WalletTransferRequest extends MoneyRequest {
  phone: string;
}

export interface MerchantPayRequest extends MoneyRequest {
  merchantId: string;
  merchantName: string;
}

export interface BillPayRequest extends MoneyRequest {
  billerId: string;
  account: string;
}

const API_URL: string | undefined = import.meta.env?.VITE_TELEBIRR_API_URL;
const API_KEY: string | undefined = import.meta.env?.VITE_TELEBIRR_API_KEY;
export const USE_LIVE_BACKEND = Boolean(API_URL);

function makeReference(): string {
  // FTT + base-36 timestamp + random segment, mirroring telebirr-style receipt refs
  const t = Date.now().toString(36).toUpperCase().padStart(9, '0').slice(-9);
  const r = Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()
    .padStart(2, '0');
  return `FTT${t}${r}`.slice(0, 13);
}

async function livePost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.message ?? `HTTP ${res.status}` };
    return { ok: true, data: json as T, reference: (json as { reference?: string })?.reference };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Simulates network latency + a deterministic-feel demo response. */
function simulate<T>(build: () => { data: T; reference: string }): Promise<ApiResult<T>> {
  const delay = 700 + Math.random() * 700;
  return new Promise((resolve) =>
    setTimeout(() => {
      const { data, reference } = build();
      resolve({ ok: true, data, reference });
    }, delay),
  );
}

export const telebirrApi = {
  /** Send money to another telebirr wallet */
  sendMoney(req: SendMoneyRequest): Promise<ApiResult<{ status: string }>> {
    if (USE_LIVE_BACKEND) return livePost('/v1/transfer/wallet', req);
    return simulate(() => ({ data: { status: 'COMPLETED' }, reference: makeReference() }));
  },
  /** Buy airtime / data package */
  buyAirtime(req: AirtimeRequest): Promise<ApiResult<{ status: string }>> {
    if (USE_LIVE_BACKEND) return livePost('/v1/airtime/purchase', req);
    return simulate(() => ({ data: { status: 'COMPLETED' }, reference: makeReference() }));
  },
  /** Transfer to a linked bank account (CBE, Dashen, ...) */
  bankTransfer(req: BankTransferRequest): Promise<ApiResult<{ status: string }>> {
    if (USE_LIVE_BACKEND) return livePost('/v1/transfer/bank', req);
    return simulate(() => ({ data: { status: 'COMPLETED' }, reference: makeReference() }));
  },
  /** Transfer to another telebirr wallet by phone */
  walletTransfer(req: WalletTransferRequest): Promise<ApiResult<{ status: string }>> {
    if (USE_LIVE_BACKEND) return livePost('/v1/transfer/wallet', req);
    return simulate(() => ({ data: { status: 'COMPLETED' }, reference: makeReference() }));
  },
  /** Pay a merchant (QR or merchant id) */
  merchantPay(req: MerchantPayRequest): Promise<ApiResult<{ status: string }>> {
    if (USE_LIVE_BACKEND) return livePost('/v1/payment/merchant', req);
    return simulate(() => ({ data: { status: 'COMPLETED' }, reference: makeReference() }));
  },
  /** Pay a utility bill */
  billPay(req: BillPayRequest): Promise<ApiResult<{ status: string }>> {
    if (USE_LIVE_BACKEND) return livePost('/v1/payment/bill', req);
    return simulate(() => ({ data: { status: 'COMPLETED' }, reference: makeReference() }));
  },
  /** Request money link/QR payload */
  requestMoney(amount: number): Promise<ApiResult<{ qrPayload: string }>> {
    const qrPayload = `telebirr://pay?to=251912345678&amount=${amount}&ref=${makeReference()}`;
    if (USE_LIVE_BACKEND) return livePost('/v1/request-money', { amount });
    return simulate(() => ({ data: { qrPayload }, reference: makeReference() }));
  },
};
