'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { WifiOff } from 'lucide-react';

/**
 * Offline fallback, served by the service worker (public/sw.js) when a full-page
 * navigation fails with no network. Lives at the app root — outside the
 * (dashboard) group — so it renders with zero auth or Firestore dependencies.
 *
 * It is a public route (see proxy.ts PUBLIC_ROUTES) so the SW can precache it
 * without hitting the login redirect.
 */
export default function OfflinePage() {
  const t = useTranslations('offline');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Image src="/icon-192.png" alt="THULUTH" width={72} height={72} className="rounded-2xl" priority />
      <div className="flex items-center gap-2 text-muted-foreground">
        <WifiOff className="h-5 w-5" />
        <span className="text-sm font-medium">{t('badge')}</span>
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold">{t('title')}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <Button onClick={() => window.location.reload()}>{t('retry')}</Button>
    </div>
  );
}
