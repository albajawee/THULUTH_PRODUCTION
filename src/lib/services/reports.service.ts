'use server';

import { adminDb } from '../firebase/admin';
import { Income, Expense, Donation, Goal, Fund } from '../types';
import { calcGoalProgress } from '../utils/calculations';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

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

export async function getMonthlyReport(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyReport> {
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
  const totalSavings = totalIncome - totalExpenses - totalDonations;

  const fundBreakdown: Record<string, number> = {};
  for (const expense of expenses) {
    fundBreakdown[expense.fundType] = (fundBreakdown[expense.fundType] ?? 0) + expense.amount;
  }

  // Goals move no money — progress is derived from the linked fund's balance.
  const [goalsSnap, fundsSnap] = await Promise.all([
    adminDb
      .collection('users').doc(userId)
      .collection('goals')
      .where('status', '==', 'active')
      .get(),
    adminDb
      .collection('users').doc(userId)
      .collection('funds')
      .get(),
  ]);

  const fundBalances: Record<string, number> = {};
  for (const d of fundsSnap.docs) {
    fundBalances[d.id] = (d.data() as Fund).balance ?? 0;
  }

  const goalProgress = goalsSnap.docs.map((d) => {
    const g = d.data() as Goal;
    return {
      goalId: g.id,
      title: g.title,
      percentage: calcGoalProgress(
        g.targetAmount,
        fundBalances[g.fundType] ?? 0,
        g.deadline
      ).percentage,
    };
  });

  return {
    month: format(new Date(year, month - 1), 'MMMM yyyy'),
    totalIncome,
    totalExpenses,
    totalDonations,
    totalSavings,
    fundBreakdown,
    goalProgress,
  };
}

export async function getYearlyReport(
  userId: string,
  year: number
): Promise<YearlyReport> {
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
  const totalSavings = totalIncome - totalExpenses - totalDonations;

  // Build monthly trends
  const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
    const monthStart = format(startOfMonth(new Date(year, i)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(year, i)), 'yyyy-MM-dd');
    const monthLabel = format(new Date(year, i), 'MMM');

    const income = incomes
      .filter((inc) => inc.date >= monthStart && inc.date <= monthEnd)
      .reduce((s, i) => s + i.amount, 0);

    const exp = expenses
      .filter((e) => e.date >= monthStart && e.date <= monthEnd)
      .reduce((s, e) => s + e.amount, 0);

    return { month: monthLabel, income, expenses: exp };
  });

  return {
    year: year.toString(),
    totalIncome,
    totalExpenses,
    totalDonations,
    totalSavings,
    monthlyTrends,
  };
}
