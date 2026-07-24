'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Download, Share, X } from 'lucide-react';

/**
 * Install affordance for the PWA.
 *
 * Two paths, because platforms differ:
 *   - Chromium (Android / desktop): capture `beforeinstallprompt`, suppress the
 *     mini-infobar, and offer our own "Install" button that calls prompt().
 *   - iOS Safari: has no such event, so we show the manual "Share → Add to Home
 *     Screen" hint instead — only when not already installed.
 *
 * Dismissal is remembered in localStorage so the banner never nags. It hides
 * itself in standalone mode and after `appinstalled`. Positioned above the
 * mobile BottomNav (z-40) so it never covers navigation.
 */

const DISMISS_KEY = 'thuluth-pwa-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Mode = 'none' | 'prompt' | 'ios';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from home screen.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const t = useTranslations('pwa');
  const [mode, setMode] = useState<Mode>('none');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop the default mini-infobar; we drive our own UI
      setDeferred(e as BeforeInstallPromptEvent);
      setMode('prompt');
    };
    const onInstalled = () => {
      localStorage.setItem(DISMISS_KEY, '1');
      setMode('none');
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS never fires beforeinstallprompt — offer the manual hint instead.
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIOS) setMode((m) => (m === 'none' ? 'ios' : m));

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setMode('none');
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setMode('none');
  }

  if (mode === 'none') return null;

  return (
    <div
      role="dialog"
      aria-label={t('installTitle')}
      className="fixed inset-x-0 bottom-20 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-border/60 bg-popover/95 p-4 text-popover-foreground shadow-lg backdrop-blur mb-[env(safe-area-inset-bottom)] md:bottom-4 print:hidden"
      style={{ marginInline: '1rem' }}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {mode === 'ios' ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t('installTitle')}</p>
        {mode === 'ios' ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{t('installIOS')}</p>
        ) : (
          <>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('installDescription')}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={install}>
                {t('installAction')}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                {t('installDismiss')}
              </Button>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label={t('installDismiss')}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
