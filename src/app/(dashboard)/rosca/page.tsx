'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRoscaOverview } from '@/lib/hooks/useRosca';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { formatCurrency } from '@/lib/utils/formatters';
import { RoscaGroupForm } from '@/components/rosca/RoscaGroupForm';
import { RoscaGroupCard } from '@/components/rosca/RoscaGroupCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users } from 'lucide-react';

export default function RoscaPage() {
  const { user } = useAuth();
  const { roscaEnabled } = useUserSettings();
  const { overview, schedules, loading } = useRoscaOverview(user?.uid ?? null);
  const { currency } = useUserSettings();
  const t = useTranslations('rosca');
  const [open, setOpen] = useState(false);

  // The nav entry is hidden when the feature is off, but the route stays reachable — by a
  // bookmark, or on a second device before its cookie is written. An explanation beats a 404, and
  // there is nothing to protect here: Firestore rules already scope every read to the owner.
  if (!roscaEnabled) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">{t('disabledTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('disabledHint')}</p>
          <Link
            href="/settings"
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}
          >
            {t('goToSettings')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const active = schedules.filter((s) => s.group.status === 'active');
  const closed = schedules.filter((s) => s.group.status !== 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('subtitle', {
              active: overview.activeCount,
              amount: formatCurrency(overview.monthlyCommitment, currency),
            })}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />{t('newGroup')}</Button>} />
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('createGroup')}</DialogTitle>
            </DialogHeader>
            <RoscaGroupForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{t('noGroups')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('noGroupsHint')}</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">{t('tabActive')}</TabsTrigger>
            <TabsTrigger value="closed">{t('tabClosed')}</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {active.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('noActiveGroups')}</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((s) => <RoscaGroupCard key={s.group.id} schedule={s} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-4">
            {closed.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('noClosedGroups')}</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {closed.map((s) => <RoscaGroupCard key={s.group.id} schedule={s} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
