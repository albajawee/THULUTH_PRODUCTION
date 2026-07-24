'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

/**
 * Registers the service worker (public/sw.js) and drives the update flow.
 *
 * Update UX: when a new SW finishes installing while an old one still controls
 * the page, we surface a sonner toast (the app's existing notification channel)
 * with a "Reload" action. Clicking it tells the waiting worker to activate; the
 * single `controllerchange` handler then reloads the page once.
 *
 * Only same-origin registration — no push/VAPID here, keeping scope minimal and
 * dependency-free.
 */
export function ServiceWorkerRegistrar() {
  const t = useTranslations('pwa');
  const refreshing = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const promptUpdate = (worker: ServiceWorker) => {
      toast.info(t('updateTitle'), {
        description: t('updateDescription'),
        duration: Infinity,
        action: {
          label: t('updateAction'),
          onClick: () => worker.postMessage({ type: 'SKIP_WAITING' }),
        },
      });
    };

    let reg: ServiceWorkerRegistration | undefined;

    const register = async () => {
      try {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // An update was already waiting before this tab loaded.
        if (reg.waiting && navigator.serviceWorker.controller) {
          promptUpdate(reg.waiting);
        }

        reg.addEventListener('updatefound', () => {
          const installing = reg?.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // 'installed' + an existing controller === this is an update, not a
            // first install, so it's safe to prompt.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(installing);
            }
          });
        });
      } catch {
        // Registration failure must never break the app; offline is a bonus.
      }
    };

    // Reload exactly once after the new SW takes control.
    const onControllerChange = () => {
      if (refreshing.current) return;
      refreshing.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    register();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, [t]);

  return null;
}
