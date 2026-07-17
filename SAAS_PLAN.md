# THULUTH — Personal App → SaaS: Plan

> Status: **plan / not yet implemented**. Written 2026-07-17.
> Evidence for every claim below was gathered from the codebase, a production build, and a
> guarded dev run. Where something is unverified, it says so.

---

## 0. Verdict up front

The **product** is in better shape than the **plumbing**. The domain model (33/33/33/1, immutable
transaction ledger, audit logs, per-fund balances) is genuinely well designed and is the right
core for a SaaS. The blockers are not features — they are three facts:

1. ~~**It does not build.**~~ ✅ **FIXED (P0 complete, 2026-07-17).** It now builds, and CI guards it.
2. **It has no multi-tenant security.** Every server action trusts a `userId` sent by the browser.
   The moment a second user exists, any user can read/write any other user's money data.
3. **"Slow" is architectural**, not incidental — the dashboard opens ~8 realtime Firestore
   listeners *after* client-side auth resolves. That is a waterfall, and at scale it's also a bill.

None of these are hard to fix. But #2 must be fixed *before* a second user exists. **#2 is now the
only thing standing between this and a second user.**

---

## 1. What I actually found (evidence)

### 1.1 ~~The build is broken~~ ✅ RESOLVED

`npm run build` → `Failed to type check.` **`tsc --noEmit` found exactly 3 errors — all now fixed:**

| File | Error | Status |
|---|---|---|
| `src/app/(dashboard)/reports/page.tsx:121` | `formatCurrency(Number(v ?? 0, currency))` — paren misplaced, `Number()` got 2 args. **Two occurrences.** | ✅ fixed |
| `src/lib/repositories/goal.repository.ts:12` | imports `GoalAllocation` from `../types` — **the type did not exist** | ✅ fixed (§3.1 Option A) |
| `src/lib/services/reports.service.ts:79` | reads `g.allocatedAmount` — **not a field on `Goal`** → live **NaN** | ✅ fixed (uses `calcGoalProgress`) |

> Better than feared: I had said "assume there are more." There weren't — the damage was contained
> to the one half-built `goal_allocations` feature.

**Why this happened — three compounding causes, all now closed:**
1. No `lint`/`typecheck` script and no CI. ✅ added.
2. Turbopack **dev** does not block on type errors, so drift accumulated invisibly. ✅ CI now blocks.
3. **In Next 16, `next build` no longer runs linting and `next lint` was removed entirely**
   (`docs/01-app/02-guides/upgrading/version-16.md`). So even a passing build lints nothing —
   ESLint must be wired up separately, which it now is. This is a Next-16-specific trap.

### 1.2 `goal_allocations` is a half-built feature

- `GoalAllocation` — imported 3× in `goal.repository.ts`, **never defined anywhere**.
- `goalRepository.getGoalAllocations()` — **dead code**, nothing calls it.
- `reports.service.ts` computes goal progress from `g.allocatedAmount`, which doesn't exist →
  `undefined / targetAmount` → **`NaN`** shown in the monthly report at runtime.
- Meanwhile `PROJECT_OVERVIEW.md` and `calcGoalProgress` say goals *don't* move money and progress
  is derived from the linked fund's balance.

**Two contradictory designs are half-implemented.** Pick one (see §3.1).

### 1.3 Security: server actions trust the client (**the SaaS blocker**)

Every one of the 7 server actions takes `userId` as its first parameter:

```ts
export async function addIncome(userId: string, rawData: unknown)   // income.service.ts:10
export async function addExpense(userId: string, rawData: unknown)  // expense.service.ts:9
export async function transferFunds(userId: string, rawData: unknown)
export async function recordDonation(userId: string, rawData: unknown)
export async function createGoal(userId: string, rawData: unknown)
export async function updateUserSettings(userId: string, rawData: unknown)
export async function initFunds(userId: string)
```

Called as `addIncome(user.uid, data)` from the client. **A server action is a public HTTP
endpoint.** Anyone can call it with any `uid`.

The `firestore.rules` are well written — but **they do not apply here**. The Admin SDK bypasses
Firestore rules entirely by design. The rules protect client *reads*; the server actions are the
only gate on *writes*, and they have no gate at all.

Today this is harmless: one user, and the only `uid` that exists is yours. On day one of SaaS it is
a full data breach of other people's financial records.

### 1.4 Auth is not enforceable

- `signIn()` sets the token via `document.cookie` — **readable by any JS** (XSS-stealable), not
  `HttpOnly`, not `Secure`.
- `max-age=3600` with **no refresh** → every session hard-dies after exactly 1 hour.
- `middleware.ts` checks only that a cookie *exists*, never that it's **valid**:
  ```ts
  const sessionCookie = request.cookies.get('__session')?.value ?? request.cookies.get('firebase-auth-token')?.value;
  if (!isPublicRoute && !sessionCookie) { /* redirect */ }
  ```
  `document.cookie = 'firebase-auth-token=anything'` in devtools walks straight past it.

### 1.5 Performance — where "slow" actually comes from

The dashboard mounts **5 hooks → ~8 concurrent Firestore listeners**:

```
useFunds(uid)              → 4 separate onSnapshot doc listeners (one per fund)
useTransactions(uid, 10)   → 1
useGoals(uid)              → 1
useIncome(uid, 100)        → 1   ← 100 docs, only to draw a chart
useExpenses(uid, ..., 100) → 1   ← 100 docs, only to draw a chart
```

The load waterfall is: HTML → JS bundle → Firebase SDK init → `onAuthStateChanged` resolves →
*only then* 8 subscriptions open → skeletons → data. Nothing renders with data server-side; every
page starts empty and fills in. **That's the "slow".**

Three separate problems here:

1. **`useFunds` opens 4 doc listeners instead of 1 collection listener** — trivially 4→1.
2. **Reports scan whole date ranges.** `getYearlyReport` fetches *every* income/expense/donation
   for the year, then filters 12× in JS. Cost and latency grow forever with account age.
3. **Firestore bills per document read.** ~200+ doc reads per dashboard view, per user, live. At
   1,000 users this is both slow *and* a real monthly bill.

### 1.6 Smaller things

- `shadcn` (5.6 MB **CLI tool**) is in `dependencies`, not `devDependencies`. Nothing imports it.
- `middleware.ts` works but is deprecated in Next 16 → renamed `proxy.ts` (same functionality).
- No tests, no lint, no CI.
- `firestore.rules` forbids deleting user profiles (`allow delete: if false`) — blocks GDPR erasure.

---

## 2. Fix order (why this sequence)

Each phase unblocks the next. Don't reorder.

```
P0  Make it build + deployable        ← nothing ships until this
P1  Make it multi-tenant safe         ← MUST land before user #2 exists
P2  Make it fast                      ← cheaper to do before feature surface grows
P3  Make it a business (billing, ops)
P4  Make it worth paying for (features)
```

---

## 3. P0 — Deployable ✅ **COMPLETE** (2026-07-17)

- [x] Enumerate every type error (`tsc --noEmit`) — found 3, fixed 3. **Typecheck passes.**
- [x] **Resolved the goals contradiction** (§3.1) — Option A. Killed the live NaN bug.
- [x] Added scripts: `typecheck`, `lint`, `check` (= typecheck + lint + build).
- [x] Added CI (`.github/workflows/ci.yml`): typecheck + lint + build, **plus an i18n key-parity
      job** guarding the bilingual commitment (§7). Currently 95 keys in parity.
- [x] Moved `shadcn` → `devDependencies`.
- [x] Renamed `middleware.ts` → `src/proxy.ts` — deprecation warning gone, `Proxy` still registers.
- [x] Installed ESLint 9 + `eslint-config-next` (flat config). **`next lint` no longer exists in
      Next 16** — see §1.1.

**Verified:** `npm run check` → exit 0. Build: 17 routes, compiled ~7–14s.

### ⚠️ Two lint rules are downgraded to `warn` — tracked, not dismissed

`eslint.config.mjs` sets these to `warn` with the reasoning inline. **Restore both to `error` in P2:**

- `react-hooks/set-state-in-effect` — fires on `if (!userId) { setLoading(false); return; }` across
  the realtime hooks + `setLoading(true)` in reports. Real smells (one extra render each), not bugs.
  The proper fix is deriving loading state instead of setting it — which is a rewrite of *the exact
  hooks P2 rewrites anyway* (4 listeners → 1, rollups, SSR). Doing it twice churns money code for
  no behavioural gain.
- `react-hooks/immutability` — fires on `document.cookie = …` inside an async **submit handler**.
  Mutation in an event handler is legitimate; the rule targets mutation during render. Assessed as
  a false positive, kept at `warn` (not `off`) so new occurrences stay visible.

Current state: **0 errors, 34 warnings.** The warnings are the P2 backlog, in the open.

### 3.1 ✅ DECIDED: goals are **derived** now, allocations become a paid feature later

**Option A now, Option B later as Pro.** Concretely, in P0:

- Progress = linked fund's balance ÷ target (`calcGoalProgress`). Goals stay visual, move no money.
- **Delete** `GoalAllocation` import, `goalRepository.getGoalAllocations()` (dead code), and the
  `goal_allocations` collection from the model/rules/indexes.
- **Fix** `reports.service.ts:79` to use `calcGoalProgress` instead of the non-existent
  `g.allocatedAmount` — this is the live **NaN** bug.

This clears 2 of the known build errors and matches `PROJECT_OVERVIEW.md`.

*Known weakness, accepted for now:* two goals on the same fund show identical progress — neither
can "own" money. That limitation **is** the upsell to Option B (real earmarking) as a Pro feature
once billing exists. Nothing here forecloses B.

---

## 4. P1 — Multi-tenant security (est. 2–3 days) 🔴 **the actual blocker**

### 4.1 Session cookies (replace the JS-readable token)

1. Add `POST /api/session` route handler: takes the Firebase ID token, verifies it with
   `adminAuth.verifyIdToken()`, mints `adminAuth.createSessionCookie()` (up to 14 days), sets it
   `HttpOnly; Secure; SameSite=Lax`.
2. `signIn()` calls that endpoint instead of writing `document.cookie`.
3. Add `DELETE /api/session` for logout (+ `revokeRefreshTokens`).
4. This fixes XSS-stealability **and** the 1-hour session death in one change.

### 4.2 Derive `userId` on the server — never accept it

```ts
// lib/auth/session.ts
import 'server-only';
export async function requireUser(): Promise<{ uid: string }> {
  const cookie = (await cookies()).get('__session')?.value;
  if (!cookie) throw new UnauthorizedError();
  const decoded = await adminAuth.verifySessionCookie(cookie, true); // true = check revocation
  return { uid: decoded.uid };
}
```

Then every action changes shape — **`userId` leaves the signature entirely**:

```ts
// before — client says who it is 💀
export async function addIncome(userId: string, rawData: unknown)
// after — server decides who it is ✅
export async function addIncome(rawData: unknown) {
  const { uid } = await requireUser();
  ...
}
```

Update all 7 actions + all call sites (`addIncome(user.uid, data)` → `addIncome(data)`).
**Deleting the parameter is the point** — it makes the vulnerability *unrepresentable* rather than
relying on every future action remembering to check.

### 4.3 Verify in the proxy — but only optimistically

Firebase Admin needs the Node runtime and **cannot run in Edge middleware**. Next's own bundled
docs are explicit about this:

> "Proxy is *not* intended for slow data fetching. While Proxy can be helpful for optimistic
> checks such as permission-based redirects, it should not be used as a full session management
> or authorization solution."
> — `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`

So: proxy keeps the cheap cookie-presence check **for redirect UX only**. Real authorization lives
in `requireUser()` inside every action and every protected page. Never trust the proxy for auth.

### 4.4 Also
- [ ] Rate-limit server actions (per-uid) — money mutations are abuse targets.
- [ ] `initFunds` should run on **session creation server-side**, not from the login page.
- [ ] Add `allow delete` path for account erasure (GDPR) — currently impossible by rule.
- [ ] Enforce email verification before money operations.

---

## 5. P2 — Performance (est. 3–5 days)

Ordered by impact/effort:

| # | Change | Why |
|---|---|---|
| 1 | **Precomputed monthly rollups.** Maintain `users/{uid}/summaries/{YYYY-MM}` updated inside the *existing* write batch. | Kills the full-range scans. Dashboard + reports read **1 doc** instead of 200+. Biggest single win — fixes latency *and* Firestore bill *and* unbounded growth. |
| 2 | **`useFunds`: 4 doc listeners → 1 collection listener.** | 4→1 subscriptions on every page that shows funds. Trivial. |
| 3 | **SSR the first paint.** With an HttpOnly session cookie (P1), server-render the dashboard with real data via Admin SDK, then attach realtime for updates. | Removes the entire auth→subscribe waterfall. Skeletons → content. Depends on P1. |
| 4 | **Stop over-fetching for charts.** Dashboard pulls 100 incomes + 100 expenses to draw one chart — replace with rollups from #1. | ~200 doc reads per view → ~1. |
| 5 | **Subscribe only to what's visible.** Fund pages don't need all listeners. | Cuts idle listeners. |
| 6 | Bundle: audit Firebase client SDK weight; consider moving reads server-side. | Firebase JS SDK is heavy; less client Firestore = smaller bundle. |
| 7 | **Every route is `ƒ (Dynamic)` — nothing is static.** `cookies()` in the root layout (for the `locale` cookie / RTL `dir`) opts the *entire app* out of static rendering, including `/login` and `/register`, which need no user data. Scope the cookie read so public pages can be static/cached. | Found in the first successful build. Free win on the pages a new visitor hits first — which are exactly the pages that decide whether they sign up. |
| 8 | Restore `react-hooks/set-state-in-effect` to `error` once the hooks are rewritten (§3). | Closes the P0 debt honestly rather than leaving it downgraded forever. |

> **Note 1:** the 12.7s `/login` compile was Turbopack dev cold-compile (208ms on the second hit) —
> **not** production slowness. Do not "fix" it.
>
> **Note 2 — bundle baseline still missing.** Next 16's Turbopack build prints **no size column**
> (verified on the first green build), so `next build` alone can't give a baseline. Use
> `@next/bundle-analyzer` or measure First Load JS in DevTools before starting P2 — otherwise
> "make it fast" has no scoreboard and #6 above is unfalsifiable.

---

## 6. P3 — Making it a business

- **Billing:** Stripe (Checkout + Customer Portal + webhooks → entitlements in Firestore).
- **Plans:** see §8.
- **Entitlements:** enforce limits **server-side** in `requireUser()`-adjacent middleware — never client-side.
- **Onboarding:** currency/language pick, first income, guided split explainer.
- **Email:** verification, password reset, receipts, monthly summary (Resend/Postmark).
- **Legal:** ToS, Privacy Policy, DPA. Financial data ⇒ take this seriously.
- **Compliance:** data export (JSON/CSV) + account deletion. Both currently impossible.
- **Observability:** Sentry, structured logs, uptime. You cannot run a money app blind.
- **Support:** even just a contact form + status page.

> **Note:** THULUTH stores financial *records* the user types in — it does not touch banks or move
> money, so this is not regulated as a financial institution. That changes the day you add bank
> sync (§7). Revisit before doing so.

---

## 7. P4 — Features worth paying for

**The honest framing:** personal finance apps are a brutal, crowded market. THULUTH should not
compete with YNAB/Mint on breadth. Its moat is the **opinionated 33/33/33/1 methodology** plus
something almost nobody serves well: **Arabic/RTL and Islamic finance.**

**✅ DECIDED: bilingual (EN + AR) from day one.** EN/AR + RTL already work, so the reach is real —
but this is a standing tax, not a free win: **every feature below must ship in both languages, and
every string must be RTL-safe.** Bilingual is only a moat if parity is actually maintained; a
half-translated app is worse than a monolingual one. Budget for it in each feature, and add a CI
check that `en.json` and `ar.json` have identical key sets.

### Tier 1 — differentiators (build these)
| Feature | Why it wins |
|---|---|
| **Zakat calculator & tracker** | You *already* have a 1% charity fund, donation records, Arabic support, and a full immutable ledger. The clearest wedge you have — and the most natural paid feature. Still the top pick under a bilingual strategy: it's the thing the English-first competition simply does not do. |
| **Recurring income & expenses** | The #1 expected feature of any finance app, in any language. Auto-distribution on payday is the core promise of the methodology. |
| **Multi-currency + FX** | `selectedCurrency` exists but is display-only. **Rises in priority under bilingual** — serves both the MENA/expat audience and the global one. |

### Tier 2 — expected table stakes
- Budgets/limits per category with alerts
- CSV/Excel import + export
- Receipt attachment (Firebase Storage is already wired)
- PWA / mobile (finance apps live on phones)
- Notifications & reminders

### Tier 3 — later
- **Goal allocations (Option B)** — real earmarking; the natural Pro upgrade from §3.1
- Bank sync (**MENA: Lean, Tarabut; global: Plaid**) — high value, high cost, triggers regulation
- AI insights / anomaly detection ("Life fund burns out by the 20th")
- Debt payoff planner, net-worth tracking
- Public API, accountant read-only access
- ~~Household / shared funds~~ — **explicitly out of scope** (see §9)

---

## 8. Pricing (opening hypothesis, not a decision)

| Plan | Price | Contents |
|---|---|---|
| **Free** | 0 | Core 33/33/33/1 split, manual entry, 12mo history |
| **Pro** | ~$5–8/mo | Unlimited history, recurring, Zakat, multi-currency, goal allocations, reports/export, attachments |

Free must be genuinely useful — the methodology *is* the marketing. Charge for **time and
automation**, not for basic access to your own money data.

> **Note:** with Household dropped, there is no multi-user tier — so the entire paid pitch now rests
> on *automation and depth* (recurring, Zakat, multi-currency, allocations). That's a thinner hook
> than "add your partner," which is usually the easiest upgrade to sell in personal finance. Worth
> pressure-testing that Pro is compelling enough on automation alone before building billing.

Pricing in a bilingual market: consider regional pricing (PPP) for MENA vs. USD/EUR markets.

---

## 9. ✅ DECIDED: stay single-tenant (`users/{uid}/...`)

**Household/shared accounts are out of scope for the next year**, so we keep the existing
`users/{userId}/...` shape. It's already a good single-tenant structure — no migration, no extra
day of work, nothing to build. This is the right call for the stated roadmap.

**The tripwire.** This decision is cheap to make and expensive to reverse. Reversing it means
migrating live financial records for paying customers — the single most expensive mistake available
in this codebase. So treat the following as a **hard stop**: if *any* of these ever comes up —

- shared/household/couple accounts
- an accountant or advisor with read access
- teams, or one person managing another's funds (e.g. a parent and child)

— **stop and revisit §9 before writing a line of it.** Do not bolt sharing onto `users/{uid}`
incrementally; that's how you end up with an ACL layer grafted onto a structure that assumes one
owner, which is worse than either clean option.

To keep the reversal *possible* rather than catastrophic, one cheap hedge in P1: have
`requireUser()` return an opaque **`ownerId`** rather than passing `uid` around everywhere. Today
`ownerId === uid`. If a tenant boundary is ever needed, the seam already exists in one place
instead of ~40 call sites. Costs minutes now.

---

## 10. Questions

### ✅ Answered (2026-07-17)
| # | Question | Decision | Consequence |
|---|---|---|---|
| 1 | Household/shared accounts within a year? | **No — personal only** | §9: keep `users/{uid}/...`. No tenancy work. Hedge via `ownerId` seam. No Household pricing tier. |
| 2 | Primary audience? | **Both — bilingual from day one** | §7: EN/AR parity is a standing cost on every feature. Multi-currency rises. Zakat still Tier 1. Add i18n key-parity CI check. |
| 3 | Goals: derived or allocated? | **A now, B later as paid** | §3.1: delete `GoalAllocation`/`goal_allocations`, fix the NaN bug, revisit B as Pro. |

### ⬜ Still open
4. **Timeline & appetite** — nights/weekends, or a real push? Changes scope drastically.
5. **Bank sync** — on the roadmap? It's the difference between a notes app and a regulated one.
6. **Hosting** — Vercel (easiest for Next 16) or Firebase App Hosting (keeps it one vendor)?
7. **Pro's hook** — with Household dropped, is automation alone enough to charge for? (see §8 note)

---

## 11. Suggested first milestone

**"Deployable and safe"** — P0 + P1. Roughly 3–4 days.

At the end: it builds, CI guards it, sessions are HttpOnly and survive >1h, and no user can touch
another user's data. **That's the smallest state in which showing this to a second human is not
negligent.** Performance (P2) is worth doing right after — before the feature surface grows.
</content>
