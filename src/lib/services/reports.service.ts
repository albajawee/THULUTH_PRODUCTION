'use server';

import { z } from 'zod';
import { getTranslations } from 'next-intl/server';
import { adminDb } from '../firebase/admin';
import { requireUser } from '../auth/session';
import { calcGoalProgress } from '../utils/calculations';
import { DISTRIBUTION } from '../constants/fund-percentages';
import { Income, Expense, Donation, Transfer, Goal, Fund, FundType } from '../types';
import {
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  differenceInCalendarDays, subDays, format,
} from 'date-fns';

const FUNDS: FundType[] = ['stability', 'growth', 'life', 'charity'];

// ---------------------------------------------------------------------------
// Legacy month/year reports (kept: still used by any month/year callers)
// ---------------------------------------------------------------------------

export interface MonthlyReport {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  totalDonations: number;
  totalSavings: number;
  fundBreakdown: Record<string, number>;
  goalProgress: { goalId: string; title: string; percentage: number }[];
}

export interface YearlyReport {
  year: string;
  totalIncome: number;
  totalExpenses: number;
  totalDonations: number;
  totalSavings: number;
  monthlyTrends: { month: string; income: number; expenses: number }[];
}

async function getCollectionInRange<T>(
  userId: string,
  collectionName: string,
  startDate: string,
  endDate: string
): Promise<T[]> {
  const snap = await adminDb
    .collection('users')
    .doc(userId)
    .collection(collectionName)
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .orderBy('date', 'desc')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  const { ownerId: userId } = await requireUser();

  const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

  const [incomes, expenses, donations] = await Promise.all([
    getCollectionInRange<Income>(userId, 'incomes', start, end),
    getCollectionInRange<Expense>(userId, 'expenses', start, end),
    getCollectionInRange<Donation>(userId, 'donations', start, end),
  ]);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalDonations = donations.reduce((s, d) => s + d.amount, 0);

  const fundBreakdown: Record<string, number> = {};
  for (const expense of expenses) {
    fundBreakdown[expense.fundType] = (fundBreakdown[expense.fundType] ?? 0) + expense.amount;
  }

  const [goalsSnap, fundsSnap] = await Promise.all([
    adminDb.collection('users').doc(userId).collection('goals').where('status', '==', 'active').get(),
    adminDb.collection('users').doc(userId).collection('funds').get(),
  ]);

  const fundBalances: Record<string, number> = {};
  for (const d of fundsSnap.docs) fundBalances[d.id] = (d.data() as Fund).balance ?? 0;

  const goalProgress = goalsSnap.docs.map((d) => {
    const g = d.data() as Goal;
    return {
      goalId: g.id,
      title: g.title,
      percentage: calcGoalProgress(g.targetAmount, fundBalances[g.fundType] ?? 0, g.deadline).percentage,
    };
  });

  return {
    month: format(new Date(year, month - 1), 'MMMM yyyy'),
    totalIncome, totalExpenses, totalDonations,
    totalSavings: totalIncome - totalExpenses - totalDonations,
    fundBreakdown, goalProgress,
  };
}

export async function getYearlyReport(year: number): Promise<YearlyReport> {
  const { ownerId: userId } = await requireUser();

  const start = format(startOfYear(new Date(year, 0)), 'yyyy-MM-dd');
  const end = format(endOfYear(new Date(year, 0)), 'yyyy-MM-dd');

  const [incomes, expenses, donations] = await Promise.all([
    getCollectionInRange<Income>(userId, 'incomes', start, end),
    getCollectionInRange<Expense>(userId, 'expenses', start, end),
    getCollectionInRange<Donation>(userId, 'donations', start, end),
  ]);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalDonations = donations.reduce((s, d) => s + d.amount, 0);

  const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
    const monthStart = format(startOfMonth(new Date(year, i)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(year, i)), 'yyyy-MM-dd');
    const monthLabel = format(new Date(year, i), 'MMM');
    const income = incomes.filter((inc) => inc.date >= monthStart && inc.date <= monthEnd).reduce((s, i) => s + i.amount, 0);
    const exp = expenses.filter((e) => e.date >= monthStart && e.date <= monthEnd).reduce((s, e) => s + e.amount, 0);
    return { month: monthLabel, income, expenses: exp };
  });

  return {
    year: year.toString(),
    totalIncome, totalExpenses, totalDonations,
    totalSavings: totalIncome - totalExpenses - totalDonations,
    monthlyTrends,
  };
}

// ---------------------------------------------------------------------------
// Custom-range report: the rich one (fund health, categories, insights)
// ---------------------------------------------------------------------------

export interface FundHealth {
  fund: FundType;
  received: number;      // income share + transfers in
  spent: number;         // expenses (+ donations for charity) + transfers out
  net: number;           // received - spent
  utilization: number;   // spent / received, as a percentage (0 if nothing received)
  overspent: boolean;    // spent more than the fund took in this period
}

export interface CategoryStat {
  fund: FundType;
  category: string;
  total: number;
  count: number;
  share: number;         // % of all expenses in the period
}

export interface ReportInsight {
  tone: 'good' | 'warn' | 'info';
  text: string;
}

export interface RangeReport {
  from: string;
  to: string;
  days: number;
  totalIncome: number;
  totalExpenses: number;
  totalDonations: number;
  totalTransferred: number;
  netSavings: number;
  savingsRate: number;   // netSavings / income, as a percentage
  fundHealth: FundHealth[];
  categories: CategoryStat[];
  topExpenses: { description: string; category: string; fund: FundType; amount: number; date: string }[];
  insights: ReportInsight[];
  // headline comparison vs the immediately-preceding period of equal length
  previous: { totalIncome: number; totalExpenses: number; netSavings: number };
}

const rangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date'),
}).refine((r) => r.from <= r.to, { message: 'Start date must be on or before end date', path: ['to'] });

/** Sum of income, expense and donation amounts over a date range. Used for the period and its predecessor. */
async function periodTotals(userId: string, from: string, to: string) {
  const [incomes, expenses, donations] = await Promise.all([
    getCollectionInRange<Income>(userId, 'incomes', from, to),
    getCollectionInRange<Expense>(userId, 'expenses', from, to),
    getCollectionInRange<Donation>(userId, 'donations', from, to),
  ]);
  return {
    incomes, expenses, donations,
    totalIncome: incomes.reduce((s, i) => s + i.amount, 0),
    totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
    totalDonations: donations.reduce((s, d) => s + d.amount, 0),
  };
}

export async function getRangeReport(rawData: unknown): Promise<
  { success: true; report: RangeReport } | { success: false; error: string }
> {
  const { ownerId: userId } = await requireUser();

  const parsed = rangeSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid range' };
  }
  const { from, to } = parsed.data;
  const days = differenceInCalendarDays(new Date(to), new Date(from)) + 1;

  // Previous period of equal length, immediately before `from`.
  const prevTo = format(subDays(new Date(from), 1), 'yyyy-MM-dd');
  const prevFrom = format(subDays(new Date(from), days), 'yyyy-MM-dd');

  // Transfers carry only createdAt (no user date); filter by its date portion in JS — transfers
  // are few, so a full read is cheaper than maintaining another index.
  const transfersSnap = await adminDb.collection('users').doc(userId).collection('transfers').get();
  const transfers = transfersSnap.docs
    .map((d) => d.data() as Transfer)
    .filter((t) => {
      const day = (t.createdAt ?? '').slice(0, 10);
      return day >= from && day <= to;
    });

  const [cur, prev] = await Promise.all([
    periodTotals(userId, from, to),
    periodTotals(userId, prevFrom, prevTo),
  ]);

  const { incomes, expenses, donations, totalIncome, totalExpenses, totalDonations } = cur;
  const totalTransferred = transfers.reduce((s, t) => s + t.amount, 0);
  const netSavings = totalIncome - totalExpenses - totalDonations;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // --- Fund health ------------------------------------------------------
  const received: Record<FundType, number> = { stability: 0, growth: 0, life: 0, charity: 0 };
  const spent: Record<FundType, number> = { stability: 0, growth: 0, life: 0, charity: 0 };

  for (const inc of incomes) {
    for (const f of FUNDS) received[f] += inc.distributions?.[f] ?? 0;
  }
  for (const t of transfers) {
    received[t.toFund] += t.amount;
    spent[t.fromFund] += t.amount;
  }
  for (const e of expenses) spent[e.fundType] += e.amount;
  for (const d of donations) spent.charity += d.amount;

  const fundHealth: FundHealth[] = FUNDS.map((fund) => {
    const rec = received[fund];
    const sp = spent[fund];
    return {
      fund,
      received: rec,
      spent: sp,
      net: rec - sp,
      utilization: rec > 0 ? (sp / rec) * 100 : 0,
      overspent: sp > rec,
    };
  });

  // --- Category deep-dive ----------------------------------------------
  const catMap = new Map<string, CategoryStat>();
  for (const e of expenses) {
    const key = `${e.fundType}:${e.category}`;
    const existing = catMap.get(key);
    if (existing) {
      existing.total += e.amount;
      existing.count += 1;
    } else {
      catMap.set(key, { fund: e.fundType, category: e.category, total: e.amount, count: 1, share: 0 });
    }
  }
  const categories = [...catMap.values()]
    .map((c) => ({ ...c, share: totalExpenses > 0 ? (c.total / totalExpenses) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  const topExpenses = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e) => ({ description: e.description, category: e.category, fund: e.fundType, amount: e.amount, date: e.date }));

  // --- Insights (narrative conclusions) --------------------------------
  // Localized server-side: getTranslations picks up the request's locale cookie, so insights come
  // back in the user's language with fund names translated (category names stay as entered).
  const [tReports, tNav] = await Promise.all([
    getTranslations('reports'),
    getTranslations('nav'),
  ]);
  const insights = buildInsights(
    { days, totalIncome, totalExpenses, totalDonations, netSavings, savingsRate, fundHealth, categories, prev },
    tReports,
    tNav
  );

  return {
    success: true,
    report: {
      from, to, days,
      totalIncome, totalExpenses, totalDonations, totalTransferred,
      netSavings, savingsRate,
      fundHealth, categories, topExpenses, insights,
      previous: {
        totalIncome: prev.totalIncome,
        totalExpenses: prev.totalExpenses,
        netSavings: prev.totalIncome - prev.totalExpenses - prev.totalDonations,
      },
    },
  };
}

/** Absolute, rounded percentage as a number (the "%" lives in the message template). */
const p = (n: number): number => Math.abs(Math.round(n));

type Translate = (key: string, values?: Record<string, string | number>) => string;

function buildInsights(
  d: {
    days: number;
    totalIncome: number;
    totalExpenses: number;
    totalDonations: number;
    netSavings: number;
    savingsRate: number;
    fundHealth: FundHealth[];
    categories: CategoryStat[];
    prev: { totalIncome: number; totalExpenses: number; totalDonations: number };
  },
  t: Translate,
  tf: Translate
): ReportInsight[] {
  const out: ReportInsight[] = [];

  if (d.totalIncome === 0 && d.totalExpenses === 0) {
    return [{ tone: 'info', text: t('insightNoActivity') }];
  }

  // Savings rate
  if (d.totalIncome > 0) {
    if (d.netSavings >= 0) {
      out.push({ tone: 'good', text: t('insightSavedPositive', { pct: p(d.savingsRate) }) });
    } else {
      out.push({ tone: 'warn', text: t('insightSpentMore', { pct: p(-d.savingsRate) }) });
    }
  }

  // Overspent funds (methodology adherence)
  const overspent = d.fundHealth.filter((f) => f.overspent && f.spent > 0);
  for (const f of overspent) {
    out.push({ tone: 'warn', text: t('insightOverspentFund', { fund: tf(f.fund), pct: p(f.utilization) }) });
  }
  const healthiest = [...d.fundHealth].filter((f) => f.received > 0).sort((a, b) => a.utilization - b.utilization)[0];
  if (healthiest && !healthiest.overspent && healthiest.spent > 0) {
    out.push({ tone: 'good', text: t('insightBestFund', { fund: tf(healthiest.fund), pct: p(healthiest.utilization) }) });
  }

  // Top category (category name is user data — not translated)
  if (d.categories.length > 0) {
    const top = d.categories[0];
    out.push({ tone: 'info', text: t('insightTopCategory', { category: top.category, fund: tf(top.fund), pct: p(top.share) }) });
  }

  // Charity share
  if (d.totalIncome > 0 && d.totalDonations > 0) {
    const charityShare = (d.totalDonations / d.totalIncome) * 100;
    out.push({ tone: 'good', text: t('insightCharity', { pct: p(charityShare) }) });
  }

  // Comparison vs previous period
  if (d.prev.totalExpenses > 0) {
    const delta = ((d.totalExpenses - d.prev.totalExpenses) / d.prev.totalExpenses) * 100;
    if (Math.abs(delta) >= 5) {
      out.push({
        tone: delta > 0 ? 'warn' : 'good',
        text: delta > 0
          ? t('insightSpendingUp', { pct: p(delta), days: d.days })
          : t('insightSpendingDown', { pct: p(delta), days: d.days }),
      });
    }
  }

  return out;
}
