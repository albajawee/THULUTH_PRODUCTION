'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getMonthlyReport, getYearlyReport, MonthlyReport, YearlyReport } from '@/lib/services/reports.service';
import { formatCurrency } from '@/lib/utils/formatters';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FUND_COLORS = ['#60a5fa', '#34d399', '#a78bfa', '#fbbf24'];

export default function ReportsPage() {
  const { user } = useAuth();
  const { currency } = useUserSettings();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getMonthlyReport(user.uid, year, month),
      getYearlyReport(user.uid, year),
    ]).then(([m, y]) => {
      setMonthlyReport(m);
      setYearlyReport(y);
      setLoading(false);
    });
  }, [user, year, month]);

  const summaryItems = monthlyReport ? [
    { label: 'Total Income', value: monthlyReport.totalIncome, color: 'text-emerald-400' },
    { label: 'Total Expenses', value: monthlyReport.totalExpenses, color: 'text-rose-400' },
    { label: 'Total Savings', value: monthlyReport.totalSavings, color: 'text-blue-400' },
    { label: 'Total Charity', value: monthlyReport.totalDonations, color: 'text-amber-400' },
  ] : [];

  const fundBreakdownData = monthlyReport
    ? Object.entries(monthlyReport.fundBreakdown).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((m, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : summaryItems.map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`}>
                    {formatCurrency(item.value, currency)}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Breakdown</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fund Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {fundBreakdownData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No expenses this month</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={fundBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                        {fundBreakdownData.map((_, i) => <Cell key={i} fill={FUND_COLORS[i % FUND_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => formatCurrency(Number(v ?? 0), currency)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Legend iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Goal Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {(monthlyReport?.goalProgress ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No active goals</p>
                ) : (
                  <div className="space-y-3">
                    {monthlyReport?.goalProgress.map((g) => (
                      <div key={g.goalId}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="truncate">{g.title}</span>
                          <span className="font-semibold text-emerald-400 ml-2">{g.percentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${g.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="yearly" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Income vs Expenses — {year}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={yearlyReport?.monthlyTrends ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={60} tickFormatter={(v) => formatCurrency(v, currency).slice(0, -3) + 'K'} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v ?? 0), currency)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="income" name="Income" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
