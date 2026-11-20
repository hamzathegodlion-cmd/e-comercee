# telebirr-web — Unofficial Web Recreation of the Telebirr Super-App

A faithful web rebuild of the **Flutter Telebirr clone** by
[birukbr7/Telebirr-clone-by-biruk](https://github.com/birukbr7/Telebirr-clone-by-biruk),
recreated in **React 19 + TypeScript + Vite**, runnable in any modern browser.

> **Disclaimer — read this first**
> This is an **unofficial UI recreation for personal, educational and portfolio use**.
> It is **not affiliated with, endorsed by or connected to Ethio telecom** in any way.
> Telebirr, the telebirr logo and Ethio telecom branding are trademarks of Ethio telecom SC.
> No real money moves. All balances, transactions, OTPs and PINs are simulated and stored
> locally in your browser (localStorage). The PIN never leaves the device and is never sent
> anywhere. Do not distribute this as if it were the official product.

## What was recreated (from the Flutter source)

| Flutter original (lib/) | Web equivalent |
| --- | --- |
| `screens/main_screen.dart` — dot bottom-nav (Home / Payment / Apps / Account) | `src/components/BottomNav.tsx` |
| `screens/home_screen.dart` — green header, amber marquee, carousel, 4×2 service grids, Scan QR FAB | `src/tabs/HomeTab.tsx` + `src/components/GreenHeader.tsx` |
| `widgets/balance_info.dart` — eye-toggle masked balances | `GreenHeader.tsx` (Balance / EndeKise / Reward) |
| `widgets/grid_content.dart` — service grids with original assets (dashen, cbe, christmas, ethio-logo…) | `ServicesGrid.tsx` + `public/images/*` |
| `widgets/notification_area.dart` — search, bell w/ badge 23, Eng/Amh switch | `GreenHeader.tsx` + `NotificationsSheet` |
| `widgets/user_introduction.dart` — "Selam, BirukBr7" | `GreenHeader.tsx` |
| `widgets/transaction detail.dart` — "Transaction Details →" | `TransactionsSheet` (filterable, CSV export) |
| `constants.dart` / `colors.dart` — labels & `#8CCA3B` green | `src/data.ts`, `src/index.css` |

Plus everything is now **functional** (locally simulated): send money with contact picker,
cash in/out, airtime & packages, request-money QR, CBE/Dashen/other-bank transfers, wallet
transfers, merchant payment + QR scanner simulation, bill pay, fuel payment, scheduled
payments, notifications (23 seeded), Amharic/English toggle, transaction history with CSV
export, demo sign-out/sign-in, and a resettable demo wallet.

## Run it

```bash
cd telebirr-web
npm install
npm run dev        # http://0.0.0.0:3100
```

```bash
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build on 0.0.0.0:3100
```

## Connecting to a real back end later

There is **no public Telebirr API** for third-party apps. The only sanctioned route is a
formal integration agreement with Ethio telecom (e.g. the telebirr merchant payment gateway,
which requires applying as a merchant and receiving production credentials).

This codebase is already shaped for that: `src/lib/api.ts` exposes `telebirrApi` with one
method per transaction type. Today they resolve through a simulated `fetch`-less path. To go
live, set:

```bash
VITE_TELEBIRR_API_URL=https://<your-issued-base-url>
VITE_TELEBIRR_API_KEY=<your-issued-key-or-token>
```

and every call switches to real HTTPS `POST ${VITE_TELEBIRR_API_URL}${path}` with an
`Authorization: Bearer …` header — no other code changes needed. **Never** point this at a
production endpoint without written authorization from Ethio telecom, and never commit real
credentials (use `.env.local`, which is git-ignored).

## Project structure

```
telebirr-web/
├── public/images/        # original assets from the Flutter repo (banners, logos)
├── src/
│   ├── lib/api.ts        # backend abstraction (simulated today, env-driven live mode)
│   ├── lib/WalletContext.tsx  # wallet state + localStorage persistence
│   ├── components/       # Header, GreenHeader, BottomNav, Sheet, Carousel, ServicesGrid, icons
│   ├── tabs/             # HomeTab, PaymentTab, AppsTab, AccountTab
│   ├── flows.tsx         # all transaction flows (Send, Cash, Airtime, Bank, Wallet,
│   │                     #  Merchant, Bill, Fuel) + QR scanner, notifications, history
│   ├── data.ts           # demo seed: user, balances, transactions, contacts, billers, apps
│   ├── App.tsx           # shell: tabs, overlays, search, toast, sign-out
│   └── index.css         # Telebirr design system (green #8CCA3B, amber strip, blue CTA)
└── vite.config.ts        # dev/preview on 0.0.0.0:3100, permissive hosts for sandbox preview
```

## Credits

- Original UI design: [birukbr7/Telebirr-clone-by-biruk](https://github.com/birukbr7/Telebirr-clone-by-biruk) (MIT-style hobby project; assets used with attribution).
- Telebirr product design © Ethio telecom. This project is not a product of Ethio telecom.
