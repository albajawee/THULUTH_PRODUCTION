# THULUTH — Project Overview

> A reference map of this codebase so it doesn't need to be re-analyzed from scratch each time.
> **THULUTH** (ثلث, "one-third") is a personal **financial operating system** built around a
> fixed income-splitting methodology: **33 / 33 / 33 / 1**.

---

## 1. What it does

Every time income arrives, it is automatically split across four "funds":

| Fund | Share | Purpose | Accent |
|------|-------|---------|--------|
| **Stability** (الاستقرار) | 33% | Financial obligations & essentials (rent, loans, utilities, food…) | blue |
| **Growth** (النمو) | 33% | Building wealth & future assets (real estate, business, investments, retirement…) | emerald |
| **Life** (الحياة) | 33% | Enjoying life responsibly (travel, restaurants, entertainment, gifts…) | violet |
| **Charity** (الصدقة) | 1% | Giving & charitable donations | amber |

Users then track **expenses** against each fund, move money between funds via **transfers**,
record **donations** from the charity fund, set savings **goals** linked to a fund, and view
**reports**. All monetary mutations are logged immutably (transactions + audit logs).

> Note: shares total **1.00** (0.33×3 + 0.01 = **1.00**). See `DISTRIBUTION` in
> `src/lib/constants/fund-percentages.ts`. Distribution uses `Math.floor` per fund to avoid
> fractional currency, so a few units may be "lost" to rounding by design.

---

## 2. Tech stack

- **Next.js 16.2.9** (App Router) + **React 19.2** — ⚠️ see `AGENTS.md`: this Next.js has
  breaking changes vs. training data; **read `node_modules/next/dist/docs/` before writing Next code.**
- **TypeScript**, **Tailwind CSS v4** (`@tailwindcss/postcss`), **shadcn/ui** components
  built on **@base-ui/react** (not Radix), **lucide-react** icons, **framer-motion**.
- **Firebase**: client SDK (Auth + Firestore realtime) *and* **firebase-admin** (server writes).
- **next-intl** for i18n — **English + Arabic** with RTL. Locale stored in a `locale` cookie.
- **react-hook-form** + **zod** for forms/validation, **recharts** for charts, **sonner** for toasts,
  **next-themes** (defaults to **dark**, system theme disabled).

Scripts: `npm run dev` / `build` / `start`. No test or lint script defined.

---

## 3. Architecture — the key pattern

**Reads are client-side & realtime; writes are server-side & privileged.**

```
Client (browser)                         Server ('use server')
─────────────────                        ─────────────────────
firebase/config.ts  ──reads──►  Firestore  ◄──writes──  firebase/admin.ts
  (client SDK)                     ▲                        (Admin SDK)
     │                            rules                        │
  hooks/use*.ts  (onSnapshot)   (client                  services/*.ts
     │            realtime)      write=false)             (Server Actions)
  components/  ◄── live data       └─ enforces read-only client
```

- **`src/lib/firebase/config.ts`** — client SDK (`auth`, `db`, `storage`). Uses `NEXT_PUBLIC_*` env vars.
- **`src/lib/firebase/admin.ts`** — Admin SDK (`adminDb`, `adminAuth`), `server-only`. Uses
  `FIREBASE_ADMIN_*` env vars. Marked `serverExternalPackages` in `next.config.ts`.
- **`firestore.rules`** — every subcollection is **client-read-only** (`write: if false`).
  ALL writes go through Server Actions using the Admin SDK. User profiles are never deletable.

### Layers (`src/lib/`)
- **`types/`** — domain types, re-exported from `types/index.ts` (fund, income, expense, goal,
  transaction, transfer, donation, audit, user).
- **`constants/`** — `fund-percentages.ts` (the 33/33/33/1 `DISTRIBUTION`), `fund-config.ts`
  (labels EN/AR, colors, icons, routes, `FUND_ORDER`), `fund-categories.ts` (per-fund expense categories).
- **`utils/`** — `calculations.ts` (`distributeIncome`, `calcGoalProgress`, `calcAverageMonthlyIncome`),
  `formatters.ts`, `validators.ts` (zod schemas), plus `src/lib/utils.ts` (shadcn `cn`).
- **`repositories/`** — client-side **read** helpers wrapping Firestore `getDoc`/`getDocs`
  (fund, income, expense, goal, transaction, transfer, donation, user).
- **`services/`** — server **write** actions (`'use server'`): `income`, `expense`, `transfer`,
  `goal`, `charity`, `reports`, `user`. Each validates with zod, writes via `adminDb.batch()`,
  updates fund balances with `FieldValue.increment`, appends transaction + audit records, then
  `revalidatePath(...)`.
- **`hooks/`** — client realtime subscriptions (`useFunds`, `useIncome`, `useExpenses`, `useGoals`,
  `useTransactions`, `useTransfers`, `useDonations`) + context providers (`AuthProvider`,
  `UserSettingsProvider`) and `useAuth`.

### The canonical write flow (see `services/income.service.ts` & `transfer.service.ts`)
A single `adminDb.batch()` performs **all** of:
1. Write the primary doc (income / transfer / expense / goal…).
2. Update affected **fund** balance(s) via `FieldValue.increment` (`set(..., { merge: true })`
   so it works even if the fund doc doesn't exist yet). Tracks `balance`, `totalReceived`, `totalSpent`.
3. Append immutable **transaction** record(s) (`income_distribution`, `transfer_in/out`, etc.).
4. Append an **audit_log** entry.
5. `commit()` then `revalidatePath()` the affected routes.

> Goals do **not** move money — `calcGoalProgress` computes progress purely from the linked
> fund's current balance (visual only).

---

## 4. Firestore data model

All per-user data lives under `users/{userId}/...`:

```
users/{userId}
  ├─ funds/{fundId}            fundId ∈ stability|growth|life|charity  { balance, totalReceived, totalSpent, updatedAt }
  ├─ incomes/{id}             { amount, source, date, note?, distributions, createdAt }
  ├─ expenses/{id}
  ├─ goals/{id}               { title, targetAmount, fundType, deadline, priority, status, ... }
  ├─ transfers/{id}           { fromFund, toFund, amount, reason, createdAt }
  ├─ donations/{id}
  ├─ transactions/{id}        IMMUTABLE ledger { type, fundType, amount, description, relatedId, relatedType }
  └─ audit_logs/{id}          IMMUTABLE { action, entityType, entityId, after, createdAt }
```

Indexes in `firestore.indexes.json`; security in `firestore.rules`; Firebase project config in `firebase.json`.

---

## 5. App routes (`src/app/`, App Router)

- **`(auth)/`** — `login`, `register` (own minimal layout).
- **`(dashboard)/`** — authed area with `DashboardShell` (Sidebar + TopBar):
  - `dashboard` — overview (summary bar, fund cards, monthly chart, recent transactions, active goals)
  - `funds/{stability|growth|life|charity}` — per-fund pages (share `FundPageTemplate`)
  - `income` + `income/add` — record income & preview distribution
  - `goals` + `goals/[id]` — savings goals
  - `transfers` — move money between funds
  - `reports` — analytics
  - `settings` — user settings
- **`layout.tsx`** (root) — fonts (Geist), `ThemeProvider` (dark), `NextIntlClientProvider`,
  `AuthProvider`, `Toaster`. Sets `<html dir>` to `rtl` when locale cookie = `ar`.
- **Metadata title**: "THULUTH — Financial Operating System".

## 6. Components (`src/components/`)
`ui/` (shadcn primitives) · `layout/` (DashboardShell, Sidebar, TopBar) · `dashboard/`
(SummaryBar, FundCard, MonthlyChart, RecentTransactions, ActiveGoals) · `funds/` (FundPageTemplate,
ExpenseForm, ExpenseHistory, CategoryBreakdown) · `income/` (IncomeForm, DistributionPreview) ·
`goals/` (GoalCard, GoalForm) · `charity/` (DonationForm).

## 7. i18n
`src/i18n/request.ts` reads the `locale` cookie (`en`|`ar`, default `en`). Messages in
`src/messages/{en,ar}.json`. Fund config carries both `label`/`labelAr` and `description`/`descriptionAr`.

---

## 8. Gotchas / conventions to remember
- ⚠️ **This is a modified Next.js 16** — always consult `node_modules/next/dist/docs/` before writing framework code (per `AGENTS.md`).
- **Never write to Firestore from the client** — rules forbid it. Add a Server Action in `services/` instead.
- Keep mutations **atomic**: one `adminDb.batch()` covering doc + fund increments + transaction + audit log, then `revalidatePath`.
- Money is integer-floored per fund at distribution time.
- Env: client needs `NEXT_PUBLIC_FIREBASE_*`; server needs `FIREBASE_ADMIN_*` (see `.env.local.example`).
- Default theme is **dark**; app is bilingual EN/AR with RTL support.
