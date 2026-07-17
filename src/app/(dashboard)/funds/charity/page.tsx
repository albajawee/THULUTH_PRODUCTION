'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useFunds } from '@/lib/hooks/useFunds';
import { useDonations } from '@/lib/hooks/useDonations';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { DonationForm } from '@/components/charity/DonationForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HandHeart } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';

export default function CharityPage() {
  const { user } = useAuth();
  const { funds } = useFunds(user?.uid ?? null);
  const { donations, totalDonated, loading } = useDonations(user?.uid ?? null);
  const { currency } = useUserSettings();

  const charityFund = funds?.charity;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-amber-500/10">
          <HandHeart className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Charity Fund</h1>
          <p className="text-muted-foreground text-sm">Giving & charitable contributions (1%)</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Balance</p>
            {charityFund ? (
              <p className="text-xl font-bold text-amber-400">
                {formatCurrency(charityFund.balance, currency)}
              </p>
            ) : <Skeleton className="h-7 w-32 mt-1" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total Received</p>
            {charityFund ? (
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(charityFund.totalReceived, currency)}
              </p>
            ) : <Skeleton className="h-7 w-32 mt-1" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total Donated</p>
            <p className="text-xl font-bold text-rose-400">{formatCurrency(totalDonated, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonationForm />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Donation History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : donations.length === 0 ? (
              <div className="text-center py-10">
                <HandHeart className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No donations recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{donation.recipient}</p>
                      <p className="text-xs text-muted-foreground">{donation.description} · {formatDate(donation.date)}</p>
                    </div>
                    <span className="text-sm font-semibold text-rose-400 ml-3 tabular-nums">
                      -{formatCurrency(donation.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
