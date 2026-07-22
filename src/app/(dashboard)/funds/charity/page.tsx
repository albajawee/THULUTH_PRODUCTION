'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFunds } from '@/lib/hooks/useFunds';
import { useDonations } from '@/lib/hooks/useDonations';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { reverseDonation } from '@/lib/services/charity.service';
import { DonationForm } from '@/components/charity/DonationForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { HandHeart, Trash2 } from 'lucide-react';
import { Donation } from '@/lib/types';

import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';

export default function CharityPage() {
  const { user } = useAuth();
  const { funds } = useFunds(user?.uid ?? null);
  const { donations, totalDonated, loading } = useDonations(user?.uid ?? null);
  const { currency } = useUserSettings();
  const t = useTranslations('charity');
  const tfund = useTranslations('funds');

  const charityFund = funds?.charity;

  async function handleDelete(donation: Donation) {
    const result = await reverseDonation({ donationId: donation.id });
    if (result.success) {
      toast.success(t('returnedToast', { amount: formatCurrency(donation.amount, currency) }));
    } else {
      toast.error(result.error ?? t('deleteFailedToast'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-amber-500/10">
          <HandHeart className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('fundTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">{tfund('balance')}</p>
            {charityFund ? (
              <p className="text-xl font-bold text-amber-400">
                {formatCurrency(charityFund.balance, currency)}
              </p>
            ) : <Skeleton className="h-7 w-32 mt-1" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">{tfund('totalReceived')}</p>
            {charityFund ? (
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(charityFund.totalReceived, currency)}
              </p>
            ) : <Skeleton className="h-7 w-32 mt-1" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">{t('totalDonated')}</p>
            <p className="text-xl font-bold text-rose-400">{formatCurrency(totalDonated, currency)}</p>
          </CardContent>
        </Card>
        {/* Charity can be transferred out of like any other fund; that is not giving. */}
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">{tfund('totalTransferred')}</p>
            {charityFund ? (
              <p className="text-xl font-bold text-sky-400">
                {formatCurrency(charityFund.transferredOut ?? 0, currency)}
              </p>
            ) : <Skeleton className="h-7 w-32 mt-1" />}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonationForm />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('history')}</CardTitle>
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
                <p className="text-sm text-muted-foreground">{t('noDonations')}</p>
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
                      <div className="flex items-center gap-2 mt-0.5">
                        {/* Absent on donations recorded before categories existed. */}
                        {donation.category && (
                          <Badge variant="outline" className="text-xs">
                            {donation.category}
                          </Badge>
                        )}
                        {/* Description is optional — don't render a dangling separator without it. */}
                        <span className="text-xs text-muted-foreground">
                          {donation.description ? `${donation.description} · ` : ''}
                          {formatDate(donation.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3 shrink-0">
                      <span className="text-sm font-semibold text-rose-400 tabular-nums">
                        -{formatCurrency(donation.amount, currency)}
                      </span>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={t('deleteConfirm')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title={t('deleteTitle')}
                        description={t('deleteDesc', { amount: formatCurrency(donation.amount, currency) })}
                        confirmLabel={t('deleteConfirm')}
                        destructive
                        onConfirm={() => handleDelete(donation)}
                      />
                    </div>
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
